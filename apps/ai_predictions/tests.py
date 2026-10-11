import uuid
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import UserRole
from apps.ai_predictions.models import AIPredictionLog
from apps.ai_predictions.services import (
    AIDuplicateDetectorService,
    AIInsightService,
    AITriageService,
)
from apps.complaints.models import (
    Complaint,
    ComplaintCategory,
    ComplaintPriority,
    ComplaintStatus,
)

User = get_user_model()


class AITriageAndServicesTests(APITestCase):
    def test_classify_drainage(self):
        result = AITriageService.classify_complaint(
            title="Clogged Gutter and Drainage Overflow",
            description="Blocked sewer drain with wastewater overflowing into street",
            location_address="Market Lane, Ward 5",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.DRAINAGE)
        self.assertGreaterEqual(result["confidence_score"], 0.7)

    def test_classify_electricity_hazard(self):
        result = AITriageService.classify_complaint(
            title="Transformer Sparking and Electric Wire Broken",
            description="Power cut blackout due to broken electric line sparking fire hazard near school gate",
            location_address="Station Road, Ward 4",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.ELECTRICITY)
        self.assertIn(result["predicted_priority"], [ComplaintPriority.HIGH, ComplaintPriority.URGENT])
        self.assertGreaterEqual(result["urgency_score"], 60)
        self.assertTrue(any("LIVE_WIRE" in tag or "FIRE_HAZARD" in tag for tag in result["hazard_tags"]))

    def test_classify_roads(self):
        result = AITriageService.classify_complaint(
            title="Deep Potholes and Craters on Road",
            description="Damaged road lane with large potholes after heavy rain",
            location_address="Ring Road",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.ROAD)
        self.assertGreaterEqual(result["confidence_score"], 0.6)

    def test_classify_sanitation(self):
        result = AITriageService.classify_complaint(
            title="Illegal Garbage Dumping and Waste Disposal",
            description="Rubbish and uncollected trash dumping for days without removal",
            location_address="Bus Terminal Complex",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.SANITATION)
        self.assertGreaterEqual(result["confidence_score"], 0.7)

    def test_classify_water_supply(self):
        result = AITriageService.classify_complaint(
            title="Low Water Pressure and Disrupted Drinking Water Supply",
            description="Tap water connection interrupted due to leaking water line",
            location_address="Civil Lines",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.WATER)
        self.assertGreaterEqual(result["confidence_score"], 0.8)

    def test_classify_complaint_includes_ml_priority_details(self):
        result = AITriageService.classify_complaint(
            title="Dangerous potholes after heavy rain",
            description="Massive road damage and dangerous craters near Sakhipara",
            location_address="Sakhipara",
        )
        self.assertIn("ml_priority_details", result)
        self.assertIn("predicted_priority", result["ml_priority_details"])
        self.assertIn("probabilities", result["ml_priority_details"])
        self.assertIn(result["predicted_priority"], [ComplaintPriority.HIGH, ComplaintPriority.URGENT, ComplaintPriority.MEDIUM])

    def test_classify_complaint_includes_department_routing(self):
        result = AITriageService.classify_complaint(
            title="Burst Drinking Water Main Pipe",
            description="Clean drinking water supply pipe ruptured and leaking on street",
            location_address="Budharaja",
        )
        self.assertIn("predicted_department", result)
        self.assertEqual(result["predicted_department"], "Water Department")
        self.assertIn("department_routing", result)
        self.assertEqual(result["department_routing"]["db_department_name"], "Water")
        self.assertIn("requires_human_review", result)

    def test_classify_complaint_saves_department_in_log(self):
        user = User.objects.create_user(
            email="log_user@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
        )
        complaint = Complaint.objects.create(
            citizen=user,
            title="Live Wire Sparking",
            description="Electric pole transformer explosion and sparks",
            location_address="Ainthapali",
        )
        result = AITriageService.classify_complaint(
            title=complaint.title,
            description=complaint.description,
            location_address=complaint.location_address,
            save_log=True,
            complaint=complaint,
        )
        log = AIPredictionLog.objects.filter(complaint=complaint).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.predicted_department, "Electrical")
        self.assertFalse(log.requires_human_review)


    def test_duplicate_detection(self):
        user = User.objects.create_user(
            email="ai_user@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
        )
        # Existing active complaint
        Complaint.objects.create(
            citizen=user,
            category=ComplaintCategory.WATER,
            title="Main Water Pipeline Burst",
            description="Heavy water leak flooding the main market road",
            latitude=28.6139,
            longitude=77.2090,
            status=ComplaintStatus.PENDING,
        )

        # Incoming similar complaint nearby
        matches = AIDuplicateDetectorService.find_potential_duplicates(
            title="Water Pipeline Leaking on Market Road",
            description="Huge water leakage on the street",
            category=ComplaintCategory.WATER,
            latitude=28.6140,
            longitude=77.2092,
            radius_km=1.0,
        )
        self.assertGreaterEqual(len(matches), 1)
        self.assertEqual(matches[0]["tracking_code"][:4], "CMP-")
        self.assertGreater(matches[0]["similarity_score"], 0.3)

    def test_city_insights(self):
        AIPredictionLog.objects.create(
            predicted_category=ComplaintCategory.ROAD,
            predicted_priority=ComplaintPriority.HIGH,
            urgency_score=75,
            confidence_score=0.92,
        )
        insights = AIInsightService.get_city_insights()
        self.assertEqual(insights["total_ai_scans"], 1)
        self.assertEqual(insights["system_readiness_status"], "OPERATIONAL")


class AIApiTests(APITestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email="citizen_ai_api@example.com",
            password="Password123!",
            role=UserRole.CITIZEN,
        )
        self.classify_url = reverse("ai_predictions:ai-classify")
        self.dup_url = reverse("ai_predictions:ai-detect-duplicates")
        self.insights_url = reverse("ai_predictions:ai-city-insights")

    def test_api_classify_all_five_categories(self):
        test_cases = [
            {
                "payload": {
                    "title": "Clogged Gutter and Drainage Overflow",
                    "description": "Blocked sewer drain with wastewater overflowing into street",
                    "location_address": "Ward 7",
                },
                "expected_category": ComplaintCategory.DRAINAGE,
            },
            {
                "payload": {
                    "title": "Transformer Sparking and Electric Wire Broken",
                    "description": "Power cut blackout due to broken electric line sparking fire hazard",
                    "location_address": "Sector 9",
                },
                "expected_category": ComplaintCategory.ELECTRICITY,
            },
            {
                "payload": {
                    "title": "Deep Potholes and Craters on Road",
                    "description": "Damaged road lane with large potholes after heavy rain",
                    "location_address": "National Highway 16",
                },
                "expected_category": ComplaintCategory.ROAD,
            },
            {
                "payload": {
                    "title": "Illegal Garbage Dumping and Waste Disposal",
                    "description": "Rubbish and uncollected trash dumping for days without removal",
                    "location_address": "Railway Station Area",
                },
                "expected_category": ComplaintCategory.SANITATION,
            },
            {
                "payload": {
                    "title": "Low Water Pressure and Disrupted Drinking Water Supply",
                    "description": "Tap water connection interrupted due to leaking water line",
                    "location_address": "Housing Board Colony",
                },
                "expected_category": ComplaintCategory.WATER,
            },
        ]

        for case in test_cases:
            response = self.client.post(self.classify_url, case["payload"], format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(
                response.data["predicted_category"],
                case["expected_category"],
                f"Failed for {case['payload']['title']}: got {response.data['predicted_category']}",
            )
            self.assertIn("urgency_score", response.data)
            self.assertIn("confidence_score", response.data)
            self.assertGreaterEqual(response.data["confidence_score"], 0.6)

    def test_api_classify_title_only(self):
        payload = {"title": "No water supply", "description": ""}
        response = self.client.post(self.classify_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["predicted_category"], ComplaintCategory.WATER)

    def test_api_classify_description_only(self):
        payload = {"title": "", "description": "There has been no water supply since yesterday"}
        response = self.client.post(self.classify_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["predicted_category"], ComplaintCategory.WATER)

    def test_api_duplicate_detection(self):
        self.client.force_authenticate(user=self.citizen)
        Complaint.objects.create(
            citizen=self.citizen,
            category=ComplaintCategory.SANITATION,
            title="Overflowing Dumpster near Market",
            description="Garbage not collected for five days rotting waste",
            status=ComplaintStatus.PENDING,
        )

        payload = {
            "title": "Uncollected Garbage Dumpster",
            "description": "Rotting waste near market bin overflowing",
            "category": ComplaintCategory.SANITATION,
        }
        response = self.client.post(self.dup_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 1)

    def test_api_city_insights(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(self.insights_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_ai_scans", response.data)
        self.assertIn("system_readiness_status", response.data)

    def test_api_complaint_prediction(self):
        self.client.force_authenticate(user=self.citizen)
        complaint = Complaint.objects.create(
            citizen=self.citizen,
            category=ComplaintCategory.ROAD,
            title="Deep Potholes and Craters on Road",
            description="Damaged road lane with large potholes after heavy rain",
            status=ComplaintStatus.PENDING,
        )
        url = reverse("ai_predictions:complaint-ai-prediction", kwargs={"complaint_public_id": complaint.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["predicted_category"], ComplaintCategory.ROAD)
