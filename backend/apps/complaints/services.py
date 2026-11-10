import logging
import os
import uuid

from PIL import Image
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import UserRole
from apps.complaint_history.models import ComplaintHistory, HistoryAction
from apps.complaint_images.models import AttachmentType, ComplaintAttachment, ComplaintImage
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from apps.complaints.scoping import categories_for_user, officers_for_category, scope_complaints
from infrastructure.events.outbox import OutboxService
from infrastructure.events.schema import build_event


User = get_user_model()
logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

ALLOWED_AUDIO_TYPES = {
    "audio/webm", "audio/ogg", "audio/mp3", "audio/mpeg",
    "audio/wav", "audio/x-wav", "audio/m4a", "audio/mp4", "audio/x-m4a", "audio/aac"
}
ALLOWED_AUDIO_EXTENSIONS = {".webm", ".ogg", ".mp3", ".wav", ".m4a", ".aac"}
MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/quicktime", "video/x-matroska"
}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
MAX_VIDEO_SIZE = 25 * 1024 * 1024  # 25 MB


def evaluate_deterministic_category(title: str, description: str) -> str:
    """Deterministic keyword-based category fallback using weighted frequency scoring."""
    import re

    text = f"{title or ''} {description or ''}".lower()
    tokens = set(re.findall(r"\b[a-z0-9_]{3,}\b", text))

    keywords = {
        "DRAINAGE": ["drain", "drainage", "sewage", "gutter", "manhole", "sewer", "waterlog", "clog", "wastewater", "culvert"],
        "SANITATION": ["garbage", "trash", "rubbish", "dump", "bin", "cleanliness", "sanitation", "litter", "filth"],
        "ELECTRICITY": ["electric", "electricity", "wire", "pole", "spark", "transformer", "power", "current", "voltage", "blackout", "fuse"],
        "WATER": ["pipeline", "tap", "drinking water", "water tanker", "pipe leak", "water supply", "low pressure", "burst pipe"],
        "ROAD": ["pothole", "asphalt", "crater", "road", "footpath", "highway", "divider", "pavement"],
    }

    scores = {cat: 0 for cat in keywords}
    for cat, kw_list in keywords.items():
        for kw in kw_list:
            if kw in text:
                scores[cat] += 2

    # Standalone token scoring for general words
    if "water" in tokens and scores["DRAINAGE"] == 0:
        scores["WATER"] += 2
    if "waste" in tokens and scores["DRAINAGE"] == 0:
        scores["SANITATION"] += 2

    best_cat = max(scores, key=scores.get)
    if scores[best_cat] > 0:
        return best_cat

    return "ROAD"


def evaluate_deterministic_priority(title: str, description: str, category: str, requested_priority=None) -> str:
    """
    Evaluates grievance priority deterministically based on safety keywords and user selection,
    completely eliminating AI inference dependencies.
    """
    if requested_priority and str(requested_priority).upper() in ComplaintPriority.values:
        return str(requested_priority).upper()

    combined_text = f"{title or ''} {description or ''}".lower()

    urgent_keywords = [
        "fire", "live wire", "open wire", "sparking", "shock", "explosion",
        "burst pipe", "flooding", "gas leak", "bridge collapse", "fatal", "emergency", "danger"
    ]
    high_keywords = [
        "contamination", "sewage overflow", "deep pothole", "accident", "broken pole",
        "no water supply", "blockage", "cave in", "sinkhole", "toxic", "hazard"
    ]
    low_keywords = [
        "cosmetic", "paint", "street sign", "garbage bin full", "minor litter", "cleaning schedule"
    ]

    for kw in urgent_keywords:
        if kw in combined_text:
            return ComplaintPriority.URGENT

    for kw in high_keywords:
        if kw in combined_text:
            return ComplaintPriority.HIGH

    for kw in low_keywords:
        if kw in combined_text:
            return ComplaintPriority.LOW

    return ComplaintPriority.MEDIUM


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
        priority=None,
        images=None,
        audio=None,
        video=None,
        audio_duration=None,
        attachments=None,
        department=None,
        correlation_id=None,
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

        if not resolved_category or resolved_category == "AUTO":
            resolved_category = evaluate_deterministic_category(title, description)

        if priority and str(priority).upper() in ComplaintPriority.values:
            final_priority = str(priority).upper()
        else:
            final_priority = evaluate_deterministic_priority(
                title=title,
                description=description,
                category=resolved_category,
                requested_priority=priority,
            )

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

        # Log creation history
        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=citizen,
            action=HistoryAction.CREATED,
            new_status=ComplaintStatus.PENDING,
            remarks=f"Complaint filed under category: {complaint.get_category_display()}.",
        )
        workflow_correlation_id = correlation_id or uuid.uuid4()
        OutboxService.record(
            build_event(
                event_type="ComplaintCreated",
                source="grievance",
                aggregate_id=complaint.public_id,
                correlation_id=workflow_correlation_id,
                payload={
                    "tracking_code": complaint.tracking_code,
                    "category": complaint.category,
                    "priority": complaint.priority,
                    "status": complaint.status,
                    "citizen_id": str(citizen.public_id),
                },
            )
        )

        # Save any initially uploaded images
        if images:
            for img in images:
                ComplaintService.add_image(complaint, citizen, img)

        # Save audio evidence if provided
        if audio:
            ComplaintService.add_audio(complaint, citizen, audio, duration_seconds=audio_duration)

        # Save video evidence if provided
        if video:
            ComplaintService.add_video(complaint, citizen, video)

        # Save generic attachments if provided
        if attachments:
            for att in attachments:
                if isinstance(att, tuple):
                    ComplaintService.add_attachment(complaint, citizen, att[0], attachment_type=att[1])
                else:
                    ComplaintService.add_attachment(complaint, citizen, att)

        # Notify the officers whose departments handle this category. If no
        # department covers it, alert the super admins so it is not missed.
        try:
            from apps.notifications.models import NotificationType
            from apps.notifications.services import NotificationService

            authorities = officers_for_category(complaint.category)
            if not authorities.exists():
                authorities = get_user_model().objects.filter(
                    role=UserRole.SUPER_ADMIN, is_active=True
                )
            for authority_user in authorities:
                NotificationService.create_notification(
                    recipient=authority_user,
                    title="New Complaint Filed",
                    message=f"A new complaint \"{complaint.title}\" has been filed under {complaint.get_category_display()}.",
                    notification_type=NotificationType.NEW_COMPLAINT,
                    complaint=complaint,
                    correlation_id=workflow_correlation_id,
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
    def update_status(complaint, actor, new_status, remarks="", correlation_id=None):
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

        # Closing the loop needs a written record: resolution notes to resolve
        # (new remarks, or notes already saved), and a reason to reject.
        has_remarks = bool((remarks or "").strip())
        if new_status == ComplaintStatus.RESOLVED and not (
            has_remarks or (complaint.resolution_notes or "").strip()
        ):
            raise ValueError("Resolution notes are required to mark a complaint as resolved.")
        if new_status == ComplaintStatus.REJECTED and not has_remarks:
            raise ValueError("A reason is required to reject a complaint.")

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
        event_payload = {
            "old_status": old_status,
            "new_status": new_status,
            "actor_id": str(actor.public_id) if actor else None,
            "remarks": remarks[:500],
        }
        workflow_correlation_id = correlation_id or uuid.uuid4()
        OutboxService.record(
            build_event(
                event_type="ComplaintStatusChanged",
                source="grievance",
                aggregate_id=complaint.public_id,
                correlation_id=workflow_correlation_id,
                payload=event_payload,
            )
        )
        if new_status in (ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED):
            OutboxService.record(
                build_event(
                    event_type=f"Complaint{new_status.title().replace('_', '')}",
                    source="grievance",
                    aggregate_id=complaint.public_id,
                    correlation_id=workflow_correlation_id,
                    payload=event_payload,
                )
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
    def assign_authority(
        complaint, actor, authority_user, remarks="", correlation_id=None
    ):
        """Assign an authority user to handle the complaint."""
        if authority_user.role != UserRole.AUTHORITY and authority_user.role != UserRole.SUPER_ADMIN:
            raise ValueError("Only an authority or super admin can be assigned to handle complaints.")

        if authority_user.role == UserRole.AUTHORITY and authority_user.department_assignments.exists():
            if complaint.category not in categories_for_user(authority_user):
                raise ValueError("Authority does not belong to the department of this complaint.")

        old_status = complaint.status
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
            old_status=old_status,
            new_status=complaint.status,
            remarks=remarks or f"Assigned to {authority_user.full_name}.",
        )
        OutboxService.record(
            build_event(
                event_type="ComplaintAssigned",
                source="grievance",
                aggregate_id=complaint.public_id,
                correlation_id=correlation_id or uuid.uuid4(),
                payload={
                    "assigned_authority_id": str(authority_user.public_id),
                    "actor_id": str(actor.public_id) if actor else None,
                    "status": complaint.status,
                    "remarks": remarks[:500],
                },
            )
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

        try:
            ComplaintAttachment.objects.create(
                complaint=complaint,
                file=image_file,
                attachment_type=AttachmentType.IMAGE,
                original_filename=filename[:255] if filename else "image.jpg",
                content_type=content_type or "image/jpeg",
                file_size=getattr(image_file, "size", 0),
                caption=caption[:255],
                uploader=actor if actor and getattr(actor, "is_authenticated", False) else None,
            )
        except Exception as att_err:
            logger.debug("Dual-write attachment notice: %s", att_err)

        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=actor if actor and getattr(actor, "is_authenticated", False) else None,
            action=HistoryAction.IMAGE_ADDED,
            remarks=f"Image attached: {caption or image_file.name}",
        )

        logger.info("Image added to complaint %s by %s", complaint.tracking_code, getattr(actor, "email", "guest"))
        return img

    @staticmethod
    def add_audio(complaint, actor, audio_file, caption="", duration_seconds=None):
        """Validates and attaches voice recording / audio evidence to a complaint."""
        return ComplaintService.add_attachment(
            complaint=complaint,
            actor=actor,
            file_obj=audio_file,
            attachment_type=AttachmentType.AUDIO,
            caption=caption,
            duration_seconds=duration_seconds,
        )

    @staticmethod
    def add_video(complaint, actor, video_file, caption="", duration_seconds=None):
        """Validates and attaches video evidence to a complaint."""
        return ComplaintService.add_attachment(
            complaint=complaint,
            actor=actor,
            file_obj=video_file,
            attachment_type=AttachmentType.VIDEO,
            caption=caption,
            duration_seconds=duration_seconds,
        )

    @staticmethod
    def add_attachment(
        complaint,
        actor,
        file_obj,
        attachment_type=AttachmentType.IMAGE,
        caption="",
        duration_seconds=None,
    ):
        """Validates and creates a ComplaintAttachment with object-level checks."""
        if not file_obj:
            raise ValueError("No attachment file provided.")

        filename = getattr(file_obj, "name", "") or "attachment"
        ext = os.path.splitext(filename)[1].lower()
        file_size = getattr(file_obj, "size", 0)
        content_type = getattr(file_obj, "content_type", "") or ""

        if attachment_type == AttachmentType.IMAGE:
            return ComplaintService.add_image(complaint, actor, file_obj, caption=caption)

        elif attachment_type == AttachmentType.AUDIO:
            if file_size > MAX_AUDIO_SIZE:
                raise ValueError(
                    f"Audio recording exceeds maximum limit of {MAX_AUDIO_SIZE // (1024 * 1024)} MB."
                )
            if ext and ext not in ALLOWED_AUDIO_EXTENSIONS:
                raise ValueError(
                    f"Unsupported audio extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}."
                )
            if content_type and content_type not in ALLOWED_AUDIO_TYPES:
                raise ValueError(f"Unsupported audio MIME type '{content_type}'.")

        elif attachment_type == AttachmentType.VIDEO:
            if file_size > MAX_VIDEO_SIZE:
                raise ValueError(
                    f"Video file exceeds maximum limit of {MAX_VIDEO_SIZE // (1024 * 1024)} MB."
                )
            if ext and ext not in ALLOWED_VIDEO_EXTENSIONS:
                raise ValueError(
                    f"Unsupported video extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}."
                )
            if content_type and content_type not in ALLOWED_VIDEO_TYPES:
                raise ValueError(f"Unsupported video MIME type '{content_type}'.")
        else:
            raise ValueError(f"Unsupported attachment type '{attachment_type}'.")

        attachment = ComplaintAttachment.objects.create(
            complaint=complaint,
            file=file_obj,
            attachment_type=attachment_type,
            original_filename=filename[:255],
            content_type=content_type[:100],
            file_size=file_size,
            caption=caption[:255],
            duration_seconds=duration_seconds,
            uploader=actor if actor and getattr(actor, "is_authenticated", False) else None,
        )

        ComplaintHistory.objects.create(
            complaint=complaint,
            actor=actor if actor and getattr(actor, "is_authenticated", False) else None,
            action=HistoryAction.IMAGE_ADDED,
            remarks=f"{attachment_type.title()} attached: {caption or filename}",
        )

        logger.info(
            "%s attachment added to complaint %s by %s",
            attachment_type,
            complaint.tracking_code,
            getattr(actor, "email", "guest"),
        )
        return attachment

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

        # Role-based scoping (citizen: own; officer: own departments; admin: all).
        queryset = scope_complaints(queryset, user)

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
