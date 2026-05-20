CREATE TABLE "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "store_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"industry_id" uuid,
	"country" text DEFAULT 'IN' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"default_language" text DEFAULT 'en' NOT NULL,
	"logo_url" text,
	"website" text,
	"hq_address" jsonb,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "super_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sso_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_sso_user_id_unique" UNIQUE("sso_user_id"),
	CONSTRAINT "super_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"parent_zone_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_template_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"role_template_id" uuid NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_data_scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scope_entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sso_user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"avatar_url" text,
	"role_template" text NOT NULL,
	"scope_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"language_preference" text,
	"last_login_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_sso_user_id_unique" UNIQUE("sso_user_id")
);
--> statement-breakpoint
CREATE TABLE "store_surveyors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"zone_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'pending_tour' NOT NULL,
	"category_id" uuid,
	"address" jsonb NOT NULL,
	"location" jsonb,
	"timezone" text,
	"operating_hours" jsonb,
	"contact_phone" text,
	"contact_email" text,
	"logo_url" text,
	"manager_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"tour_id" uuid NOT NULL,
	"external_scene_id" text NOT NULL,
	"panorama_url" text NOT NULL,
	"thumbnail_url" text,
	"capture_start_heading" numeric(6, 2),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"label" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"floor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"tour_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"label" text NOT NULL,
	"yaw" numeric(6, 2) NOT NULL,
	"pitch" numeric(6, 2) NOT NULL,
	"bounding_box" jsonb,
	"shelf_image_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"captured_by" uuid,
	"tour_manifest" jsonb NOT NULL,
	"scene_count" integer DEFAULT 0 NOT NULL,
	"shelf_count" integer DEFAULT 0 NOT NULL,
	"is_baseline" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurrence_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"schedule_template_id" uuid NOT NULL,
	"recurrence_type" text NOT NULL,
	"days_of_week" integer[],
	"interval_value" integer,
	"interval_unit" text,
	"custom_rrule" text,
	"exceptions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"schedule_template_id" uuid NOT NULL,
	"recurrence_rule_id" uuid NOT NULL,
	"time_window_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"window_start_utc" timestamp with time zone NOT NULL,
	"window_end_utc" timestamp with time zone NOT NULL,
	"window_start_local" timestamp NOT NULL,
	"window_end_local" timestamp NOT NULL,
	"timezone" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_surveyor_id" uuid,
	"assigned_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"survey_id" uuid,
	"idempotency_key" text NOT NULL,
	"materialized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_instances_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "schedule_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"store_id" uuid,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveyor_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"recurrence_rule_id" uuid NOT NULL,
	"time_window_id" uuid NOT NULL,
	"surveyor_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"recurrence_rule_id" uuid NOT NULL,
	"window_start" time NOT NULL,
	"window_end" time NOT NULL,
	"label" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "window_end_after_start" CHECK ("time_windows"."window_end" > "time_windows"."window_start")
);
--> statement-breakpoint
CREATE TABLE "form_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"lineage_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"definition" jsonb NOT NULL,
	"created_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_form_assignments" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"form_lineage_id" uuid,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_question_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"form_definition_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"question_type" text NOT NULL,
	"answer_value" jsonb NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_ai_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_photo_id" uuid NOT NULL,
	"survey_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"products" jsonb,
	"product_count" integer DEFAULT 0 NOT NULL,
	"processing_time_ms" integer,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_ai_results_survey_photo_id_unique" UNIQUE("survey_photo_id")
);
--> statement-breakpoint
CREATE TABLE "survey_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"survey_scene_id" uuid,
	"shelf_id" uuid,
	"photo_url" text NOT NULL,
	"thumbnail_url" text,
	"photo_type" text DEFAULT 'shelf' NOT NULL,
	"ai_status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"survey_id" uuid NOT NULL,
	"external_scene_id" text NOT NULL,
	"baseline_scene_id" uuid,
	"panorama_url" text NOT NULL,
	"thumbnail_url" text,
	"capture_start_heading" numeric(6, 2),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"schedule_instance_id" uuid,
	"tour_id" uuid,
	"surveyor_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_seconds" integer,
	"tour_manifest" jsonb,
	"scene_count" integer DEFAULT 0 NOT NULL,
	"shelf_count" integer DEFAULT 0 NOT NULL,
	"questions_answered" integer DEFAULT 0 NOT NULL,
	"questions_total" integer DEFAULT 0 NOT NULL,
	"form_definition_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_approved_by_super_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."super_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_template_permissions" ADD CONSTRAINT "role_template_permissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_template_permissions" ADD CONSTRAINT "role_template_permissions_role_template_id_role_templates_id_fk" FOREIGN KEY ("role_template_id") REFERENCES "public"."role_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_templates" ADD CONSTRAINT "role_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_data_scopes" ADD CONSTRAINT "user_data_scopes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_surveyors" ADD CONSTRAINT "store_surveyors_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_surveyors" ADD CONSTRAINT "store_surveyors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_surveyors" ADD CONSTRAINT "store_surveyors_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_category_id_store_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."store_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_captured_by_users_id_fk" FOREIGN KEY ("captured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_schedule_template_id_schedule_templates_id_fk" FOREIGN KEY ("schedule_template_id") REFERENCES "public"."schedule_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_instances" ADD CONSTRAINT "schedule_instances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_instances" ADD CONSTRAINT "schedule_instances_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_instances" ADD CONSTRAINT "schedule_instances_schedule_template_id_schedule_templates_id_fk" FOREIGN KEY ("schedule_template_id") REFERENCES "public"."schedule_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_instances" ADD CONSTRAINT "schedule_instances_recurrence_rule_id_recurrence_rules_id_fk" FOREIGN KEY ("recurrence_rule_id") REFERENCES "public"."recurrence_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_instances" ADD CONSTRAINT "schedule_instances_time_window_id_time_windows_id_fk" FOREIGN KEY ("time_window_id") REFERENCES "public"."time_windows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_instances" ADD CONSTRAINT "schedule_instances_assigned_surveyor_id_users_id_fk" FOREIGN KEY ("assigned_surveyor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveyor_assignments" ADD CONSTRAINT "surveyor_assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveyor_assignments" ADD CONSTRAINT "surveyor_assignments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveyor_assignments" ADD CONSTRAINT "surveyor_assignments_recurrence_rule_id_recurrence_rules_id_fk" FOREIGN KEY ("recurrence_rule_id") REFERENCES "public"."recurrence_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveyor_assignments" ADD CONSTRAINT "surveyor_assignments_time_window_id_time_windows_id_fk" FOREIGN KEY ("time_window_id") REFERENCES "public"."time_windows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveyor_assignments" ADD CONSTRAINT "surveyor_assignments_surveyor_id_users_id_fk" FOREIGN KEY ("surveyor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveyor_assignments" ADD CONSTRAINT "surveyor_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_windows" ADD CONSTRAINT "time_windows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_windows" ADD CONSTRAINT "time_windows_recurrence_rule_id_recurrence_rules_id_fk" FOREIGN KEY ("recurrence_rule_id") REFERENCES "public"."recurrence_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_form_assignments" ADD CONSTRAINT "store_form_assignments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_form_assignments" ADD CONSTRAINT "store_form_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_question_answers" ADD CONSTRAINT "survey_question_answers_form_definition_id_form_definitions_id_fk" FOREIGN KEY ("form_definition_id") REFERENCES "public"."form_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_ai_results" ADD CONSTRAINT "survey_ai_results_survey_photo_id_survey_photos_id_fk" FOREIGN KEY ("survey_photo_id") REFERENCES "public"."survey_photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_ai_results" ADD CONSTRAINT "survey_ai_results_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_ai_results" ADD CONSTRAINT "survey_ai_results_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_photos" ADD CONSTRAINT "survey_photos_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_photos" ADD CONSTRAINT "survey_photos_survey_scene_id_survey_scenes_id_fk" FOREIGN KEY ("survey_scene_id") REFERENCES "public"."survey_scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_photos" ADD CONSTRAINT "survey_photos_shelf_id_shelves_id_fk" FOREIGN KEY ("shelf_id") REFERENCES "public"."shelves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_scenes" ADD CONSTRAINT "survey_scenes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_scenes" ADD CONSTRAINT "survey_scenes_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_scenes" ADD CONSTRAINT "survey_scenes_baseline_scene_id_scenes_id_fk" FOREIGN KEY ("baseline_scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_schedule_instance_id_schedule_instances_id_fk" FOREIGN KEY ("schedule_instance_id") REFERENCES "public"."schedule_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_surveyor_id_users_id_fk" FOREIGN KEY ("surveyor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_form_definition_id_form_definitions_id_fk" FOREIGN KEY ("form_definition_id") REFERENCES "public"."form_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organizations_country_idx" ON "organizations" USING btree ("country");--> statement-breakpoint
CREATE INDEX "zones_org_id_idx" ON "zones" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "zones_org_parent_idx" ON "zones" USING btree ("org_id","parent_zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "zones_org_name_uniq" ON "zones" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "rtp_org_id_idx" ON "role_template_permissions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "rtp_role_template_id_idx" ON "role_template_permissions" USING btree ("role_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rtp_template_permission_uniq" ON "role_template_permissions" USING btree ("role_template_id","permission");--> statement-breakpoint
CREATE INDEX "role_templates_org_id_idx" ON "role_templates" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_templates_org_name_uniq" ON "role_templates" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "user_data_scopes_user_id_idx" ON "user_data_scopes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_permissions_user_perm_uniq" ON "user_permissions" USING btree ("user_id","permission");--> statement-breakpoint
CREATE INDEX "users_org_id_idx" ON "users" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "users_org_role_idx" ON "users" USING btree ("org_id","role_template");--> statement-breakpoint
CREATE INDEX "users_org_status_idx" ON "users" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "users_org_scope_idx" ON "users" USING btree ("org_id","scope_type");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "store_surveyors_store_idx" ON "store_surveyors" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_surveyors_user_idx" ON "store_surveyors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_surveyors_store_user_uniq" ON "store_surveyors" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE INDEX "stores_org_id_idx" ON "stores" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stores_org_status_idx" ON "stores" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "stores_org_zone_idx" ON "stores" USING btree ("org_id","zone_id");--> statement-breakpoint
CREATE INDEX "stores_manager_idx" ON "stores" USING btree ("manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_org_slug_uniq" ON "stores" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "scenes_org_id_idx" ON "scenes" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "scenes_tour_id_idx" ON "scenes" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "scenes_tour_order_idx" ON "scenes" USING btree ("tour_id","display_order");--> statement-breakpoint
CREATE INDEX "shelves_org_id_idx" ON "shelves" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "shelves_tour_id_idx" ON "shelves" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "shelves_scene_id_idx" ON "shelves" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "tours_store_status_idx" ON "tours" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "tours_org_store_idx" ON "tours" USING btree ("org_id","store_id");--> statement-breakpoint
CREATE INDEX "tours_store_created_idx" ON "tours" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "recurrence_rules_org_idx" ON "recurrence_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "recurrence_rules_template_idx" ON "recurrence_rules" USING btree ("schedule_template_id");--> statement-breakpoint
CREATE INDEX "sched_inst_store_date_idx" ON "schedule_instances" USING btree ("store_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "sched_inst_surveyor_date_idx" ON "schedule_instances" USING btree ("assigned_surveyor_id","scheduled_date") WHERE "schedule_instances"."status" IN ('pending', 'in_progress');--> statement-breakpoint
CREATE INDEX "sched_inst_org_date_idx" ON "schedule_instances" USING btree ("org_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "sched_inst_status_date_idx" ON "schedule_instances" USING btree ("status","scheduled_date") WHERE "schedule_instances"."status" IN ('pending', 'in_progress');--> statement-breakpoint
CREATE INDEX "sched_inst_store_status_date_idx" ON "schedule_instances" USING btree ("store_id","status","scheduled_date");--> statement-breakpoint
CREATE INDEX "sched_tmpl_org_active_idx" ON "schedule_templates" USING btree ("org_id") WHERE "schedule_templates"."is_active" = true;--> statement-breakpoint
CREATE INDEX "sched_tmpl_org_store_idx" ON "schedule_templates" USING btree ("org_id","store_id") WHERE "schedule_templates"."is_active" = true;--> statement-breakpoint
CREATE INDEX "sched_tmpl_store_idx" ON "schedule_templates" USING btree ("store_id") WHERE "schedule_templates"."store_id" IS NOT NULL AND "schedule_templates"."is_active" = true;--> statement-breakpoint
CREATE INDEX "surveyor_assign_org_idx" ON "surveyor_assignments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "surveyor_assign_store_idx" ON "surveyor_assignments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "surveyor_assign_surveyor_idx" ON "surveyor_assignments" USING btree ("surveyor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "surveyor_assign_slot_uniq" ON "surveyor_assignments" USING btree ("store_id","recurrence_rule_id","time_window_id");--> statement-breakpoint
CREATE INDEX "time_windows_org_idx" ON "time_windows" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "time_windows_rule_idx" ON "time_windows" USING btree ("recurrence_rule_id");--> statement-breakpoint
CREATE INDEX "form_defs_org_scope_idx" ON "form_definitions" USING btree ("org_id","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "form_defs_lineage_version_idx" ON "form_definitions" USING btree ("lineage_id","version");--> statement-breakpoint
CREATE INDEX "form_defs_lineage_published_idx" ON "form_definitions" USING btree ("lineage_id","status") WHERE "form_definitions"."status" = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "form_defs_lineage_version_uniq" ON "form_definitions" USING btree ("lineage_id","version");--> statement-breakpoint
CREATE INDEX "survey_answers_survey_idx" ON "survey_question_answers" USING btree ("survey_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answers_survey_question_uniq" ON "survey_question_answers" USING btree ("survey_id","question_id");--> statement-breakpoint
CREATE INDEX "survey_ai_results_survey_idx" ON "survey_ai_results" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "survey_ai_results_store_created_idx" ON "survey_ai_results" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "survey_ai_results_status_idx" ON "survey_ai_results" USING btree ("status") WHERE "survey_ai_results"."status" IN ('pending', 'processing');--> statement-breakpoint
CREATE INDEX "survey_photos_survey_idx" ON "survey_photos" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "survey_photos_shelf_idx" ON "survey_photos" USING btree ("shelf_id");--> statement-breakpoint
CREATE INDEX "survey_photos_ai_status_idx" ON "survey_photos" USING btree ("ai_status") WHERE "survey_photos"."ai_status" IN ('pending', 'processing');--> statement-breakpoint
CREATE INDEX "survey_scenes_org_idx" ON "survey_scenes" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "survey_scenes_survey_idx" ON "survey_scenes" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "surveys_org_created_idx" ON "surveys" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "surveys_store_created_idx" ON "surveys" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "surveys_surveyor_created_idx" ON "surveys" USING btree ("surveyor_id","created_at");--> statement-breakpoint
CREATE INDEX "surveys_store_status_idx" ON "surveys" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "surveys_schedule_instance_idx" ON "surveys" USING btree ("schedule_instance_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_org_created_idx" ON "notifications" USING btree ("org_id","created_at");