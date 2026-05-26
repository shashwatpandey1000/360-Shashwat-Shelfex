import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';

import {
  // Templates
  createTemplateHandler,
  listTemplatesHandler,
  getTemplateHandler,
  getOrgDefaultTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
  previewSlotsHandler,
  materializeHandler,
  // Rules
  createRuleHandler,
  updateRuleHandler,
  deleteRuleHandler,
  // Windows
  createWindowHandler,
  updateWindowHandler,
  deleteWindowHandler,
  // Slots
  listSlotsHandler,
  getSlotHandler,
  assignSurveyorHandler,
  updateSlotStatusHandler,
  // Assignments
  listAssignmentsHandler,
  createAssignmentHandler,
  deleteAssignmentHandler,
  // Store effective template
  storeEffectiveTemplateHandler,
  // Validation schemas (re-exported for wire-up)
  createTemplateSchema,
  updateTemplateSchema,
  createRuleSchema,
  updateRuleSchema,
  createWindowSchema,
  updateWindowSchema,
} from './schedule.controller';

const router = Router();

// All schedule routes require authentication + tenant context
router.use(authMiddleware, tenantContext);

// ─── Templates ────────────────────────────────────────────────────────────────

// IMPORTANT: /default must come before /:id to avoid param capture
router.get('/templates/default', requirePermission('schedule:read'), getOrgDefaultTemplateHandler);

router.post(
  '/templates',
  requirePermission('schedule:write'),
  validate(createTemplateSchema),
  createTemplateHandler,
);
router.get('/templates', requirePermission('schedule:read'), listTemplatesHandler);
router.get('/templates/:id', requirePermission('schedule:read'), getTemplateHandler);
router.patch(
  '/templates/:id',
  requirePermission('schedule:write'),
  validate(updateTemplateSchema),
  updateTemplateHandler,
);
router.delete('/templates/:id', requirePermission('schedule:delete'), deleteTemplateHandler);

// Preview & manual materialise
router.post('/templates/:id/preview', requirePermission('schedule:read'), previewSlotsHandler);
router.post('/templates/:id/materialize', requirePermission('schedule:write'), materializeHandler);

// ─── Rules (nested under template) ───────────────────────────────────────────

router.post(
  '/templates/:id/rules',
  requirePermission('schedule:write'),
  validate(createRuleSchema),
  createRuleHandler,
);
router.patch(
  '/templates/:id/rules/:ruleId',
  requirePermission('schedule:write'),
  validate(updateRuleSchema),
  updateRuleHandler,
);
router.delete(
  '/templates/:id/rules/:ruleId',
  requirePermission('schedule:delete'),
  deleteRuleHandler,
);

// ─── Windows (nested under rule) ─────────────────────────────────────────────

router.post(
  '/templates/:id/rules/:ruleId/windows',
  requirePermission('schedule:write'),
  validate(createWindowSchema),
  createWindowHandler,
);
router.patch(
  '/templates/:id/rules/:ruleId/windows/:windowId',
  requirePermission('schedule:write'),
  validate(updateWindowSchema),
  updateWindowHandler,
);
router.delete(
  '/templates/:id/rules/:ruleId/windows/:windowId',
  requirePermission('schedule:delete'),
  deleteWindowHandler,
);

// ─── Slots ────────────────────────────────────────────────────────────────────

router.get('/slots', requirePermission('schedule:read'), listSlotsHandler);
router.get('/slots/:id', requirePermission('schedule:read'), getSlotHandler);
router.patch(
  '/slots/:id/assign',
  requirePermission('employees:manage'),
  assignSurveyorHandler,
);
router.patch(
  '/slots/:id/status',
  requirePermission('schedule:write'),
  updateSlotStatusHandler,
);

// ─── Persistent Assignments ───────────────────────────────────────────────────

router.get('/assignments', requirePermission('schedule:read'), listAssignmentsHandler);
router.post(
  '/assignments',
  requirePermission('employees:manage'),
  createAssignmentHandler,
);
router.delete(
  '/assignments/:id',
  requirePermission('employees:manage'),
  deleteAssignmentHandler,
);

// ─── Store effective template ─────────────────────────────────────────────────

router.get(
  '/stores/:storeId/template',
  requirePermission('schedule:read'),
  storeEffectiveTemplateHandler,
);

export default router;
