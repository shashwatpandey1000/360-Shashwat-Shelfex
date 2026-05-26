# Employees Feature

## 1. Overview
Manages employee lifecycle UI within an org: paginated list with search/filter, employee detail view,
and invite dialog. Enforces role hierarchy display (org_manager > zone_manager > store_manager > surveyor).
All data operations go through TanStack Query hooks backed by the /api/v1/employees REST endpoints.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Raw Axios calls for employee CRUD (list, getById, create, update, deactivate, reactivate, assignStoreManager) |
| queries.ts | useEmployeesQuery (paginated list), useEmployeeByIdQuery |
| mutations.ts | useCreateEmployeeMutation, useUpdateEmployeeMutation, useDeactivateEmployeeMutation, useReactivateEmployeeMutation, useAssignStoreManagerMutation |
| types.ts | EmployeeRow interface, ROLE_LABELS map |
| components/EmployeeList.tsx | Full paginated employee table with search, role filter, status filter, per-page |
| components/EmployeeDetail.tsx | Employee detail view with permissions and scopes |
| components/AddEmployeeDialog.tsx | Invite new employee modal (role + scope selection) |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** EmployeeList, EmployeeDetail, AddEmployeeDialog, useEmployeesQuery, useEmployeeByIdQuery, useCreateEmployeeMutation, useDeactivateEmployeeMutation

## 4. Core Rules & Edge Cases
- ROLE_LABELS drives all role display strings — do not hardcode role names in components
- EmployeeDetail accepts `id` as a prop (not from useParams) — page passes it from URL params
- Deactivation is optimistic-UI with cache invalidation; reactivation follows the same pattern
- Search is debounced 400ms to avoid excessive API calls
- useAssignStoreManagerMutation calls /stores/:storeId/manager (cross-domain endpoint)
