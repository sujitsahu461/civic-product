from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.views.generic import TemplateView



from django.views.static import serve


# React SPA catch-all view — serves the built React index.html for any route
# that isn't an API, admin, or schema endpoint.
react_spa = TemplateView.as_view(template_name='index.html')


def root_asset_view(request, path):
    """
    Serve static assets requested from root (e.g. /civic-hero-city.jpg, /civicsetu-logo.png, /favicon.ico)
    directly from the static directory instead of returning index.html.
    """
    static_file = settings.BASE_DIR / "static" / path
    if static_file.exists() and static_file.is_file():
        return serve(request, path, document_root=str(settings.BASE_DIR / "static"))
    return react_spa(request)


urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # REST API endpoints — All Platform Modules Active
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/departments/", include("apps.departments.urls")),
    path("api/v1/complaints/", include("apps.complaints.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/authority/", include("apps.authority.urls")),
    path("api/v1/feedback/", include("apps.feedback.urls")),
    path("api/v1/ai/", include("apps.ai_predictions.urls")),
    path("api/v1/audit-logs/", include("apps.audit_logs.urls")),

    # API Schema & Swagger Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # Direct root asset handler for images, icons, and static documents
    re_path(r"^(?P<path>[^/]+\.(?:png|jpg|jpeg|svg|webp|ico|gif|json|xml|txt))$", root_asset_view),

    # ↓ React SPA catch-all — MUST be last.
    re_path(r"^(?!api/|admin/|media/|static/).*$", react_spa, name="react-spa"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
