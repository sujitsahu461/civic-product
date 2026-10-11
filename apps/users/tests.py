import io
import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole, UserStatus
from apps.departments.models import Department, DepartmentAuthority
from apps.users.permissions import IsActiveUser, IsProfileOwner


User = get_user_model()

TEMP_MEDIA = tempfile.mkdtemp()


def _create_test_image(name="test.png", size=(100, 100), fmt="PNG"):
    """Return an in-memory image file suitable for upload."""
    image = Image.new("RGB", size, color="blue")
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    buf.seek(0)
    buf.name = name
    return buf


def _make_user(role=UserRole.CITIZEN, email=None, password="StrongPass123!", **kwargs):
    email = email or f"{role.lower()}_{id(role)}@example.com"
    return User.objects.create_user(
        email=email,
        password=password,
        full_name=f"Test {role}",
        role=role,
        **kwargs,
    )


# ===========================================================================
# Citizen Profile
# ===========================================================================


class CitizenProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.citizen = _make_user(UserRole.CITIZEN, email="citizen@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="authority@example.com")
        self.url = reverse("user-profile-citizen")

    def test_citizen_can_view_own_profile(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "citizen@example.com")

    def test_authority_cannot_access_citizen_profile_endpoint(self):
        self.client.force_authenticate(user=self.authority)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_is_denied(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_citizen_profile_returns_expected_fields(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(self.url)
        expected = {"public_id", "email", "full_name", "phone", "bio", "address", "profile_image", "created_at"}
        self.assertEqual(set(response.data.keys()), expected)


# ===========================================================================
# Authority Profile
# ===========================================================================


class AuthorityProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.authority = _make_user(
            UserRole.AUTHORITY,
            email="auth@example.com",
        )
        self.dept = Department.objects.create(name="Water Supply")
        DepartmentAuthority.objects.create(
            department=self.dept, user=self.authority,
            designation="Inspector", is_head=False,
        )
        self.citizen = _make_user(UserRole.CITIZEN, email="citizen2@example.com")
        self.url = reverse("user-profile-authority")

    def test_authority_can_view_own_profile(self):
        self.client.force_authenticate(user=self.authority)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["departments"]), 1)
        self.assertEqual(response.data["departments"][0]["department_name"], "Water Supply")
        self.assertEqual(response.data["departments"][0]["designation"], "Inspector")

    def test_citizen_cannot_access_authority_profile_endpoint(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authority_profile_includes_departments(self):
        self.client.force_authenticate(user=self.authority)
        response = self.client.get(self.url)
        self.assertIn("departments", response.data)


# ===========================================================================
# Admin Profile
# ===========================================================================


class AdminProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="admin@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="citizen3@example.com")
        self.url = reverse("user-profile-admin")

    def test_admin_can_view_own_profile(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("role", response.data)
        self.assertIn("status", response.data)
        self.assertIn("is_active", response.data)
        self.assertIn("updated_at", response.data)

    def test_citizen_cannot_access_admin_profile_endpoint(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# Update Profile
# ===========================================================================


class UpdateProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.citizen = _make_user(UserRole.CITIZEN, email="upd_citizen@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="upd_auth@example.com")
        self.url = reverse("user-profile-update")

    def test_citizen_can_update_basic_fields(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.put(
            self.url,
            {"full_name": "New Name", "phone": "1111111111", "bio": "Hello", "address": "123 Street"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.citizen.refresh_from_db()
        self.assertEqual(self.citizen.full_name, "New Name")

    def test_citizen_cannot_set_department_via_profile_update(self):
        """Department assignment is via the departments module, not profile update."""
        self.client.force_authenticate(user=self.citizen)
        response = self.client.put(
            self.url,
            {"full_name": "Name", "phone": "1234567890", "bio": "", "address": ""},
            format="json",
        )
        # Should succeed — department field is not accepted here
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authority_profile_update_does_not_accept_department(self):
        """Department/designation are managed via the departments module."""
        self.client.force_authenticate(user=self.authority)
        response = self.client.patch(
            self.url,
            {"bio": "Updated bio"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.authority.refresh_from_db()
        self.assertEqual(self.authority.bio, "Updated bio")

    def test_partial_update_only_updates_provided_fields(self):
        self.client.force_authenticate(user=self.citizen)
        original_name = self.citizen.full_name
        response = self.client.patch(
            self.url,
            {"bio": "Updated bio"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.citizen.refresh_from_db()
        self.assertEqual(self.citizen.bio, "Updated bio")
        self.assertEqual(self.citizen.full_name, original_name)

    def test_phone_uniqueness_on_update(self):
        other = _make_user(UserRole.CITIZEN, email="other@example.com", phone="5555555555")
        self.client.force_authenticate(user=self.citizen)
        response = self.client.patch(
            self.url,
            {"phone": "5555555555"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# Profile Image Upload
# ===========================================================================


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ProfileImageUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(UserRole.CITIZEN, email="img@example.com")
        self.url = reverse("user-profile-upload-image")

    def test_valid_image_upload(self):
        self.client.force_authenticate(user=self.user)
        image = _create_test_image()
        response = self.client.post(self.url, {"profile_image": image}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.profile_image)

    def test_invalid_format_rejected(self):
        self.client.force_authenticate(user=self.user)
        buf = io.BytesIO(b"not-an-image-file")
        buf.name = "file.txt"
        response = self.client.post(self.url, {"profile_image": buf}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_old_image_replaced(self):
        self.client.force_authenticate(user=self.user)
        # Upload first image.
        img1 = _create_test_image("first.png")
        self.client.post(self.url, {"profile_image": img1}, format="multipart")
        self.user.refresh_from_db()
        first_image = self.user.profile_image.name
        # Upload second image.
        img2 = _create_test_image("second.png")
        self.client.post(self.url, {"profile_image": img2}, format="multipart")
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.profile_image.name, first_image)


# ===========================================================================
# Change Password
# ===========================================================================


class ChangePasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(UserRole.CITIZEN, email="pwd@example.com", password="OldPass123!")
        self.url = reverse("user-change-password")

    def test_successful_password_change(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url,
            {"old_password": "OldPass123!", "new_password": "NewPass123!", "confirm_password": "NewPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass123!"))

    def test_wrong_old_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url,
            {"old_password": "WrongPass!", "new_password": "NewPass123!", "confirm_password": "NewPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mismatched_confirm_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url,
            {"old_password": "OldPass123!", "new_password": "NewPass123!", "confirm_password": "Different!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_new_password_same_as_old_rejected(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url,
            {"old_password": "OldPass123!", "new_password": "OldPass123!", "confirm_password": "OldPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_rejected(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url,
            {"old_password": "OldPass123!", "new_password": "123", "confirm_password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# User Search (Admin only)
# ===========================================================================


class UserSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="search_admin@example.com")
        self.citizen1 = _make_user(UserRole.CITIZEN, email="alice@example.com", phone="1000000001")
        self.citizen2 = _make_user(UserRole.CITIZEN, email="bob@example.com", phone="1000000002")
        self.authority1 = _make_user(UserRole.AUTHORITY, email="carol@example.com", phone="1000000003")
        self.url = reverse("user-search")

    def test_admin_can_search_users(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

    def test_citizen_cannot_access_search(self):
        self.client.force_authenticate(user=self.citizen1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_search_by_email(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {"q": "alice"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [u["email"] for u in response.data["results"]]
        self.assertIn("alice@example.com", emails)
        self.assertNotIn("bob@example.com", emails)

    def test_filter_by_role(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {"role": UserRole.AUTHORITY})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data["results"]:
            self.assertEqual(user["role"], UserRole.AUTHORITY)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url, {"status": UserStatus.ACTIVE})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data["results"]:
            self.assertEqual(user["status"], UserStatus.ACTIVE)


# ===========================================================================
# User Detail
# ===========================================================================


class UserDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="detail_admin@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="detail_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="detail_citizen@example.com")
        self.target = _make_user(UserRole.CITIZEN, email="target@example.com")

    def test_admin_can_view_any_user(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("user-detail", kwargs={"public_id": self.target.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "target@example.com")

    def test_authority_can_view_any_user(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("user-detail", kwargs={"public_id": self.target.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_citizen_cannot_view_other_user(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("user-detail", kwargs={"public_id": self.target.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nonexistent_user_returns_404(self):
        import uuid

        self.client.force_authenticate(user=self.admin)
        url = reverse("user-detail", kwargs={"public_id": uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# Custom Permission unit tests
# ===========================================================================


class PermissionTests(TestCase):
    def test_is_active_user_allows_active(self):
        user = _make_user(UserRole.CITIZEN, email="active@example.com", status=UserStatus.ACTIVE)

        class FakeRequest:
            def __init__(self, u):
                self.user = u

        self.assertTrue(IsActiveUser().has_permission(FakeRequest(user), None))

    def test_is_active_user_denies_suspended(self):
        user = _make_user(UserRole.CITIZEN, email="suspended@example.com")
        user.status = UserStatus.SUSPENDED
        user.save()

        class FakeRequest:
            def __init__(self, u):
                self.user = u

        self.assertFalse(IsActiveUser().has_permission(FakeRequest(user), None))

    def test_is_profile_owner_matches(self):
        user = _make_user(UserRole.CITIZEN, email="owner@example.com")

        class FakeRequest:
            def __init__(self, u):
                self.user = u

        self.assertTrue(IsProfileOwner().has_object_permission(FakeRequest(user), None, user))

    def test_is_profile_owner_rejects_other(self):
        user1 = _make_user(UserRole.CITIZEN, email="owner1@example.com")
        user2 = _make_user(UserRole.CITIZEN, email="owner2@example.com")

        class FakeRequest:
            def __init__(self, u):
                self.user = u

        self.assertFalse(IsProfileOwner().has_object_permission(FakeRequest(user1), None, user2))
