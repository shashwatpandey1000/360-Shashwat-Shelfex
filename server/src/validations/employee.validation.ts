import { z } from 'zod';

export const createEmployeeSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required').max(100),
  roleTemplate: z.enum(['org_manager', 'zone_manager', 'store_manager', 'surveyor']),
  scopeType: z.enum(['org', 'zones', 'stores']),
  scopeEntityIds: z.array(z.string().uuid()).optional().default([]),
  phone: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  roleTemplate: z.enum(['org_manager', 'zone_manager', 'store_manager', 'surveyor']).optional(),
  scopeType: z.enum(['org', 'zones', 'stores']).optional(),
  scopeEntityIds: z.array(z.string().uuid()).optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const listEmployeesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  roleTemplate: z.enum(['org_manager', 'zone_manager', 'store_manager', 'surveyor']).optional(),
  status: z.enum(['active', 'inactive', 'pending_first_login']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'roleTemplate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListEmployeesQuery = z.infer<typeof listEmployeesSchema>;

export const assignManagerSchema = z.object({
  employeeId: z.string().uuid('Valid employee ID is required'),
});

export type AssignManagerInput = z.infer<typeof assignManagerSchema>;
