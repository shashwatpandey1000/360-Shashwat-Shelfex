# ShelfEx 360 — User Flows

> What happens, in what order, from each user's perspective.
> **Auth model:** Delegated to Shelfex SSO (OAuth 2.0). Email + password authentication handled by SSO. Cross-app SSO across all Shelfex products.
> **Access model:** Fully access-based and modular. See Section 0 (Access & Permissions System) below.

---

## Flow 0: Access & Permissions System

> **Core principle:** The entire platform is access-based, not role-based. Roles exist as convenient defaults, but actual access is controlled by a granular permission map per user. This must work identically on frontend (show/hide UI) and backend (enforce on every API call).

### 0.1 — How It Works

Every user has an **access map** — a configuration that defines exactly what they can and cannot do. The system checks this map before every action (API call, page render, data query).

**Default roles** (org manager, store manager, surveyor, etc.) are just **preset access map templates**. When a user is created with a role, they get that role's default access map. But the org manager can create **custom users** with any combination of permissions.

### 0.2 — Access Dimensions

The access map covers these dimensions:

| Dimension              | Examples                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **Data scope**         | Which stores, zones, regions, or the entire org can this user see?                                 |
| **Module access**      | Dashboard, Stores, Surveys, Employees, Settings, Schedule — which sidebar items are visible?       |
| **Action permissions** | Read, write, download, delete — per module (e.g., can read surveys but not download survey photos) |
| **Survey execution**   | Can this user perform surveys? (surveyors: yes, most managers: optional)                           |
| **Employee management**| Can this user add/remove/manage surveyors or other employees?                                      |
| **Schedule management**| Can this user view/edit survey schedules?                                                          |
| **Store management**   | Can this user add/edit/deactivate stores?                                                          |
| **Location scope**     | Access restricted to specific stores, zones, regions, or all                                       |

### 0.3 — Default Role Templates

| Role                | Default Access                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Org Manager**     | Full access to everything in the org — all stores, all modules, all actions, schedule management |
| **Zone Manager**    | Read/write access to all stores in assigned zone(s), employee management within zone            |
| **Store Manager**   | Full access to assigned store(s), surveyor management, survey assignment                        |
| **Surveyor**        | Survey execution only for assigned stores. No dashboard, no analytics, no management            |

### 0.4 — Custom Users

The org manager can create users with **custom access** that doesn't fit any preset role:

- A user who manages 4-5 zones (multi-zone manager)
- A state-level manager who sees all stores in a state but can't edit schedules
- A read-only auditor who can view survey data and download reports but change nothing
- A regional surveyor coordinator who manages surveyors across a region but doesn't do surveys themselves

**How:** When creating a user, the org manager either picks a default role template OR builds a custom access map by toggling individual permissions.

### 0.5 — Frontend & Backend Enforcement

- **Backend:** Every API endpoint checks the user's access map before returning data or executing actions. No exceptions. The access map is the single source of truth.
- **Frontend:** The dashboard is modular. Sidebar items, pages, buttons, and data are shown/hidden based on the same access map. If a user doesn't have access to the Surveys module, they don't see it in the sidebar. If they have read-only access, edit buttons are hidden.
- **Access map storage:** Stored per-user in the database. Loaded on login, cached for the session, re-checked on sensitive operations.

### 0.6 — Access Hierarchy (Data Visibility)

Data flows down the hierarchy. Each level sees everything below it:

```
Org Manager → sees all zones, all stores, all surveys, all employees
  └─ Zone Manager → sees all stores in their zone(s), surveys and employees within
      └─ Store Manager → sees their assigned store(s), surveys and surveyors within
          └─ Surveyor → sees only their own assigned survey slots
```

Custom users can have access at any cut of this hierarchy.

---

## Flow 1: Organization Manager (Org Admin) — Multi-Store / Chain

### 1.1 — Onboarding: Registration

X (the org manager) visits the onboarding page. It's a multi-step form — one question per step.

**Step 1 — Account:** X registers/logs in via Shelfex SSO (name, email, password handled on SSO). After SSO authentication, X is redirected back to continue onboarding.
**Step 2 — Organization Type:** Chain / multi-store org OR single retail store.

> If X selects **single retail store** → redirected to the **Kirana Self-Registration flow** (see Flow 3).

**Step 3 — Industry:** Selection from dynamic list (e.g., FMCG, Grocery, Pharmacy, Electronics, etc.). Options managed on backend.
**Step 4 — Location:** Google Places autocomplete → HQ address.
**Step 5 — Website:** Optional.
**Step 6 — Org Name & Logo:** Org name (required), logo upload (optional). Contact number = email from Step 1.

**On Submit:**

- Org created with status `pending_approval`.
- X sees a confirmation: "Registration submitted, we'll email you once approved."
- X receives a registration confirmation email (**Email #1**).

---

### 1.2 — Approval by Super Admin

- Super admins receive **Email #2** with all org details and inline **Approve / Reject** buttons.
- Clicking either button requires super admin authentication.
- **Approve** → org becomes `active`, X receives approval email (**Email #3**) with login link and getting-started steps.
- **Reject** → org becomes `rejected`, X receives a rejection email (**Email #4**).

---

### 1.3 — First Login

X visits `manage.shelfex360.com` → redirected to Shelfex SSO for authentication (OAuth 2.0) → after login, redirected back to 360 dashboard.

- If org is `pending_approval` → message: "Still under review."
- If org is `rejected` → message: "Not approved. Contact support."
- If org is `active` → proceed to dashboard.
- **First login** → redirected to Stores page (empty state).
- **Returning user** → redirected to Dashboard home.
- If X is already logged into another Shelfex app → SSO session carries over, no login prompt.

Forgot password flow available via Shelfex SSO.

---

### 1.4 — Adding Stores

#### 1.4a — Single Store

X fills a form:

- **Store details:** Name, location (Google Places), category (dynamic list).
- **Manager assignment:** Manager name, email. Option to assign self as manager.

**On Submit:**

- Store created with status `pending_tour`.
- If manager is someone else → manager account created with temporary password, manager receives **Email #5** with login details and next steps (change password → create 360 tour → assign surveyors for scheduled slots).
- If X assigned themselves → no email needed. X sees store manager capabilities for this store within the same dashboard.
- **Survey default:** The store inherits the org's default survey schedule (see 1.6). Store manager is auto-assigned as the default surveyor for all slots.

#### 1.4b — Bulk Import via CSV

- X downloads a CSV template, fills it with store + manager details, uploads it.
- System creates stores and manager accounts.
- Each new manager receives **Email #5**.
- X sees a results summary.
- Each store inherits the org's default survey schedule. Each store manager is auto-assigned as default surveyor.

---

### 1.5 — Day-to-Day Usage: Dashboard

**Sidebar navigation:** Dashboard, Stores, Surveys, Employees, Schedule, Settings.
(Sidebar items shown/hidden based on user's access map — see Flow 0.)

---

#### Dashboard (Home)

High-level snapshot of the org:

- **Key metrics:** Total stores, active stores, stores pending tour.
- **Today's survey status:** Completion rates across all stores (based on each store's configured schedule).
- **Recent activity feed:** Survey completions, missed surveys, tours created, stores added, surveyors added. Each entry links to the relevant detail page.
- **Alerts:** E.g., stores that haven't created their 360 tour yet.

---

#### Stores

**List view:** All stores with name, city, status, last survey, assigned manager, today's survey status. Searchable, filterable by status and city, sortable.

**Store Detail — 3 tabs:**

1. **Overview:** Store info (address, category, manager). If 360 tour exists → embedded panorama viewer (from the latest survey's 360 capture) where shelf hotspots show survey photos + AI-detected products. Can compare across surveys.
2. **Surveys:** All surveys for this store. Filterable by date, time slot, status. Click through to survey detail.
3. **Employees:** Store manager and surveyors assigned to this store. Org admin can **view** who is assigned to survey slots but **cannot change assignments** — that's the store manager's job.

---

#### Surveys

List of all surveys across all stores. Filterable by date, store, time slot, status.

**Survey Detail — three view modes:**

1. **360° View:** The 360 capture from this specific survey (fresh 360 captured each time). Shelf hotspots show captured photos + AI results. Can compare with previous survey's 360 and shelf photos.
2. **Analytics View:** Analytics related to AI data captured.
3. **Questions:** If survey had configured questions, answers are shown here.

---

#### Employees

List of all store managers, surveyors, and custom-role users in the org. Searchable, filterable by role/store/zone/status.

**Employee Detail:** Profile info, assigned stores, access map summary, activity log (tours created, surveys submitted, etc.). Activity logs should be stored from day 1 — they provide granular audit trails and full operational history across the platform.

**Creating users:** Org manager can create users with:
- A default role template (store manager, zone manager, surveyor), OR
- A custom access map (see Flow 0, section 0.4).

---

#### Schedule

**Org-level survey schedule management.** This is where the org manager defines when surveys happen.

- **Default schedule:** Set the org-wide default (e.g., 2 surveys/day — Window 1: 8:00 AM–1:00 PM and 2:00 PM–7:00 PM, daily).
- **Per-store override:** Org manager can customize the schedule for individual stores — different number of surveys, different time windows, different days.
- **Schedule slots** have:
  - **Time window:** Start time and end time (e.g., 8:00 AM – 1:00 PM). The survey must be completed within this window.
  - **Recurrence:** Daily, specific weekdays, odd/even days, custom pattern.
- **Flexibility:** The system should be as flexible as possible — 1 survey/day, 5/day, 30/day, different days, different windows. Fully modular.
- **Store managers cannot create or modify the schedule.** They can only assign who executes each scheduled slot (themselves or a surveyor). See Flow 2, section 2.4.

---

#### Settings

- **Organization Profile:** Edit org name, logo, industry, location, website, org type.
- **Survey Questions:** Configurable **per store**. Org manager can define a default question set for the org, and customize questions for individual stores. Question types: Yes/No, MCQ, rating scale, short text — exact types TBD. Examples: "Is the store entrance clean?", "Are all price tags visible?", "Rate shelf organization (1-5)." Store managers and surveyors cannot modify questions — they only answer them.
- **Notification Preferences:** Toggle email notifications — survey missed (daily summary), weekly report, new manager logged in.
- **Account:** Edit own profile (password change via Shelfex SSO).

---

### 1.6 — Org-Level Survey Schedule

The org manager controls when surveys happen across all stores. This is a core change from earlier drafts.

**Flow:**
1. Org manager sets a **default schedule** (e.g., 2 surveys/day — Window 1: 8 AM–1 PM, Window 2: 2 PM–7 PM, daily).
2. When a new store is created, it inherits this default schedule.
3. Org manager can override the schedule for specific stores (e.g., Store #42 needs 3 surveys/day).
4. Store managers see the schedule but **cannot change it**. They can only assign who executes each slot.

**Survey time windows:**
- Each scheduled survey has a **time window** (start time → end time).
- Surveyor **cannot start the survey before the window opens**.
- If the survey is not completed by the window's end time → it is marked **missed**.

---

### 1.7 — Store Manager Replacement

If an org manager replaces a store manager (assigns a new person):
- The old store manager **loses all access immediately**.
- The new store manager receives **Email #5** and takes over.
- Existing surveyor assignments for that store remain intact — the new manager inherits them.

---

### 1.8 — Automated Emails

| #   | Email                                      | Trigger                        | Recipient      |
| --- | ------------------------------------------ | ------------------------------ | -------------- |
| 1   | Registration confirmation                  | Org registered                 | X              |
| 2   | New org registration (with approve/reject) | Org registered                 | Super admins   |
| 3   | Organization approved                      | Super admin approves           | X              |
| 4   | Organization rejected                      | Super admin rejects            | X              |
| 5   | Store manager account created              | Store created with new manager | New manager    |
| 6   | Weekly survey report                       | Every Monday morning           | X (if enabled) |

---

## Flow 2: Store Manager

Y is the store manager. Y could be:

- A person assigned by the org manager (via single store add or CSV import), OR
- The org manager themselves (self-assigned during store creation).

If Y is the org manager (self-assigned), they already have an account and see store manager capabilities within the same dashboard — no separate login, no role switch. The sections below describe what Y can see and do for their assigned stores.

If Y is a separate person, the flow starts from the email they received.

---

### 2.1 — Getting Started (New Store Manager)

Y receives **Email #5** (from Flow 1) — "You've been added as a store manager." The email contains a login link and temporary password.

Y clicks the link → redirected to Shelfex SSO → enters email + temporary password.

**First login — forced password change (handled by SSO):**

- SSO prompts Y to set a new password before proceeding.
- An **OTP is sent to Y's email** to verify identity before the password change is allowed. This confirms the right person is resetting the password without storing a "first login" flag in the DB.

After password change → SSO redirects Y back to the 360 dashboard.

---

### 2.2 — Store Manager Dashboard

Y sees `manage.shelfex360.com` — same platform as the org manager, but **scoped to Y's access map** (typically: their assigned stores only).

**If Y manages multiple stores:** Dashboard shows combined data across all their stores.
**If Y manages one store:** Dashboard shows that store's data directly.

**Sidebar navigation:** Dashboard, My Stores, Surveys, Employees (Surveyors), Settings.
(Items shown/hidden based on Y's access map — see Flow 0.)

---

#### Dashboard (Home)

Overview across all of Y's stores:

- **Key metrics:** Total assigned stores, stores with active tours, stores pending initial tour.
- **Upcoming surveys:** Next scheduled survey for each store — time window, assigned surveyor (or "You"), store name. Highlighted if coming up soon.
- **Today's survey status:** Completion rates across Y's stores.
- **Recent activity feed:** Survey completions, missed surveys, surveyors added, tours created/updated.

---

#### My Stores

List of all stores assigned to Y. Each store shows: name, city, status (active / pending tour / inactive), last survey, today's survey status.

**Store Detail — what Y sees for a single store:**

1. **Overview:** Store info. If 360 tour exists → embedded panorama viewer showing the latest 360 capture with shelf hotspots, survey photos, and AI-detected products. Can compare with previous surveys.
2. **Surveys:** All surveys for this store. Click through to survey detail (360 view + grid view + AI results, same as org manager sees).
3. **Surveyors:** List of surveyors assigned to this store. Y can **add, remove, and manage** surveyors here (org manager can view but cannot change — this is Y's job).
4. **Schedule (read-only):** The survey schedule for this store **as defined by the org manager**. Y can see the time windows and frequency but **cannot modify them**. Y can only assign who executes each slot (see 2.4 below).

---

### 2.3 — Initial 360 Tour Creation

When Y first accesses a store that has status `pending_tour`, they're prompted to create the initial 360 tour.

- This initial tour is what the org manager (and anyone viewing the store) will see as the "store layout" — the interactive panorama with shelf hotspots.
- Y opens the **360 Capture App** (separate mobile app, built by the capture app team) and creates the tour: walks through the store, captures panoramic scenes, labels shelves.
- The tour data syncs to the platform. Store status changes from `pending_tour` → `active`.
- The details of how the capture app works are the capture app team's scope — we consume the output.

**Important distinction:** This initial tour is for the **store's baseline 360 view**. Every subsequent survey also captures a fresh 360 (see 2.6).

---

### 2.4 — Survey Slot Assignment

The survey schedule (when and how many surveys happen) is **controlled by the org manager** (see Flow 1, section 1.6). Y cannot change the schedule itself.

**What Y controls:** Who executes each scheduled survey slot.

- When a store is created, Y (the store manager) is **auto-assigned as the default surveyor** for all slots.
- Y can reassign any slot to a surveyor they've added (see 2.5).
- Y can assign themselves back if needed.
- **Assignments are persistent.** Y assigns a surveyor to a recurring slot once (e.g., "Monday mornings → Surveyor X"), and the assignment applies to all future occurrences of that slot automatically. No need to reassign every day.
- **Availability check:** Before assigning a surveyor to a slot, the system checks if that surveyor is already booked for another survey at the same time (like a Google Calendar conflict check). If there's a conflict, assignment is blocked and Y is shown the conflict.
- Y can only assign surveyors that work for their store(s) — not surveyors from other stores or other store managers' surveyors.

---

### 2.5 — Managing Surveyors

Y controls surveyor operations for their stores. The org manager can view who is assigned but cannot change assignments.

**Adding a surveyor:**

- Y invites a surveyor by email (and optionally name).
- Surveyor receives **Email #13** with a link to download the survey app + login credentials (email + temporary password).
- Y assigns the surveyor to one or more of Y's stores.

**Removing a surveyor:**

- Y can deactivate or remove a surveyor from a store.
- If the surveyor was assigned to upcoming survey slots, Y is prompted to reassign those slots (Y becomes the default assignee again).

**Self as surveyor:**

- Y can assign themselves as the surveyor for any slot at their stores (common for single-store / kirana setups). Y is the default assignee when the store is created.

---

### 2.6 — Survey Execution (What Happens During a Survey)

This is what the surveyor (or Y, if self-surveying) does when it's survey time. Happens on the **mobile app**.

**Notifications before survey:**

- **1 hour before window opens:** Notification on app + web — "Upcoming survey for [Store Name] — window opens at [time]."
- **10 minutes before window opens:** Notification on app + web — "Survey for [Store Name] starts in 10 minutes."
- We send these notifications. The app team handles displaying them on the app side.

**Survey flow (on app):**

1. Surveyor opens the app → sees their assigned survey for this time slot.
2. **Cannot start before the time window opens.** The "Start Survey" button is disabled until the window start time.
3. **360 Capture:** Surveyor captures a fresh 360 of the store (every survey includes a new 360 capture). This lets us track how the store looks over time, not just individual shelves.
4. **Shelf Photos:** Within the 360 capture, individual shelf photos are identified/tagged (matching the shelf mapping from the initial tour).
5. **Questions (if configured):** If survey questions are configured for this store (see 2.7), the surveyor answers them after the photo capture.
6. **Submit:** Surveyor submits the survey. Photos + 360 data + question answers are uploaded.

**After submission:**

- AI processes the shelf photos (product detection — separate team's API).
- Survey appears in the dashboard for both Y (store manager) and the org manager.
- The new 360 capture becomes viewable in the survey detail.

**If survey is missed (not completed by window end time):**

- Survey is marked `missed`.
- Store manager (Y) is notified in-app.
- Org manager is **not notified immediately** — missed surveys are collected and sent as a **daily summary at end of day** (Email #6).

---

### 2.7 — Survey Questions (Configured by Org Manager, Per Store)

Survey questions are **defined by the org manager**. They are configurable **per store** — not a single global set.

- The org manager can set a **default question set** for the org (applied to all stores).
- The org manager can **override or customize** questions for individual stores (e.g., different questions for grocery vs. pharmacy stores).
- Question types: Yes/No, MCQ, rating scale, short text — TBD on exact types.
- Examples: "Is the store entrance clean?", "Are all price tags visible?", "Rate overall shelf organization (1-5)."
- Store managers and surveyors **cannot modify the questions** — they only answer them during surveys.
- The system should be very flexible and modular — easy to add new question types, conditional logic, etc. in the future.

---

### 2.8 — Viewing Survey Results

Y can view all past surveys for their stores through the dashboard.

**Survey Detail (same view modes as org manager):**

1. **360° View:** The 360 capture from this specific survey. Shelf hotspots show the captured photos + AI-detected products. Can compare with previous survey's 360 and shelf photos.
2. **Grid View:** All shelf photos in a grid. Click for full photo + AI data.
3. **Questions:** If the survey had questions, the answers are shown alongside the photo data.

Y can also see:

- Which surveyor did it, when, how long it took.
- Completion status (all shelves captured? all questions answered?).
- Comparison with previous surveys for the same store.

**No survey editing:** Once submitted, a survey cannot be edited or corrected.

---

### 2.9 — Surveyor Experience (Z's Perspective)

Z is a surveyor. Z could be:

- A dedicated surveyor invited by the store manager (Y), OR
- The store manager themselves (Y acting as their own surveyor — common for single-store / kirana setups).

If Z is Y (self-assigned), there's no separate onboarding — Y already has the app and sees their own survey assignments. The sections below describe the full experience for a **dedicated surveyor**.

---

#### 2.9a — Surveyor Onboarding

Z receives an email from the platform — "You've been invited as a surveyor for [Store Name]." The email contains:

- A link to download the 360 Capture App.
- Login credentials (email + temporary password).

Z downloads the app → logs in via Shelfex SSO → forced password change on first login (handled by SSO).

After login, Z sees a simple home screen: **their assigned stores and upcoming surveys**. No dashboard, no analytics — just the work queue.

---

#### 2.9b — Surveyor's Day-to-Day

Z opens the app. They see:

- **Today's surveys:** List of scheduled surveys for today — store name, time window, status (upcoming / in-progress / completed / missed).
- **Upcoming:** Next few days of scheduled surveys (based on the recurrence pattern).

Z doesn't configure anything. They show up, do the survey, submit.

---

#### 2.9c — Doing a Survey

When it's time for a scheduled survey:

1. **Notifications:** Z gets a reminder 1 hour before and 10 minutes before the window opens (in-app + email).
2. Z opens the app → taps on the scheduled survey. **Cannot start before the time window opens.**
3. **360 Capture:** Z captures a fresh 360 of the store (the app guides this process — capture app team's scope).
4. **Shelf Photos:** Individual shelves are captured/tagged within the 360 (matching the shelf mapping from the initial tour).
5. **Questions:** If the store has configured survey questions, Z answers them (Y/N, MCQ, rating, short text).
6. **Submit:** Z submits. Photos + 360 data + question answers are uploaded.

Z sees a confirmation. The survey now appears in Y's and the org manager's dashboards.

**If Z misses a survey:** The time window passes → survey is marked `missed` → Y (store manager) is notified in-app. Org manager receives it in the daily summary.

---

#### 2.9d — What Z Cannot Do

- Z cannot modify the survey schedule — that's set by the org manager.
- Z cannot reassign survey slots — that's the store manager's job.
- Z cannot add/remove other surveyors — that's the store manager's job.
- Z cannot see analytics, dashboards, or other stores' data.
- Z cannot modify survey questions — those are set by the org manager.

Z's scope is intentionally narrow: show up, capture, answer questions, submit.

---

#### 2.9e — Surveyor Settings (on App)

- **Profile:** Edit name, email.
- **Password:** Change password (redirects to Shelfex SSO).
- **Notifications:** Toggle survey reminders on/off.

---

### 2.10 — Store Manager Settings

- **Profile:** Edit own name, email.
- **Password:** Change password.

---

### 2.11 — Automated Emails & Notifications

| #   | Notification                        | Channel                  | Recipient | Trigger                                                                      |
| --- | ----------------------------------- | ------------------------ | --------- | ---------------------------------------------------------------------------- |
| 5   | Account created + login details     | Email                    | Y         | Org manager adds Y as store manager                                          |
| 8   | Upcoming survey (1 hour before)     | App + Email              | Z (or Y)  | Scheduled survey window approaching                                          |
| 9   | Upcoming survey (10 min before)     | App + Email              | Z (or Y)  | Scheduled survey window imminent                                             |
| 10  | Survey completed by surveyor        | Web + Email (if enabled) | Y         | Z completes a survey                                                         |
| 11  | Survey missed                       | Web (in-app)             | Y         | A scheduled survey was not completed within its time window                  |
| 12  | Surveyor added/removed confirmation | Web                      | Y         | Y adds or removes a surveyor                                                 |
| 13  | Surveyor invited                    | Email                    | Z         | Y adds Z as a surveyor                                                       |
| 6   | Daily missed survey summary         | Email                    | X (org)   | End of day — lists all missed surveys across the org (not real-time per miss) |

---

## Flow 3: Single Store / Kirana Self-Registration

K is a kirana (single retail store) owner who registers independently — not added by an organization.

### 3.1 — Registration

K visits the onboarding page. Same multi-step form as Flow 1.

**Step 1 — Account:** Name, email, password.
**Step 2 — Organization Type:** K selects **"Single retail store"**.

> This routes K to the kirana-specific flow (remaining steps below), NOT the multi-store org flow.

**Step 3 — Industry:** Selection from dynamic list (Grocery, Sweets, General Store, etc.).
**Step 4 — Store Location:** Google Places autocomplete → the store's physical address.
**Step 5 — Store Name & Logo:** Store name (required), logo/photo upload (optional).

**On Submit:**

- An org is automatically created with K as the **org manager**.
- A store is automatically created under that org with K as the **store manager**.
- K is also auto-assigned as the **default surveyor** for all survey slots.
- **No approval needed.** The org is created with status `active` immediately.
- K sees a confirmation and is redirected to the dashboard.
- K receives a welcome email (**Email #14**).

> **Key difference from Flow 1:** No `pending_approval` state. Kirana store owners get instant access. This is because they are individual stores (the supply side), not enterprise clients who need vetting.

---

### 3.2 — What K Sees (Dashboard)

K sees the **full dashboard** — they are the org manager, store manager, and surveyor all in one. Their access map has full permissions for everything.

**Sidebar navigation:** Dashboard, My Store, Surveys, Employees, Schedule, Settings.
(Same sidebar as org manager, but with data scoped to their single store.)

**Dashboard (Home):**

- Key metrics for their one store (survey completion, tour status).
- Upcoming surveys (K is the default surveyor).
- Recent activity.

**My Store:**

- Store profile, 360 tour viewer, surveys, surveyors.
- K can add surveyors if they want someone else to do surveys.

**Schedule:**

- K configures their own survey schedule (since they are both the org manager and store manager, they control everything).
- Default: 2 surveys/day. K can change this.

**Settings:**

- Org profile (which is just their store's profile in this case).
- Survey questions — K can configure questions for their store.
- Notification preferences, account settings.

---

### 3.3 — Initial 360 Tour

After first login, K is guided to create the initial 360 tour (same as Flow 2, section 2.3).

- K opens the 360 Capture App → creates the tour → tour syncs to platform.
- Store status changes from `pending_tour` → `active`.
- K can now start doing surveys.

---

### 3.4 — Day-to-Day: Surveying

K is auto-assigned as the surveyor. When a scheduled survey window opens:

1. K gets notifications (1 hour before, 10 minutes before).
2. K opens the app → captures fresh 360 + shelf photos + answers questions.
3. K submits.
4. Survey appears in K's dashboard.

K can also add surveyors if they want help (same as Flow 2, section 2.5).

---

### 3.5 — Public Store Page

Each store (kirana or org-managed) gets a unique public URL: `shelfex360.com/{store-slug}`.

**What the public page shows (no authentication required):**

- Store name, address, category, logo/photo.
- The latest 360 tour — interactive panorama viewer. Visitors can look around.
- Basic store details (operating hours, contact info — if provided).

**What is NOT shown on the public page:**

- Survey data, shelf photos, AI detection results.
- Employee information, survey schedules.
- Any internal operational data.

---

### 3.6 — Automated Emails

| #   | Email              | Trigger                  | Recipient |
| --- | ------------------ | ------------------------ | --------- |
| 14  | Welcome + get started | Kirana store registered  | K         |

(All other survey-related emails from Flow 2 section 2.11 also apply to K when they act as surveyor/store manager.)

---

_Super Admin flow will be added later. For now, org approvals happen via email (see Flow 1, section 1.2)._
