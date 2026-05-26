# Employee Module

## 1. Overview
Manages the lifecycle of users within an organization: invitation, role assignment, scope control,
and activation/deactivation. "Employees" are users invited by an org manager; they are created
with `sso_user_id=null` and `status=pending_first_login` until they register via SSO.

## 2. File Map
| File | Responsibility |
|------|---------------|
| employee.routes.ts | Route definitions with auth + tenant + permission middleware chain |
| employee.controller.ts | Parse req, call service, return ApiResponse |
| employee.service.ts | Business logic: role hierarchy, scope bounds, DB queries |
| employee.types.ts | Zod schemas (CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesQuery) and TS types |
| index.ts | Exports `employeeRouter` |

## 3. Public Contract
**Server exports:** `employeeRouter` (mounted at `/api/v1/employees`)

**Routes:**
- `POST /employees` — invite a new employee (requires `employees:write`)
- `GET /employees` — list employees with search/filter/pagination (requires `employees:read`)
- `GET /employees/:id` — employee detail with permissions + scopes (requires `employees:read`)
- `PATCH /employees/:id` — update employee (requires `employees:write`)
- `POST /employees/:id/deactivate` — deactivate (requires `employees:delete`)
- `POST /employees/:id/reactivate` — reactivate (requires `employees:delete`)

## 4. Core Rules & Edge Cases
- **Role hierarchy** — `CREATABLE_ROLES` map enforces who can create whom (org_manager > zone_manager > store_manager > surveyor)
- **Scope bounds** — store_managers can only assign stores within their own scope
- **Invitation flow** — `sso_user_id=null`, `status=pending_first_login` until SSO registration
- **Email sending** — invite email is fire-and-forget; failure does not block employee creation
- **Cross-module dep** — `employee.controller` imports `getOrgSettings` from `../org` (org's index) to pass org name to invite email
