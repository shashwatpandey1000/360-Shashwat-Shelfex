import { z } from 'zod';

export const updateOrgSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
  defaultLanguage: z.string().min(2).max(5).optional(),
  industryId: z.string().uuid().optional(),
  hqAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      formattedAddress: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  settings: z
    .object({
      notificationPrefs: z
        .object({
          missedSurveyDaily: z.boolean().optional(),
          weeklyReport: z.boolean().optional(),
          newManagerLogin: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsSchema>;
