# Org Module

## 1. Overview
Manages organization lifecycle: registration, admin approval/rejection, and settings management.
Every authenticated request carries an `orgId`; this module owns the organization record that
backs it. Org status controls what features an org can access (`pending`, `active`, `rejected`, `suspended`).

## 2. File Map
| File | Responsibility |
|------|---------------|
| org.routes.ts | Route definitions for org registration, settings, profile |
| org.controller.ts | Parse req, call service, return ApiResponse |
| org.service.ts | Business logic: org creation, approval, settings update, status checks |
| org.types.ts | Zod schemas (RegisterOrgInput, UpdateOrgSettingsInput) and TS types |
| index.ts | Exports `orgRouter` + service functions used cross-module |

## 3. Public Contract
**Server exports:** `orgRouter` (mounted at `/api/v1/orgs`)
**Cross-module service exports:** `getOrgSettings`, `getOrgById`, `listPendingOrgs`, `approveOrg`, `rejectOrg`

**Routes:**
- `POST /orgs/register` — register a new organization
- `GET /orgs/settings` — get current org settings
- `PATCH /orgs/settings` — update org settings

## 4. Core Rules & Edge Cases
- Org status flow: `pending_approval` → (admin approves) → `active` OR (admin rejects) → `rejected`
- Only `active` orgs can access the dashboard; `pending_approval` orgs see the onboarding pending page
- `getOrgSettings` is consumed by `employee.controller` to get org name for invite emails
- `getOrgById`, `listPendingOrgs`, `approveOrg`, `rejectOrg` are consumed by `admin` module
- Org name and industry are set during registration; cannot be changed after approval (enforce in service)
- `findSuperAdmin` and `listActiveSuperAdmins` are also exported and used by `superAdmin.middleware` and the retry job
