# NexusHealth

A full-stack healthcare platform built for granular patient consent, emergency clinical access, drug-interaction safety, and structured adverse drug reaction (ADR) reporting. NexusHealth gives patients control over who sees what in their record, while giving clinicians the tools they need in urgent care — with immutable audit trails throughout.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [System Overview](#system-overview)
- [Workflows](#workflows)
  - [Feature 1 — Granular Consent Management](#feature-1--granular-consent-management)
  - [Feature 2 — Emergency Access Protocol (Break-Glass)](#feature-2--emergency-access-protocol-break-glass)
  - [Feature 3 — Drug Interaction & Contraindication Firewall](#feature-3--drug-interaction--contraindication-firewall)
  - [Feature 4 — Structured Adverse Drug Reaction Reporting](#feature-4--structured-adverse-drug-reaction-reporting)
- [User Roles & Routes](#user-roles--routes)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Surface](#api-surface)
- [Testing](#testing)

---

## Features

### Feature 1 — Granular Consent Management

A patient grants their cardiologist read-only access to cardiac records and medication history, but explicitly excludes psychiatric records — for a **90-day window** tied to a specific referral episode.

- Consent automatically expires and notifies both parties; renewal requires **active re-confirmation**, not passive rollover
- **Permission tiers:** View-only, View + Add Notes, View + Add Prescriptions, Full Clinical Write Access
- **Consent versioning** — every change is logged with a timestamp and the patient's authenticated identity, creating a legally defensible audit trail

### Feature 2 — Emergency Access Protocol (Break-Glass)

- **Tier 1 (Soft Override):** An attending physician can invoke emergency access by entering a mandatory clinical justification code. Access is granted immediately and the patient is notified.
- **Tier 2 (Hard Override):** For critical care scenarios (ICU, OR), a hospital's designated Chief Medical Officer (CMO) account can authorize emergency access to a patient's full record, with a mandatory retrospective review flag.
- Every break-glass event triggers an **immutable log entry** and is automatically escalated to the platform's compliance review queue within **24 hours**.
- Post-emergency, the patient receives a full access report and can challenge any unauthorized access through a formal dispute workflow.

### Feature 3 — Rule-Based Drug Interaction & Contraindication Firewall

Powered by **RxNorm** and **NDF-RT** terminology:

- Validates every new prescription entry against the patient's existing medication list and documented allergy profile
- Flags are tiered:
  - **Hard Stop** — known fatal interactions
  - **Soft Warning** — significant risk; requires prescriber acknowledgment with reason
  - **Informational** — minor interaction; logged only

### Feature 4 — Structured Adverse Drug Reaction (ADR) Reporting

- Patients log symptoms through a guided, structured UI that maps plain-language descriptions to standardized **MedDRA** (Medical Dictionary for Regulatory Activities) terminology behind the scenes
- Entries are timestamped, linked to the specific medication batch/lot number when available, and tied to the prescribing physician's record

---

## Architecture

NexusHealth is a **monorepo** with a React SPA frontend and an Express REST API backend, backed by MongoDB.

### Frontend (`frontend/`)

| Layer | Technology |
|---|---|
| Runtime | React 19 |
| Build tool | Vite 8 |
| Routing | React Router DOM 7 |
| State / API | Redux Toolkit 2 + RTK Query |
| UI primitives | Radix UI (Dialog, Label, Select, Slot) |
| Styling | Tailwind CSS 3 + DaisyUI 5 |
| Icons | Lucide React |
| Utilities | clsx, class-variance-authority, tailwind-merge |

**Dev server:** `http://localhost:5173` — proxies `/api` → backend on port `5000`.

### Backend (`backend/`)

| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS) |
| HTTP framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| File uploads | Multer → Cloudinary |
| Security | express-rate-limit, cookie-parser |
| Config | dotenv |
| Testing | Jest 30 + Supertest + mongodb-memory-server |

**API server:** `http://localhost:5000`

### External Integrations

| Service | Purpose |
|---|---|
| **RxNorm API** | Drug name → RxCUI resolution, ingredient lookup |
| **RxCheck / NDF-RT** | Drug–drug interaction severity classification |
| **openFDA** | Drug label excerpts for allergy/contraindication checks |
| **Cloudinary** | Secure storage for physical prescription images |
| **MedDRA terminology** | Standardized ADR symptom coding (validated server-side) |

---

## System Overview

```mermaid
flowchart TB
  subgraph Client["Frontend — React + Vite"]
    LP[Landing Page]
    AUTH[Auth Pages]
    PAT[Patient Portal]
    PHY[Physician Portal]
    CMO[CMO Portal]
    ADM[Admin Portal]
  end

  subgraph API["Backend — Express 5"]
    MW[Middleware\nauth · rate-limit · consent-scope]
    RT[Routes]
    SVC[Services]
    UTIL[Utils\naudit · seal · scope]
  end

  subgraph Data["MongoDB"]
    USR[(Users)]
    CR[(ClinicalRecords)]
    CON[(ConsentRules)]
    BG[(BreakGlassAuditLogs)]
    ADR[(AdrReports)]
    AUD[(AuditLogs)]
    DIR[(DrugInteractionRules)]
    IMG[(PrescriptionImages)]
  end

  subgraph External["External APIs"]
    RXN[RxNorm]
    RXC[RxCheck / NDF-RT]
    FDA[openFDA]
    CLD[Cloudinary]
  end

  Client -->|"/api/*"| MW --> RT --> SVC --> Data
  SVC --> External
  SVC --> UTIL --> AUD
```

---

## Workflows

### Feature 1 — Granular Consent Management

```mermaid
sequenceDiagram
  actor Patient
  participant Portal as Consent Center (React)
  participant API as /api/consent
  participant SVC as consentService
  participant DB as ConsentRule + AuditLog

  Patient->>Portal: Select provider, domains, permission tier, episode, duration (≤90d)
  Portal->>API: POST /api/consent (draft)
  API->>SVC: createConsentDraft()
  SVC->>DB: ConsentRule status = PENDING_PATIENT_CONFIRMATION
  SVC->>DB: AuditLog CONSENT_CREATED

  Patient->>Portal: Confirm with 2FA / authenticated identity
  Portal->>API: POST /api/consent/:id/confirm
  API->>SVC: confirmConsent()
  SVC->>DB: status = ACTIVE, version++, confirmingIdentityHash
  SVC->>DB: AuditLog CONSENT_CONFIRMED

  Note over SVC,DB: Provider access enforced via consentScope middleware

  alt Active window elapses
    SVC->>DB: status = EXPIRED
    SVC->>DB: AuditLog CONSENT_EXPIRED
    SVC-->>Patient: Notify patient + provider
  end

  alt Patient requests renewal
    Patient->>Portal: Request renewal
    Portal->>API: POST /api/consent/:id/renew
    API->>SVC: requestRenewal()
    Note over Patient: Requires active re-confirmation — no passive rollover
    Patient->>Portal: Re-confirm identity
    SVC->>DB: New version, AuditLog CONSENT_RENEWED
  end

  alt Patient revokes
    Patient->>Portal: Revoke consent
    Portal->>API: POST /api/consent/:id/revoke
    SVC->>DB: status = REVOKED, AuditLog CONSENT_REVOKED
  end
```

**Permission tiers**

| Tier | Capabilities |
|---|---|
| `VIEW_ONLY` | Read allowed clinical domains |
| `VIEW_ADD_NOTES` | View + append clinical notes |
| `VIEW_ADD_PRESCRIPTIONS` | View + write prescriptions |
| `FULL_WRITE` | Full clinical write access within allowed domains |

**Domain scoping example:** `allowedDomains: [CARDIOLOGY]` + `excludedDomains: [PSYCHIATRY]` → cardiologist sees cardiac records and meds, never psychiatric data.

---

### Feature 2 — Emergency Access Protocol (Break-Glass)

```mermaid
flowchart TD
  START([Physician needs emergency access]) --> RESOLVE{Resolve required tier\nvia domain sensitivity}

  RESOLVE -->|Standard domains| T1[Tier 1 — Soft Override]
  RESOLVE -->|Sensitive / Highly Sensitive| T2REQ[Tier 2 — Request Hard Override]

  T1 --> J1[Enter clinical justification code\n+ free-text reason ≥20 chars]
  J1 --> GRANT1[Immediate access granted\n4-hour session]
  GRANT1 --> LOG1[Immutable BreakGlassAuditLog\n+ sealed audit event]
  LOG1 --> NOTIFY1[Notify patient via SMS / Email / Portal]
  NOTIFY1 --> ESC1[Escalate to compliance queue\nSLA: 24 hours]

  T2REQ --> PENDING[Status: PENDING — awaiting CMO]
  PENDING --> CMO{CMO decision}
  CMO -->|Approve| GRANT2[Full record access granted\n8-hour session]
  CMO -->|Deny| DENY[Access denied — logged]
  GRANT2 --> LOG2[Immutable log + retrospective review flag\nreview due within 7 days]
  LOG2 --> NOTIFY2[Notify patient]
  NOTIFY2 --> ESC2[Compliance queue — 24h SLA]

  ESC1 --> REPORT[Patient receives full access report]
  ESC2 --> REPORT
  REPORT --> DISPUTE{Patient challenges access?}
  DISPUTE -->|Yes| REVIEW[Formal dispute → compliance investigation]
  DISPUTE -->|No| END([Closed])
  REVIEW --> END
```

**Break-glass tiers**

| Tier | Who | Access | Session | Review |
|---|---|---|---|---|
| `TIER_1_SOFT_OVERRIDE` | Attending physician | Scoped domains | 4 hours | Compliance queue within 24h |
| `TIER_2_HARD_OVERRIDE` | CMO-approved | Full clinical record | 8 hours | Mandatory retrospective review (7 days) |

**Clinical justification codes:** `EMERGENCY_DEPARTMENT`, `UNCONSCIOUS_PATIENT`, `LIFE_THREATENING_EVENT`, `TRANSFER_OF_CARE`

---

### Feature 3 — Drug Interaction & Contraindication Firewall

```mermaid
sequenceDiagram
  actor Prescriber
  participant UI as Add Prescription Dialog
  participant API as /api/prescriptions
  participant VAL as prescriptionValidationService
  participant RES as drugResolverService
  participant RXN as RxNorm Client
  participant CHK as interactionCheckerService
  participant RXC as RxCheck / NDF-RT
  participant ALG as allergyInteractionService
  participant FDA as openFDA
  participant DB as ClinicalRecord + AuditLog

  Prescriber->>UI: Enter drug name, dose, route
  UI->>API: POST /api/prescriptions/validate
  API->>VAL: validatePrescription()

  VAL->>RES: resolveDrugName()
  RES->>RXN: Lookup RxCUI + ingredients

  VAL->>CHK: checkPair(newDrug, eachActiveMed)
  CHK->>RXC: Query interaction severity
  CHK-->>VAL: Tier per pair (HARD_STOP / SOFT_WARNING / INFORMATIONAL)

  VAL->>ALG: checkAllergyInteractions()
  ALG->>FDA: Fetch label contraindications
  ALG-->>VAL: Allergy flags

  VAL->>VAL: computeWorstDecision()

  alt HARD_STOP
    VAL-->>UI: Block — prescription cannot proceed
  else SOFT_WARNING
    VAL-->>UI: Warning — prescriber must acknowledge with reason
    Prescriber->>UI: Acknowledge + provide reason
    UI->>API: POST /api/prescriptions/acknowledge
    API->>DB: AuditLog PRESCRIPTION_ACKNOWLEDGED
  else SAFE / INFORMATIONAL
    VAL-->>UI: Proceed (informational logged)
  end

  Prescriber->>UI: Commit prescription
  UI->>API: POST /api/prescriptions/commit
  API->>DB: Write to ClinicalRecord
  API->>DB: AuditLog PRESCRIPTION_COMMITTED
```

**Flag tiers**

| Tier | Behavior | Prescriber action |
|---|---|---|
| `HARD_STOP` | Known fatal / contraindicated interaction | Prescription blocked |
| `SOFT_WARNING` | Significant risk (moderate interaction or allergy match) | Must acknowledge with documented reason |
| `INFORMATIONAL` | Minor interaction | Logged; no block |

**Data sources:** Local `DrugInteractionRule` cache → RxCheck/NDF-RT live lookup → openFDA allergy label cross-check.

---

### Feature 4 — Structured Adverse Drug Reaction Reporting

```mermaid
sequenceDiagram
  actor Reporter as Patient / Physician / Pharmacist
  participant UI as ADR Reporting UI
  participant API as /api/adr-reports
  participant SVC as adrReportService
  participant MED as validateMeddraTerms
  participant NORM as adrDrugNormalizer
  participant RXN as RxNorm Client
  participant DB as AdrReport + ClinicalRecord + AuditLog

  Reporter->>UI: Describe symptoms in plain language
  UI->>UI: Map selections → MedDRA preferred terms (PT/LLT)

  Reporter->>UI: Select suspected drug, severity, outcome\nOptional: batch/lot number
  UI->>API: POST /api/adr-reports

  API->>SVC: createAdrReport()
  SVC->>MED: Validate MedDRA term codes
  SVC->>NORM: normalizeSuspectedDrug()
  NORM->>RXN: Resolve RxCUI for suspected drug

  SVC->>DB: AdrReport (timestamped, linked to prescriber record)
  SVC->>DB: AuditLog ADR_REPORTED

  alt Severity = SERIOUS / LIFE_THREATENING / FATAL
    SVC->>API: submitRegulatoryReport()
    API->>DB: AuditLog ADR_REGULATORY_SUBMITTED
  end

  Note over Reporter,DB: Provider reads reports via consent-scoped /api/adr-reports/patient/:id
```

**ADR severity levels:** `NON_SERIOUS`, `SERIOUS`, `LIFE_THREATENING`, `FATAL`

**Reporter roles:** `PATIENT`, `PHYSICIAN`, `PHARMACIST`

---

## User Roles & Routes

| Role | Frontend base path | Key capabilities |
|---|---|---|
| `PATIENT` | `/patient/*` | Dashboard, prescriptions, doctors, physical prescriptions, consent center |
| `PHYSICIAN` | `/doctor/*` | Dashboard, patient list, break-glass, prescription management |
| `CMO` | `/cmo/*` | Dashboard, Tier-2 approval queue, compliance review |
| `PHARMACIST` | `/doctor/dashboard` | Prescription visibility, ADR submission |
| `ADMIN` | `/admin/*` | User invitation, platform administration |

---

## Project Structure

```
NexusHealth/
├── frontend/
│   ├── src/
│   │   ├── app/              # Router, Redux store, RTK Query base API
│   │   ├── components/       # Shared UI (layout, feedback, shadcn-style primitives)
│   │   ├── features/
│   │   │   ├── auth/         # Login, signup, role guards, JWT bootstrap
│   │   │   ├── consent/      # Consent Center, timeline, action modals
│   │   │   ├── breakGlass/   # Emergency access UI, CMO compliance queue
│   │   │   ├── prescriptions/# Drug search, interaction warnings, Rx management
│   │   │   ├── dashboard/    # Role-specific dashboards
│   │   │   ├── patients/     # Physician patient list + consent cards
│   │   │   ├── doctors/      # Patient care-team management
│   │   │   ├── physicalPrescriptions/  # Image upload + lightbox
│   │   │   ├── admin/        # User invitation
│   │   │   └── landing/      # Public marketing page
│   │   └── lib/              # API client, theme, utilities
│   └── package.json
│
└── backend/
    ├── server.js             # Express app entry + route mounting
    ├── routes/               # REST route handlers
    ├── services/             # Business logic (consent, break-glass, Rx, ADR)
    ├── models/               # Mongoose schemas
    ├── middleware/           # Auth, rate-limit, consent-scope enforcement
    ├── utils/                # Audit writer, seal events, scope helpers
    ├── config/               # Enums, DB connection, indexes
    ├── scripts/              # DB init, seed users, MRN backfill
    ├── tests/                # Jest integration + unit tests
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for prescription image uploads)

### Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, and Cloudinary credentials

npm install
npm run db:init          # Create indexes
npm run db:seed-users    # Seed development users (optional)
npm run dev              # Start on http://localhost:5000
```

### Frontend setup

```bash
cd frontend
cp .env.example .env

npm install
npm run dev              # Start on http://localhost:5173
```

### Environment variables

**Backend (`backend/.env`)**

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_ACCESS_TTL` | Access token lifetime (default `15m`) |
| `JWT_REFRESH_TTL` | Refresh token lifetime (default `7d`) |
| `AUDIT_SEAL_SECRET` | HMAC secret for immutable audit event sealing |
| `PORT` | API port (default `5000`) |
| `CLOUDINARY_URL` | Cloudinary upload credentials |

**Frontend (`frontend/.env`)**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API base URL (empty for Vite dev proxy) |
| `VITE_DEV_AUTH` | Enable dev auth shortcuts (`false` in production) |

---

## API Surface

| Prefix | Domain |
|---|---|
| `/api/auth` | Registration, login, token refresh, logout |
| `/api/users` | Profile and user lookup |
| `/api/admin/users` | Admin user invitation |
| `/api/consent` | Consent CRUD, confirm, renew, revoke, expire |
| `/api/clinical-records` | Scoped clinical record read/write |
| `/api/break-glass` | Tier-1 override, Tier-2 request/approve/deny, compliance queue |
| `/api/drugs` | RxNorm drug search and resolution |
| `/api/prescriptions` | Validate, acknowledge, commit, discontinue, polypharmacy check |
| `/api/adr-reports` | ADR submission, patient listing, regulatory submit |
| `/api/prescription-images` | Physical prescription image upload and access |
| `/api/meta` | Platform enums and reference data |
| `/health` | Database connectivity check |

---

## Testing

```bash
cd backend
npm test                 # Run all Jest tests (in-band)
npm run test:watch       # Watch mode
```

Test coverage includes consent lifecycle, break-glass transactions, interaction checking, ADR validation, audit log integrity, and full route integration via Supertest.
