from django.urls import path

from apps.users.views import (
    AdminProfileView,
    AdminUserCreateView,
    AuthorityProfileView,
    ChangePasswordView,
    CitizenProfileView,
    UpdateProfileView,
    UploadProfileImageView,
    UserDetailView,
    UserSearchView,
)


urlpatterns = [
    # Profile views (role-specific)
    path("profile/citizen/", CitizenProfileView.as_view(), name="user-profile-citizen"),
    path("profile/authority/", AuthorityProfileView.as_view(), name="user-profile-authority"),
    path("profile/admin/", AdminProfileView.as_view(), name="user-profile-admin"),
    # Profile mutations
    path("profile/update/", UpdateProfileView.as_view(), name="user-profile-update"),
    path("profile/upload-image/", UploadProfileImageView.as_view(), name="user-profile-upload-image"),
    # Password
    path("change-password/", ChangePasswordView.as_view(), name="user-change-password"),
    # Admin search, create & detail
    path("search/", UserSearchView.as_view(), name="user-search"),
    path("create/", AdminUserCreateView.as_view(), name="user-create-admin"),
    path("<uuid:public_id>/", UserDetailView.as_view(), name="user-detail"),
]
