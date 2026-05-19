import logger from '../utils/logger';
import {
  listActiveSuperAdmins,
  listPendingOrgsNeedingApprovalNotification,
  recordApprovalNotificationAttempt,
} from '../services/org.service';
import { sendOrgPendingApprovalEmail } from '../services/email.service';

const DEFAULT_BATCH_SIZE = 100;

export async function retryPendingApprovalEmails(): Promise<void> {
  const batchSize = Number(
    process.env.APPROVAL_NOTIFICATION_RETRY_BATCH_SIZE || DEFAULT_BATCH_SIZE,
  );
  const maxAttempts = Number(process.env.APPROVAL_NOTIFICATION_MAX_ATTEMPTS || 10);
  const apiBaseUrl =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.CORS_ORIGIN?.split(',')[0] ||
    'http://localhost:4000';
  const pendingOrgsUrl = `${apiBaseUrl}/api/v1/admin/orgs/pending`;

  const admins = await listActiveSuperAdmins();
  if (admins.length === 0) {
    logger.warn('Retry job skipped: no active super admins configured');
    return;
  }

  const pending = await listPendingOrgsNeedingApprovalNotification(batchSize);
  if (pending.length === 0) {
    logger.info('Retry job: no pending organizations need notification');
    return;
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const org of pending) {
    if (org.attempts >= maxAttempts) {
      skipped += 1;
      continue;
    }

    const results = await Promise.all(
      admins.map((admin) =>
        sendOrgPendingApprovalEmail(
          admin.email,
          org.name,
          org.contactEmail,
          org.createdAt,
          pendingOrgsUrl,
        ),
      ),
    );

    const sentToAny = results.some((r) => r.ok);
    const error = sentToAny
      ? undefined
      : results
          .map((r) => r.error)
          .filter(Boolean)
          .join(' | ') || 'All super-admin notification emails failed';

    await recordApprovalNotificationAttempt(org.id, sentToAny, error);

    processed += 1;
    if (sentToAny) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  logger.info(
    `Retry job complete: processed=${processed}, sent=${sent}, failed=${failed}, skipped=${skipped}`,
  );
}
