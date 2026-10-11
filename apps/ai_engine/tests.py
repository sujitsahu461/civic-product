from django.test import TestCase

from apps.ai_engine.category_classifier import CategoryClassifier, MODEL_TO_DB_CATEGORY_MAP
from apps.ai_engine.preprocessing import clean_text
from apps.ai_engine.services import AIEngineService
from apps.complaints.models import ComplaintCategory, ComplaintPriority


class AIEngineTests(TestCase):
    def test_clean_text_normalization(self):
        raw = "  Water Leakage!! #123 on MG Road---Street... \n\t "
        cleaned = clean_text(raw)
        self.assertEqual(cleaned, "water leakage on mg road street")

    def test_lazy_singleton_instance(self):
        instance1 = CategoryClassifier.get_instance()
        instance2 = CategoryClassifier.get_instance()
        self.assertIs(instance1, instance2)

    def test_classify_drainage_category(self):
        result = AIEngineService.classify_grievance(
            title="Sewage Overflow and Blocked Drain",
            description="The underground drainage manhole is clogged and overflowing with foul wastewater.",
            location_address="Ward 12 Market",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.DRAINAGE)
        self.assertEqual(result["raw_category"], "Drainage")
        self.assertGreaterEqual(result["confidence_score"], 0.70)
        self.assertIn(ComplaintCategory.DRAINAGE, result["probabilities"])

    def test_classify_electricity_category(self):
        result = AIEngineService.classify_grievance(
            title="Transformer Sparking and Power Blackout",
            description="Electric pole wire short circuit sparking danger with live current outage.",
            location_address="Sector 4 Substation",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.ELECTRICITY)
        self.assertEqual(result["raw_category"], "Electricity")
        self.assertGreaterEqual(result["confidence_score"], 0.70)
        self.assertIn(ComplaintCategory.ELECTRICITY, result["probabilities"])

    def test_classify_roads_category(self):
        result = AIEngineService.classify_grievance(
            title="Large Pothole on Highway Lane",
            description="Deep crater in the asphalt near the bus stop causing slow traffic and damaged road.",
            location_address="Ring Road",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.ROAD)
        self.assertEqual(result["raw_category"], "Roads")
        self.assertGreaterEqual(result["confidence_score"], 0.60)
        self.assertIn(ComplaintCategory.ROAD, result["probabilities"])

    def test_classify_sanitation_category(self):
        result = AIEngineService.classify_grievance(
            title="Unsanitary Public Toilet and Garbage Dump",
            description="Dirty public restroom with no hygiene, mosquito breeding, and uncollected waste.",
            location_address="Central Bus Stand",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.SANITATION)
        self.assertEqual(result["raw_category"], "Sanitation")
        self.assertGreaterEqual(result["confidence_score"], 0.70)
        self.assertIn(ComplaintCategory.SANITATION, result["probabilities"])

    def test_classify_water_supply_category(self):
        result = AIEngineService.classify_grievance(
            title="Main Water Pipeline Burst and Low Pressure",
            description="Contaminated dirty drinking water supply and severe pipeline leakage.",
            location_address="Main Bazar",
        )
        self.assertEqual(result["predicted_category"], ComplaintCategory.WATER)
        self.assertEqual(result["raw_category"], "Water Supply")
        self.assertGreaterEqual(result["confidence_score"], 0.80)
        self.assertIn(ComplaintCategory.WATER, result["probabilities"])

    def test_empty_text_fallback(self):
        result = AIEngineService.classify_grievance(
            title="",
            description="",
            location_address="",
        )
        self.assertIn(result["predicted_category"], ComplaintCategory.values)
        self.assertGreaterEqual(result["confidence_score"], 0.0)

    def test_priority_lazy_singleton(self):
        from apps.ai_engine.priority_classifier import PriorityClassifier
        p1 = PriorityClassifier.get_instance()
        p2 = PriorityClassifier.get_instance()
        self.assertIs(p1, p2)

    def test_priority_classifier_metadata(self):
        from apps.ai_engine.priority_classifier import PriorityClassifier
        p = PriorityClassifier.get_instance()
        meta = p.metadata
        self.assertIn("model_type", meta)
        self.assertIn("supported_priority_classes", meta)

    def test_classify_priority_high(self):
        result = AIEngineService.classify_priority(
            title="Road Damaged after Heavy Rain Danger",
            description="Massive road damage accident danger potholes near Sakhipara",
            category="ROAD",
            location_address="Sakhipara",
        )
        self.assertIn(result["predicted_priority"], [ComplaintPriority.HIGH, ComplaintPriority.MEDIUM])
        self.assertGreaterEqual(result["confidence_score"], 0.50)
        self.assertIn("probabilities", result)
        self.assertIn("Medium", result["probabilities"])
        self.assertIn("High", result["probabilities"])

    def test_classify_priority_medium(self):
        result = AIEngineService.classify_priority(
            title="Water supply disrupted",
            description="Routine water supply disrupted in Budharaja",
            category="WATER",
            location_address="Budharaja",
        )
        self.assertIn(result["predicted_priority"], [ComplaintPriority.HIGH, ComplaintPriority.MEDIUM])
        self.assertGreater(result["confidence_score"], 0.0)

    def test_classify_priority_unknown_category_and_location(self):
        result = AIEngineService.classify_priority(
            title="Street light flickering on pole",
            description="Light pole bulb failure near unfamiliar locality",
            category="UNKNOWN_CATEGORY",
            location_address="Unfamiliar Random Colony 999",
        )
        self.assertIn(result["predicted_priority"], [ComplaintPriority.HIGH, ComplaintPriority.MEDIUM])
        self.assertGreater(result["confidence_score"], 0.0)

    def test_classify_priority_empty_text_fallback(self):
        result = AIEngineService.classify_priority(
            title="",
            description="",
            category="ROAD",
            location_address="",
        )
        self.assertEqual(result["predicted_priority"], ComplaintPriority.MEDIUM)
        self.assertEqual(result["confidence_score"], 0.50)

    def test_department_lazy_singleton(self):
        from apps.ai_engine.department_classifier import DepartmentClassifier
        d1 = DepartmentClassifier.get_instance()
        d2 = DepartmentClassifier.get_instance()
        self.assertIs(d1, d2)

    def test_department_metadata_and_lookup_table(self):
        from apps.ai_engine.department_classifier import DepartmentClassifier
        d = DepartmentClassifier.get_instance()
        meta = d.metadata
        lookup = d.lookup_table
        self.assertIn("model_type", meta)
        self.assertIn("department_classes", meta)
        self.assertEqual(lookup.get("Drainage"), "Sewer")
        self.assertEqual(lookup.get("Electricity"), "Electrical")
        self.assertEqual(lookup.get("Roads"), "Public Works")
        self.assertEqual(lookup.get("Sanitation"), "Sanitation")
        self.assertEqual(lookup.get("Water Supply"), "Water Department")

    def test_route_department_water_supply(self):
        res = AIEngineService.route_department(
            title="Burst Drinking Water Pipeline",
            description="Massive clean water leak flooding street with zero water supply.",
            category="WATER",
            location_address="Sakhipara",
        )
        self.assertEqual(res["predicted_department"], "Water Department")
        self.assertEqual(res["db_department_name"], "Water")
        self.assertIn(res["cross_check_status"], ["AGREED", "DISAGREED"])
        self.assertIn("Water Department", res["probabilities"])

    def test_route_department_roads(self):
        res = AIEngineService.route_department(
            title="Dangerous Potholes and Crater on Highway",
            description="Crater on main road causing severe accident risk and vehicle damage.",
            category="ROAD",
            location_address="Budharaja",
        )
        self.assertEqual(res["predicted_department"], "Public Works")
        self.assertEqual(res["db_department_name"], "Road")
        self.assertIn("Public Works", res["probabilities"])

    def test_route_department_electricity(self):
        res = AIEngineService.route_department(
            title="Transformer Sparking and Power Outage",
            description="Electric wire hanging down sparking fire hazard.",
            category="ELECTRICITY",
            location_address="Ainthapali",
        )
        self.assertEqual(res["predicted_department"], "Electrical")
        self.assertEqual(res["db_department_name"], "Electricity")
        self.assertIn("Electrical", res["probabilities"])

    def test_route_department_drainage(self):
        res = AIEngineService.route_department(
            title="Blocked Gutter and Sewage Overflow",
            description="Manhole clogged with foul sewage water overflowing onto footpath.",
            category="DRAINAGE",
            location_address="Khetrajpur",
        )
        self.assertEqual(res["predicted_department"], "Sewer")
        self.assertEqual(res["db_department_name"], "Drainage")
        self.assertIn("Sewer", res["probabilities"])

    def test_route_department_sanitation(self):
        res = AIEngineService.route_department(
            title="Uncollected Garbage Pile Rotten",
            description="Rotting trash bin overflowing with pests and foul garbage smell.",
            category="SANITATION",
            location_address="Modipara",
        )
        self.assertEqual(res["predicted_department"], "Sanitation")
        self.assertEqual(res["db_department_name"], "Garbage")
        self.assertIn("Sanitation", res["probabilities"])

    def test_route_department_auto_classify_category(self):
        # Category omitted: should auto-predict category then route department
        res = AIEngineService.route_department(
            title="Pipeline Leakage and Low Water Pressure",
            description="Pure drinking water flowing down the drain due to broken pipe.",
            location_address="Budharaja",
        )
        self.assertEqual(res["predicted_department"], "Water Department")
        self.assertEqual(res["db_department_name"], "Water")

    def test_route_department_fallback_mode(self):
        from apps.ai_engine.department_classifier import DepartmentClassifier
        classifier = DepartmentClassifier.get_instance()
        # Pass non-existent category to trigger ML fallback
        res = classifier.predict(
            text="Electric pole broken and spark wire danger",
            category="NON_EXISTENT_CATEGORY",
            location="Bareipali",
        )
        self.assertEqual(res["decision_source"], "ml_model_fallback")
        self.assertEqual(res["cross_check_status"], "FALLBACK")
        self.assertIn(res["predicted_department"], classifier.metadata.get("department_classes", []))

