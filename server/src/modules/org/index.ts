export { default as orgRouter } from './org.routes';
// Cross-module service exports:
export { getOrgSettings, getOrgById, listPendingOrgs, approveOrg, rejectOrg } from './org.service';
// Cross-module type/schema exports:
export { rejectOrgSchema } from './org.types';
// Consumed by shared/middlewares/superAdmin.middleware and shared/jobs/:
export { findSuperAdmin, listActiveSuperAdmins, listPendingOrgsNeedingApprovalNotification, recordApprovalNotificationAttempt } from './org.service';
