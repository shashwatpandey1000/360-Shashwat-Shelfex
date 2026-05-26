# Admin Module

## 1. Overview
Super-admin operations for platform-level management. Not accessible to org users —
all routes require the `superAdminMiddleware`. Primary use: approving or rejecting new org registrations.

## 2. File Map
| File | Responsibility |
|------|---------------|
| admin.routes.ts | Route definitions, all protected by superAdminMiddleware |
| admin.controller.ts | Parse req, call org service + email service, return ApiResponse |
| admin.types.ts | Type definitions (minimal) |
| index.ts | Exports `adminRouter` |

## 3. Public Contract
**Server exports:** `adminRouter` (mounted at `/api/v1/admin`)

**Routes:**
- `GET /admin/orgs/pending` — list orgs awaiting approval
- `POST /admin/orgs/:id/approve` — approve org (sends approval email)
- `POST /admin/orgs/:id/reject` — reject org (sends rejection email)
- `GET /admin/orgs/:id` — get any org by ID

## 4. Core Rules & Edge Cases
- All routes protected by `superAdminMiddleware` — NOT the standard JWT authMiddleware
- Super admins are stored in a separate table, not `users` table
- Admin module has NO own service — it delegates to `../org` (cross-module import via org's index.ts)
- Cross-module dep: imports `listPendingOrgs`, `approveOrg`, `rejectOrg`, `getOrgById` from `../org`
