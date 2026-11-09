"""Who may see or act on which complaints.

One place for the department-to-category mapping and the role rules, so the
complaint list, the officer queue, dashboards, analytics and detail views all
agree:

- SUPER_ADMIN: every complaint.
- AUTHORITY: complaints whose category belongs to one of the officer's
  departments (via ``department_authorities``), plus any complaint assigned to
  them directly. An officer with no department sees only direct assignments.
- CITIZEN: their own complaints.
- Anyone else: nothing.
"""

from django.db.models import Q

from apps.accounts.models import UserRole
from apps.complaints.models import Complaint, ComplaintCategory

# Words in a department name -> complaint categories that department handles.
# A department name can match several rules (e.g. "Water Supply & Sewerage").
DEPARTMENT_CATEGORY_RULES = (
    (("ROAD", "PUBLIC WORKS", "PWD", "INFRASTRUCTURE"), (ComplaintCategory.ROAD,)),
    (("WATER",), (ComplaintCategory.WATER,)),
    (("ELEC", "LIGHT", "POWER"), (ComplaintCategory.ELECTRICITY, ComplaintCategory.STREET_LIGHT)),
    (("GARBAGE", "WASTE", "SANITATION"), (ComplaintCategory.GARBAGE, ComplaintCategory.SANITATION)),
    (("DRAIN", "SEWER", "SEWAGE"), (ComplaintCategory.DRAINAGE,)),
    (("PARK", "FOREST", "GARDEN"), (ComplaintCategory.PARKS,)),
    (("NOISE", "POLLUTION"), (ComplaintCategory.NOISE,)),
)


def categories_for_department_name(name):
    """Return the set of complaint categories a department name covers."""
    upper = (name or "").upper()
    categories = set()
    for keywords, cats in DEPARTMENT_CATEGORY_RULES:
        if any(keyword in upper for keyword in keywords):
            categories.update(str(c) for c in cats)
    return categories


def categories_for_user(user):
    """Categories covered by all departments an officer is assigned to."""
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    names = user.department_assignments.values_list("department__name", flat=True)
    categories = set()
    for name in names:
        categories |= categories_for_department_name(name)
    return categories


def officer_scope_q(user):
    """Q filter for the complaints an officer may see."""
    return Q(category__in=categories_for_user(user)) | Q(assigned_authority=user)


def scope_complaints(queryset, user):
    """Restrict a Complaint queryset to what ``user`` may see."""
    if not user or not getattr(user, "is_authenticated", False):
        return queryset.none()
    role = getattr(user, "role", None)
    if role == UserRole.SUPER_ADMIN:
        return queryset
    if role == UserRole.AUTHORITY:
        return queryset.filter(officer_scope_q(user))
    if role == UserRole.CITIZEN:
        return queryset.filter(citizen=user)
    return queryset.none()


def can_access_complaint(user, complaint):
    """True if ``user`` may view (and, for staff, act on) this complaint."""
    if not user or not getattr(user, "is_authenticated", False) or complaint is None:
        return False
    role = getattr(user, "role", None)
    if role == UserRole.SUPER_ADMIN:
        return True
    if role == UserRole.CITIZEN:
        return complaint.citizen_id == user.id
    if role == UserRole.AUTHORITY:
        if complaint.assigned_authority_id == user.id:
            return True
        return complaint.category in categories_for_user(user)
    return False


def officers_for_category(category):
    """Active officers whose departments cover ``category``."""
    from django.contrib.auth import get_user_model
    from apps.departments.models import DepartmentAuthority

    user_ids = set()
    rows = DepartmentAuthority.objects.select_related("department").filter(
        user__role=UserRole.AUTHORITY, user__is_active=True
    )
    for row in rows:
        if category in categories_for_department_name(row.department.name):
            user_ids.add(row.user_id)
    return get_user_model().objects.filter(id__in=user_ids)


def scoped_complaint_or_none(user, public_id):
    """Fetch a complaint by UUID only if ``user`` may see it (else None)."""
    queryset = Complaint.objects.select_related("citizen", "assigned_authority")
    return scope_complaints(queryset, user).filter(public_id=public_id).first()
