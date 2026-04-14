import { Resend } from 'resend';
import logger from '../utils/logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'no-reply@shelfexecution.com';

// Non-blocking email send — logs errors but never throws
function sendEmail(to: string, subject: string, html: string) {
  resend.emails
    .send({ from: FROM, to, subject, html })
    .then((res) => {
      if (res.error) {
        logger.error(`Email failed to ${to}: ${res.error.message}`);
      } else {
        logger.info(`Email sent to ${to}: ${res.data?.id}`);
      }
    })
    .catch((err) => {
      logger.error(`Email send error to ${to}: ${err.message}`);
    });
}

// Employee invite email
export function sendEmployeeInviteEmail(
  to: string,
  employeeName: string,
  orgName: string,
  roleName: string,
  ssoUrl: string,
) {
  const registerUrl = `${ssoUrl}/register?invite=true&email=${encodeURIComponent(to)}&name=${encodeURIComponent(employeeName)}`;
  const subject = `You've been invited to ${orgName} on Shelf360`;
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #131313;">Welcome to Shelf360</h2>
      <p>Hi ${employeeName},</p>
      <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${roleName}</strong>.</p>
      <p>To get started, create your account:</p>
      <a href="${registerUrl}" style="display: inline-block; background: #131313; color: white; padding: 10px 24px; text-decoration: none; margin: 16px 0;">
        Set Up Your Account
      </a>
      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy this link:<br/>
        <a href="${registerUrl}">${registerUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Shelf360 by ShelfExecution</p>
    </div>
  `;
  sendEmail(to, subject, html);
}

// Org approved email
export function sendOrgApprovedEmail(to: string, orgName: string, loginUrl: string) {
  const subject = `${orgName} has been approved on Shelf360`;
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #131313;">Your Organization is Approved!</h2>
      <p>Great news — <strong>${orgName}</strong> has been approved on Shelf360.</p>
      <p>You can now log in and start adding stores:</p>
      <a href="${loginUrl}" style="display: inline-block; background: #131313; color: white; padding: 10px 24px; text-decoration: none; margin: 16px 0;">
        Go to Dashboard
      </a>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Shelf360 by ShelfExecution</p>
    </div>
  `;
  sendEmail(to, subject, html);
}

// Org rejected email
export function sendOrgRejectedEmail(to: string, orgName: string, reason: string) {
  const subject = `${orgName} registration update on Shelf360`;
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #131313;">Registration Update</h2>
      <p>Unfortunately, <strong>${orgName}</strong> was not approved for Shelf360.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this was a mistake, please contact support.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Shelf360 by ShelfExecution</p>
    </div>
  `;
  sendEmail(to, subject, html);
}
