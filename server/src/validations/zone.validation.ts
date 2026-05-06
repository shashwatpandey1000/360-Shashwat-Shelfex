import { z } from 'zod';

export const createZoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required').max(100),
  description: z.string().max(500).optional(),
  parentZoneId: z.string().uuid('Invalid parent zone').optional().nullable(),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  parentZoneId: z.string().uuid().optional().nullable(),
});

export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

export const listZonesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  parentZoneId: z.string().uuid().optional(),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListZonesQuery = z.infer<typeof listZonesSchema>;
