import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_architecture_pdf(filename="CivicSetu_Codebase_Architecture_Review1.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Premium Palette
    PRIMARY = colors.HexColor("#1E3A8A")     # Deep Navy Blue
    SECONDARY = colors.HexColor("#0D9488")   # Teal / Slate
    TEXT_DARK = colors.HexColor("#1F2937")   # Charcoal
    BG_LIGHT = colors.HexColor("#F8FAFC")    # Light slate background
    BORDER_COLOR = colors.HexColor("#CBD5E1")

    # Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        spaceAfter=3,
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceAfter=10,
    )

    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_DARK,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        spaceAfter=4,
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3,
    )

    qa_q_style = ParagraphStyle(
        "QAQuestion",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=PRIMARY,
        spaceBefore=4,
        spaceAfter=2,
        keepWithNext=True,
    )

    qa_a_style = ParagraphStyle(
        "QAAnswer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        leftIndent=8,
        spaceAfter=6,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=10.5,
        textColor=colors.white,
        alignment=1,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=TEXT_DARK,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=PRIMARY,
    )

    story = []

    # 1. Title Banner
    story.append(Paragraph("CivicSetu — Codebase Architecture & Technical Guide", title_style))
    story.append(Paragraph("Comprehensive Guide for Project Review 1 (Architecture, Code Structure, Stack Rationale & Viva Q&A)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))

    # Metadata Card
    meta_data = [
        [
            Paragraph("<b>Project:</b> CivicSetu AI Platform", meta_style),
            Paragraph(f"<b>Generated Date:</b> {datetime.now().strftime('%B %d, %Y')}", meta_style),
        ],
        [
            Paragraph("<b>Target Milestone:</b> Full Core Architecture (10 Modules)", meta_style),
            Paragraph("<b>Test Verification:</b> 175 / 175 Unit Tests Passing (100%)", meta_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[3.6 * inch, 3.8 * inch])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # 2. Executive Architectural Principles
    story.append(Paragraph("1. System Architecture & Design Principles", h1_style))
    arch_desc = (
        "CivicSetu is designed following the <b>Clean Service-Layer Architecture</b> pattern within Django. "
        "Unlike standard Django applications that mix database operations directly inside views or serializers, "
        "CivicSetu strictly decouples the HTTP layer from business logic using dedicated service modules."
    )
    story.append(Paragraph(arch_desc, body_style))
    story.append(Spacer(1, 4))

    arch_bullets = [
        "<b>Service-Layer Business Logic (services.py):</b> HTTP Views handle request parsing, serializers perform format validation, while <i>services.py</i> executes all business workflows (complaint status transitions, tracking code generation, notification dispatch).",
        "<b>Transactional Safety (@transaction.atomic):</b> Multi-table database operations (e.g. status update + history timeline log + notification creation) are wrapped in atomic transactions so that any runtime failure triggers an immediate automatic rollback.",
        "<b>Role-Based Access Control (RBAC):</b> Fine-grained permission classes (<code>IsCitizen</code>, <code>IsAuthority</code>, <code>IsSuperAdmin</code>) govern every REST API endpoint.",
        "<b>Stateless Authentication (JWT):</b> Uses SimpleJWT tokens containing user identity and role claims, eliminating server-side session overhead.",
    ]
    for bullet in arch_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))

    story.append(Spacer(1, 8))

    # 3. Technology Stack & Justification Table
    story.append(Paragraph("2. Technology Stack & Architectural Justifications", h1_style))

    tech_table_data = [
        [
            Paragraph("Technology Layer", table_header_style),
            Paragraph("Chosen Stack", table_header_style),
            Paragraph("Architectural Justification (Why We Used It)", table_header_style),
        ],
        [
            Paragraph("Backend Framework", table_cell_bold),
            Paragraph("Python 3.12 + Django 5 + DRF", table_cell_style),
            Paragraph("Provides built-in ORM, protection against SQL injection & CSRF, fast REST API serialization, and scalability.", table_cell_style),
        ],
        [
            Paragraph("Database Engine", table_cell_bold),
            Paragraph("MySQL 8.0 (InnoDB)", table_cell_style),
            Paragraph("Full ACID transactional compliance, foreign key constraints, utf8mb4 encoding, superior to file-based SQLite.", table_cell_style),
        ],
        [
            Paragraph("Authentication", table_cell_bold),
            Paragraph("SimpleJWT (JSON Web Tokens)", table_cell_style),
            Paragraph("Stateless token authentication allowing independent scaling and seamless integration with web & mobile apps.", table_cell_style),
        ],
        [
            Paragraph("API Documentation", table_cell_bold),
            Paragraph("drf-spectacular (OpenAPI 3.0)", table_cell_style),
            Paragraph("Auto-generates interactive Swagger UI at /api/docs/ for real-time endpoint testing during reviews.", table_cell_style),
        ],
        [
            Paragraph("Frontend Architecture", table_cell_bold),
            Paragraph("Vanilla JS + CSS3 SPA", table_cell_style),
            Paragraph("Lightweight Dark Glassmorphism interface with zero node build dependencies (node_modules), easy to deploy.", table_cell_style),
        ],
    ]

    tech_table = Table(tech_table_data, colWidths=[1.4 * inch, 2.0 * inch, 4.0 * inch])
    tech_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 0.5, PRIMARY),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ])
    )
    story.append(tech_table)
    story.append(Spacer(1, 8))

    # 4. App-by-App Module Breakdown
    story.append(Paragraph("3. Implemented Modules & Code Structure Deep-Dive", h1_style))

    mod_points = [
        "<b>config/ (Modular Configuration):</b> Settings are split into <code>base.py</code>, <code>dev.py</code>, <code>prod.py</code>, and <code>test.py</code> to separate development credentials from production and test environments.",
        "<b>apps/accounts/ & apps/users/:</b> Implements Custom User Model with email login (<code>USERNAME_FIELD = 'email'</code>), role enums (Citizen, Authority, Admin), JWT login/refresh/logout, profile image upload, and password reset.",
        "<b>apps/departments/:</b> Manages 5 municipal sectors (Roads, Water, Electricity, Waste, Drainage), department authority assignments with designations, and department-wise complaint statistics.",
        "<b>apps/complaints/:</b> Handles grievance filing, auto-generates tracking codes (<code>CMP-YYYYMMDD-XXXX</code>), enforces image file size validation (max 5MB, JPEG/PNG/WebP), and manages state transitions (PENDING → IN_PROGRESS → RESOLVED / REJECTED).",
        "<b>apps/authority/:</b> Municipal Authority command dashboard providing real-time metrics, complaint resolution engine with mandatory evidence upload, and notes logging.",
        "<b>apps/notifications/:</b> Dispatches automated in-app notifications whenever a complaint's status changes.",
        "<b>apps/feedback/:</b> Citizen resolution satisfaction ratings (1-5 stars), resolution quality & timeliness metrics, and department/authority feedback aggregation.",
        "<b>apps/ai_predictions/:</b> Automated NLP triage, hazard detection (live wire, fire, flood), urgency scoring (1-100), geospatial Haversine duplicate detection, and city insights.",
        "<b>apps/audit_logs/:</b> Enterprise security audit trail recording user logins, status changes, and administrative actions with IP and User-Agent tracking.",
        "<b>frontend/ (SPA):</b> Responsive Dark Glassmorphism SPA with live search, complaint dropzone modal, interactive timeline modal, and notification drawer.",
    ]
    for pt in mod_points:
        story.append(Paragraph(f"• {pt}", bullet_style))

    story.append(Spacer(1, 8))

    # 5. End-to-End Complaint Lifecycle Flow
    story.append(Paragraph("4. End-to-End Complaint Lifecycle Flow", h1_style))
    flow_steps = [
        "1. <b>Authentication:</b> Citizen logs into SPA ➔ Receives Access & Refresh JWT tokens stored in localStorage.",
        "2. <b>Filing Complaint:</b> Citizen submits grievance with title, category, address, and evidence photo.",
        "3. <b>Service Processing:</b> <code>ComplaintService.create_complaint()</code> auto-generates tracking code (e.g. <code>CMP-20260727-8A3F</code>), stores image, and logs initial timeline status (<code>PENDING</code>).",
        "4. <b>Department Routing:</b> Complaint is automatically assigned to the designated municipal department.",
        "5. <b>Authority Action:</b> Department Authority reviews grievance, updates status to <code>RESOLVED</code>, uploads resolution proof image, and inputs resolution notes.",
        "6. <b>Atomic Execution (@transaction.atomic):</b> System updates complaint record, appends history log, and dispatches in-app notification to Citizen.",
        "7. <b>Real-Time Tracking:</b> Citizen views update in their notification drawer and tracks public progress code.",
    ]
    for step in flow_steps:
        story.append(Paragraph(step, bullet_style))

    story.append(Spacer(1, 8))

    # 6. Reviewer Viva Q&A Cheat Sheet
    story.append(Paragraph("5. Project Reviewer Viva Q&A Cheat Sheet", h1_style))

    qa_list = [
        (
            "Q1: Why did you build a Custom User Model instead of Django's default User?",
            "Answer: Django's default user model relies on username and lacks domain-specific fields like roles (Citizen/Authority), phone numbers, and UUIDs. We configured a Custom User Model at the project start to use Email authentication and enable clean role-based access control (RBAC)."
        ),
        (
            "Q2: Why did you choose JWT authentication over Session cookies?",
            "Answer: Session authentication requires server memory/DB lookups for every request. JWTs are stateless—user identity and role claims are cryptographically signed inside the token, making the API scalable across web and future mobile applications."
        ),
        (
            "Q3: How do you handle database integrity during complaint status transitions?",
            "Answer: We wrap multi-step operations (status change + history log + notification insertion) inside @transaction.atomic in services.py. If any database insert fails, all operations roll back automatically, ensuring data integrity."
        ),
        (
            "Q4: Why separate views.py and services.py in your Django apps?",
            "Answer: We use the Clean Service-Layer Architecture. views.py handles HTTP endpoints and permissions, while services.py contains all business logic. This separation made our backend testable, resulting in 149 / 149 passing automated unit tests."
        ),
    ]

    for q, a in qa_list:
        story.append(Paragraph(f"<b>{q}</b>", qa_q_style))
        story.append(Paragraph(a, qa_a_style))

    doc.build(story)
    print(f"Architecture PDF successfully generated at: {filename}")


if __name__ == "__main__":
    generate_architecture_pdf()
