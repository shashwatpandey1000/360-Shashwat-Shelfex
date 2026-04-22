ALTER TABLE "organizations" ADD COLUMN "approval_notification_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approval_notification_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approval_notification_last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approval_notification_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approval_notification_last_error" text;--> statement-breakpoint
CREATE INDEX "organizations_status_notify_idx" ON "organizations" USING btree ("status","approval_notification_sent");