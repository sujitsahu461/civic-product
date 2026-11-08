# CivicSetu: MySQL-to-PostgreSQL 18 Migration Report & Reconciled Verification Ledger

> **Historical Document Notice**: This document serves as the historical record of the complete migration and reconciliation of data from MySQL 8.0 to PostgreSQL 18.0. PostgreSQL is now the sole active application database for CivicSetu.

---

## 1. Executive Summary & Objective

- **Project:** CivicSetu — AI-Powered Civic Grievance Management Platform
- **Primary Objective:** Make PostgreSQL the sole active database, reconcile and verify all application records, preserve physical media, retain integrated AI/ML functionality, and establish automated test parity on Windows.
- **Migration & Reconciliation Status:** **100% COMPLETED AND INDEPENDENTLY VERIFIED**
- **Cutover & Reconciliation Date:** 2026-10-12 / 2026-10-13
- **Primary Database:** PostgreSQL 18.6 (`civicsetu_db` on `127.0.0.1:5432`)
- **Former Source Database:** MySQL 8.0.45 (`civicsetu` on `127.0.0.1:3306`) — preserved intact for historical reference
- **Django Engine:** `django.db.backends.postgresql` via `psycopg2-binary 2.9.12`
- **Data Parity:** 0 orphaned foreign keys; 1,230/1,230 application database records in 100% parity; 9/9 physical media files verified by SHA-256; 221/221 unit tests passing on SQLite, 221/221 tests passing on dedicated PostgreSQL test database.

---

## 2. Environment Specifications

| Component | Legacy Source Environment | Active Target Environment |
|---|---|---|
| **Database System** | MySQL 8.0.45 (Community Server) | PostgreSQL 18.6 (EnterpriseDB x86_64) |
| **Database Name** | `civicsetu` | `civicsetu_db` |
| **Host / Port** | `127.0.0.1:3306` | `127.0.0.1:5432` |
| **Administrative User** | `root` | `postgres` |
| **Python Driver** | `mysqlclient` / `PyMySQL` (Decommissioned) | `psycopg2-binary` 2.9.12 |
| **Django Framework** | Django 6.0.5 on Python 3.14.3 | Django 6.0.5 on Python 3.14.3 |
| **Active Settings** | `config.settings.dev` | `config.settings.dev` |
| **PostgreSQL Test Settings**| N/A | `config.settings.test_postgres` |

---

## 3. Audited Data Reconciliation

An independent non-destructive audit revealed that following an initial 1,170-row cutover on 2026-10-11, additional grievances (complaint ID 38 and ID 39) had been registered with attached evidence images, history transitions, authority notifications, and AI classification records.

A safe, restartable reconciliation plan was executed in topological foreign-key order:
1. `complaints`: Inserted IDs 38 and 39 with public UUID, tracking codes, coordinates, and categories.
2. `complaint_images`: Inserted IDs 32 and 33 linked to complaint ID 39.
3. `complaint_history`: Inserted IDs 121..126 tracking grievance submission, attachments, and resolution.
4. `notifications`: Inserted IDs 345..364 for recipient authorities and citizens.
5. `ai_prediction_logs`: Inserted log ID 19 capturing category confidence, hazard analysis, and department routing.
6. `token_blacklist_outstandingtoken`: Inserted tokens 374..377.
7. **Sequence Synchronization**: All 17 serial sequences were synchronized with `pg_get_serial_sequence` to `MAX(id)` to prevent primary key collisions.

---

## 4. Final Table-by-Table Verification Ledger

| Table Name | MySQL Row Count | PostgreSQL Row Count | Parity Status |
|---|---|---|---|
| `departments` | 7 | 7 | **100% MATCH** |
| `users` | 21 | 21 | **100% MATCH** |
| `department_authorities` | 15 | 15 | **100% MATCH** |
| `complaints` | 38 | 38 | **100% MATCH** |
| `complaint_images` | 33 | 33 | **100% MATCH** |
| `complaint_attachments` | 0 | 0 | **100% MATCH** |
| `complaint_history` | 126 | 126 | **100% MATCH** |
| `notifications` | 364 | 364 | **100% MATCH** |
| `feedback` | 6 | 6 | **100% MATCH** |
| `ai_prediction_logs` | 19 | 19 | **100% MATCH** |
| `audit_logs` | 3 | 3 | **100% MATCH** |
| `token_blacklist_outstandingtoken` | 377 | 377 | **100% MATCH** |
| `token_blacklist_blacklistedtoken` | 125 | 125 | **100% MATCH** |
| `django_session` | 6 | 6 | **100% MATCH** |
| `auth_permission` | 72 | 72 | **100% MATCH** |
| `django_content_type` | 18 | 18 | **100% MATCH** |
| `auth_group` | 0 | 0 | **100% MATCH** |
| `auth_group_permissions` | 0 | 0 | **100% MATCH** |
| `users_groups` | 0 | 0 | **100% MATCH** |
| `users_user_permissions` | 0 | 0 | **100% MATCH** |
| `django_admin_log` | 0 | 0 | **100% MATCH** |
| **Total Application Records** | **1,230** | **1,230** | **100% PARITY** |

---

## 5. Media Verification Ledger

All 9 physical media evidence files (27,960,669 bytes) located under `media/complaint_images/2026/10` have been verified bit-for-bit against SHA-256 hashes:

| Relative Path | Size (Bytes) | SHA-256 Hash | Status |
|---|---|---|---|
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_15_PM.png` | 3,654,345 | `5cf963206f916090e4580f2cd9037fbea6e9f64f0638fa9b15f53c4ea8729455` | **VERIFIED MATCH** |
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_15_PM_OXryd7T.png` | 3,654,345 | `5cf963206f916090e4580f2cd9037fbea6e9f64f0638fa9b15f53c4ea8729455` | **VERIFIED MATCH** |
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_15_PM_XFwfq5c.png` | 3,654,345 | `5cf963206f916090e4580f2cd9037fbea6e9f64f0638fa9b15f53c4ea8729455` | **VERIFIED MATCH** |
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_44_PM.png` | 3,335,616 | `495bfd8ba0d5ce6935e0fefa6c86f447df8200fb619ca442f834a559a7b75cc9` | **VERIFIED MATCH** |
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_44_PM_UD6iedn.png` | 3,335,616 | `495bfd8ba0d5ce6935e0fefa6c86f447df8200fb619ca442f834a559a7b75cc9` | **VERIFIED MATCH** |
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_44_PM_t2evQmi.png` | 3,335,616 | `495bfd8ba0d5ce6935e0fefa6c86f447df8200fb619ca442f834a559a7b75cc9` | **VERIFIED MATCH** |
| `complaint_images/2026/10/test_pothole.jpg` | 825 | `c70ef758da7167bdf1a2be7c4db14beab593eccb4f21042d9e1a663fdd23c641` | **VERIFIED MATCH** |
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_44_PM_iGJYA5V.png` | 3,335,616 | `050720760fe9d9d24660ea9b4999d39c072212f0ff1a9bca1b5bf441adfb4dbd` | **VERIFIED MATCH** |
| `complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_15_PM_a7cUsrO.png` | 3,654,345 | `86cae4905a5a92cf6d8cb47864f7832fb91e0a2e5572a0f5a7751fb4ebaf0733` | **VERIFIED MATCH** |

---

## 6. Verified Backup Archives

Verified, timestamped backups are stored safely outside the git repository at:
`C:\Users\ADMIN\OneDrive\Desktop\civicsetu production\civicsetu_backups_20261012_234030`

Contents verified non-empty:
1. `postgres_civicsetu_db_backup.sql`: 328,318 bytes
2. `mysql_civicsetu_full_backup.sql`: 306,813 bytes
3. `media_backup/`: 9 files (27,960,669 bytes)
4. `backup_manifest.json`: 2,394 bytes
5. `config_backup/`: `.env`, `.env.example`, `requirements.txt`, `config/`
