import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listZonesSchema } from '../validations/zone.validation';
import {
  createZone,
  listZones,
  getZoneById,
  updateZone,
  deleteZone,
  getAllZones,
} from '../services/zone.service';

// POST /zones — create a new zone
export const create = asyncHandler(async (req: Request, res: Response) => {
  try {
    const zone = await createZone(req.orgId!, req.body);
    ApiResponse.created(res, zone, 'Zone created');
  } catch (err: any) {
    ApiResponse.badRequest(res, err.message);
  }
});

// GET /zones — list zones with search, filters, pagination
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = listZonesSchema.parse(req.query);
  const result = await listZones(req.orgId!, query);
  ApiResponse.success(res, result);
});

// GET /zones/all — flat list of all zones (for dropdowns)
export const all = asyncHandler(async (req: Request, res: Response) => {
  const data = await getAllZones(req.orgId!);
  ApiResponse.success(res, data);
});

// GET /zones/:id — get single zone detail
export const detail = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const zone = await getZoneById(req.orgId!, id);

  if (!zone) {
    ApiResponse.notFound(res, 'Zone not found');
    return;
  }

  ApiResponse.success(res, zone);
});

// PATCH /zones/:id — update zone
export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const existing = await getZoneById(req.orgId!, id);
  if (!existing) {
    ApiResponse.notFound(res, 'Zone not found');
    return;
  }

  try {
    const updated = await updateZone(req.orgId!, id, req.body);
    ApiResponse.success(res, updated, 'Zone updated');
  } catch (err: any) {
    ApiResponse.badRequest(res, err.message);
  }
});

// DELETE /zones/:id — delete zone
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const existing = await getZoneById(req.orgId!, id);
  if (!existing) {
    ApiResponse.notFound(res, 'Zone not found');
    return;
  }

  try {
    await deleteZone(req.orgId!, id);
    ApiResponse.success(res, null, 'Zone deleted');
  } catch (err: any) {
    ApiResponse.badRequest(res, err.message);
  }
});
