# ShelfEx 360 — Build Timeline

> **Target:** Production-ready platform by **July 15, 2026**
> **Duration:** ~14 weeks (Apr 4 – Jul 15)
> **Team:** 1 full-stack developer + AI coding assistant

---

## Already Completed (~8–10 weeks of equivalent effort)

| Area | What was built |
|------|---------------|
| **Shelfex SSO** | Complete OAuth 2.0 authorization server from scratch — registration, email OTP verification, bcrypt hashing, PKCE, JWT issuance + refresh token rotation, cross-app SSO, password reset, rate limiting, audit logging. Full server + client, deployed to production. Serves as identity layer for all Shelfex products. |
| **ShelfIntel** | Parallel Shelfex product built on the same SSO — validated cross-app auth architecture |
| **360 Architecture** | HLD (modular monolith + microservices), user flow docs (4 personas), feature spec (9 modules), tour data contract |
| **360 Database** | 27-table PostgreSQL schema — IAM-style permissions, multi-tenant (`org_id` everywhere), Drizzle ORM, migrated to Neon |
| **360 Server** | Express.js baseline — Helmet, CORS, compression, rate limiting, Zod validation, ApiResponse utility, async error handling, graceful shutdown, Winston logging |
| **360 Client** | Next.js — SSO auth flow, auth context, protected routes, dashboard layout shell |
| **360 ↔ SSO** | OAuth code exchange, PKCE, HTTP-only cookies, token refresh with rotation, logout with revocation |
| **Security** | OWASP-aligned: parameterized queries, input validation, rate limiting, security headers, CSRF protection, no raw SQL |

---

## Why This Timeline Is Tight

This is a **multi-tenant SaaS platform** with IAM access control, timezone-aware scheduling, 360° tour integration, and real-time survey workflows — built by one developer.

- **Schedule engine** — timezone-aware recurrence → concrete UTC slots, DST handling, idempotent materialization, conflict detection. A bug here breaks every survey count for every store.
- **IAM permissions are cross-cutting** — every endpoint checks permissions + filters data by scope. Different resolution logic per resource (zone hierarchy vs store assignment).
- **Multi-tenancy overhead** — every query, index, and test must enforce tenant isolation. One missed `WHERE org_id = ?` is a data leak.
- **3-team serial dependency** — tour exists → survey happens → AI processes → dashboard has value.
- **AI assistance doesn't eliminate the bottleneck** — decisions (schema tradeoffs, permission edge cases, timezone math, integration contracts) require human judgment.

**Assumes:** zero scope additions, capture app team delivers tour format by mid-May.

---

## Phase-Wise Timeline

### Phase 0 — Foundation · Apr 7 – Apr 11 (1 week)

> Access map system, permission enforcement, seed data

- Seed: industries, store categories, 4 system role templates + all IAM permissions
- Access map materialization service (permissions + data scopes → cached JSON)
- `requirePermission('resource:action')` middleware
- Tenant context middleware + data scope SQL filter builder
- Tests: all 4 role types enforced correctly

---

### Phase 1 — Org Lifecycle · Apr 14 – Apr 23 (1.5 weeks)

> Registration → approval → dashboard entry point

- **Server:** Org registration (create org + user + permissions atomically), super admin approve/reject, org settings, kirana self-registration
- **Client:** Multi-step onboarding form, pending/approved/rejected screens, dashboard layout shell (sidebar from permissions, header, user menu), settings page

---

### Phase 2 — Stores & Employees · Apr 24 – May 9 (2.5 weeks)

> The two most referenced entities — everything else depends on these

- **Server:** Store CRUD (create, list/filter/search/paginate, detail, update, deactivate), zone CRUD (hierarchy), employee CRUD (from role template + custom permissions), store manager assignment/replacement, CSV bulk store import, data scope enforcement
- **Client:** Store list (data table, search, filters, pagination), store create form (Google Places, manager assignment), store detail (tabs), CSV import UI, employee list (filterable), employee create (role template picker + custom permission grid), employee detail

---

### Phase 3 — Schedule Engine · May 10 – May 25 (2.5 weeks)

> Most complex module — templates → recurrence → materialized slots

- **Server:** Schedule template CRUD (org default + per-store override), recurrence rules (daily/weekdays/specific/interval/exceptions), time windows, slot materializer (timezone-aware, idempotent), surveyor assignment (persistent, conflict detection), slot status state machine
- **Client:** Schedule builder (template + rules + time windows), schedule calendar view (materialized slots), surveyor assignment UI (conflict warnings)
- Timezone testing: DST, midnight-spanning, IST + US/Eastern

---

### Phase 4 — Tours & Surveys · May 26 – Jun 8 (2 weeks)

> Tour ingestion + full survey lifecycle + form engine

- **Server:** Tour sync API (manifest → scenes + shelves, store status update), survey start + submission (time window enforcement), survey list + detail APIs, form definition CRUD + per-store assignment, S3 presigned URLs, AI result ingestion webhook
- **Client:** Survey list (filterable), survey detail (photo grid + shelf photos + questions + AI results), form builder (question types, per-store override), 360° panorama viewer

---

### Phase 5 — Dashboard & Notifications · Jun 9 – Jun 20 (2 weeks)

> What managers see every day + notification system + surveyor APIs

- **Server:** Dashboard metrics (store counts, survey completion, alerts), activity feed, survey compliance (missed rates per store), in-app notification CRUD, email notification triggers (SES — org approved, manager assigned, surveyor invited), surveyor-facing APIs (my slots, slot detail), reminder + missed survey scheduled jobs
- **Client:** Dashboard home (metric cards, today's status, activity feed, alerts), survey compliance view (missed list + charts), notification bell + dropdown, public store page (`/{slug}` — SSR, 360 tour embed)

---

### Phase 6 — i18n, Polish & Hardening · Jun 21 – Jun 30 (1.5 weeks)

> Cross-cutting quality pass

- i18n setup (externalize all strings, English + Hindi, language switcher)
- Error boundaries + loading skeletons + empty states across all pages
- Mobile responsiveness pass
- Performance: EXPLAIN ANALYZE on hot queries, missing indexes
- Security audit: permission bypass testing, cross-tenant access, OWASP review

---

### Phase 7 — Integration Testing & Launch Prep · Jul 1 – Jul 15 (2 weeks)

> Full journey testing, bug fixes, deployment

- End-to-end tests: register org → add stores → create schedule → submit survey → view dashboard
- Multi-role simultaneous testing (org manager + store manager + surveyor)
- Cross-module data integrity verification
- Staging deployment + real data testing
- Bug fixes + QA buffer
- Production environment prep + deployment
