import logging
import os

from PIL import Image
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import UserRole
from apps.complaint_history.models import ComplaintHistory, HistoryAction
from apps.complaint_images.models import ComplaintImage
from apps.complaints.models import Complaint, ComplaintPriority, ComplaintStatus


User = get_user_model()
logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


class ComplaintService:
    """Core domain business logic for civic complaints."""

    VALID_STATUS_TRANSITIONS = {
        ComplaintStatus.PENDING: {
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED,
        },
        ComplaintStatus.ASSIGNED: {
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED,
            ComplaintStatus.PENDING,
        },
        ComplaintStatus.IN_PROGRESS: {
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED,
            ComplaintStatus.PENDING,
            ComplaintStatus.CLOSED,
        },
        ComplaintStatus.RESOLVED: {
            ComplaintStatus.CLOSED,
        },
        ComplaintStatus.REJECTED: {
            ComplaintStatus.CLOSED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.PENDING,
        },
        ComplaintStatus.CLOSED: {
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.RESOLVED,
        },
    }

    @staticmethod
    @transaction.atomic
    def create_complaint(
        citizen,
        category=None,
        title="",
        description="",
        location_address="",
        latitude=None,
        longitude=None,
        priority=ComplaintPriority.MEDIUM,
        images=None,
        department=None,
        **kwargs,
    ):
        """Create a new complaint with initial status PENDING and log history event."""
        resolved_category = category
        if resolved_category and hasattr(resolved_category, "name"):
            name = resolved_category.name.upper()
            if "WATER" in name:
                resolved_category = "WATER"
            elif "ELEC" in name or "LIGHT" in name:
                resolved_category = "ELECTRICITY"
            elif "GARBAGE" in name or "WASTE" in name or "SANITATION" in name:
                resolved_category = "SANITATION"
            elif "DRAIN" in name:
                resolved_category = "DRAINAGE"
            elif "PARK" in name or "FOREST" in name:
                resolved_category = "PARKS"
            elif "TRAFFIC" in name:
                resolved_category = "TRAFFIC"
            else:
                resolved_category = "ROAD"
        elif department and hasattr(department, "name"):
            name = department.name.upper()
            if "WATER" in name:
                resolved_category = "WATER"
            elif "ELEC" in name or "LIGHT" in name:
                resolved_category = "ELECTRICITY"
            elif "GARBAGE" in name or "WASTE" in name or "SANITATION" in name:
                resolved_category = "SANITATION"
            elif "DRAIN" in name:
                resolved_category = "DRAINAGE"
            elif "PARK" in name or "FOREST" in name:
                resolved_category = "PARKS"
            elif "TRAFFIC" in name:
                resolved_category = "TRAFFIC"
            else:
                resolved_category = "ROAD"
        elif isinstance(resolved_category, str) and resolved_category.strip():
            cat_upper = resolved_category.strip().upper()
            if cat_upper in ["DRAINAGE", "DRAIN"]:
                resolved_category = "DRAINAGE"
            elif cat_upper in ["ELECTRICITY", "ELECTRIC", "LIGHT", "STREET_LIGHT"]:
                resolved_category = "ELECTRICITY"
            elif cat_upper in ["ROADS", "ROAD"]:
                resolved_category = "ROAD"
            elif cat_upper in ["SANITATION", "GARBAGE", "WASTE"]:
                resolved_category = "SANITATION"
            elif cat_upper in ["WATER SUPPLY", "WATER"]:
                resolved_category = "WATER"
            elif cat_upper in ComplaintCategory.values:
                resolved_category = cat_upper
            else:
                resolved_category = None

        predicted_priority = ComplaintPriority.MEDIUM
        if not resolved_category or resolved_category == "AUTO":
            # Auto-predict category and triage priority using AI engine
            try:
                from apps.ai_predictions.services import AITriageService
                triage_res = AITriageService.classify_complaint(
                    title=title,
                    description=description,
                    location_address=location_address,
                    save_log=False,
                )
                resolved_category = triage_res.get("predicted_category", "ROAD")
                predicted_priority = triage_res.get("predicted_priority", ComplaintPriority.MEDIUM)
            except Exception as exc:
                logger.warning("AI triage prediction failed during complaint creation: %s", exc)
                try:
                    from apps.ai_engine.services import AIEngineService
                    ai_res = AIEngineService.classify_grievance(
                        title=title,
                        description=description,
                        location_address=location_address,
                    )
                    resolved_category = ai_res.get("predicted_category", "ROAD")
                except Exception as exc2:
                    logger.warning("Fallback AI classification failed: %s", exc2)
                    resolved_category = "ROAD"
        elif priority is None:
            # Auto-predict priority when category is provided but priority is omitted
            try:
                from apps.ai_predictions.services import AITriageService
                triage_res = AITriageService.classify_complaint(
                    title=title,
                    description=description,
                    location_address=location_address,
                    save_log=False,
                )
                predicted_priority = triage_res.get("predicted_priority", ComplaintPriority.MEDIUM)
            except Exception as exc:
                logger.warning("AI priority triage failed during complaint creation: %s", exc)
                predicted_priority = ComplaintPriority.MEDIUM

        final_priority = priority or predicted_priority or ComplaintPriority.MEDIUM

        complaint = Complaint.objects.create(
            citizen=citizen,
            category=resolved_category,
            title=title,
            description=description,
            priority=final_priority,
            location_address=location_address,
            latitude=latitude,
            longitude=longitude,
            status=ComplaintStatus.PENDING,
        )

        # Log AI Prediction in AIPredictionLog for audit & city-wide insights
        try:
            from apps.ai_predictions.services import AITriageService
            AITriageService.classify_complaint(
                title=title,
                description=description,
                location_address=location_address,
                save_log=True,
                complaint=complaint,
            )
        except Exception as exc:
            logger.debug("AI prediction log creation skipped: %s", exc)

        # Log creation history
        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=citizen,
            action=HistoryAction.CREATED,
            new_status=ComplaintStatus.PENDING,
            remarks=f"Complaint filed under category: {complaint.get_category_display()}.",
        )

        # Save any initially uploaded images
        if images:
            for img in images:
                ComplaintService.add_image(complaint, citizen, img)

        # Notify ALL authority users of new complaint
        try:
            from apps.authority.services import NotificationService
            from apps.notifications.models import NotificationType

            authorities = get_user_model().objects.filter(
                role=UserRole.AUTHORITY, is_active=True
            )
            for authority_user in authorities:
                NotificationService.create_notification(
                    recipient=authority_user,
                    title="New Complaint Filed",
                    message=f"A new complaint \"{complaint.title}\" has been filed under {complaint.get_category_display()}.",
                    notification_type=NotificationType.NEW_COMPLAINT,
                    complaint=complaint,
                )
        except Exception as exc:
            logger.error("Failed to notify authorities of new complaint: %s", exc)

        logger.info(
            "Complaint created: %s (tracking_code=%s) by %s",
            complaint.title,
            complaint.tracking_code,
            citizen.email,
        )
        return complaint

    @staticmethod
    @transaction.atomic
    def update_status(complaint, actor, new_status, remarks=""):
        """Update complaint status and record history timeline."""
        old_status = complaint.status
        if old_status == new_status:
            # Idempotent status update - update remarks and resolution notes if provided
            if remarks:
                update_fields = ["updated_at"]
                if new_status == ComplaintStatus.RESOLVED:
                    complaint.resolution_notes = remarks
                    update_fields.append("resolution_notes")
                complaint.save(update_fields=update_fields)
                ComplaintHistory.objects.create(
                    complaint=complaint,
                    actor=actor,
                    action=HistoryAction.NOTE_ADDED if new_status == ComplaintStatus.RESOLVED else HistoryAction.STATUS_CHANGED,
                    old_status=old_status,
                    new_status=new_status,
                    remarks=remarks,
                )
            return complaint

        allowed = ComplaintService.VALID_STATUS_TRANSITIONS.get(old_status, set())
        if new_status not in allowed:
            raise ValueError(
                f"Invalid status transition from {old_status} to {new_status}. "
                f"Allowed transitions from {old_status}: {', '.join(sorted(allowed)) if allowed else 'None (terminal state)'}."
            )

        complaint.status = new_status
        update_fields = ["status", "updated_at"]

        if new_status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = timezone.now()
            update_fields.append("resolved_at")
            if remarks:
                complaint.resolution_notes = remarks
                update_fields.append("resolution_notes")

        complaint.save(update_fields=update_fields)

        # Determine history action
        action_map = {
            ComplaintStatus.RESOLVED: HistoryAction.RESOLVED,
            ComplaintStatus.REJECTED: HistoryAction.REJECTED,
            ComplaintStatus.ASSIGNED: HistoryAction.ASSIGNED,
        }
        action = action_map.get(new_status, HistoryAction.STATUS_CHANGED)

        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=actor,
            action=action,
            old_status=old_status,
            new_status=new_status,
            remarks=remarks or f"Status changed from {old_status} to {new_status}.",
        )

        logger.info(
            "Complaint %s status updated: %s -> %s by %s",
            complaint.tracking_code,
            old_status,
            new_status,
            actor.email,
        )
        return complaint

    @staticmethod
    @transaction.atomic
    def assign_authority(complaint, actor, authority_user, remarks=""):
        """Assign an authority user to handle the complaint."""
        if authority_user.role != UserRole.AUTHORITY and authority_user.role != UserRole.SUPER_ADMIN:
            raise ValueError("Only an authority or super admin can be assigned to handle complaints.")

        if hasattr(authority_user, "department_assignments") and authority_user.department_assignments.exists():
            dept_names = list(authority_user.department_assignments.values_list("department__name", flat=True))
            auth_cats = set()
            for name in dept_names:
                uname = name.upper()
                if "ROAD" in uname:
                    auth_cats.add("ROAD")
                elif "WATER" in uname:
                    auth_cats.add("WATER")
                elif "ELEC" in uname or "LIGHT" in uname:
                    auth_cats.update(["ELECTRICITY", "STREET_LIGHT"])
                elif "GARBAGE" in uname or "WASTE" in uname or "SANITATION" in uname:
                    auth_cats.update(["GARBAGE", "SANITATION"])
                elif "DRAIN" in uname:
                    auth_cats.add("DRAINAGE")
                elif "PARK" in uname:
                    auth_cats.add("PARKS")
                elif "TRAFFIC" in uname:
                    auth_cats.add("TRAFFIC")
            if auth_cats and complaint.category not in auth_cats:
                raise ValueError("Authority does not belong to the department of this complaint.")

        complaint.assigned_authority = authority_user
        if complaint.status == ComplaintStatus.PENDING:
            complaint.status = ComplaintStatus.IN_PROGRESS
            complaint.save(update_fields=["assigned_authority", "status", "updated_at"])
        else:
            complaint.save(update_fields=["assigned_authority", "updated_at"])

        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=actor,
            action=HistoryAction.ASSIGNED,
            old_status=complaint.status,
            new_status=complaint.status,
            remarks=remarks or f"Assigned to {authority_user.full_name} ({authority_user.email}).",
        )

        logger.info(
            "Complaint %s assigned to %s by %s",
            complaint.tracking_code,
            authority_user.email,
            actor.email,
        )
        return complaint

    @staticmethod
    @transaction.atomic
    def add_image(complaint, actor, image_file, caption=""):
        """Validate and attach an image to a complaint."""
        file_size = getattr(image_file, "size", None)
        if file_size is None and hasattr(image_file, "getvalue"):
            file_size = len(image_file.getvalue())

        if file_size and file_size > MAX_IMAGE_SIZE:
            raise ValueError(f"Image size exceeds maximum allowed size of {MAX_IMAGE_SIZE // (1024 * 1024)} MB.")

        filename = getattr(image_file, "name", "")
        if filename:
            ext = os.path.splitext(filename)[1].lower()
            if ext and ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise ValueError(
                    f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}."
                )

        content_type = getattr(image_file, "content_type", None)
        if content_type and content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError(f"Unsupported image type '{content_type}'. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}.")

        # Strict image binary and magic bytes validation via Pillow
        try:
            pil_img = Image.open(image_file)
            pil_img.verify()
            if pil_img.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError(f"Invalid image format '{pil_img.format}'. Allowed formats: JPEG, PNG, WEBP.")
        except Exception as err:
            raise ValueError(f"Uploaded file is corrupted or not a valid image: {err}") from err
        finally:
            if hasattr(image_file, "seek"):
                image_file.seek(0)

        img = ComplaintImage.objects.create(
            complaint=complaint,
            image=image_file,
            caption=caption,
        )

        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=actor,
            action=HistoryAction.IMAGE_ADDED,
            remarks=f"Image attached: {caption or image_file.name}",
        )

        logger.info("Image added to complaint %s by %s", complaint.tracking_code, actor.email)
        return img

    @staticmethod
    def get_timeline(complaint):
        """Retrieve full chronological timeline/history entries for a complaint."""
        return complaint.history.select_related("actor").order_by("created_at")

    @staticmethod
    def track_by_code(tracking_code):
        """Retrieve complaint by human-readable tracking code or public UUID."""
        # Try tracking code first
        complaint = Complaint.objects.filter(tracking_code__iexact=tracking_code).first()
        if not complaint:
            # Try public_id UUID
            try:
                complaint = Complaint.objects.filter(public_id=tracking_code).first()
            except Exception:
                pass
        return complaint


class ComplaintSearchService:
    """Provides search, filtering, and query scoping by user role."""

    @staticmethod
    def filter_complaints(
        user,
        query="",
        status=None,
        priority=None,
        category=None,
        citizen_public_id=None,
        assigned_authority_public_id=None,
    ):
        """Build filtered QuerySet scoped by request user role."""
        queryset = Complaint.objects.select_related(
            "citizen", "assigned_authority"
        ).prefetch_related("images")

        # Role-based scoping:
        if not user or not user.is_authenticated:
            return Complaint.objects.none()

        if getattr(user, "role", None) == UserRole.CITIZEN:
            queryset = queryset.filter(citizen=user)
        elif getattr(user, "role", None) == UserRole.AUTHORITY:
                if hasattr(user, "department_assignments") and user.department_assignments.exists():
                    dept_names = list(user.department_assignments.values_list("department__name", flat=True))
                    cat_filters = []
                    for name in dept_names:
                        uname = name.upper()
                        if "ROAD" in uname:
                            cat_filters.append("ROAD")
                        elif "WATER" in uname:
                            cat_filters.append("WATER")
                        elif "ELEC" in uname or "LIGHT" in uname:
                            cat_filters.extend(["ELECTRICITY", "STREET_LIGHT"])
                        elif "GARBAGE" in uname or "WASTE" in uname or "SANITATION" in uname:
                            cat_filters.extend(["GARBAGE", "SANITATION"])
                        elif "DRAIN" in uname:
                            cat_filters.append("DRAINAGE")
                        elif "PARK" in uname or "FOREST" in uname:
                            cat_filters.append("PARKS")
                        elif "TRAFFIC" in uname:
                            cat_filters.append("TRAFFIC")
                    if cat_filters:
                        queryset = queryset.filter(Q(category__in=cat_filters) | Q(assigned_authority=user))

        # Free-text search across title, description, tracking_code, location_address
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(tracking_code__icontains=query)
                | Q(location_address__icontains=query)
            )

        if status:
            queryset = queryset.filter(status=status)

        if priority:
            queryset = queryset.filter(priority=priority)

        if category:
            queryset = queryset.filter(category=category)

        if citizen_public_id:
            queryset = queryset.filter(citizen__public_id=citizen_public_id)

        if assigned_authority_public_id:
            queryset = queryset.filter(assigned_authority__public_id=assigned_authority_public_id)

        return queryset.order_by("-created_at")
