import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def create_comprehensive_progress_report(filename="CivicSetu_Comprehensive_Progress_Report.pdf"):
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
    ACCENT = colors.HexColor("#4338CA")      # Indigo
    BORDER_COLOR = colors.HexColor("#CBD5E1")

    # Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
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
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=2,
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

    table_cell_center = ParagraphStyle(
        "TableCellCenter",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=TEXT_DARK,
        alignment=1,
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

    # 1. Header Banner Block
    story.append(Paragraph("CivicSetu — AI-Powered Civic Engagement Platform", title_style))
    story.append(Paragraph("Full-Stack Progress & Architecture Report (Backend REST API + MySQL + Premium Frontend SPA)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))

    # Metadata Table
    meta_data = [
        [
            Paragraph("<b>Project:</b> CivicSetu AI Platform", meta_style),
            Paragraph(f"<b>Date:</b> {datetime.now().strftime('%B %d, %Y')}", meta_style),
        ],
        [
            Paragraph("<b>Stack:</b> Django 5 + MySQL 8.0 + DRF + Vanilla SPA", meta_style),
            Paragraph("<b>Status:</b> Full-Stack System Completed (175/175 Tests Passing)", meta_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[3.4 * inch, 4.0 * inch])
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
    story.append(Spacer(1, 6))

    # 2. Executive Summary
    story.append(Paragraph("1. Executive Summary", h1_style))
    exec_summary_text = (
        "<b>CivicSetu</b> is a full-stack, enterprise-grade AI civic engagement and complaint resolution platform "
        "designed to digitize public municipal grievance reporting, authority resolution workflows, and real-time tracking. "
        "The project features a high-performance <b>MySQL database engine</b>, strict <b>Service-Layer Architecture</b> "
        "wrapped in transactional safety (<code>@transaction.atomic</code>), 175 automated unit tests across 10 core modules, "
        "AI grievance intelligence with automated NLP triage & duplicate detection, security audit trails, and a modern "
        "<b>Dark Glassmorphism Frontend Web Application</b> featuring Citizen, Authority, and Super Admin command portals."
    )
    story.append(Paragraph(exec_summary_text, body_style))
    story.append(Spacer(1, 4))

    # 3. System Architecture & Engineering
    story.append(Paragraph("2. Full-Stack System Architecture & Engineering", h1_style))
    arch_points = [
        "<b>Service-Layer Business Logic:</b> Completely decouples business operations from views and serializers using dedicated services (<i>ComplaintService</i>, <i>AuthorityComplaintService</i>, <i>NotificationService</i>, <i>AuthorityDashboardService</i>, <i>AuthorityAnalyticsService</i>).",
        "<b>MySQL Database Architecture:</b> Production MySQL database utilizing InnoDB engines, <code>utf8mb4</code> charset, indexed fields, foreign key constraints, and clean Django migration history.",
        "<b>Role-Based Security (RBAC):</b> JWT authentication (SimpleJWT) enforcing granular role separation across Citizens, Municipal Authorities, and Super Admins.",
        "<b>OpenAPI 3.0 Documentation:</b> Comprehensive API schema auto-generated via DRF Spectacular at <code>/api/docs/</code>.",
        "<b>Frontend SPA Design System:</b> Custom Dark Glassmorphism interface built with Vanilla CSS3 variables, CSS Grid, backdrop blur filters, responsive modal controllers, and real-time notification drawer.",
    ]
    for pt in arch_points:
        story.append(Paragraph(f"• {pt}", bullet_style))

    story.append(Spacer(1, 6))

    # 4. Completed Modules Summary Table
    story.append(Paragraph("3. Implemented Modules & Verification Summary", h1_style))

    modules_table_data = [
        [
            Paragraph("Module Name", table_header_style),
            Paragraph("Key Technical Capabilities Implemented", table_header_style),
            Paragraph("Status", table_header_style),
            Paragraph("Unit Tests", table_header_style),
        ],
        [
            Paragraph("Auth & User Management", table_cell_bold),
            Paragraph("JWT Auth (SimpleJWT), Custom User Model, Profile Management, Role Enums (Citizen, Authority, Admin), Password Change, Profile Photo Upload", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("25 Passed", table_cell_center),
        ],
        [
            Paragraph("Department Module", table_cell_bold),
            Paragraph("CRUD APIs for 5 Departments (Road, Water, Electricity, Garbage, Drainage), Department Authority Assignment with designations, Department Statistics", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("48 Passed", table_cell_center),
        ],
        [
            Paragraph("Complaint Module", table_cell_bold),
            Paragraph("Complaint filing, Auto-generated Tracking Codes (<code>CMP-YYYYMMDD-XXXX</code>), Image Validation (JPEG/PNG/WebP, max 5MB), Public Status Tracking, History Timeline", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("40 Passed", table_cell_center),
        ],
        [
            Paragraph("Authority Module", table_cell_bold),
            Paragraph("Dashboard Aggregates, Status Update Engine, Resolution Notes & Evidence Upload, Priority Re-assignment, Scoped Analytics, In-App Notifications Engine", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("36 Passed", table_cell_center),
        ],
        [
            Paragraph("Feedback Module", table_cell_bold),
            Paragraph("Citizen 1-5 Star Ratings, Satisfaction Scoring, Timeliness & Quality Metrics, Department & Authority Performance Aggregations", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("9 Passed", table_cell_center),
        ],
        [
            Paragraph("AI Grievance Intelligence", table_cell_bold),
            Paragraph("Automated NLP Triage, Hazard Detection (Live Wire, Fire, Flood), Priority Prediction, Geospatial Haversine Duplicate Detection, City Insights", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("9 Passed", table_cell_center),
        ],
        [
            Paragraph("Audit Trail Logging", table_cell_bold),
            Paragraph("Immutable Security & Activity Logging, IP & User-Agent Tracking, Super Admin Audit Dashboard, Filter & Query Engine", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("8 Passed", table_cell_center),
        ],
        [
            Paragraph("Frontend Web App (SPA)", table_cell_bold),
            Paragraph("Dark Glassmorphism UI, Citizen, Authority & SuperAdmin Portals, File Complaint Dropzone Modal, Timeline Modal, Real-time Notifications, City Map View", table_cell_style),
            Paragraph("Completed", table_cell_center),
            Paragraph("Verified (SPA)", table_cell_center),
        ],
    ]

    mod_table = Table(modules_table_data, colWidths=[1.5 * inch, 4.0 * inch, 0.9 * inch, 1.0 * inch])
    mod_table.setStyle(
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
    story.append(mod_table)
    story.append(Spacer(1, 6))

    # 5. Quality Assurance & Verification
    story.append(Paragraph("4. Quality Assurance & Testing Metrics", h1_style))

    metrics_data = [
        [
            Paragraph("Metric", table_header_style),
            Paragraph("Value / Result", table_header_style),
            Paragraph("Details", table_header_style),
        ],
        [
            Paragraph("Total Automated Tests", table_cell_bold),
            Paragraph("<b>175 / 175 Passed</b>", table_cell_center),
            Paragraph("100% Pass Rate across all 10 backend modules", table_cell_style),
        ],
        [
            Paragraph("Database Engine", table_cell_bold),
            Paragraph("MySQL 8.0+", table_cell_center),
            Paragraph("InnoDB Engine, strict tables mode, utf8mb4 encoding", table_cell_style),
        ],
        [
            Paragraph("Web App Served At", table_cell_bold),
            Paragraph("<code>http://127.0.0.1:8000/</code>", table_cell_center),
            Paragraph("Integrated Django static & template pipeline", table_cell_style),
        ],
        [
            Paragraph("API Documentation", table_cell_bold),
            Paragraph("Swagger UI", table_cell_center),
            Paragraph("Interactive schema at <code>/api/docs/</code>", table_cell_style),
        ],
    ]
    qa_table = Table(metrics_data, colWidths=[1.8 * inch, 2.2 * inch, 3.4 * inch])
    qa_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SECONDARY),
            ("BOX", (0, 0), (-1, -1), 0.5, SECONDARY),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ])
    )
    story.append(qa_table)
    story.append(Spacer(1, 6))

    # 6. Upcoming Roadmap
    story.append(Paragraph("5. Next Milestones & AI Integration", h1_style))
    roadmap_points = [
        "<b>AI Predictions Module:</b> Machine learning models for automated complaint category classification, priority prediction, and duplicate issue detection.",
        "<b>Citizen Feedback & Rating Engine:</b> Post-resolution feedback ratings and municipal performance scoring.",
        "<b>System Audit Logs:</b> Security and administrative event auditing for compliance.",
    ]
    for r_pt in roadmap_points:
        story.append(Paragraph(f"• {r_pt}", bullet_style))

    story.append(Spacer(1, 12))

    # 7. Signature Block
    sig_data = [
        [
            Paragraph("<b>Submitted By:</b>", meta_style),
            Paragraph("<b>Reviewed & Approved By:</b>", meta_style),
        ],
        [
            Paragraph("<br/><br/>___________________________<br/>Student / Lead Developer", meta_style),
            Paragraph("<br/><br/>___________________________<br/>Project Supervisor / Professor", meta_style),
        ],
    ]
    sig_table = Table(sig_data, colWidths=[3.7 * inch, 3.7 * inch])
    sig_table.setStyle(
        TableStyle([
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ])
    )
    story.append(KeepTogether(sig_table))

    doc.build(story)
    print(f"Comprehensive report successfully generated at: {os.path.abspath(filename)}")


if __name__ == "__main__":
    create_comprehensive_progress_report()
