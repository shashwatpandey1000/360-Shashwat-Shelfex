import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listStoresSchema } from '../validations/store.validation';
import {
  createStore,
  listStores,
  getStoreById,
  updateStore,
  deactivateStore,
} from '../services/store.service';

// POST /stores — create a new store
// Steps:
//   1. authMiddleware → verifies JWT, loads access map
//   2. tenantContext → sets req.orgId from access map
//   3. requirePermission('stores:write') → checks user can create stores
//   4. validate(createStoreSchema) → Zod validates body (name, address required)
//   5. Controller: calls createStore() → generates slug, inserts row, returns store
export const create = asyncHandler(async (req: Request, res: Response) => {
  const store = await createStore(req.orgId!, req.body);
  ApiResponse.created(res, store, 'Store created');
});

// GET /stores — list stores with search, filters, pagination
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('stores:read')
//   2. Controller: validates query params (page, perPage, search, status, sort)
//   3. calls listStores() which:
//      - applies data scope filter (org/zones/stores based on access map)
//      - applies search (name, city via JSONB)
//      - applies status filter
//      - applies pagination + sorting
//      - returns { data, total, page, perPage, totalPages }
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listStoresSchema.parse(req.query);
  const result = await listStores(req.orgId!, req.accessMap!, query);
  ApiResponse.success(res, result);
});

// GET /stores/:id — get single store detail
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('stores:read')
//   2. Controller: calls getStoreById() with scope filter
//      - if scope doesn't allow access to this store → returns null → 404
//      - otherwise returns full store record
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const store = await getStoreById(req.orgId!, id, req.accessMap!);

  if (!store) {
    ApiResponse.notFound(res, 'Store not found');
    return;
  }

  ApiResponse.success(res, store);
});

// PATCH /stores/:id — update store details
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('stores:write')
//   2. validate(updateStoreSchema) → all fields optional
//   3. Controller: calls updateStore() → updates only provided fields → returns updated store
export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  // Verify store exists and user has scope access
  const existing = await getStoreById(req.orgId!, id, req.accessMap!);
  if (!existing) {
    ApiResponse.notFound(res, 'Store not found');
    return;
  }

  const updated = await updateStore(req.orgId!, id, req.body);
  ApiResponse.success(res, updated, 'Store updated');
});

// POST /stores/:id/deactivate — soft-delete a store
// Steps:
//   1. authMiddleware → tenantContext → requirePermission('stores:delete')
//   2. Controller: verifies store exists + scope access → sets status to 'inactive'
export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const existing = await getStoreById(req.orgId!, id, req.accessMap!);
  if (!existing) {
    ApiResponse.notFound(res, 'Store not found');
    return;
  }

  if (existing.status === 'inactive') {
    ApiResponse.badRequest(res, 'Store is already inactive');
    return;
  }

  const updated = await deactivateStore(req.orgId!, id);
  ApiResponse.success(res, updated, 'Store deactivated');
});
