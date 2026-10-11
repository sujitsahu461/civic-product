# CivicSetu V1 — Multimedia Complaint Evidence Specification

## 1. Overview
CivicSetu V1 expands grievance reporting beyond basic text and photos to support a full multimodal evidence pipeline:
1. **Text Grievance**: Primary accessible submission with Unicode support (English, Odia, Hindi).
2. **Audio Evidence**: Direct in-browser voice recording via `MediaRecorder` API or audio file selection.
3. **Image Evidence**: Multi-image photo upload with previews and validation.
4. **Video Evidence**: Short on-site incident video clips with HTML5 playback preview.

---

## 2. Evidence Formats & Technical Limits

| Media Type | Supported Formats | Max File Size | Constraints & Controls |
| :--- | :--- | :--- | :--- |
| **Audio** | `.webm`, `.mp3`, `.wav`, `.m4a`, `.ogg` | **10 MB** | Max 120s duration; in-browser `MediaRecorder` with mic permission handling; play/pause waveform preview; retake button. |
| **Image** | `.jpg`, `.jpeg`, `.png`, `.webp` | **5 MB / file** | Max 5 images; thumbnail gallery with individual deletion; format verification. |
| **Video** | `.mp4`, `.webm`, `.mov` | **25 MB** | Max 60s recommended duration; native HTML5 video player preview; remove button. |

---

## 3. Data Model Architecture (`ComplaintAttachment`)
To guarantee backward compatibility with existing image-only complaints while supporting audio and video, a generalized attachment model is introduced:

```python
class AttachmentType(models.TextChoices):
    IMAGE = "IMAGE", "Image"
    AUDIO = "AUDIO", "Audio Recording"
    VIDEO = "VIDEO", "Video Evidence"

class ComplaintAttachment(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="complaint_attachments/%Y/%m/")
    attachment_type = models.CharField(max_length=10, choices=AttachmentType.choices)
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    file_size = models.PositiveIntegerField(help_text="Size in bytes")
    caption = models.CharField(max_length=255, blank=True, default="")
    duration_seconds = models.FloatField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploader = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
```

### Backwards Compatibility
- The existing `ComplaintImage` model and table remain untouched.
- Any image uploaded automatically creates a `ComplaintAttachment(type=IMAGE)` and maintains existing `images` relations.
- Existing frontend clients expecting `complaint.images` receive full compatibility, while new clients access `complaint.attachments`.

---

## 4. Security & Access Control
- **MIME & Extension Validation**: Content-Type header and file extension validated on server; executable files (`.exe`, `.sh`, `.php`, `.py`) strictly rejected.
- **Object-Level Permissions**: Evidence attached to anonymous or citizen complaints is accessible only to:
  1. The citizen owner who filed it.
  2. Authorized municipal officers within the assigned department or superadmins.
  3. Tracking views display sanitized thumbnails without exposing arbitrary server file paths.
