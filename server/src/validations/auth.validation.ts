import { z } from 'zod';

export const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  code_verifier: z.string().optional(),
});

export type CallbackInput = z.infer<typeof callbackSchema>;
