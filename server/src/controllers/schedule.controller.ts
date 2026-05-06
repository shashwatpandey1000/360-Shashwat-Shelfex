import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import {
  createTemplateSchema,
  updateTemplateSchema,
  createRuleSchema,
  updateRuleSchema,
  createWindowSchema,
  updateWindowSchema,
  listSlotsSchema,
  assignSurveyorSchema,
  updateSlotStatusSchema,
  createAssignmentSchema,
  previewSlotsSchema,
} from '../validations/schedule.validation';

import {
  createTemplate,
  listTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  createRule,
  updateRule,
  deleteRule,
  createWindow,
  updateWindow,
  deleteWindow,
  listSlots,
  getSlotById,
  assignSurveyor,
  updateSlotStatus,
  listAssignments,
  createAssignment,
  deleteAssignment,
  getStoreEffectiveTemplate,
  previewSlots,
  triggerManualMaterialize,
} from '../services/schedule.service';

// ─── Templates ────────────────────────────────────────────────────────────────

export const createTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await createTemplate(req.orgId!, req.accessMap!.userId, req.body);
  ApiResponse.created(res, template, 'Template created');
});

export const listTemplatesHandler = asyncHandler(async (req: Request, res: Response) => {
  const templates = await listTemplates(req.orgId!);
  ApiResponse.success(res, templates);
});

export const getTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await getTemplateById(req.orgId!, req.params['id'] as string);
  if (!template) { ApiResponse.notFound(res, 'Template not found'); return; }
  ApiResponse.success(res, template);
});

export const getOrgDefaultTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const templates = await listTemplates(req.orgId!);
  const def = templates.find((t) => t.storeId === null && t.isActive);
  if (!def) { ApiResponse.notFound(res, 'No active org-default template found'); return; }
  const full = await getTemplateById(req.orgId!, def.id);
  ApiResponse.success(res, full);
});

export const updateTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await updateTemplate(req.orgId!, req.params['id'] as string, req.body);
  if (!template) { ApiResponse.notFound(res, 'Template not found'); return; }
  ApiResponse.success(res, template, 'Template updated');
});

export const deleteTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const ok = await deleteTemplate(req.orgId!, req.params['id'] as string);
  if (!ok) { ApiResponse.notFound(res, 'Template not found'); return; }
  ApiResponse.success(res, null, 'Template deleted');
});

export const previewSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = previewSlotsSchema.parse(req.body);
  const slots = await previewSlots(req.orgId!, req.params['id'] as string, input);
  if (!slots) { ApiResponse.notFound(res, 'Template not found'); return; }
  ApiResponse.success(res, slots);
});

export const materializeHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await triggerManualMaterialize(req.orgId!, req.params['id'] as string);
  if (!result) { ApiResponse.notFound(res, 'Template not found'); return; }
  ApiResponse.success(res, result, `Materialised: ${result.created} created, ${result.skipped} skipped`);
});

// ─── Rules ────────────────────────────────────────────────────────────────────

export const createRuleHandler = asyncHandler(async (req: Request, res: Response) => {
  const rule = await createRule(req.orgId!, req.params['id'] as string, req.body);
  if (!rule) { ApiResponse.notFound(res, 'Template not found'); return; }
  ApiResponse.created(res, rule, 'Rule created');
});

export const updateRuleHandler = asyncHandler(async (req: Request, res: Response) => {
  const rule = await updateRule(
    req.orgId!,
    req.params['id'] as string,
    req.params['ruleId'] as string,
    req.body,
  );
  if (!rule) { ApiResponse.notFound(res, 'Rule not found'); return; }
  ApiResponse.success(res, rule, 'Rule updated');
});

export const deleteRuleHandler = asyncHandler(async (req: Request, res: Response) => {
  const ok = await deleteRule(
    req.orgId!,
    req.params['id'] as string,
    req.params['ruleId'] as string,
  );
  if (!ok) { ApiResponse.notFound(res, 'Rule not found'); return; }
  ApiResponse.success(res, null, 'Rule deleted');
});

// ─── Windows ──────────────────────────────────────────────────────────────────

export const createWindowHandler = asyncHandler(async (req: Request, res: Response) => {
  const win = await createWindow(req.orgId!, req.params['ruleId'] as string, req.body);
  if (!win) { ApiResponse.notFound(res, 'Rule not found'); return; }
  ApiResponse.created(res, win, 'Window created');
});

export const updateWindowHandler = asyncHandler(async (req: Request, res: Response) => {
  const win = await updateWindow(
    req.orgId!,
    req.params['ruleId'] as string,
    req.params['windowId'] as string,
    req.body,
  );
  if (!win) { ApiResponse.notFound(res, 'Window not found'); return; }
  ApiResponse.success(res, win, 'Window updated');
});

export const deleteWindowHandler = asyncHandler(async (req: Request, res: Response) => {
  const ok = await deleteWindow(
    req.orgId!,
    req.params['ruleId'] as string,
    req.params['windowId'] as string,
  );
  if (!ok) { ApiResponse.notFound(res, 'Window not found'); return; }
  ApiResponse.success(res, null, 'Window deleted');
});

// ─── Slots ────────────────────────────────────────────────────────────────────

export const listSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = listSlotsSchema.parse(req.query);
  const result = await listSlots(req.orgId!, req.accessMap!, query);
  ApiResponse.success(res, result);
});

export const getSlotHandler = asyncHandler(async (req: Request, res: Response) => {
  const slot = await getSlotById(req.orgId!, req.params['id'] as string);
  if (!slot) { ApiResponse.notFound(res, 'Slot not found'); return; }
  ApiResponse.success(res, slot);
});

export const assignSurveyorHandler = asyncHandler(async (req: Request, res: Response) => {
  const { surveyorId, force } = assignSurveyorSchema.parse(req.body);
  const result = await assignSurveyor(req.orgId!, req.params['id'] as string, surveyorId, force);
  if ('error' in result) {
    res.status(result.conflict ? 409 : 404).json({
      success: false,
      message: result.error,
      conflict: result.conflict ?? false,
    });
    return;
  }
  ApiResponse.success(res, result.slot, 'Surveyor assigned');
});

export const updateSlotStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const { status } = updateSlotStatusSchema.parse(req.body);
  const slot = await updateSlotStatus(req.orgId!, req.params['id'] as string, status);
  if (!slot) { ApiResponse.notFound(res, 'Slot not found'); return; }
  ApiResponse.success(res, slot, 'Status updated');
});

// ─── Persistent Assignments ───────────────────────────────────────────────────

export const listAssignmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const storeId = req.query['storeId'] as string | undefined;
  const assignments = await listAssignments(req.orgId!, storeId);
  ApiResponse.success(res, assignments);
});

export const createAssignmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createAssignmentSchema.parse(req.body);
  const assignment = await createAssignment(req.orgId!, input, req.accessMap!.userId);
  ApiResponse.created(res, assignment, 'Assignment created');
});

export const deleteAssignmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const ok = await deleteAssignment(req.orgId!, req.params['id'] as string);
  if (!ok) { ApiResponse.notFound(res, 'Assignment not found'); return; }
  ApiResponse.success(res, null, 'Assignment deleted');
});

// ─── Store effective template ─────────────────────────────────────────────────

export const storeEffectiveTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await getStoreEffectiveTemplate(req.orgId!, req.params['storeId'] as string);
  if (!template) { ApiResponse.notFound(res, 'No active template found for this store'); return; }
  ApiResponse.success(res, template);
});

// Re-export validation schemas so the route file can wire them up cleanly
export {
  createTemplateSchema,
  updateTemplateSchema,
  createRuleSchema,
  updateRuleSchema,
  createWindowSchema,
  updateWindowSchema,
  assignSurveyorSchema,
  updateSlotStatusSchema,
  createAssignmentSchema,
};
