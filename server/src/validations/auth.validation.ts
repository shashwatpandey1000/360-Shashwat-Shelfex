import { z } from 'zod';

export const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  code_verifier: z.string().optional(),
});

export type CallbackInput = z.infer<typeof callbackSchema>;

export const introspectSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  clientId: z.string().min(1, 'clientId is required'),
});

export type IntrospectInput = z.infer<typeof introspectSchema>;
