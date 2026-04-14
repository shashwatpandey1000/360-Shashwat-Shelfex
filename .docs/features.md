# ShelfEx 360 — Feature List

> This document lists all features grouped by module. Each major feature has sub-features.
> Items marked ⏳ are deferred (not in initial build).
> **Build strategy:** Survey system is the foundation — it delivers value to data clients (Haldiram) from day 1 and creates the store network.
> **Auth model:** Delegated to Shelfex SSO (OAuth 2.0). Email + password authentication handled by SSO. Cross-app SSO across all Shelfex products.
> **Access model:** Fully access-based and modular. Roles are preset templates; actual access is controlled by a granular permission map per user.

---

## ⚠️ External Dependencies (BLOCKERS)

> **These are hard blockers.** Our webapp cannot be built or function without the outputs from these teams. API contracts / data format specs must be finalized BEFORE development begins on dependent modules.

> **The biggest risk is the dependency chain: tour must exist before surveys can happen, surveys must exist before AI can process, AI must process before the dashboard has value. That's a three-team serial dependency.**

### DEP-1: 360 Capture App Team (BLOCKER for Modules 4, 5, 6, 7)

The entire survey system depends on the 360 tour being created first:

**Tour is created first → AI processes those photos → data is stored and displayed.**

**If the capture app isn't ready, or the output format isn't defined, nothing else works.**

**What we need from the Capture App team:**

- **API contract / data format spec** — the exact JSON schema or data structure for:
  - Tour data: how is a tour represented? (tour ID, store ID, metadata)
  - Scenes: how are scenes listed? (scene ID, panorama image URL, position/order)
  - Shelf mapping: how is a shelf bound to a scene? (shelf ID, scene ID, label, bounding box / hotspot coordinates)

### DEP-2: AI Product Recognition Team (BLOCKER for Modules 6, 7)

The survey dashboard's value depends entirely on AI returning product detection results from shelf photos.

**What we need from the AI team:**

- **API contract / data format spec** — the exact request and response format:
  - **Request:** How do we send photos? (image URL? base64? S3 path?) What metadata is required? (store ID, shelf ID, scene ID?)
  - **Response:** What does the AI return? (product name, brand, SKU, position on shelf, confidence score, bounding box?)

**Note:** Our system should work **with and without** AI results — show raw survey photos first, overlay AI detection when available. This prevents us from being fully blocked.

---

## Platform Architecture — Subdomains

The platform is split into separate apps served on different subdomains:

| Subdomain               | Purpose                           | Users                                                  |
| ----------------------- | --------------------------------- | ------------------------------------------------------ |
| `manage.shelfex360.com` | Survey dashboard + org management | Org managers, zone managers, store managers, custom users |
| `admin.shelfex360.com`  | Super admin panel (deferred)      | Super Admin (Shashwat, Gaurav)                         |
| `shelfex360.com/{slug}` | Public store pages (unauthenticated) | Anyone                                              |

- Shared auth via Shelfex SSO across subdomains and all Shelfex apps (single login, access-map-based routing)

---

## 🌍 Globalization (Design for Global from Day 1)

> **CEO directive:** India is the pilot. US launch within one month of India launch. Design for global from day one.

This does NOT mean building everything for every country now. It means **never hardcoding India-specific assumptions** so expansion doesn't require rewrites.

### G-1: Multi-Language (i18n)

- All UI strings externalized from day 1 (no hardcoded text in components)
- Use an i18n framework (e.g., i18next, react-intl)
- **Launch languages:** English (default), Hindi
- **US launch:** English (already done)
- Language selector in UI — user preference stored in profile
- Right-to-left (RTL) support not needed initially but don't block it architecturally

### G-2: Multi-Currency

- Currency is a **per-org setting** (Haldiram India = ₹, US client = $)
- All monetary values stored with currency code (e.g., `{ amount: 150, currency: "INR" }`)
- Display formatting respects locale (₹1,50,000 vs $1,500.00)
- No currency conversion needed — each org operates in its own currency

### G-3: Multi-Region

- **Timezone per store** — survey schedules are in store's local timezone (not IST hardcoded)
- **Address format** — flexible address fields that work across countries (no India-specific pincode assumptions)
  - Use: street, city, state/province, postal code, country
- **Date/time format** — respect locale (DD/MM/YYYY vs MM/DD/YYYY)

### G-4: Data Residency

- Architecture should support region-based data storage (separate DB instances or schemas per region) if needed
- For now: single deployment, but design DB schemas and APIs to include `region` / `country` fields

### G-5: What This Means for Each Module

| Module                   | Global-ready requirement                                           |
| ------------------------ | ------------------------------------------------------------------ |
| Auth & Access (1)        | Auth delegated to Shelfex SSO — works globally, no region-specific auth providers |
| Org Management (3)       | Org has country + currency + timezone settings                     |
| Store Onboarding (4)     | Flexible address, store timezone, locale-aware URL slugs           |
| Surveyor Management (5)  | Survey schedules in store's local timezone                         |
| Survey Workflow (6)      | Timestamps stored in UTC, displayed in local time                  |
| Survey Dashboard (7)     | Locale-aware date/time/number formatting                           |
| Super Admin (8)          | Filter by country/region, multi-currency stats                     |
| Notifications (9)        | Multi-language email templates, in-app notification center         |

---

## 1. Authentication & User Management

### 1.1 Registration & Login

> **Authentication is fully delegated to Shelfex SSO** (`accounts.shelfex.com`). 360 does not have its own login/register pages or password management. Users authenticate via OAuth 2.0 authorization code flow through the shared SSO.

- **Shelfex SSO** handles: registration, login (email + password), password reset, session management, token issuance
- All Shelfex apps (ShelfScan, ShelfMuse, ShelfIntel, Shelf360) share the same user identity
- Users who already have a Shelfex account can access 360 without re-registering
- Cross-app SSO: logging into any Shelfex app grants silent access to all others
- First-login forced password change for accounts created via CSV or by a manager (handled via SSO)
- **First-login OTP verification:** When a user logs in for the first time with a temporary password, an OTP is sent to their email to verify identity before the password change is allowed. This confirms the right person is resetting the password without storing a "first login" flag in the DB. (Handled via SSO)

### 1.2 Access & Permissions System

> **Core principle:** The entire platform is access-based, not role-based. Roles exist as convenient default templates, but actual access is controlled by a granular permission map per user. Enforced identically on frontend (show/hide UI) and backend (every API call).

**Access Maps:**

Every user has an **access map** — a configuration defining exactly what they can and cannot do. The system checks this map before every action.

**Two orthogonal access dimensions:**

*Dimension 1: Permissions (IAM-style `resource:action` strings)*

| Permission | What it allows |
| ---------- | -------------- |
| `stores:read`, `stores:write`, `stores:delete`, `stores:import` | View, edit, deactivate, bulk-import stores |
| `surveys:read`, `surveys:write`, `surveys:delete`, `surveys:download`, `surveys:execute` | View, edit, delete, download, physically perform surveys |
| `employees:read`, `employees:write`, `employees:delete`, `employees:manage` | View, edit, delete, manage surveyor assignments |
| `schedule:read`, `schedule:write`, `schedule:delete` | View, create/edit, delete schedules |
| `dashboard:read` | View dashboard metrics |
| `settings:read`, `settings:write` | View, edit org settings |

Sidebar modules are derived: if user has any `stores:*` permission, the Stores module appears. Adding new permissions (e.g., `surveys:export`) requires no schema migration — just a new string.

*Dimension 2: Data scope (which data do those permissions apply to)*

| Scope type | What it means |
| ---------- | ------------- |
| `org` | Sees everything in the organization |
| `zones` | Sees only stores/data in assigned zone(s) and sub-zones |
| `stores` | Sees only specifically assigned store(s) |

**Default Role Templates:**

| Role                | Default Access                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Org Manager**     | Full access to everything in the org — all stores, all modules, all actions, schedule management |
| **Zone Manager**    | Read/write access to all stores in assigned zone(s), employee management within zone            |
| **Store Manager**   | Full access to assigned store(s), surveyor management, survey assignment                        |
| **Surveyor**        | Survey execution only for assigned stores. No dashboard, no analytics, no management            |

**Custom Users:**

Org manager can create users with custom access that doesn't fit any preset role:

- A user who manages 4-5 zones (multi-zone manager)
- A state-level manager who sees all stores in a state but can't edit schedules
- A read-only auditor who can view survey data and download reports but change nothing
- A regional surveyor coordinator who manages surveyors across a region but doesn't do surveys

**Enforcement:**

- **Backend:** Every API endpoint checks the user's access map. No exceptions. The access map is the single source of truth.
- **Frontend:** Dashboard is modular. Sidebar items, pages, buttons, and data shown/hidden based on the same access map.
- **Storage:** Access map stored per-user in DB. Loaded on login, cached for session, re-checked on sensitive operations.

**Access Hierarchy (Data Visibility):**

```
Org Manager → sees all zones, all stores, all surveys, all employees
  └─ Zone Manager → sees all stores in their zone(s), surveys and employees within
      └─ Store Manager → sees their assigned store(s), surveys and surveyors within
          └─ Surveyor → sees only their own assigned survey slots
```

Custom users can have access at any cut of this hierarchy.

### 1.3 Account Management

- Edit profile (name, email)
- Change password (redirects to Shelfex SSO)
- Deactivate/reactivate accounts (by users with `employees:manage` permission)

---

## 2. Activity Logs

> Activity logs are stored from day 1. They provide granular audit trails and full operational history across the platform.

- Every significant action is logged: user logins, store creation, survey completion, surveyor assignment changes, schedule changes, access map modifications, tour creation/updates, etc.
- Logs are viewable per-user (employee detail page) and per-store
- Queryable by date range, user, action type, store
- Used for operational auditing and accountability

---

## 3. Organization Management

### 3.1 Org Registration & Approval

- Org manager self-registers via multi-step onboarding form: account details, org type (chain/multi-store vs. single store), industry, HQ location, website (optional), org name + logo
- If user selects "single retail store" → redirected to kirana self-registration flow (see Module 4.2)
- Org created with status `pending_approval`
- Super admin approves or rejects via email (inline buttons with auth)
- On approval → org becomes `active`, org manager receives approval email with login link
- On rejection → org manager receives rejection email

### 3.2 Bulk Store Import (CSV)

- Org manager uploads CSV with store details + manager info
- System bulk-creates: stores + store manager accounts with temporary passwords
- Each new manager receives an email with login details
- CSV supports flexible address fields
- Each store inherits the org's default survey schedule; each store manager is auto-assigned as default surveyor
- Managers prompted to change password on first login via Shelfex SSO (with email OTP verification)

### 3.3 Store Management (from Org level)

- Add/edit/deactivate stores under the org (single store add or CSV bulk import)
- View all stores: name, address, status (pending tour / active / inactive)
- Filter/search stores by city, zone, status, survey compliance
- Store manager replacement: old manager loses access immediately, new manager takes over, existing surveyor assignments remain intact

### 3.4 Employee Management

- Create users with a **default role template** (org manager, zone manager, store manager, surveyor) OR a **custom permission set** (see 1.2)
- View all employees: store managers, zone managers, surveyors, custom users. Searchable, filterable by role/store/zone/status
- Employee detail: profile info, assigned stores, permission summary, activity log
- Org manager can view surveyor assignments per store but **cannot change them** — that's the store manager's job

### 3.5 Org-Level Survey Schedule

> The org manager controls when surveys happen across all stores. This is a core feature.

- **Default schedule:** Org manager sets the org-wide default (e.g., 2 surveys/day — Window 1: 8 AM–1 PM, Window 2: 2 PM–7 PM, daily)
- **Per-store override:** Org manager can customize the schedule for individual stores — different number of surveys, different time windows, different days
- **Schedule slots** have:
  - **Time window:** Start time and end time (e.g., 8 AM – 1 PM). Survey must be completed within this window.
  - **Recurrence:** Daily, specific weekdays, odd/even days, custom pattern.
- **Flexibility:** Fully modular — 1 survey/day, 5/day, 30/day, different days, different windows
- **Store managers cannot create or modify the schedule.** They can only assign who executes each scheduled slot.
- When a new store is created, it inherits the org's default schedule

### 3.6 Survey Questions (Per-Store Configurable)

- Org manager defines a **default question set** for the org (applied to all stores)
- Org manager can **override or customize** questions for individual stores (e.g., different questions for grocery vs. pharmacy)
- Question types: Yes/No, MCQ, rating scale, short text — exact types TBD
- Examples: "Is the store entrance clean?", "Are all price tags visible?", "Rate shelf organization (1-5)"
- Store managers and surveyors **cannot modify questions** — they only answer them during surveys
- System should be modular — easy to add new question types, conditional logic, etc. in the future

### 3.7 Org Settings

- **Organization profile:** Edit org name, logo, industry, location, website, org type
- **Org-level settings:** country, currency, timezone, default language
- **Notification preferences:** Toggle email notifications — survey missed (daily summary), weekly report, new manager logged in
- **Account:** Edit own profile (password change handled via Shelfex SSO)

---

## 4. Store Onboarding

### 4.1 Store Creation (by Org Manager)

**Single store:**

- Org manager fills form: store name, location (Google Places), category (dynamic list), manager assignment (name + email, or self-assign)
- Store created with status `pending_tour`
- If manager is someone else → account created with temporary password, email sent with login details
- If org manager self-assigns → no email needed, store manager capabilities appear in same dashboard
- Store inherits org's default survey schedule; store manager is auto-assigned as default surveyor

**Bulk import:** See Module 3.2.

### 4.2 Kirana Self-Registration (Single Retail Store)

- Store owner registers via multi-step form: account details (name, email, password), selects "single retail store", industry, store location (Google Places), store name + logo
- **No approval needed.** Org + store created immediately with status `active`
- K is automatically the org manager, store manager, AND default surveyor (all in one)
- K receives a welcome email and is redirected to the dashboard
- K has full control: can configure their own survey schedule, questions, add surveyors if wanted

### 4.3 Store Profile

- Store name, address (flexible: street, city, state/province, postal code, country), contact, category
- Store logo/photo upload
- Operating hours
- **Store timezone** — all survey windows and display times use this
- Unique store URL: `shelfex360.com/{store-slug}` (auto-generated from store name, editable)

### 4.4 360 Tour Creation

- Store manager creates the initial 360 tour via the **360 Capture App** (separate mobile app)
- Walk through store → capture panoramic scenes → label shelves → shelf mapping happens during creation
- Tour data syncs to platform → store status changes from `pending_tour` → `active`
- Tour preview before publishing
- **Note:** Capture app built by separate team — we consume the output (tour data + scene mapping)

### 4.5 Tour Update

- Re-capture scenes if store layout changes
- Add new scenes / remove old ones
- Update shelf labels/mapping

### 4.6 Public Store Page

Each store gets a unique public URL: `shelfex360.com/{store-slug}`.

**What the public page shows (no authentication required):**

- Store name, address, category, logo/photo
- The latest 360 tour — interactive panorama viewer
- Basic store details (operating hours, contact info — if provided)

**What is NOT shown:**

- Survey data, shelf photos, AI detection results
- Employee information, survey schedules
- Any internal operational data

### 4.7 ⏳ Custom Domain for Stores

- Store can map their own domain (e.g., `ramkishanstore.com`) to their store page
- DNS configuration flow, SSL provisioning

---

## 5. Surveyor Management

### 5.1 Add/Remove Surveyors

- **Store manager controls this** (org manager can view assignments but cannot change them)
- Invite surveyor by **email** (and optionally name)
- Surveyor receives email with app download link + login credentials (email + temporary password)
- Store manager can assign themselves as surveyor (default when store is created)
- Remove/deactivate surveyors — if surveyor was assigned to upcoming slots, store manager is prompted to reassign (store manager becomes default assignee again)

### 5.2 Assign Surveyors to Stores

- A surveyor can be assigned to one or more stores
- Each store can have multiple surveyors
- Store manager can only assign surveyors that work for their store(s) — not surveyors from other stores

### 5.3 Survey Slot Assignment

- Survey schedule (when and how many surveys happen) is controlled by the **org manager** (see 3.5)
- Store manager controls **who executes** each scheduled slot
- Store manager is auto-assigned as default surveyor for all slots when store is created
- Store manager can reassign any slot to a surveyor they've added
- **Assignments are persistent.** Assign a surveyor to a recurring slot once (e.g., "Monday mornings → Surveyor X"), and the assignment applies to all future occurrences automatically. No need to reassign every day.
- **Availability check:** Before assigning a surveyor, the system checks if that surveyor is already booked for another survey at the same time (like a Google Calendar conflict check). Conflicts are blocked and shown to the store manager.

### 5.4 Surveyor Notifications

- **1 hour before** survey window opens: notification on app + web
- **10 minutes before** survey window opens: notification on app + web
- We send these notifications; the app team handles displaying them on the app side

---

## 6. Survey Workflow

### 6.1 Survey Capture (Mobile App)

- Surveyor opens app → sees their assigned survey for this time slot
- **Cannot start before the time window opens.** Start button is disabled until window start time.
- Each survey includes:
  1. **Fresh 360 capture** of the store (new 360 every survey — CEO mandate, not just photos on old tour)
  2.  **Survey questions** (if configured for this store) — answered after photo capture
- guided capture
- Submit survey: 360 photos and data + question answers uploaded

### 6.2 Survey Time Windows

- Each scheduled survey has a **time window** (start time → end time)
- Surveyor **cannot start** the survey before the window opens
- If survey is not completed by the window's end time → marked **missed**
- Missed surveys: store manager is notified in-app immediately;

### 6.3 Survey Status Tracking

- Per-store: survey status per scheduled slot (pending / in-progress / completed / missed)
- Per-question: answered yes/no
- Dashboard shows completion per scheduled slot

### 6.4 AI Product Recognition (Integration)

- Survey photos sent to AI model (separate team's API)
- AI returns: list of detected products per photo (product name, brand, position on shelf)
- Results stored in DB linked to: store → shelf → survey date/time → products
- We consume the API — AI model development is not our scope

### 6.5 Survey Data Storage

- Per survey: store, shelf, scene, surveyor, timestamp, photo URL, 360 capture data, AI detection results, question answers
- Historical data retained (all surveys, not just latest)
- Queryable by: date range, store, org, shelf, product, brand

---

## 7. Survey Dashboard (Org Manager / Store Manager)

### 7.1 Org Manager Dashboard

**Sidebar navigation:** Dashboard, Stores, Surveys, Employees, Schedule, Settings.
(Items shown/hidden based on user's access map.)

- **Dashboard (Home)**
  - Key metrics: total stores, active stores, stores pending tour
  - Today's survey status: completion rates across all stores (based on each store's configured schedule)
  - Recent activity feed: survey completions, missed surveys, tours created, stores added, surveyors added (each entry links to detail)
  - Alerts: e.g., stores that haven't created their 360 tour yet

- **Stores**
  - List view: all stores with name, city, status, last survey, assigned manager, today's survey status. Searchable, filterable, sortable.
  - Store detail — 3 tabs:
    1. **Overview:** Store info (address, category, manager). If 360 tour exists → embedded panorama viewer (from latest survey's 360 capture) with shelf hotspots showing survey photos + AI-detected products. Can compare across surveys.
    2. **Surveys:** All surveys for this store. Filterable by date, time slot, status. Click through to survey detail.
    3. **Employees:** Store manager and surveyors assigned to this store. Org manager can **view** assignments but **cannot change them** — that's the store manager's job.

- **Surveys**
  - List of all surveys across all stores. Filterable by date, store, time slot, status.
  - Survey detail — three view modes:
    1. **360° View:** The 360 capture from this specific survey. Shelf hotspots show captured photos + AI results. Can compare with previous survey's 360 and shelf photos.
    2. **Analytics View:** Analytics related to AI data captured.
    3. **Questions:** If survey had configured questions, answers are shown here.

- **Schedule**
  - Org-level survey schedule management (see Module 3.5 for details)

- **Survey Compliance**
  - Stores with missed surveys (flagged)
  - Compliance rate over time

### 7.2 Store Manager Dashboard

**Sidebar navigation:** Dashboard, My Stores, Surveys, Employees (Surveyors), Settings.
(Items shown/hidden based on access map.)

- Same platform (`manage.shelfex360.com`), scoped to store manager's assigned stores
- If managing multiple stores → combined dashboard across all stores
- Today's survey status: completion rates across store manager's stores
- Latest 360 capture with survey overlays (same view as org manager, filtered to their stores)
- Surveyor activity: who surveyed, when, which shelves
- Missed survey warnings
- **Schedule (read-only):** Can see time windows and frequency as defined by org manager but **cannot modify them**. Can only assign who executes each slot (see Module 5.3).
- Store detail shows same 3 tabs as org manager view (Overview, Surveys, Surveyors) — but store manager can **add, remove, and manage** surveyors

### 7.3 Kirana Dashboard

- K sees the **full dashboard** — they are org manager, store manager, and surveyor all in one
- Same sidebar as org manager, scoped to their single store
- K controls everything: schedule, questions, surveyor assignments
- Dashboard home: key metrics for their one store, upcoming surveys, recent activity

### 7.4 Operational Metrics (Ours) vs Intelligence Layer (Analytics Team)

**What we build (operational / survey health):**

- Survey completion rates (per store, per org, per scheduled slot)
- Missed survey counts and compliance status
- Store status (active / pending tour / inactive)
- Surveyor activity logs (who surveyed, when, which shelves)
- Basic counts: total surveys today, total stores surveyed, overdue list

> These are operational metrics needed to run the platform. Not analytics.

**What the analytics team builds (intelligence layer — NOT our scope):**

- Cross-store comparisons and benchmarking
- Product trend analysis (which SKUs appear/disappear over time)
- Shelf compliance scoring and rules
- Time-series analysis and historical intelligence
- Brand-level insights for data monetization

**Integration:**

- Analytics team gets DB read access.
- Embedded in our dashboard via **iframe** or similar embed
- Our scope: provide clean data + embed their output. We do not build analytics.

