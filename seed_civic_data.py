import os
import random
from datetime import timedelta
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.complaints.models import Complaint, ComplaintCategory, ComplaintStatus, ComplaintPriority
from apps.departments.models import Department
from apps.audit_logs.models import AuditLog, AuditAction

def seed():
    print("Seeding civic complaints and audit logs...")
    
    # 1. Fetch reference users
    citizens = list(User.objects.filter(role=UserRole.CITIZEN))
    authorities = list(User.objects.filter(role=UserRole.AUTHORITY))
    superadmins = list(User.objects.filter(role=UserRole.SUPER_ADMIN))
    
    if not citizens:
        print("Creating default citizen...")
        c = User.objects.create_user(
            email='citizen@civicsetu.gov.in',
            password='Citizen@12345',
            full_name='Aarav Sharma',
            role=UserRole.CITIZEN,
            phone='9876543210'
        )
        citizens = [c]
        
    if not authorities:
        print("Creating default authority...")
        a = User.objects.create_user(
            email='officer@civicsetu.gov.in',
            password='Officer@12345',
            full_name='Er. Rajesh Verma',
            role=UserRole.AUTHORITY,
            phone='9876543211',
            department='Road'
        )
        authorities = [a]

    # Additional citizens for realism
    extra_citizens_data = [
        ('priya.citizen@civicsetu.local', 'Priya Nair', '9812345671', 'Bhubaneswar'),
        ('amit.citizen@civicsetu.local', 'Amit Mohapatra', '9812345672', 'Cuttack'),
        ('sunita.citizen@civicsetu.local', 'Sunita Swain', '9812345673', 'Sambalpur'),
        ('rahul.citizen@civicsetu.local', 'Rahul Behera', '9812345674', 'Rourkela'),
        ('ananya.citizen@civicsetu.local', 'Ananya Das', '9812345675', 'Bargarh'),
    ]
    for email, name, phone, city in extra_citizens_data:
        if not User.objects.filter(email=email).exists():
            u = User.objects.create_user(
                email=email,
                password='Citizen@12345',
                full_name=name,
                role=UserRole.CITIZEN,
                phone=phone,
                address=f"{city}, Odisha"
            )
            citizens.append(u)

    # 2. Seed realistic complaints
    complaints_data = [
        # Road & Infrastructure
        ("Deep potholes after monsoon rain near VSS Stadium", "Heavy water logging and 2ft deep potholes causing severe vehicle damage and traffic bottleneck.", ComplaintCategory.ROAD, ComplaintPriority.HIGH, ComplaintStatus.RESOLVED, "Main Gate, VSS Stadium, Sambalpur", "Road repairs executed with bitumen hot mix. Inspected and approved.", 22, 18),
        ("Broken culvert bridge railing on Ring Road", "Damaged guard railing exposes commuters to canal edge hazard.", ComplaintCategory.ROAD, ComplaintPriority.URGENT, ComplaintStatus.IN_PROGRESS, "Ring Road, Ward 12, Cuttack", "Temporary barricading installed. Pre-cast RCC repair work order issued.", 14, None),
        ("Sunken road manhole cover causing accidents", "Manhole cover is 6 inches below asphalt grade on arterial road.", ComplaintCategory.ROAD, ComplaintPriority.HIGH, ComplaintStatus.ASSIGNED, "Uditnagar Main Road, Rourkela", "", 8, None),
        ("Crumbling pedestrian sidewalk on MG Avenue", "Paver blocks displaced by tree roots, causing tripping hazard for elderly citizens.", ComplaintCategory.ROAD, ComplaintPriority.MEDIUM, ComplaintStatus.PENDING, "MG Avenue, Ward 4, Bhubaneswar", "", 3, None),
        ("Damaged speed breaker near DAV Public School", "Unmarked irregular speed bump causing two-wheeler skidding.", ComplaintCategory.ROAD, ComplaintPriority.HIGH, ComplaintStatus.RESOLVED, "School Road, Sambalpur", "Repainted with reflective thermoplastic markings and leveled.", 28, 25),

        # Water Supply
        ("Underground water distribution pipeline leakage", "Continuous high-pressure drinking water leakage flooding street since 24 hours.", ComplaintCategory.WATER, ComplaintPriority.URGENT, ComplaintStatus.RESOLVED, "Sector 4 Market Complex, Rourkela", "Defective 100mm PVC joint replaced and pressure restored.", 19, 17),
        ("Low water pressure during morning municipal supply", "Residents from 2nd floor and above receiving zero municipal tap flow.", ComplaintCategory.WATER, ComplaintPriority.MEDIUM, ComplaintStatus.IN_PROGRESS, "Badambadi Colony, Cuttack", "Booster pump maintenance underway at Sector pump house.", 11, None),
        ("Turbid brownish water supply in Ward 7", "Tap water contains suspended sediments and odor.", ComplaintCategory.WATER, ComplaintPriority.HIGH, ComplaintStatus.RESOLVED, "Khetrajpur Area, Sambalpur", "Sedimentation tank desilted, chlorination dosage recalibrated. Sample cleared laboratory test.", 25, 23),
        ("Broken public water standpost tap wasting drinking water", "Brass tap valve sheared off at community point.", ComplaintCategory.WATER, ComplaintPriority.LOW, ComplaintStatus.PENDING, "Bargarh Bus Stand Road, Bargarh", "", 2, None),

        # Garbage & Waste
        ("Overflowing community garbage dump near primary health centre", "Solid municipal waste scattered outside bins, generating foul odor and stray animals.", ComplaintCategory.GARBAGE, ComplaintPriority.URGENT, ComplaintStatus.RESOLVED, "Near PHC, Civil Township, Rourkela", "Special clearance tractor dispatched. Disinfected with bleaching powder. Twin 1100L HDPE bins placed.", 16, 15),
        ("Irregular door-to-door waste collection vehicle", "Compactor truck has missed scheduled collection for 4 consecutive days.", ComplaintCategory.GARBAGE, ComplaintPriority.MEDIUM, ComplaintStatus.IN_PROGRESS, "Sailashree Vihar, Bhubaneswar", "Route driver reassigned; backlog pickup executed.", 9, None),
        ("Illegal commercial plastic dumping along canal bank", "Commercial packaging waste dumped unlawfully overnight.", ComplaintCategory.GARBAGE, ComplaintPriority.HIGH, ComplaintStatus.ASSIGNED, "Taldanda Canal Road, Cuttack", "", 5, None),
        ("Construction debris blocking rainwater gutter", "Building rubble dumped onto open stormwater drain by private contractor.", ComplaintCategory.GARBAGE, ComplaintPriority.HIGH, ComplaintStatus.RESOLVED, "Budharaja Hill Road, Sambalpur", "Debris cleared with JCB. Municipal fine notice served on property owner.", 29, 27),

        # Electricity & Street Lights
        ("Non-functioning LED street lights across entire lane", "12 consecutive street poles dark for past week, raising security concern.", ComplaintCategory.ELECTRICITY, ComplaintPriority.HIGH, ComplaintStatus.RESOLVED, "Lane 3, Chhend Colony, Rourkela", "Phase wire junction box repaired and 8 LED luminaires replaced.", 21, 20),
        ("Low-hanging electrical cable over public road", "Loose HT overhead wire hanging dangerously close to truck traffic.", ComplaintCategory.ELECTRICITY, ComplaintPriority.URGENT, ComplaintStatus.RESOLVED, "Modipara Chowk, Sambalpur", "Emergency lineman team restaged and tensioned the overhead line.", 12, 11),
        ("Flickering high-mast lighting tower at main roundabout", "Intermittent power surge causing high mast to trip repeatedly.", ComplaintCategory.ELECTRICITY, ComplaintPriority.MEDIUM, ComplaintStatus.IN_PROGRESS, "Madhupatna Square, Cuttack", "Timer relay and control panel ballast undergoing replacement.", 7, None),
        ("Exposed electrical wiring at base of utility pole", "Open service wire near footpath without protective conduit.", ComplaintCategory.ELECTRICITY, ComplaintPriority.HIGH, ComplaintStatus.ASSIGNED, "Janpath, Ward 15, Bhubaneswar", "", 4, None),

        # Drainage & Sewage
        ("Clogged stormwater drain leading to street inundation", "Monsoon drain choked with silt and polythene; 10 houses experiencing backflow.", ComplaintCategory.DRAINAGE, ComplaintPriority.URGENT, ComplaintStatus.RESOLVED, "Dhanupali Ward 6, Sambalpur", "Suction jetting machine cleared 40 meters of blocked concrete pipe.", 24, 22),
        ("Damaged concrete slab on open municipal drain", "Broken top cover exposes deep stormwater sewer on school walking route.", ComplaintCategory.DRAINAGE, ComplaintPriority.HIGH, ComplaintStatus.IN_PROGRESS, "Koel Nagar, Rourkela", "Heavy duty RCC slab cast; curing completed, installation scheduled.", 10, None),
        ("Sewage line overflow into residential colony road", "Manhole overflowing with foul sewage liquid during peak morning hours.", ComplaintCategory.DRAINAGE, ComplaintPriority.URGENT, ComplaintStatus.RESOLVED, "Buxi Bazaar, Cuttack", "Super suction machine deployed. Blockage dislodged.", 17, 16),
        ("Stagnant water ponding due to improper drain slope", "Rainwater remains trapped in roadside hollow for over 72 hours.", ComplaintCategory.DRAINAGE, ComplaintPriority.LOW, ComplaintStatus.PENDING, "Patia Ward 10, Bhubaneswar", "", 1, None),
    ]

    now = timezone.now()
    created_count = 0
    for title, desc, cat, prio, stat, loc, notes, days_ago, res_days_ago in complaints_data:
        c_user = random.choice(citizens)
        a_user = random.choice(authorities) if stat != ComplaintStatus.PENDING else None
        
        # Check if identical title already exists
        if Complaint.objects.filter(title=title).exists():
            continue

        cmp = Complaint.objects.create(
            citizen=c_user,
            assigned_authority=a_user,
            category=cat,
            priority=prio,
            status=stat,
            title=title,
            description=desc,
            location_address=loc,
            latitude=21.4669 + (random.random() - 0.5) * 0.5,
            longitude=83.9812 + (random.random() - 0.5) * 0.5,
            resolution_notes=notes,
            resolved_at=(now - timedelta(days=res_days_ago)) if res_days_ago is not None else None,
        )
        created_time = now - timedelta(days=days_ago)
        Complaint.objects.filter(pk=cmp.pk).update(created_at=created_time)
        created_count += 1

    print(f"Created {created_count} realistic complaints. Total complaints in DB: {Complaint.objects.count()}")

    # 3. Seed realistic Audit Logs
    audit_data = [
        ("superadmin", "superadmin@civicsetu.gov.in", "SUPER_ADMIN", AuditAction.AUTH_LOGIN, "Session", "SES-9821", "192.168.1.42", "Super Admin logged into Platform Governance Console", 1),
        ("superadmin", "superadmin@civicsetu.gov.in", "SUPER_ADMIN", AuditAction.DEPARTMENT_UPDATED, "Department", "DEP-ROAD", "192.168.1.42", "Updated category SLA threshold for Roads & Infrastructure (24 hrs)", 2),
        ("officer@civicsetu.gov.in", "officer@civicsetu.gov.in", "AUTHORITY", AuditAction.COMPLAINT_STATUS_UPDATE, "Complaint", "CMP-20260920-ROA1", "10.0.1.18", "Changed status from IN_PROGRESS to RESOLVED with verification notes", 3),
        ("system", "system@civicsetu.internal", "SYSTEM", AuditAction.AI_TRIAGE_RUN, "AIModel", "TRIAGE-NLP-V2", "127.0.0.1", "Automated grievance categorization completed: 96.2% confidence", 4),
        ("superadmin", "superadmin@civicsetu.gov.in", "SUPER_ADMIN", AuditAction.AUTH_REGISTER, "User", "USR-0042", "192.168.1.42", "Provisioned Nodal Officer account: Er. Rajesh Verma (Roads & Infra)", 6),
        ("officer@civicsetu.gov.in", "officer@civicsetu.gov.in", "AUTHORITY", AuditAction.COMPLAINT_PRIORITY_UPDATE, "Complaint", "CMP-20260918-ELE2", "10.0.1.18", "Escalated priority to URGENT due to safety hazard report", 8),
        ("system", "system@civicsetu.internal", "SYSTEM", AuditAction.SYSTEM_EVENT, "BackupService", "BAK-20260922", "127.0.0.1", "Automated daily platform database & image snapshot archived", 10),
        ("citizen@civicsetu.gov.in", "citizen@civicsetu.gov.in", "CITIZEN", AuditAction.COMPLAINT_CREATED, "Complaint", "CMP-20260914-WAT1", "103.24.88.12", "Citizen filed grievance: Underground water pipeline leakage", 14),
        ("superadmin", "superadmin@civicsetu.gov.in", "SUPER_ADMIN", AuditAction.AUTHORITY_ASSIGNED, "Department", "DEP-DRAIN", "192.168.1.42", "Assigned Nodal Officer to Drainage & Sewage Department", 16),
        ("system", "system@civicsetu.internal", "SYSTEM", AuditAction.AI_TRIAGE_RUN, "AIInsight", "HAZARD-SCAN-01", "127.0.0.1", "City-wide hazard scanning: Identified 3 high-priority electrical hotspots", 18),
    ]

    log_count = 0
    for actor_name, email, role, action, etype, eid, ip, details, days_ago in audit_data:
        log_time = now - timedelta(days=days_ago)
        al = AuditLog.objects.create(
            actor_email=email,
            actor_role=role,
            action=action,
            entity_type=etype,
            entity_id=eid,
            ip_address=ip,
            metadata={"details": details, "actor_name": actor_name},
        )
        AuditLog.objects.filter(pk=al.pk).update(created_at=log_time)
        log_count += 1

    print(f"Created {log_count} realistic audit logs. Total audit logs in DB: {AuditLog.objects.count()}")
    print("Seeding complete!")

if __name__ == '__main__':
    seed()
