from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import UserRole, UserStatus
from apps.departments.models import Department, DepartmentAuthority, DepartmentStatus
from apps.departments.permissions import IsDepartmentMember
from apps.departments.services import DepartmentAuthorityService, DepartmentService


User = get_user_model()

# Use names that don't collide with the 5 seeded departments
# (Road, Water, Electricity, Garbage, Drainage).
SEEDED_NAMES = {"Road", "Water", "Electricity", "Garbage", "Drainage"}


def _make_user(role=UserRole.CITIZEN, email=None, password="StrongPass123!", **kwargs):
    email = email or f"{role.lower()}_{id(role)}@example.com"
    return User.objects.create_user(
        email=email,
        password=password,
        full_name=f"Test {role}",
        role=role,
        **kwargs,
    )


def _make_department(name="Test Dept", **kwargs):
    """Create a department. Uses unique test names to avoid seeded-data collisions."""
    return Department.objects.create(name=name, **kwargs)


def _get_seeded(name):
    """Retrieve one of the 5 seeded departments."""
    return Department.objects.get(name=name)


# ===========================================================================
# Model tests
# ===========================================================================


class DepartmentModelTests(TestCase):
    def test_department_creation(self):
        dept = _make_department("Power Grid", description="Power supply dept")
        self.assertEqual(dept.name, "Power Grid")
        self.assertEqual(dept.slug, "power-grid")
        self.assertTrue(dept.is_active)
        self.assertEqual(str(dept), "Power Grid")

    def test_slug_auto_generated(self):
        dept = _make_department("Fire Safety")
        self.assertEqual(dept.slug, "fire-safety")

    def test_unique_name_constraint(self):
        _make_department("Bridge Maintenance")
        with self.assertRaises(Exception):
            _make_department("Bridge Maintenance")

    def test_department_status_choices(self):
        dept = _make_department("Street Lights")
        dept.status = DepartmentStatus.INACTIVE
        dept.save()
        self.assertFalse(dept.is_active)

    def test_seeded_departments_exist(self):
        for name in SEEDED_NAMES:
            self.assertTrue(Department.objects.filter(name=name).exists())


class DepartmentAuthorityModelTests(TestCase):
    def test_authority_assignment_creation(self):
        dept = _get_seeded("Garbage")
        user = _make_user(UserRole.AUTHORITY, email="auth1@example.com")
        assignment = DepartmentAuthority.objects.create(
            department=dept, user=user, designation="Inspector", is_head=True
        )
        self.assertEqual(assignment.department, dept)
        self.assertEqual(assignment.user, user)
        self.assertTrue(assignment.is_head)
        self.assertIn("Inspector", str(assignment))

    def test_unique_department_user_constraint(self):
        dept = _get_seeded("Road")
        user = _make_user(UserRole.AUTHORITY, email="auth2@example.com")
        DepartmentAuthority.objects.create(department=dept, user=user)
        with self.assertRaises(Exception):
            DepartmentAuthority.objects.create(department=dept, user=user)


# ===========================================================================
# Service tests
# ===========================================================================


class DepartmentServiceTests(TestCase):
    def test_create_department(self):
        dept = DepartmentService.create_department(
            name="Parks", description="Parks and recreation department"
        )
        self.assertEqual(dept.name, "Parks")
        self.assertEqual(dept.slug, "parks")

    def test_create_duplicate_name_raises(self):
        DepartmentService.create_department(name="Transport")
        with self.assertRaises(ValueError):
            DepartmentService.create_department(name="Transport")

    def test_update_department(self):
        dept = _get_seeded("Electricity")
        updated = DepartmentService.update_department(
            dept, {"description": "Updated description", "contact_email": "elec@example.com"}
        )
        self.assertEqual(updated.description, "Updated description")
        self.assertEqual(updated.contact_email, "elec@example.com")

    def test_deactivate_department(self):
        dept = _make_department("Temp Dept")
        deactivated = DepartmentService.deactivate_department(dept)
        self.assertEqual(deactivated.status, DepartmentStatus.INACTIVE)
        self.assertFalse(deactivated.is_active)

    def test_get_statistics(self):
        dept = _get_seeded("Drainage")
        user1 = _make_user(UserRole.AUTHORITY, email="stat1@example.com")
        user2 = _make_user(UserRole.AUTHORITY, email="stat2@example.com")
        DepartmentAuthority.objects.create(department=dept, user=user1, is_head=True)
        DepartmentAuthority.objects.create(department=dept, user=user2)

        stats = DepartmentService.get_statistics(dept)
        self.assertEqual(stats["total_authorities"], 2)
        self.assertEqual(stats["department_heads"], 1)
        self.assertEqual(stats["department"], "Drainage")


class DepartmentAuthorityServiceTests(TestCase):
    def setUp(self):
        self.dept = _get_seeded("Water")
        self.authority = _make_user(UserRole.AUTHORITY, email="svc_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="svc_citizen@example.com")

    def test_assign_authority(self):
        assignment = DepartmentAuthorityService.assign_authority(
            self.dept, self.authority, designation="Engineer", is_head=True
        )
        self.assertEqual(assignment.department, self.dept)
        self.assertEqual(assignment.user, self.authority)
        self.assertEqual(assignment.designation, "Engineer")
        self.assertTrue(assignment.is_head)

    def test_assign_citizen_raises(self):
        with self.assertRaises(ValueError):
            DepartmentAuthorityService.assign_authority(self.dept, self.citizen)

    def test_assign_duplicate_raises(self):
        DepartmentAuthorityService.assign_authority(self.dept, self.authority)
        with self.assertRaises(ValueError):
            DepartmentAuthorityService.assign_authority(self.dept, self.authority)

    def test_remove_authority(self):
        DepartmentAuthorityService.assign_authority(self.dept, self.authority)
        DepartmentAuthorityService.remove_authority(self.dept, self.authority)
        self.assertFalse(
            DepartmentAuthority.objects.filter(
                department=self.dept, user=self.authority
            ).exists()
        )

    def test_remove_non_assigned_raises(self):
        with self.assertRaises(ValueError):
            DepartmentAuthorityService.remove_authority(self.dept, self.authority)

    def test_update_authority(self):
        assignment = DepartmentAuthorityService.assign_authority(
            self.dept, self.authority, designation="Officer"
        )
        updated = DepartmentAuthorityService.update_authority(
            assignment, {"designation": "Senior Officer", "is_head": True}
        )
        self.assertEqual(updated.designation, "Senior Officer")
        self.assertTrue(updated.is_head)

    def test_list_authorities(self):
        user2 = _make_user(UserRole.AUTHORITY, email="svc_auth2@example.com")
        DepartmentAuthorityService.assign_authority(self.dept, self.authority, is_head=True)
        DepartmentAuthorityService.assign_authority(self.dept, user2)
        authorities = DepartmentAuthorityService.list_authorities(self.dept)
        self.assertEqual(authorities.count(), 2)


# ===========================================================================
# CRUD API tests
# ===========================================================================


class DepartmentListAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="list_admin@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="list_citizen@example.com")
        # Deactivate one seeded dept for the filter test
        dept = _get_seeded("Garbage")
        dept.status = DepartmentStatus.INACTIVE
        dept.save()
        self.url = reverse("department-list")

    def test_authenticated_user_can_list_departments(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [d["name"] for d in response.data["results"]]
        self.assertIn("Road", names)
        self.assertIn("Water", names)
        # Garbage was deactivated
        self.assertNotIn("Garbage", names)

    def test_unauthenticated_user_is_denied(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DepartmentCreateAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="create_admin@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="create_citizen@example.com")
        self.url = reverse("department-create")

    def test_admin_can_create_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url,
            {"name": "Sanitation", "description": "Waste management"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Sanitation")
        self.assertEqual(response.data["slug"], "sanitation")
        self.assertTrue(Department.objects.filter(name="Sanitation").exists())

    def test_citizen_cannot_create_department(self):
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post(
            self.url,
            {"name": "Test Dept"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_name_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url,
            {"name": "Road"},  # Already seeded
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DepartmentDetailAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.citizen = _make_user(UserRole.CITIZEN, email="detail_citizen@example.com")
        self.dept = _get_seeded("Water")

    def test_authenticated_user_can_view_detail(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("department-detail", kwargs={"public_id": self.dept.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Water")

    def test_nonexistent_department_returns_404(self):
        import uuid

        self.client.force_authenticate(user=self.citizen)
        url = reverse("department-detail", kwargs={"public_id": uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DepartmentUpdateAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="update_admin@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="update_citizen@example.com")
        self.dept = _get_seeded("Road")

    def test_admin_can_update_department(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-update", kwargs={"public_id": self.dept.public_id})
        response = self.client.patch(
            url,
            {"description": "Updated road description"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dept.refresh_from_db()
        self.assertEqual(self.dept.description, "Updated road description")

    def test_citizen_cannot_update_department(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("department-update", kwargs={"public_id": self.dept.public_id})
        response = self.client.patch(
            url,
            {"description": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_name_to_existing_name_rejected(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-update", kwargs={"public_id": self.dept.public_id})
        response = self.client.patch(
            url,
            {"name": "Water"},  # Already seeded
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DepartmentDeactivateAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="deact_admin@example.com")
        self.dept = _make_department("Temp Deactivate Dept")

    def test_admin_can_deactivate(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-deactivate", kwargs={"public_id": self.dept.public_id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.dept.refresh_from_db()
        self.assertEqual(self.dept.status, DepartmentStatus.INACTIVE)


# ===========================================================================
# Authority assignment API tests
# ===========================================================================


class AssignAuthorityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="assign_admin@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="assign_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="assign_citizen@example.com")
        self.dept = _get_seeded("Road")

    def test_admin_can_assign_authority(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-authority-assign", kwargs={"public_id": self.dept.public_id})
        response = self.client.post(
            url,
            {
                "user_public_id": str(self.authority.public_id),
                "designation": "Inspector",
                "is_head": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["designation"], "Inspector")
        self.assertTrue(response.data["is_head"])
        self.assertTrue(
            DepartmentAuthority.objects.filter(
                department=self.dept, user=self.authority
            ).exists()
        )

    def test_cannot_assign_citizen(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-authority-assign", kwargs={"public_id": self.dept.public_id})
        response = self.client.post(
            url,
            {"user_public_id": str(self.citizen.public_id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_assignment_rejected(self):
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-authority-assign", kwargs={"public_id": self.dept.public_id})
        response = self.client.post(
            url,
            {"user_public_id": str(self.authority.public_id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_citizen_cannot_assign_authority(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("department-authority-assign", kwargs={"public_id": self.dept.public_id})
        response = self.client.post(
            url,
            {"user_public_id": str(self.authority.public_id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RemoveAuthorityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="remove_admin@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="remove_auth@example.com")
        self.dept = _get_seeded("Water")
        DepartmentAuthority.objects.create(department=self.dept, user=self.authority)

    def test_admin_can_remove_authority(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse(
            "department-authority-remove",
            kwargs={"public_id": self.dept.public_id, "user_public_id": self.authority.public_id},
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            DepartmentAuthority.objects.filter(
                department=self.dept, user=self.authority
            ).exists()
        )

    def test_remove_non_assigned_returns_400(self):
        other_authority = _make_user(UserRole.AUTHORITY, email="other_auth@example.com")
        self.client.force_authenticate(user=self.admin)
        url = reverse(
            "department-authority-remove",
            kwargs={"public_id": self.dept.public_id, "user_public_id": other_authority.public_id},
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UpdateAuthorityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="upd_auth_admin@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="upd_auth@example.com")
        self.dept = _get_seeded("Electricity")
        self.assignment = DepartmentAuthority.objects.create(
            department=self.dept, user=self.authority, designation="Officer"
        )

    def test_admin_can_update_authority_assignment(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse(
            "department-authority-update",
            kwargs={"public_id": self.dept.public_id, "user_public_id": self.authority.public_id},
        )
        response = self.client.patch(
            url,
            {"designation": "Senior Officer", "is_head": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.designation, "Senior Officer")
        self.assertTrue(self.assignment.is_head)


class DepartmentAuthorityListAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="auth_list_admin@example.com")
        self.authority = _make_user(UserRole.AUTHORITY, email="auth_list_auth@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="auth_list_citizen@example.com")
        self.dept = _get_seeded("Drainage")
        DepartmentAuthority.objects.create(
            department=self.dept, user=self.authority, designation="Inspector"
        )

    def test_admin_can_list_authorities(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-authority-list", kwargs={"public_id": self.dept.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["designation"], "Inspector")

    def test_authority_can_list_authorities(self):
        self.client.force_authenticate(user=self.authority)
        url = reverse("department-authority-list", kwargs={"public_id": self.dept.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_citizen_cannot_list_authorities(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("department-authority-list", kwargs={"public_id": self.dept.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# Statistics API tests
# ===========================================================================


class DepartmentStatisticsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="stats_admin@example.com")
        self.citizen = _make_user(UserRole.CITIZEN, email="stats_citizen@example.com")
        self.dept = _get_seeded("Road")
        user1 = _make_user(UserRole.AUTHORITY, email="stats_auth1@example.com")
        user2 = _make_user(UserRole.AUTHORITY, email="stats_auth2@example.com")
        DepartmentAuthority.objects.create(department=self.dept, user=user1, is_head=True)
        DepartmentAuthority.objects.create(department=self.dept, user=user2)

    def test_admin_can_view_statistics(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-statistics", kwargs={"public_id": self.dept.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_authorities"], 2)
        self.assertEqual(response.data["department_heads"], 1)
        self.assertEqual(response.data["department"], "Road")

    def test_citizen_cannot_view_statistics(self):
        self.client.force_authenticate(user=self.citizen)
        url = reverse("department-statistics", kwargs={"public_id": self.dept.public_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# Permission tests
# ===========================================================================


class DepartmentPermissionTests(TestCase):
    def test_is_department_member_allows_assigned_user(self):
        dept = _get_seeded("Electricity")
        user = _make_user(UserRole.AUTHORITY, email="perm_auth@example.com")
        DepartmentAuthority.objects.create(department=dept, user=user)

        class FakeRequest:
            def __init__(self, u):
                self.user = u

        self.assertTrue(
            IsDepartmentMember().has_object_permission(FakeRequest(user), None, dept)
        )

    def test_is_department_member_denies_non_assigned_user(self):
        dept = _get_seeded("Garbage")
        user = _make_user(UserRole.AUTHORITY, email="perm_auth2@example.com")

        class FakeRequest:
            def __init__(self, u):
                self.user = u

        self.assertFalse(
            IsDepartmentMember().has_object_permission(FakeRequest(user), None, dept)
        )


# ===========================================================================
# Validation tests
# ===========================================================================


class DepartmentValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _make_user(UserRole.SUPER_ADMIN, email="val_admin@example.com")

    def test_create_without_name_fails(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-create")
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_with_empty_name_fails(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-create")
        response = self.client.post(url, {"name": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_nonexistent_user_fails(self):
        import uuid

        dept = _get_seeded("Water")
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-authority-assign", kwargs={"public_id": dept.public_id})
        response = self.client.post(
            url,
            {"user_public_id": str(uuid.uuid4())},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_case_insensitive_duplicate_name_rejected(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("department-create")
        # "road" should clash with seeded "Road"
        response = self.client.post(url, {"name": "road"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
