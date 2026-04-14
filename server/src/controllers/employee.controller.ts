import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listEmployeesSchema } from '../validations/employee.validation';
import {
  createEmployee,
  listEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  assignStoreManager,
} from '../services/employee.service';
import { getOrgSettings } from '../services/org.service';

// POST /employees — create an invited employee
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('employees:write')
//   2. validate(createEmployeeSchema) → email, name, roleTemplate, scopeType required
//   3. Controller: creates 360 user with sso_user_id=null, status=pending_first_login,
//      copies role template permissions, sets data scopes
export const create = asyncHandler(async (req: Request, res: Response) => {
  try {
    const org = await getOrgSettings(req.orgId!);
    const employee = await createEmployee(req.orgId!, req.body, req.accessMap!.userId, org?.name);
    ApiResponse.created(res, employee, 'Employee invited');
  } catch (err: any) {
    ApiResponse.badRequest(res, err.message);
  }
});

// GET /employees — list employees with search, filters, pagination
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('employees:read')
//   2. Controller: queries all users in org, applies search/filters/pagination
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listEmployeesSchema.parse(req.query);
  const result = await listEmployees(req.orgId!, query);
  ApiResponse.success(res, result);
});

// GET /employees/:id — employee detail with permissions + scopes
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('employees:read')
//   2. Controller: returns full user + permissions list + scope entity IDs
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const employee = await getEmployeeById(req.orgId!, id);

  if (!employee) {
    ApiResponse.notFound(res, 'Employee not found');
    return;
  }

  ApiResponse.success(res, employee);
});

// PATCH /employees/:id — update employee role, scope, or basic info
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('employees:write')
//   2. validate(updateEmployeeSchema)
//   3. Controller: if roleTemplate changed → rewrites permissions from new template.
//      if scopeType/scopeEntityIds changed → rewrites data scopes
export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = await updateEmployee(req.orgId!, id, req.body);

  if (!updated) {
    ApiResponse.notFound(res, 'Employee not found');
    return;
  }

  ApiResponse.success(res, updated, 'Employee updated');
});

// POST /employees/:id/deactivate — soft-delete employee
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('employees:delete')
//   2. Controller: sets status=inactive, clears store.manager_id if they managed stores
export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = await deactivateEmployee(req.orgId!, id);

  if (!updated) {
    ApiResponse.notFound(res, 'Employee not found');
    return;
  }

  ApiResponse.success(res, updated, 'Employee deactivated');
});

// POST /stores/:storeId/manager — assign store manager
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('stores:write')
//   2. validate(assignManagerSchema) → { employeeId }
//   3. Controller: verifies employee exists + is active → sets stores.manager_id
export const assignManager = asyncHandler(async (req: Request, res: Response) => {
  const storeId = req.params.storeId as string;
  const { employeeId } = req.body;

  try {
    const store = await assignStoreManager(req.orgId!, storeId, employeeId);
    ApiResponse.success(res, store, 'Store manager assigned');
  } catch (err: any) {
    ApiResponse.badRequest(res, err.message);
  }
});
