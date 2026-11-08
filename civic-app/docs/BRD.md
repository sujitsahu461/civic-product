# CIVIC — Business Requirements Document (BRD)

> Exported from the live Claude Doc on 2026-11-06: https://claude.ai/artifact/Rm5Sa1pajnAkoeAaM4gQUT. Edit there, then re-export.

Nov 6, 2026 · @Sujit

## Executive summary

Gunupur Municipality should adopt CIVIC as its single digital channel for citizen grievances, so every complaint gets an owner, a status and a deadline that the municipality can measure.

Today complaints arrive by phone, letter and walk-in. Nobody can say how many are open, which department holds them, or how long they take. Citizens get no reference number and stop reporting.

CIVIC, built on the CivicSetu platform, gives citizens a phone app to report with a photo and GPS location, routes each complaint to the right department automatically, and shows its progress publicly by tracking code. Officers work from a department queue. Management gets the data to hold departments to service levels.

**The ask.** Approve phase 2 (connecting the app to the CivicSetu Django backend), a pilot with two departments, and the officer accounts and SMS gateway the pilot needs.

## Current state and business problem

Grievance handling today is manual and invisible: complaints are not logged in one place, so they cannot be counted, routed or followed up.

| Pain point today | Effect on citizens | Effect on the municipality |
| --- | --- | --- |
| Complaints arrive by phone, letter or in person | Must travel or call during office hours | Staff time spent taking down details by hand |
| No reference number | Cannot follow up or prove they reported | Same issue reported many times, counted many times |
| Routing by word of mouth | Issue sits with the wrong desk | Departments dispute ownership |
| No photo or exact location | Have to explain the place again and again | Inspectors spend trips finding the site |
| No status updates | Assume nothing is happening | Repeat calls and public frustration |
| No data | No way to see if service improves | Cannot set or enforce service levels |

CIVIC accepts nine categories: roads, garbage, water, streetlights, sewage, parks, noise and air, public safety, and an "other services" catch-all.

## Business objectives and KPIs

Five objectives, each with one KPI the municipality can read from CIVIC's own data. Targets are proposed for the first 12 months and should be confirmed after the pilot sets a baseline.

| ID | Objective | KPI | Proposed target |
| --- | --- | --- | --- |
| BO-1 | Make reporting easy for every resident | Share of grievances received through CIVIC instead of phone or walk-in | 60% |
| BO-2 | Route every complaint to an accountable department | Complaints with a department assigned at creation | 100% |
| BO-3 | Resolve issues faster | Median days from report to Resolved | Under 7 days |
| BO-4 | Build public trust through transparency | Mean citizen rating on resolved complaints | 4.0 of 5 |
| BO-5 | Manage departments with data | Departments reviewed monthly against an agreed SLA | All departments |

BO-1 needs a count of non-digital complaints for comparison; the grievance cell should keep a simple manual tally during the pilot.

## Stakeholders

The municipality owns the service; departments own the work; citizens are the customers.

| Stakeholder | Interest | Responsibility in this project | Sign-off needed |
| --- | --- | --- | --- |
| Municipal Commissioner / Executive Officer, Gunupur | Visible, accountable service | Business sponsor; approves scope and budget | Yes |
| Civic Grievance Redressal Cell | Fewer manual complaints, clear queues | Day-to-day owner; triages "other" complaints; runs reports | Yes |
| Public Works Department (PWD) | Roads and pavements | Works its queue; sets its SLA | Pilot |
| Sanitation Wing | Garbage and sanitation | Works its queue; sets its SLA | Pilot |
| PHED (water supply) | Leaks and supply | Works its queue; sets its SLA | Launch |
| Electrical and Streetlights Wing | Streetlights and power | Works its queue; sets its SLA | Launch |
| Other departments (drainage, horticulture, pollution, safety) | Their categories | Work their queues | Launch |
| Citizens of Gunupur, including GIET University students | Easy reporting, visible progress | Use the app; give feedback | Pilot survey |
| CivicSetu product and engineering team | A working, adopted platform | Build, host and support CIVIC and the Django API | Yes |
| Rayagada district IT / NIC | Security and data policy | Reviews hosting, data protection and SMS gateway | Yes |

## Business requirements

Fourteen requirements, eight of them Must. Each traces to an objective above; the product requirements (PRD) turn them into features.

| ID | Requirement | Supports | Priority |
| --- | --- | --- | --- |
| BR-01 | Citizens can report a civic issue from a phone, with or without registering | BO-1 | Must |
| BR-02 | Every complaint is assigned to one department when it is filed | BO-2 | Must |
| BR-03 | Every complaint gets a unique tracking code the citizen can quote | BO-2, BO-4 | Must |
| BR-04 | Anyone can check status by tracking code without seeing who reported it | BO-4 | Must |
| BR-05 | Citizens are told about every status change | BO-4 | Must |
| BR-06 | Officers see and update only their own department's complaints | BO-2 | Must |
| BR-07 | Reporting works on weak or no network, and no report is lost | BO-1 | Must |
| BR-08 | Personal data is handled under the Digital Personal Data Protection Act, 2023: consent, minimum data, limited retention | Compliance | Must |
| BR-09 | The grievance cell sees all complaints and can reassign wrongly routed ones | BO-2 | Should |
| BR-10 | Each department has a resolution SLA, and overdue complaints are flagged | BO-3, BO-5 | Should |
| BR-11 | Citizens can rate the resolution, and ratings are reported by department | BO-4 | Should |
| BR-12 | Monthly report by department: volume, median resolution time, overdue count, rating | BO-5 | Should |
| BR-13 | The app is available in Odia as well as English | BO-1 | Could |
| BR-14 | Repeat reports of the same issue are merged and counted | BO-2 | Could |

BR-09, BR-10 and BR-12 have no screens in the current prototype; they need an officer back-office in a later phase.

## Scope, assumptions and constraints

The project covers citizen grievances in Gunupur municipality only, delivered on the web and Android.

**In scope**

- Citizen and guest reporting, tracking, notifications and feedback
- Officer department queue and status updates
- Public tracking by code
- Web app (installable PWA) and Android app
- Integration with the CivicSetu Django backend

**Out of scope**

- Other municipal services (tax, licences, certificates, payments)
- Other municipalities and the district administration
- AI-based classification (deferred)
- Integration with state portals such as CPGRAMS or Odisha's grievance systems (later phase)

**Assumptions**

- Most residents who report have an Android smartphone with mobile data at least some of the time.
- Each department will name one officer accountable for its queue.
- The CivicSetu Django API will be hosted on a reachable HTTPS endpoint before the pilot.
- An SMS gateway can deliver OTPs reliably across Gunupur.

**Constraints**

- Personal data must stay in India and follow the DPDP Act, 2023.
- Photos must be 5 MB or less (backend limit) to keep uploads workable on 3G.
- The client never creates authoritative complaint records; only the server issues IDs and tracking codes.
- No budget or headcount has been confirmed yet.

## Cost, benefits and risks

Running costs are small (hosting, SMS, app store); the main cost is officer time to adopt a new way of working. No figures have been estimated yet.

**Cost items to estimate**

| Item | Type | Driver |
| --- | --- | --- |
| Cloud hosting for the web app and Django API, in an Indian region | Recurring | Users and stored photos |
| Database and photo storage with backups | Recurring | Complaints per month and photo size |
| SMS gateway for OTP | Recurring | Sign-ins per month |
| Google Play developer account and Expo/EAS build service | One-off plus recurring | Releases |
| Officer training and change management | One-off | Number of officers |
| Support and maintenance | Recurring | Bug fixes, upgrades |

**Benefits**

- Fewer phone calls and walk-ins for status, freeing grievance-cell staff time.
- Faster site visits, because every complaint carries a photo and GPS pin.
- Less duplicate work: one tracking code per issue instead of many verbal reports.
- Evidence for budgeting: complaint volumes by category and ward show where money is needed.
- Public trust: visible progress and citizen ratings.

**Risks**

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Officers keep working from paper and ignore the queue | Medium | High | Commissioner mandate; monthly SLA review per department |
| Low citizen adoption | Medium | High | Guest reporting with no sign-up; posters with QR codes at ward offices and GIET |
| Backend not ready for the pilot | Medium | High | Phase gate: no pilot until live API tests pass on staging |
| Personal data breach | Low | High | Server-side access control, HTTPS, data stored in India, security review by district IT |
| SMS delivery failures in rural pockets | Medium | Medium | Guest mode; OTP retry; biometric sign-in on return visits |
| Fake or abusive reports | Medium | Low | Rate limits per phone and device; officers can reject with a reason |

## Governance, sign-off and next steps

The Commissioner sponsors the project; a monthly steering review checks KPIs and phase gates. Four approvals are needed before phase 2 starts.

| Approver | Approves | Status |
| --- | --- | --- |
| Municipal Commissioner / Executive Officer | Scope, pilot departments, budget | Pending |
| Head, Civic Grievance Redressal Cell | Business requirements and KPIs | Pending |
| District IT / NIC | Hosting, data protection, SMS gateway | Pending |
| CivicSetu product lead | Delivery plan and phase gates | Pending |

**Next steps**

- [ ] Confirm the two pilot departments (PWD and Sanitation proposed)
- [ ] Name one accountable officer per pilot department
- [ ] Stand up a staging Django API with test accounts
- [ ] Choose an SMS gateway and confirm OTP costs
- [ ] Agree a resolution SLA per pilot department
- [ ] Set the pilot start date and baseline the manual complaint count
