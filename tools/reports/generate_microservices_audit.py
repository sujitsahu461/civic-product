from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs" / "reports" / "CivicSetu_Modular_Monolith_to_Microservices_Audit.pdf"


def paragraph(text, style):
    return Paragraph(text, style)


def build_pdf(filename=OUTPUT):
    filename.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(filename),
        pagesize=letter,
        rightMargin=42,
        leftMargin=42,
        topMargin=42,
        bottomMargin=42,
        title="CivicSetu Modular Monolith to Microservices Architecture Audit",
        author="CivicSetu Engineering Audit",
    )
    styles = getSampleStyleSheet()
    navy = colors.HexColor("#1E3A8A")
    teal = colors.HexColor("#0D9488")
    ink = colors.HexColor("#1F2937")
    pale = colors.HexColor("#F1F5F9")
    border = colors.HexColor("#CBD5E1")

    title = ParagraphStyle(
        "AuditTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=25,
        textColor=navy,
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    subtitle = ParagraphStyle(
        "AuditSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=teal,
        alignment=TA_CENTER,
        spaceAfter=16,
    )
    heading = ParagraphStyle(
        "AuditHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=navy,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )
    body = ParagraphStyle(
        "AuditBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=ink,
        spaceAfter=6,
    )
    bullet = ParagraphStyle(
        "AuditBullet",
        parent=body,
        leftIndent=14,
        firstLineIndent=-8,
        spaceAfter=3,
    )
    cell = ParagraphStyle(
        "AuditCell",
        parent=body,
        fontSize=8,
        leading=10,
        spaceAfter=0,
    )
    cell_bold = ParagraphStyle(
        "AuditCellBold",
        parent=cell,
        fontName="Helvetica-Bold",
        textColor=navy,
    )
    header = ParagraphStyle(
        "AuditHeader",
        parent=cell,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=TA_CENTER,
    )

    story = [
        paragraph("CivicSetu Architecture Audit", title),
        paragraph("Current Modular Monolith and Target Microservices Migration", subtitle),
        paragraph(
            "<b>Audit date:</b> November 9, 2026 &nbsp;&nbsp; "
            "<b>Repository baseline:</b> CivicSetu Django/React project &nbsp;&nbsp; "
            "<b>Validation:</b> 198 Django tests passed",
            body,
        ),
        paragraph(
            "<b>Executive conclusion:</b> CivicSetu is currently a modular monolith, "
            "not a microservices architecture. The nine-service Azure design is a "
            "planned target state; its migration phases have not started.",
            body,
        ),
        paragraph("1. Current Architecture Assessment", heading),
    ]

    current_rows = [
        [paragraph("Area", header), paragraph("Current state", header), paragraph("Assessment", header)],
        [paragraph("Backend", cell_bold), paragraph("One Django + Django REST Framework application", cell), paragraph("Modular monolith", cell)],
        [paragraph("Frontends", cell_bold), paragraph("React web and Expo mobile clients call the same /api/v1/ API", cell), paragraph("Shared API surface", cell)],
        [paragraph("Database", cell_bold), paragraph("Shared relational database with cross-app foreign keys", cell), paragraph("Strong coupling", cell)],
        [paragraph("Deployment", cell_bold), paragraph("One backend deployment", cell), paragraph("Not independently deployable", cell)],
        [paragraph("Communication", cell_bold), paragraph("Synchronous in-process Python calls", cell), paragraph("No broker or event bus", cell)],
        [paragraph("Files", cell_bold), paragraph("Local backend media storage", cell), paragraph("Not horizontally scalable", cell)],
        [paragraph("Notifications", cell_bold), paragraph("Created during request processing", cell), paragraph("No queue/retry system", cell)],
        [paragraph("Gateway/BFF", cell_bold), paragraph("Django URL routing only", cell), paragraph("No implemented gateway or BFF", cell)],
        [paragraph("Infrastructure", cell_bold), paragraph("No Dockerfiles, IaC, or service platform", cell), paragraph("Migration not started", cell)],
    ]
    story.append(Table(current_rows, colWidths=[1.25 * inch, 3.35 * inch, 2.0 * inch], repeatRows=1, style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), navy),
        ("GRID", (0, 0), (-1, -1), 0.4, border),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, pale]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])))

    story.extend([
        paragraph("2. Existing Domain Dependency Map", heading),
        paragraph(
            "<b>Accounts/User</b> is referenced by Departments, Complaints, Notifications, "
            "Feedback and Audit logs. <b>Complaints</b> is referenced by Complaint History, "
            "Complaint Images, Notifications and Feedback. Authority dashboard services "
            "directly query complaint and notification models.",
            body,
        ),
        paragraph("The most important coupling evidence is:", body),
        paragraph("• Complaint directly references users and assigned authorities.", bullet),
        paragraph("• Complaint History imports and references the Complaint model.", bullet),
        paragraph("• Feedback directly references Complaint as a one-to-one relationship.", bullet),
        paragraph("• Notifications directly reference both users and complaints.", bullet),
        paragraph("3. Proposed Service Ownership", heading),
    ])

    ownership_rows = [
        [paragraph("Target service", header), paragraph("Current source modules", header)],
        [paragraph("Identity", cell_bold), paragraph("accounts and user/profile portions of users", cell)],
        [paragraph("Grievance", cell_bold), paragraph("complaints and complaint_history", cell)],
        [paragraph("Department & Routing", cell_bold), paragraph("departments and complaint scoping", cell)],
        [paragraph("Triage", cell_bold), paragraph("Deterministic logic in complaints/services.py", cell)],
        [paragraph("Media", cell_bold), paragraph("complaint_images and upload logic", cell)],
        [paragraph("Notification", cell_bold), paragraph("notifications and notification logic in authority/services.py", cell)],
        [paragraph("Feedback", cell_bold), paragraph("feedback", cell)],
        [paragraph("Reporting", cell_bold), paragraph("Authority and department analytics", cell)],
        [paragraph("Audit", cell_bold), paragraph("audit_logs", cell)],
        [paragraph("Web/Mobile BFF", cell_bold), paragraph("Not implemented", cell)],
    ]
    story.append(Table(ownership_rows, colWidths=[2.0 * inch, 4.6 * inch], repeatRows=1, style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), navy),
        ("GRID", (0, 0), (-1, -1), 0.4, border),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, pale]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])))

    story.extend([
        paragraph("4. Target Azure Architecture", heading),
        paragraph(
            "The target design consists of nine independently deployable domain services "
            "and two BFFs: Identity, Grievance, Department & Routing, Triage, Media, "
            "Notification, Feedback, Reporting, Audit, Web BFF and Mobile BFF.",
            body,
        ),
        paragraph(
            "Planned infrastructure includes Azure Container Apps, PostgreSQL, Service Bus, "
            "Blob Storage, Front Door/WAF, Key Vault, Redis, Application Insights, Log Analytics "
            "and GitHub Actions with OIDC. These are planned components, not current deployments.",
            body,
        ),
        paragraph("5. Database Decomposition Strategy", heading),
        paragraph("• Keep the shared database as the temporary system of record.", bullet),
        paragraph("• Preserve stable public UUIDs and introduce versioned API contracts.", bullet),
        paragraph("• Add an outbox table for reliable event publishing.", bullet),
        paragraph("• Extract services incrementally, beginning with Notification.", bullet),
        paragraph("• Move media to private Blob Storage with signed access URLs.", bullet),
        paragraph("• Progress from shared tables to service-owned schemas and then separate databases where justified.", bullet),
        paragraph("• Extract Identity last because it affects every client and service.", bullet),
        paragraph("6. API and Event Contract Strategy", heading),
        paragraph(
            "Preserve the existing /api/v1/ contract through an anti-corruption layer or BFF. "
            "Use versioned, idempotent events with event_id, event_type, occurred_at, version, "
            "source, entity_id, correlation_id and payload fields.",
            body,
        ),
        paragraph(
            "<b>Recommended events:</b> ComplaintCreated, ComplaintAssigned, ComplaintStatusChanged, "
            "ComplaintResolved, ComplaintRejected, EvidenceUploaded, FeedbackSubmitted, "
            "NotificationRequested and AuditEventRecorded.",
            body,
        ),
        paragraph("7. Phased Migration Roadmap", heading),
    ])

    roadmap_rows = [
        [paragraph("Phase", header), paragraph("Objective", header), paragraph("Status", header)],
        [paragraph("0", cell_bold), paragraph("Baseline audit and contract inventory", cell), paragraph("Completed", cell)],
        [paragraph("1", cell_bold), paragraph("Enforce module boundaries and remove direct cross-domain imports", cell), paragraph("Not started", cell)],
        [paragraph("2", cell_bold), paragraph("Add contracts, UUID references and event/outbox foundation", cell), paragraph("Not started", cell)],
        [paragraph("3", cell_bold), paragraph("Extract Notification service", cell), paragraph("Not started", cell)],
        [paragraph("4", cell_bold), paragraph("Extract Media service and Blob Storage integration", cell), paragraph("Not started", cell)],
        [paragraph("5", cell_bold), paragraph("Extract Feedback, Audit and Reporting", cell), paragraph("Not started", cell)],
        [paragraph("6", cell_bold), paragraph("Extract Department/Routing and Triage", cell), paragraph("Not started", cell)],
        [paragraph("7", cell_bold), paragraph("Extract Grievance service", cell), paragraph("Not started", cell)],
        [paragraph("8", cell_bold), paragraph("Extract Identity service", cell), paragraph("Not started", cell)],
        [paragraph("9-10", cell_bold), paragraph("Implement BFFs, Azure infrastructure, observability, backups and load testing", cell), paragraph("Not started", cell)],
    ]
    story.append(Table(roadmap_rows, colWidths=[0.6 * inch, 4.6 * inch, 1.4 * inch], repeatRows=1, style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), navy),
        ("GRID", (0, 0), (-1, -1), 0.4, border),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, pale]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])))

    story.extend([
        paragraph("8. Key Risks", heading),
        paragraph("• Shared foreign keys prevent independent deployment.", bullet),
        paragraph("• Authority services directly query complaint models, creating high coupling.", bullet),
        paragraph("• Notifications occur inside request flows, complicating retries and failure recovery.", bullet),
        paragraph("• Local media storage prevents reliable multi-instance deployment.", bullet),
        paragraph("• The architecture documentation contains merge-conflict markers and should be cleaned.", bullet),
        paragraph("• The deployment guide still describes a unified Django deployment.", bullet),
        paragraph("9. Final Recommendation", heading),
        paragraph(
            "Do not begin by creating nine separate Django projects. Start by enforcing internal "
            "domain boundaries and introducing contracts/events while preserving the working monolith. "
            "Then extract Notification as the first independently deployable service.",
            body,
        ),
        Spacer(1, 12),
        paragraph(
            f"Generated from the verified repository baseline on {datetime.now().strftime('%B %d, %Y')}.",
            ParagraphStyle("FooterNote", parent=body, fontSize=8, textColor=colors.HexColor("#64748B")),
        ),
    ])

    document.build(story)
    return filename


if __name__ == "__main__":
    print(build_pdf())
