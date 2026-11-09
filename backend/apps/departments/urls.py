from django.urls import path

from apps.departments.views import (
    AssignAuthorityView,
    DepartmentAuthorityListView,
    DepartmentCreateView,
    DepartmentDeactivateView,
    DepartmentDetailView,
    DepartmentListView,
    DepartmentStatisticsView,
    DepartmentUpdateView,
    RemoveAuthorityView,
    UpdateAuthorityView,
)


urlpatterns = [
    # Department CRUD
    path("", DepartmentListView.as_view(), name="department-list"),
    path("create/", DepartmentCreateView.as_view(), name="department-create"),
    path("<uuid:public_id>/", DepartmentDetailView.as_view(), name="department-detail"),
    path("<uuid:public_id>/update/", DepartmentUpdateView.as_view(), name="department-update"),
    path("<uuid:public_id>/deactivate/", DepartmentDeactivateView.as_view(), name="department-deactivate"),
    # Authority assignment
    path("<uuid:public_id>/authorities/", DepartmentAuthorityListView.as_view(), name="department-authority-list"),
    path("<uuid:public_id>/authorities/assign/", AssignAuthorityView.as_view(), name="department-authority-assign"),
    path(
        "<uuid:public_id>/authorities/<uuid:user_public_id>/",
        RemoveAuthorityView.as_view(),
        name="department-authority-remove",
    ),
    path(
        "<uuid:public_id>/authorities/<uuid:user_public_id>/update/",
        UpdateAuthorityView.as_view(),
        name="department-authority-update",
    ),
    # Statistics
    path("<uuid:public_id>/statistics/", DepartmentStatisticsView.as_view(), name="department-statistics"),
]
