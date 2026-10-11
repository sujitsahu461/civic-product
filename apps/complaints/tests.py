import io
import tempfile
from PIL import Image

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.complaint_history.models import ComplaintHistory, HistoryAction
from apps.complaint_images.models import ComplaintImage
from apps.complaints.models import Complaint, ComplaintPriority, ComplaintStatus
from apps.complaints.permissions import CanManageComplaintStatus, IsComplaintOwnerOrAuthorityOrAdmin
from apps.complaints.services import ComplaintSearchService, ComplaintService
from apps.departments.models import Department, DepartmentAuthority


User = get_user_model()
TEMP_MEDIA = tempfile.mkdtemp()


from django.core.files.uploadedfile import SimpleUploadedFile


def _create_test_image(name="test.png", size=(100, 100), fmt="PNG"):
    image = Image.new("RGB", size, color="red")
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    content = buf.getvalue()
    return SimpleUploadedFile(name=name, content=content, content_type=f"image/{fmt.lower()}")


def _make_user(role=UserRole.CITIZEN, email=None, password="StrongPass123!", **kwargs):
    email = email or f"{role.lower()}_{id(role)}@example.com"
    return User.objects.create_user(
        email=email,
        password=password,
        full_name=f"Test {role}",
        role=role,
        **kwargs,
    )


def _get_department(name="Road"):
    dept, _ = Department.objects.get_or_create(name=name)
    return dept


# ===========================================================================
# Model & Service Unit Tests
# ===========================================================================


class ComplaintModelTests(TestCase):
    def setUp(self):
        self.citizen = _make_user(UserRole.CITIZEN, email="c_model@example.com")
        self.dept = _get_department("Road")

    def test_complaint_creation_and_defaults(self):
        complaint = Complaint.objects.create(
            citizen=self.citizen,
            category="ROAD",
            title="Broken Street Light",
            description="Light pole #42 is flickering continuously.",
            location_address="Main Street 123",
        )
        self.assertTrue(complaint.tracking_code.startswith("CMP-"))
        self.assertEqual(complaint.status, ComplaintStatus.PENDING)
        self.assertEqual(complaint.priority, ComplaintPriority.MEDIUM)
        self.assertEqual(str(complaint), f"{complaint.tracking_code} - Broken Street Light (PENDING)")


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ComplaintServiceTests(TestCase):
    def setUp(self):
        self.citizen = _make_user(UserRole.CITIZEN, email="c_svc@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="a_svc@example.com")
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="admin_svc@example.com")
        self.dept = _get_department("Water")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)

    def test_create_complaint_with_history_and_image(self):
        img_file = _create_test_image("pipe.png")
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Water Pipe Leakage",
            description="Substantial water leak on 5th Avenue.",
            location_address="5th Avenue #10",
            images=[img_file],
        )

        self.assertEqual(complaint.title, "Water Pipe Leakage")
        self.assertEqual(complaint.images.count(), 1)
        self.assertEqual(complaint.history.count(), 2)  # CREATED + IMAGE_ADDED

    def test_update_status_updates_resolved_at(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Pothole Repair",
            description="Deep pothole.",
            location_address="Road 4",
        )

        ComplaintService.update_status(
            complaint=complaint,
            actor=self.authority,
            new_status=ComplaintStatus.RESOLVED,
            remarks="Pothole filled with asphalt.",
        )

        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.RESOLVED)
        self.assertIsNotNone(complaint.resolved_at)
        self.assertEqual(complaint.resolution_notes, "Pothole filled with asphalt.")

    def test_assign_authority_success(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Pipeline Breakdown",
            description="No water supply.",
            location_address="Block C",
        )

        ComplaintService.assign_authority(
            complaint=complaint,
            actor=self.admin,
            authority_user=self.authority,
            remarks="Assigning to water inspector.",
        )

        complaint.refresh_from_db()
        self.assertEqual(complaint.assigned_authority, self.authority)
        self.assertEqual(complaint.status, ComplaintStatus.IN_PROGRESS)

    def test_assign_authority_wrong_department_raises(self):
        other_dept = _get_department("Electricity")
        other_authority = _make_user(UserRole.AUTHORITY, email="wrong_dept@example.com")
        DepartmentAuthority.objects.create(department=other_dept, user=other_authority)

        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Water Supply Issue",
            description="Low pressure.",
            location_address="Block A",
        )

        with self.assertRaises(ValueError):
            ComplaintService.assign_authority(
                complaint=complaint,
                actor=self.admin,
                authority_user=other_authority,
            )

    def test_track_by_code_or_public_id(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Drainage Blockage",
            description="Stagnant water.",
            location_address="Street 9",
        )

        found_by_code = ComplaintService.track_by_code(complaint.tracking_code)
        found_by_id = ComplaintService.track_by_code(str(complaint.public_id))

        self.assertEqual(found_by_code, complaint)
        self.assertEqual(found_by_id, complaint)

    def test_create_complaint_auto_category_prediction(self):
        # 1. Drainage
        c_drain = ComplaintService.create_complaint(
            citizen=self.citizen,
            title="Clogged Gutter and Drainage Overflow",
            description="Blocked sewer drain with wastewater overflowing into street",
            location_address="Market Lane",
        )
        self.assertEqual(c_drain.category, "DRAINAGE")

        # 2. Electricity
        c_elec = ComplaintService.create_complaint(
            citizen=self.citizen,
            title="Transformer Sparking and Electric Wire Broken",
            description="Power cut blackout due to broken electric line",
            location_address="Sector 4",
        )
        self.assertEqual(c_elec.category, "ELECTRICITY")

        # 3. Roads
        c_road = ComplaintService.create_complaint(
            citizen=self.citizen,
            title="Deep Potholes and Craters on Road",
            description="Damaged road lane with large potholes after heavy rain",
            location_address="Highway 1",
        )
        self.assertEqual(c_road.category, "ROAD")

        # 4. Sanitation
        c_san = ComplaintService.create_complaint(
            citizen=self.citizen,
            title="Illegal Garbage Dumping and Waste Disposal",
            description="Rubbish and uncollected trash dumping for days",
            location_address="Station Road",
        )
        self.assertEqual(c_san.category, "SANITATION")

        # 5. Water Supply
        c_water = ComplaintService.create_complaint(
            citizen=self.citizen,
            title="Low Water Pressure and Disrupted Drinking Water Supply",
            description="Tap water connection interrupted due to leaking water line",
            location_address="Main Street",
        )
        self.assertEqual(c_water.category, "WATER")


class ComplaintSearchServiceTests(TestCase):
    def setUp(self):
        self.citizen1 = _make_user(UserRole.CITIZEN, email="cit1@example.com")
        self.citizen2 = _make_user(UserRole.CITIZEN, email="cit2@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="auth_search@example.com")
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="admin_search@example.com")

        self.dept_road = _get_department("Road")
        self.dept_water = _get_department("Water")
        DepartmentAuthority.objects.create(department=self.dept_road, user=self.authority)

        self.c1 = ComplaintService.create_complaint(
            citizen=self.citizen1,
            department=self.dept_road,
            title="Broken Road Asphalt",
            description="Major potholes.",
            location_address="Highway 1",
            priority=ComplaintPriority.HIGH,
        )
        self.c2 = ComplaintService.create_complaint(
            citizen=self.citizen2,
            department=self.dept_water,
            title="Contaminated Water",
            description="Dirty drinking water.",
            location_address="Sector 12",
        )

    def test_role_based_scoping_citizen(self):
        qs = ComplaintSearchService.filter_complaints(user=self.citizen1)
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first(), self.c1)

    def test_role_based_scoping_authority(self):
        qs = ComplaintSearchService.filter_complaints(user=self.authority)
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first(), self.c1)

    def test_role_based_scoping_admin(self):
        qs = ComplaintSearchService.filter_complaints(user=self.admin)
        self.assertEqual(qs.count(), 2)

    def test_search_query_and_priority_filter(self):
        qs = ComplaintSearchService.filter_complaints(
            user=self.admin, query="asphalt", priority=ComplaintPriority.HIGH
        )
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first(), self.c1)


# ===========================================================================
# API View Endpoints Tests
# ===========================================================================


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ComplaintAPIViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.citizen = _make_user(UserRole.CITIZEN, email="api_citizen@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="api_auth@example.com")
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="api_admin@example.com")
        self.dept = _get_department("Electricity")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)

    def test_create_complaint_api(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("complaint-create")

        response = self.client.post(
            url,
            {
                "department_public_id": str(self.dept.public_id),
                "title": "Power Cut in Sector 4",
                "description": "Continuous blackout for 5 hours.",
                "priority": ComplaintPriority.HIGH,
                "location_address": "Sector 4, Street 12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tracking_code", response.data)
        self.assertEqual(response.data["title"], "Power Cut in Sector 4")

    def test_create_complaint_api_auto_category_prediction(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("complaint-create")

        response = self.client.post(
            url,
            {
                "title": "Clogged Gutter and Drainage Overflow",
                "description": "Blocked sewer drain with wastewater overflowing into street",
                "location_address": "Ward 5",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category"], "DRAINAGE")

    def test_list_complaints_api(self):
        ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Transformer Explosion",
            description="Sparks flying from transformer.",
            location_address="Grid Station 2",
        )

        self.client.force_authenticate(user=self.citizen)
        url = reverse("complaint-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)

    def test_get_complaint_detail_and_permission(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Flickering Lights",
            description="Voltage issue.",
            location_address="Lane 5",
        )

        other_citizen = _make_user(UserRole.CITIZEN, email="other_c@example.com")
        detail_url = reverse("complaint-detail", kwargs={"public_id": complaint.public_id})

        # Other citizen forbidden
        self.client.force_authenticate(user=other_citizen)
        res_forbidden = self.client.get(detail_url)
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Owner citizen allowed
        self.client.force_authenticate(user=self.citizen)
        res_ok = self.client.get(detail_url)
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data["title"], "Flickering Lights")

    def test_update_status_api(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Broken Meter Box",
            description="Meter box cover missing.",
            location_address="Plot 88",
        )

        url = reverse("complaint-status-update", kwargs={"public_id": complaint.public_id})

        # Citizen cannot update status
        self.client.force_authenticate(user=self.citizen)
        res_cit = self.client.patch(url, {"status": ComplaintStatus.IN_PROGRESS}, format="json")
        self.assertEqual(res_cit.status_code, status.HTTP_403_FORBIDDEN)

        # Authority allowed
        self.client.force_authenticate(user=self.authority)
        res_auth = self.client.patch(
            url,
            {"status": ComplaintStatus.RESOLVED, "remarks": "Replaced cover and locked box."},
            format="json",
        )
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(res_auth.data["status"], ComplaintStatus.RESOLVED)
        self.assertEqual(res_auth.data["resolution_notes"], "Replaced cover and locked box.")

    def test_assign_authority_api(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Substation Spark",
            description="Sparking noise.",
            location_address="Substation 1",
        )

        url = reverse("complaint-assign", kwargs={"public_id": complaint.public_id})

        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            url,
            {"authority_public_id": str(self.authority.public_id), "remarks": "Urgent inspection."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["assigned_authority"]["email"], self.authority.email)

    def test_image_upload_api(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Fallen Wire",
            description="Wire on road.",
            location_address="Sector 9",
        )

        url = reverse("complaint-image-upload", kwargs={"public_id": complaint.public_id})
        self.client.force_authenticate(user=self.citizen)

        img = _create_test_image("wire.png")
        response = self.client.post(url, {"image": img, "caption": "Fallen live wire"}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["caption"], "Fallen live wire")

    def test_complaint_timeline_api(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Broken Pole",
            description="Leaning pole.",
            location_address="Crossroad 2",
        )

        url = reverse("complaint-timeline", kwargs={"public_id": complaint.public_id})
        self.client.force_authenticate(user=self.citizen)

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["action"], HistoryAction.CREATED)

    def test_public_tracking_api(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Streetlight Failure",
            description="Dark alley.",
            location_address="Alley 4",
        )

        url = reverse("complaint-track", kwargs={"tracking_code": complaint.tracking_code})
        # Unauthenticated user access
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tracking_code"], complaint.tracking_code)
        self.assertEqual(response.data["title"], "Streetlight Failure")

    def test_public_tracking_invalid_code_returns_404(self):
        url = reverse("complaint-track", kwargs={"tracking_code": "CMP-99999999-INVALID"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_status_transition_raises_error(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="State Machine Test",
            description="Testing invalid transitions.",
            location_address="Test Location",
        )
        # Valid: PENDING -> RESOLVED
        ComplaintService.update_status(complaint, self.authority, ComplaintStatus.RESOLVED)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.RESOLVED)

        # Invalid: RESOLVED -> PENDING must raise ValueError
        with self.assertRaises(ValueError):
            ComplaintService.update_status(complaint, self.authority, ComplaintStatus.PENDING)

        # Invalid: RESOLVED -> IN_PROGRESS must raise ValueError
        with self.assertRaises(ValueError):
            ComplaintService.update_status(complaint, self.authority, ComplaintStatus.IN_PROGRESS)

    def test_public_timeline_sanitizes_actor_pii(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Timeline PII Test",
            description="Testing PII sanitization.",
            location_address="Test Street",
        )
        url = reverse("complaint-timeline", kwargs={"public_id": complaint.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        actor_data = response.data[0]["actor"]
        self.assertNotIn("email", actor_data)
        self.assertNotIn("phone", actor_data)
        self.assertIn("role", actor_data)
        self.assertIn("full_name", actor_data)

    def test_image_upload_disallowed_extension_raises(self):
        complaint = ComplaintService.create_complaint(
            citizen=self.citizen,
            department=self.dept,
            title="Image Extension Test",
            description="Testing extension validation.",
            location_address="Test Street",
        )
        from django.core.files.uploadedfile import SimpleUploadedFile
        fake_executable = SimpleUploadedFile("malicious.exe", b"binarycontent", content_type="application/octet-stream")
        with self.assertRaises(ValueError):
            ComplaintService.add_image(complaint, self.citizen, fake_executable)
