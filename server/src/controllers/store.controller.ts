import { Request, Response } from 'express';
import { parse as parseCsv } from 'csv-parse/sync';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listStoresSchema, csvRowSchema } from '../validations/store.validation';
import {
  createStore,
  listStores,
  getStoreById,
  updateStore,
  deactivateStore,
  bulkImportStores,
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

// POST /stores/bulk-import — bulk create stores from a CSV upload
// Expects multipart/form-data with a single "file" field (CSV, max 2 MB)
//
// CSV columns (header row required):
//   store_name*, city*, state, postal_code, country,
//   contact_phone, contact_email, zone_name,
//   manager_name*, manager_email*   (* = required)
//
// Per-row behaviour:
//   - Rows that fail validation are skipped and reported in `failed[]`
//   - If manager_email already exists in the org (active) → reuse, no invite sent
//   - If manager_email already exists but is inactive → skip the row with an error
//   - Same email across multiple rows → user created once, assigned to each store
//   - Zone name that doesn't match an existing zone → silently set to null
export const bulkImport = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    ApiResponse.badRequest(res, 'No file uploaded. Send a CSV file in the "file" field.');
    return;
  }

  // Browsers may send text/csv, application/vnd.ms-excel, or text/plain for CSVs
  const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'];
  if (!allowed.includes(file.mimetype)) {
    ApiResponse.badRequest(res, `Invalid file type "${file.mimetype}". Please upload a CSV file.`);
    return;
  }

  // ── Parse CSV ──────────────────────────────────────────────────────────────
  let rawRecords: Record<string, string>[];
  try {
    rawRecords = parseCsv(file.buffer, {
      // Normalise column headers: trim + lowercase + collapse spaces to underscore
      columns: (header: string[]) =>
        header.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')),
      skip_empty_lines: true,
      trim: true,
      bom: true,           // Strip UTF-8 BOM (common in Excel-exported CSVs)
      relax_column_count: true, // Don't error on extra/missing columns
      relax_quotes: true,       // Tolerate imperfect quoting
    });
  } catch (err) {
    ApiResponse.badRequest(res, `Could not parse CSV: ${(err as Error).message}`);
    return;
  }

  if (rawRecords.length === 0) {
    ApiResponse.badRequest(res, 'The CSV file contains no data rows.');
    return;
  }

  // ── Validate each row with Zod ─────────────────────────────────────────────
  const validRows: { row: ReturnType<typeof csvRowSchema.parse>; rowNum: number }[] = [];
  const failed: { row: number; storeName: string; reason: string }[] = [];

  for (let i = 0; i < rawRecords.length; i++) {
    const rowNum = i + 2; // +1 for 1-index, +1 for header row
    const raw = rawRecords[i];
    const storeName = (raw.store_name ?? '').trim() || `Row ${rowNum}`;

    const result = csvRowSchema.safeParse(raw);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      failed.push({
        row: rowNum,
        storeName,
        reason: `${firstIssue.path.join('.') || 'field'}: ${firstIssue.message}`,
      });
    } else {
      validRows.push({ row: result.data, rowNum });
    }
  }

  if (validRows.length === 0) {
    ApiResponse.badRequest(res, 'No valid rows found. Fix validation errors and re-upload.');
    return;
  }

  // ── Delegate to service ────────────────────────────────────────────────────
  const result = await bulkImportStores(req.orgId!, req.accessMap!.userId, validRows);

  ApiResponse.created(
    res,
    {
      created: result.created.length,
      createdDetails: result.created,
      failed: [...failed, ...result.failed],
    },
    `Bulk import complete: ${result.created.length} store(s) created`,
  );
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
