# CivicSetu — Local Website and Mobile App Synchronization Handoff

> **Status:** SOURCE VERIFIED & LOCALLY REQUEST-TESTED  
> **Target Environment:** Local Development (Single Host Machine, No Cloud Deployment)  
> **Last Updated:** 2026-10-14  
> **Workspace Path:** `C:\Users\ADMIN\OneDrive\Desktop\civicsetu production\-CivicSetu-AI-Powered-Civic-Engagement-Platform`

---

## 1. Executive Summary & Architecture Overview

CivicSetu operates as a unified platform where two distinct frontends interact with a single running Django REST Framework backend and read/write to the exact same local PostgreSQL database:

```
┌────────────────────────────────────────────────────────┐   ┌────────────────────────────────────────────────────────┐
│             Desktop Web Frontend (Antigravity)         │   │             Mobile App (VS Code / Expo)                │
│    React 19 + Vite + TypeScript (port 5173 or 8000)    │   │         React Native + Expo + TypeScript + SQLite      │
└───────────────────────────┬────────────────────────────┘   └───────────────────────────┬────────────────────────────┘
                            │                                                            │
                            │ Relative `/api/v1` (Vite Proxy or Same-Origin)             │ `EXPO_PUBLIC_CIVICSETU_API_URL`
                            ▼                                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       CivicSetu Django Backend Service                                              │
│                                  Django 6.0 REST Framework (Python 3.14.3)                                          │
│                                    Listening on 0.0.0.0:8000 (All Interfaces)                                       │
│                                              Base API: `/api/v1/`                                                   │
└──────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           Local PostgreSQL 18.6 Database                                            │
│                                `civicsetu_db` on 127.0.0.1:5432 (User: postgres)                                    │
│                              100% Shared Source of Truth for Both Web and Mobile Clients                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Both clients share the exact same database records. A grievance lodged via the React Native mobile app is immediately queryable and actionable on the React web portal, and changes made by authorities on the web portal reflect immediately in the mobile app.

---

## 2. Local Discovery & Verified URL Matrix

| Component | Setting / File | Verified Value | Runtime Status |
|---|---|---|---|
| **Django Backend Root** | Project root | `.../-CivicSetu-AI-Powered-Civic-Engagement-Platform` | Verified |
| **Django Entrypoint** | `manage.py` | Present in project root | Verified |
| **Django Settings Module** | `.env` / `config/settings/dev.py` | `config.settings.dev` | Verified |
| **Django Bind Address** | CLI Command | `0.0.0.0:8000` (Accessible to LAN & Emulators) | **ONLINE (HTTP 200)** |
| **Local API Prefix** | `config/urls.py` | `/api/v1/` | **ONLINE (HTTP 200)** |
| **Database Engine** | `.env` (`DB_ENGINE`) | `django.db.backends.postgresql` | Verified |
| **Database Name** | `.env` (`DB_NAME`) | `civicsetu_db` (PostgreSQL 18.6, port 5432) | Verified Live |
| **Web Frontend Root** | `frontend/` | `.../frontend/` | Verified |
| **Web Dev Server** | `frontend/package.json` | `npm run dev` (Vite 8.2) | **ONLINE (Port 5173)** |
| **Web Dev URL** | `frontend/vite.config.js` | `http://localhost:5173/` | **ONLINE (HTTP 200)** |
| **Web Integrated URL** | Django `TemplateView` | `http://127.0.0.1:8000/` | **ONLINE (HTTP 200)** |
| **Web API Target** | `frontend/src/services/api.ts` | Relative: `/api/v1` (Proxied via Vite to 8000) | Verified |
| **Host Machine Wi-Fi IP** | Windows `Get-NetIPAddress` | `172.35.0.20` | Verified on Host |
| **Android Emulator Target** | Standard Android Studio | `http://10.0.2.2:8000/api/v1` | Documented Below |
| **Physical Phone Target** | Wi-Fi LAN Address | `http://172.35.0.20:8000/api/v1` | Tested via LAN |
| **Mobile Environment Var** | Mobile Expo Configuration | `EXPO_PUBLIC_CIVICSETU_API_URL` | Documented Below |

---

## 3. Localhost Networking Disambiguation

Connecting mobile clients to a local development machine requires understanding network routing:

### A. Desktop Website (`localhost` / `127.0.0.1`)
- The browser and Django run on the same physical operating system.
- `http://localhost:5173` uses Vite's built-in development proxy (`frontend/vite.config.js`) to route `/api/*` and `/media/*` requests directly to `http://127.0.0.1:8000`.
- In integrated mode, Django serves both HTML and API from `http://127.0.0.1:8000`.

### B. Standard Android Emulator (`10.0.2.2`)
- **Crucial Rule:** Inside an Android emulator, `localhost` (or `127.0.0.1`) refers to the **emulator itself**, not your development PC.
- Android Studio provides a special alias: `10.0.2.2` routes directly to the host computer's loopback interface.
- **Target URL:** `http://10.0.2.2:8000/api/v1` (or `http://10.0.2.2:8000` if the mobile client appends `/api/v1`).

### C. Physical Android Phone (Host LAN IPv4)
- A physical phone connected to the same Wi-Fi network cannot resolve `localhost` or `10.0.2.2`.
- It must communicate directly with your computer's private LAN IPv4 address.
- **Current Verified Host IP:** `172.35.0.20`
- **Target URL:** `http://172.35.0.20:8000/api/v1`
- **Requirements for Physical Phone Testing:**
  1. Phone and PC must be on the **same Wi-Fi network**.
  2. Django must be started listening on all interfaces: `python manage.py runserver 0.0.0.0:8000` (already active).
  3. Windows Firewall must allow inbound connections on port 8000 (run in Admin PowerShell if needed):
     ```powershell
     New-NetFirewallRule -DisplayName "Django CivicSetu Dev 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
     ```
  4. Test phone browser reachability by opening `http://172.35.0.20:8000/api/v1/auth/captcha/` in Chrome on the phone. You should receive a JSON response with `"captcha_key"`.

> [!WARNING]
> Never commit a private LAN address (e.g. `172.35.0.20` or `192.168.x.x`) into production configuration or public git repositories. Use local `.env` files.

---

## 4. Verified Backend API Contract

Every endpoint below is **SOURCE VERIFIED** in `config/urls.py` and the respective Django apps. Key endpoints have also been **LOCALLY REQUEST-TESTED** against the active PostgreSQL database.

### Core Enums & Data Types

#### Complaint Status (`ComplaintStatus`)
- `PENDING`: Initial state upon submission
- `ASSIGNED`: Department authority has been assigned
- `IN_PROGRESS`: Work is actively underway
- `RESOLVED`: Redressal completed by authority (requires resolution notes)
- `REJECTED`: Complaint rejected with reason
- `CLOSED`: Redressal accepted and closed

#### Complaint Priority (`ComplaintPriority`)
- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

#### Civic Categories (`ComplaintCategory`)
- `ROAD` (Road & Infrastructure)
- `WATER` (Water Supply)
- `ELECTRICITY` (Electricity)
- `GARBAGE` (Garbage & Waste)
- `DRAINAGE` (Drainage & Sewage)
- `SANITATION` (Sanitation & Hygiene)
- `STREET_LIGHT` (Street Light)
- `PARKS` (Parks & Public Spaces)
- `NOISE` (Noise Pollution)
- `OTHER` (Other Civic Issues)

#### Attachment Types (`AttachmentType`)
- `IMAGE` (JPEG/PNG/WebP, max 5 MB)
- `AUDIO` (Audio recording, max 10 MB)
- `VIDEO` (Video evidence, max 25 MB)

---

### Endpoint Reference Table

| Capability | Method | Relative Route | Auth Requirement | Content-Type | Status |
|---|---|---|---|---|---|
| **CAPTCHA Challenge** | `GET` | `/api/v1/auth/captcha/` | AllowAny (Public) | None | **REQUEST-TESTED (200)** |
| **Citizen Register** | `POST` | `/api/v1/auth/register/` | AllowAny (Public) | `application/json` | **SOURCE VERIFIED** |
| **Citizen / User Login** | `POST` | `/api/v1/auth/login/` | AllowAny (Public) | `application/json` | **SOURCE VERIFIED** |
| **Token Refresh** | `POST` | `/api/v1/auth/refresh/` | AllowAny (Public) | `application/json` | **SOURCE VERIFIED** |
| **User Logout** | `POST` | `/api/v1/auth/logout/` | `Bearer <token>` | `application/json` | **SOURCE VERIFIED** |
| **Current User (`me`)** | `GET` | `/api/v1/auth/me/` | `Bearer <token>` | None | **SOURCE VERIFIED** |
| **Citizen Profile** | `GET` | `/api/v1/users/profile/citizen/` | `Bearer <token>` (Citizen) | None | **SOURCE VERIFIED** |
| **Update Profile** | `PUT`/`PATCH` | `/api/v1/users/profile/update/` | `Bearer <token>` | `application/json` | **SOURCE VERIFIED** |
| **Upload Avatar** | `POST` | `/api/v1/users/profile/upload-image/` | `Bearer <token>` | `multipart/form-data` | **SOURCE VERIFIED** |
| **List My Complaints** | `GET` | `/api/v1/complaints/` | `Bearer <token>` | None | **SOURCE VERIFIED** |
| **File Complaint** | `POST` | `/api/v1/complaints/create/` | `Bearer <token>` / AllowAny | `multipart/form-data` or JSON | **SOURCE VERIFIED** |
| **Complaint Detail** | `GET` | `/api/v1/complaints/<public_id>/` | `Bearer <token>` (Owner/Auth) | None | **SOURCE VERIFIED** |
| **Public Tracking** | `GET` | `/api/v1/complaints/track/<tracking_code>/` | AllowAny (Public) | None | **REQUEST-TESTED (200)** |
| **Complaint Timeline** | `GET` | `/api/v1/complaints/<public_id>/timeline/` | AllowAny (Public) | None | **SOURCE VERIFIED** |
| **Add Image** | `POST` | `/api/v1/complaints/<public_id>/images/` | `Bearer <token>` | `multipart/form-data` | **SOURCE VERIFIED** |
| **Add Attachment** | `POST` | `/api/v1/complaints/<public_id>/attachments/`| `Bearer <token>` | `multipart/form-data` | **SOURCE VERIFIED** |
| **List Notifications** | `GET` | `/api/v1/notifications/` | `Bearer <token>` | None | **SOURCE VERIFIED** |
| **Mark One Notif Read**| `POST` | `/api/v1/notifications/<public_id>/mark-read/` | `Bearer <token>` | None | **SOURCE VERIFIED** |
| **Mark All Read** | `POST` | `/api/v1/notifications/mark-all-read/` | `Bearer <token>` | None | **SOURCE VERIFIED** |
| **Submit Feedback** | `POST` | `/api/v1/feedback/submit/` | `Bearer <token>` | `application/json` | **SOURCE VERIFIED** |

---

### Detailed Request / Response Payloads

#### 1. Authentication: Login
- **Endpoint:** `POST /api/v1/auth/login/`
- **Request Body (JSON):**
  ```json
  {
    "email": "citizen@example.com",
    "password": "UserSecurePassword123",
    "captcha_key": "",
    "captcha_code": ""
  }
  ```
  *(Note: In development and mobile environments, `captcha_key` and `captcha_code` are optional. If omitted, credentials are authenticated directly).*
- **Success Response (200 OK):**
  ```json
  {
    "user": {
      "public_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "citizen@example.com",
      "full_name": "Aarav Sharma",
      "phone": "9876543210",
      "role": "CITIZEN",
      "status": "ACTIVE",
      "address": "Bhubaneswar, Odisha",
      "department": null,
      "designation": null,
      "profile_image": null,
      "bio": "",
      "created_at": "2026-10-11T12:00:00Z"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

#### 2. Authentication: Refresh Token
- **Endpoint:** `POST /api/v1/auth/refresh/`
- **Request Body (JSON):**
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### 3. Complaints: Filing a New Grievance
- **Endpoint:** `POST /api/v1/complaints/create/`
- **Headers:** `Authorization: Bearer <access_token>`
- **Content-Type:** `multipart/form-data` (or `application/json` if no files)
- **Form Fields:**
  - `title` *(string, required)*: Brief grievance summary (max 200 chars).
  - `description` *(string, required)*: Detailed description of the issue.
  - `category` *(string, optional)*: One of `ROAD`, `WATER`, `ELECTRICITY`, `GARBAGE`, `DRAINAGE`, `SANITATION`, `STREET_LIGHT`, `PARKS`, `NOISE`, `OTHER`. If omitted, automatically determined.
  - `priority` *(string, optional)*: One of `LOW`, `MEDIUM`, `HIGH`, `URGENT`. If omitted, automatically evaluated.
  - `location_address` *(string, optional)*: Human-readable address (defaults to "Unspecified Location").
  - `latitude` *(float, optional)*: Float between `-90.0` and `90.0`.
  - `longitude` *(float, optional)*: Float between `-180.0` and `180.0`.
  - `images` *(file list, optional)*: One or more image files (JPEG, PNG, WebP up to 5 MB each).
  - `audio` *(file, optional)*: Audio recording up to 10 MB.
  - `video` *(file, optional)*: Video evidence up to 25 MB.
  - `audio_duration` *(float, optional)*: Length of audio in seconds.
- **Success Response (201 Created):**
  ```json
  {
    "public_id": "eb414416-4fab-4c71-8291-3a49849088fd",
    "tracking_code": "CMP-20261014-GDJ3",
    "title": "Severe pothole on main avenue",
    "description": "Deep pothole causing traffic obstruction near university gate.",
    "status": "PENDING",
    "priority": "HIGH",
    "category": "ROAD",
    "category_display": "Road & Infrastructure",
    "citizen": {
      "public_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "citizen@example.com",
      "full_name": "Aarav Sharma",
      "phone": "9876543210",
      "role": "CITIZEN"
    },
    "assigned_authority": null,
    "location_address": "Main Gate, GIET University, Gunupur",
    "latitude": 19.0435,
    "longitude": 83.8210,
    "resolution_notes": "",
    "images": [
      {
        "public_id": "39b0ccc2-dc9a-4c20-b9ad-9aa467bb0853",
        "image": "/media/complaint_images/2026/10/pothole_evidence.jpg",
        "caption": "",
        "uploaded_at": "2026-10-14T17:20:46+05:30"
      }
    ],
    "attachments": [],
    "feedback": null,
    "latest_history": {
      "public_id": "fa213344-9182-4112-a102-123456789abc",
      "actor": {
        "public_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "full_name": "Aarav Sharma",
        "role": "CITIZEN"
      },
      "action": "CREATED",
      "old_status": null,
      "new_status": "PENDING",
      "remarks": "Complaint filed via mobile app",
      "created_at": "2026-10-14T17:20:46+05:30"
    },
    "created_at": "2026-10-14T17:20:46+05:30",
    "updated_at": "2026-10-14T17:20:46+05:30",
    "resolved_at": null
  }
  ```

#### 4. Complaints: Public Tracking by Code
- **Endpoint:** `GET /api/v1/complaints/track/<tracking_code>/` (e.g. `/api/v1/complaints/track/CMP-20261012-GDJ3/`)
- **Headers:** None (Public endpoint, no login required)
- **Success Response (200 OK):**
  ```json
  {
    "public_id": "eb414416-4fab-4c71-8291-3a49849088fd",
    "tracking_code": "CMP-20261012-GDJ3",
    "title": "pothole on road at giet university",
    "description": "near nc 10 room 46",
    "status": "RESOLVED",
    "priority": "HIGH",
    "category": "ROAD",
    "category_display": "Road & Infrastructure",
    "location_address": "GIET University, SH4, Gunupur Town...",
    "resolution_notes": "its done",
    "images": [
      {
        "public_id": "39b0ccc2-dc9a-4c20-b9ad-9aa467bb0853",
        "image": "/media/complaint_images/2026/10/ChatGPT_Image_Sep_22_2026_12_52_44_PM_iGJYA5V.png",
        "caption": "",
        "uploaded_at": "2026-10-12T17:20:46.352318+05:30"
      }
    ],
    "attachments": [],
    "feedback": null,
    "created_at": "2026-10-12T17:20:46.254360+05:30",
    "updated_at": "2026-10-12T17:22:05.473717+05:30",
    "resolved_at": "2026-10-12T17:22:05.473717+05:30"
  }
  ```

#### 5. Notifications: User Notification List
- **Endpoint:** `GET /api/v1/notifications/`
- **Headers:** `Authorization: Bearer <access_token>`
- **Success Response (200 OK):**
  ```json
  {
    "unread_count": 2,
    "notifications": [
      {
        "public_id": "18cf1b2e-0a52-475a-a43b-287d3a0eef91",
        "title": "Complaint Status Updated",
        "message": "Your complaint CMP-20261012-GDJ3 has been marked as RESOLVED.",
        "notification_type": "STATUS_UPDATE",
        "complaint": 38,
        "complaint_tracking_code": "CMP-20261012-GDJ3",
        "complaint_title": "pothole on road at giet university",
        "is_read": false,
        "created_at": "2026-10-12T17:22:05.512391+05:30"
      }
    ]
  }
  ```

---

## 5. Mobile Environment Configuration Guide

In your separate VS Code React Native / Expo workspace, configure your environment file (`.env`):

### Option 1: Standard Android Studio Emulator
If developing and testing using the official Android Studio emulator on the same PC:
```ini
# Android Emulator host loopback alias:
EXPO_PUBLIC_CIVICSETU_API_URL=http://10.0.2.2:8000/api/v1
```
*(If your mobile HTTP client automatically appends `/api/v1`, configure `EXPO_PUBLIC_CIVICSETU_API_URL=http://10.0.2.2:8000`)*.

### Option 2: Physical Android Device (Over Wi-Fi)
If running Expo Go or an installed APK on your physical phone:
```ini
# Replace with your computer's private Wi-Fi IPv4 address:
EXPO_PUBLIC_CIVICSETU_API_URL=http://172.35.0.20:8000/api/v1
```

### Option 3: iOS Simulator (macOS only)
```ini
EXPO_PUBLIC_CIVICSETU_API_URL=http://127.0.0.1:8000/api/v1
```

> [!IMPORTANT]
> Whenever you change an `EXPO_PUBLIC_*` variable in `.env`, you **MUST** restart the Expo development server with cache cleared:
> ```bash
> npx expo start -c
> ```

---

## 6. How to Verify or Find Your Host IPv4 Address

If your local computer reconnects to Wi-Fi and obtains a new DHCP address, run this command in Windows PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -match 'Wi-Fi'} | Select-Object -ExpandProperty IPAddress
```

Or using standard command prompt:
```cmd
ipconfig
```
Look for `IPv4 Address` under your active Wi-Fi adapter (e.g. `172.35.0.20`). Update `EXPO_PUBLIC_CIVICSETU_API_URL` with this new IP.

---

## 7. Safe Service Management & Restart Commands

### Backend Service (Django)
Run from `-CivicSetu-AI-Powered-Civic-Engagement-Platform/`:
```bash
python manage.py runserver 0.0.0.0:8000
```
> Always specify `0.0.0.0:8000` so Django accepts requests from both `localhost`, `10.0.2.2`, and external LAN devices (`172.35.0.20`).

### Frontend Website Service (Vite React)
Run from `frontend/`:
```bash
npm run dev
```
Accessible in browser at: `http://localhost:5173/`

### Mobile App Service (Expo)
Run from your mobile project in VS Code:
```bash
npx expo start -c
```

---

## 8. Two-Way Cross-Client Synchronization Test Plan

To prove that both clients are reading and writing to the exact same database records, execute this step-by-step test:

1. **Step 1 — Mobile Submission:**
   - On the mobile app, log in as a citizen or submit a guest grievance:
     - Title: `Test Pothole from Mobile Sync`
     - Category: `ROAD`
     - Address: `Main Street Junction`
   - Record the returned `tracking_code` (e.g., `CMP-20261014-XXXX`) and `public_id`.

2. **Step 2 — Web Verification:**
   - Open the web portal in your desktop browser at `http://localhost:5173/track`.
   - Enter `CMP-20261014-XXXX` into the tracking input and search.
   - **Verification Point:** The grievance created on mobile must appear with identical title, category, and status `PENDING`.

3. **Step 3 — Web Authority Status Transition:**
   - Log into the web portal as an authority or admin (`/login/authority`).
   - Navigate to the complaint queue, open `CMP-20261014-XXXX`, and update the status from `PENDING` to `IN_PROGRESS` with remarks `Inspection team dispatched`.

4. **Step 4 — Mobile Status Refresh:**
   - Return to the mobile app and refresh the complaint detail / history view.
   - **Verification Point:** The status immediately shows `IN_PROGRESS`, and the history timeline shows the authority's remarks.

---

## 9. Common Error Diagnosis & Troubleshooting

| Symptom | Root Cause | Solution |
|---|---|---|
| `Network request failed` / `ERR_CONNECTION_REFUSED` on Android emulator | Mobile app configured to `localhost:8000` instead of `10.0.2.2:8000` | Change `EXPO_PUBLIC_CIVICSETU_API_URL` to `http://10.0.2.2:8000/api/v1` and restart Expo with `-c`. |
| `Network request failed` on physical phone | Phone cannot reach PC's LAN IP or Windows Firewall blocked port 8000 | Ensure phone and PC are on same Wi-Fi; check IP with `ipconfig`; add firewall rule for port 8000; verify Django is bound to `0.0.0.0:8000`. |
| `HTTP 404 Not Found` on all requests | Double prefix in URL (e.g. `/api/v1/api/v1/...`) | Check if mobile Axios client appends `/api/v1`. If so, set base URL to `http://<IP>:8000` without `/api/v1`. |
| `HTTP 401 Unauthorized` on `/api/v1/complaints/` | Missing or expired JWT access token | Verify `Authorization: Bearer <access_token>` header; test `/api/v1/auth/refresh/`. |
| `HTTP 400 Bad Request` on complaint creation | Missing required `title` or `description`, or invalid category string | Ensure category matches one of the 10 exact enum codes: `ROAD`, `WATER`, `ELECTRICITY`, `GARBAGE`, `DRAINAGE`, `SANITATION`, `STREET_LIGHT`, `PARKS`, `NOISE`, `OTHER`. |
| Images fail to upload | Form data key name mismatch or missing `Content-Type` boundary | Send file as `images` (or `image` for single) in `multipart/form-data`. |

---

## 10. Secondary VS Code Mobile Implementation Prompt

*Copy and paste the exact prompt below into your VS Code AI assistant working on the React Native / Expo repository:*

```markdown
# CIVICSETU MOBILE INTEGRATION — LOCAL BACKEND SYNCHRONIZATION TASK

Act as a senior React Native / Expo / TypeScript engineer.

Our local Django backend is currently running on our host machine and connected to our primary PostgreSQL database (`civicsetu_db`).
The API contract, endpoints, payload formats, and networking configuration have been fully verified and documented in the handoff document at:
`-CivicSetu-AI-Powered-Civic-Engagement-Platform/docs/MOBILE_SYNC_HANDOFF.md`

## Instructions:

1. Inspect the existing mobile codebase before making edits.
2. Check how the API client is configured (e.g. `src/services/api.ts` or `src/config/env.ts`):
   - Check what environment variable is used (e.g. `EXPO_PUBLIC_CIVICSETU_API_URL`).
   - Check whether the API client automatically appends `/api/v1` to the base URL or expects the full URL with `/api/v1`. Avoid double-prefixing (`/api/v1/api/v1`).
3. For local testing:
   - If using Android Studio Emulator: set base URL to `http://10.0.2.2:8000` (or `http://10.0.2.2:8000/api/v1`).
   - If using a Physical Device on Wi-Fi: set base URL to `http://172.35.0.20:8000` (or `http://172.35.0.20:8000/api/v1`).
4. Ensure the following endpoint contracts match the verified Django backend:
   - Authentication:
     - Login: `POST /api/v1/auth/login/` with `email` and `password` (captcha optional).
     - Token refresh: `POST /api/v1/auth/refresh/` with `{"refresh": token}`.
     - User profile: `GET /api/v1/auth/me/`.
   - Complaints:
     - List: `GET /api/v1/complaints/` (paginated results with `count`, `results`).
     - Create: `POST /api/v1/complaints/create/` (multipart/form-data with `title`, `description`, `category`, `location_address`, `latitude`, `longitude`, `images`).
     - Public Track: `GET /api/v1/complaints/track/<tracking_code>/`.
     - Timeline: `GET /api/v1/complaints/<public_id>/timeline/`.
   - Notifications:
     - List: `GET /api/v1/notifications/` (returns `{"unread_count": N, "notifications": [...]}`).
     - Mark Read: `POST /api/v1/notifications/<public_id>/mark-read/`.
5. Preserve all existing SecureStore token storage, SQLite draft persistence, and offline capabilities. Ensure local drafts remain in draft state until the server returns HTTP 201 Created with `public_id` and `tracking_code`.
6. Run type checks and verify that no mock data is displayed when the local server is reachable.
7. Report the exact configuration updated and confirm connectivity to the running Django backend.
```
