import { z } from 'zod';

export const registerOrgSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  orgType: z.enum(['chain', 'single_store']),
  industryId: z.string().uuid('Invalid industry'),
  country: z.string().length(2, 'Country must be ISO 3166-1 alpha-2').default('IN'),
  currency: z.string().length(3, 'Currency must be ISO 4217').default('INR'),
  timezone: z.string().min(1).default('Asia/Kolkata'),
  website: z.string().url().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  hqAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      formattedAddress: z.string().optional(),
    })
    .optional(),
});

export type RegisterOrgInput = z.infer<typeof registerOrgSchema>;

export const approveOrgSchema = z.object({
  // no body needed — org ID comes from URL params
});

export const rejectOrgSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});

export type RejectOrgInput = z.infer<typeof rejectOrgSchema>;
