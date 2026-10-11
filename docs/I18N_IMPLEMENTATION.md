# CivicSetu V1 — Multilingual Support (i18n) Architecture

## 1. Overview
CivicSetu V1 delivers full internationalization across all citizen-facing workflows, supporting:
1. **English (`en`)** — Official English baseline.
2. **Odia (`or`)** — ଓଡ଼ିଆ (State regional language for Odisha municipal governance).
3. **Hindi (`hi`)** — हिन्दी (National official language).

The architecture is built on `i18next` and `react-i18next`, ensuring modular locale files, zero runtime latency, screen-reader accessibility, and seamless language persistence.

---

## 2. Directory Structure & Key Namespaces
```
frontend/src/i18n/
├── index.ts                # i18next initialization & config
├── locales/
│   ├── en.json             # English translation strings
│   ├── or.json             # Odia translation strings
│   └── hi.json             # Hindi translation strings
└── useLanguage.ts          # Custom hook for language switching & state
```

---

## 3. Translation Scope & Coverage
Every citizen and gateway touchpoint is covered:
- **Gateway Portal Selector (`RoleModal`)**:
  - Modal title & subtitle ("Select Your Portal to Sign In" / "Select Account Type to Register").
  - Mode switcher tabs ("Sign In" / "Create Account").
  - Role cards: Citizen Portal, Municipal Authority, Super Admin.
  - Sub-features, role pills, and action CTA links ("Sign In as Citizen", "Officer Sign In", "Admin Access Terminal", etc.).
  - Security footer notice.
  - In-modal instant language switcher with automatic light/dark theme adaptation.
- **Navigation & Shell**: Brand, menus, portal switcher, profile link, notifications, logout.
- **Authentication**: Citizen login, citizen signup, password recovery, verification captcha.
- **Complaint Submission**:
  - Form labels: Title, Description, Category, Urgency/Priority, Ward/Address, GPS detection.
  - Categories: Road & Infrastructure, Water Supply, Electricity, Drainage & Sewage, Sanitation & Solid Waste.
  - Media Evidence: Audio recording controls, photo attachments, video attachments, size limits.
  - Validation messages: Required fields, character limits, file type/size errors.
  - Confirmation Modal: Municipal tracking code, department assignment, next steps.
- **Complaint Tracking**:
  - Search input and code formatting helper.
  - Step-by-step lifecycle timeline (Submitted ➔ Assigned ➔ In Progress ➔ Resolved).
  - Status badges (`Pending`, `In Progress`, `Resolved`, `Rejected`).
  - Resolution feedback form with 5-star rating and satisfaction review.
- **Complaint History**: Status filters, date sorting, empty state, detailed record drawer.
- **Citizen Profile**: Personal information, ward selection, contact updates.
- **Notifications**: Real-time grievance updates and lifecycle status alerts.

---

## 4. Accessibility & Persistence
- **Accessibility**: Keyboard navigable language selector (`Tab`, `Enter`, `Escape`), semantic `aria-label` and `aria-expanded` attributes.
- **Persistence**: Selected language code stored in `localStorage.getItem('civicsetu_lang')`. Falls back to browser preference or English (`en`).
- **Document Metadata**: Automatically updates `document.documentElement.lang` on language switch.
- **User Content Preservation**: Citizen-typed descriptions, recorded audio, and images remain in their original submitted format without automated alterations.
