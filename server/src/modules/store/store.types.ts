import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  categoryId: z.string().uuid('Invalid category').optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    formattedAddress: z.string().optional(),
  }),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  timezone: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  operatingHours: z
    .record(z.string(), z.object({ open: z.string(), close: z.string() }))
    .optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const updateStoreSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      formattedAddress: z.string().optional(),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional()
    .nullable(),
  timezone: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  operatingHours: z
    .record(z.string(), z.object({ open: z.string(), close: z.string() }))
    .optional(),
});

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

export const listStoresSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(500).default(25),
  search: z.string().optional(),
  status: z.enum(['pending_tour', 'active', 'inactive']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListStoresQuery = z.infer<typeof listStoresSchema>;

// CSV row schema — used for server-side validation of bulk import rows
// Column names are normalised to lowercase_underscore before validation
export const csvRowSchema = z.object({
  store_name: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name must not exceed 100 characters'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional().default(''),
  postal_code: z.string().optional().default(''),
  country: z.string().optional().default(''),
  contact_phone: z.string().optional().default(''),
  contact_email: z
    .string()
    .optional()
    .default('')
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid contact email'),
  zone_name: z.string().optional().default(''),
  manager_name: z.string().min(1, 'Manager name is required'),
  manager_email: z
    .string()
    .min(1, 'Manager email is required')
    .email('Invalid manager email')
    .transform((v) => v.toLowerCase().trim()),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
