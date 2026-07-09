-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('STAFF', 'LEADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('CREATED', 'SENT', 'WA_FAILED', 'OPEN', 'OPENED', 'SUBMITTED', 'RESUBMITTED', 'WAITING_VERIFICATION', 'DONE', 'VERIFIED', 'REVISI', 'REVISION', 'REVISION_REQUESTED', 'LATE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- CreateEnum
CREATE TYPE "RepeatType" AS ENUM ('daily', 'weekdays', 'weekly', 'monthly', 'custom');

-- CreateEnum
CREATE TYPE "ChecklistReportStatus" AS ENUM ('OPEN', 'SUBMITTED', 'DONE', 'REVISI', 'LATE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('success', 'partial', 'failed');

-- CreateTable
CREATE TABLE "outlets" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "staff_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "position" VARCHAR(100),
    "outlet_id" TEXT NOT NULL,
    "area_id" TEXT,
    "wa_number" VARCHAR(20) NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'STAFF',
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "login_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "staff_id" VARCHAR(50),
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "StaffRole" NOT NULL,
    "login_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "task_id" VARCHAR(50) NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "created_by" VARCHAR(200),
    "outlet_id" TEXT NOT NULL,
    "area_id" TEXT,
    "category_id" TEXT,
    "outlet_name" VARCHAR(100),
    "area_name" VARCHAR(100),
    "category_name" VARCHAR(100),
    "task_title" VARCHAR(500) NOT NULL,
    "task_description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'Medium',
    "pic_name" VARCHAR(200) NOT NULL,
    "pic_wa" VARCHAR(20) NOT NULL,
    "staff_id" VARCHAR(50),
    "deadline" TIMESTAMP(3) NOT NULL,
    "before_photo_url" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'CREATED',
    "report_link" TEXT,
    "wa_sent_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "after_photo_url" TEXT,
    "staff_note" TEXT,
    "leader_verification" TEXT,
    "verified_by" VARCHAR(200),
    "verified_at" TIMESTAMP(3),
    "final_status" VARCHAR(50),
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "duration_minutes" INTEGER,
    "checklist_mode" BOOLEAN NOT NULL DEFAULT false,
    "recurring_template_id" VARCHAR(50),
    "source_version" VARCHAR(10) NOT NULL DEFAULT 'v2',
    "gas_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_templates" (
    "id" TEXT NOT NULL,
    "template_id" VARCHAR(50) NOT NULL,
    "template_name" VARCHAR(200) NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "area_id" TEXT,
    "category_id" TEXT,
    "pic_name" VARCHAR(200) NOT NULL,
    "pic_wa" VARCHAR(20) NOT NULL,
    "staff_id" VARCHAR(50),
    "task_title" VARCHAR(500) NOT NULL,
    "task_description" TEXT,
    "repeat_type" "RepeatType" NOT NULL DEFAULT 'daily',
    "repeat_days" TEXT[],
    "repeat_time" VARCHAR(5) NOT NULL,
    "deadline_time" VARCHAR(5) NOT NULL,
    "requires_photo" BOOLEAN NOT NULL DEFAULT true,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "template_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "template_id" VARCHAR(50) NOT NULL,
    "template_name" VARCHAR(200) NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "area_id" TEXT,
    "task_title" VARCHAR(500),
    "checklist_title" VARCHAR(500) NOT NULL,
    "pic_name" VARCHAR(200),
    "pic_wa" VARCHAR(20),
    "requires_photo" BOOLEAN NOT NULL DEFAULT false,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "checklist_item_id" VARCHAR(50) NOT NULL,
    "template_id" VARCHAR(50) NOT NULL,
    "item_order" INTEGER NOT NULL,
    "item_text" TEXT NOT NULL,
    "requires_photo" BOOLEAN NOT NULL DEFAULT false,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_reports" (
    "id" TEXT NOT NULL,
    "report_id" VARCHAR(50) NOT NULL,
    "task_id" VARCHAR(50),
    "template_id" VARCHAR(50) NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "pic_name" VARCHAR(200) NOT NULL,
    "pic_wa" VARCHAR(20) NOT NULL,
    "outlet_id" TEXT,
    "area_id" TEXT,
    "report_date" DATE NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "checklist_title" VARCHAR(500),
    "status" "ChecklistReportStatus" NOT NULL DEFAULT 'OPEN',
    "submitted_at" TIMESTAMP(3),
    "staff_note" TEXT,
    "after_photo_url" TEXT,
    "verified_by" VARCHAR(200),
    "verified_at" TIMESTAMP(3),
    "revision_note" TEXT,
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "source_version" VARCHAR(10) NOT NULL DEFAULT 'v2',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_report_items" (
    "id" TEXT NOT NULL,
    "report_item_id" VARCHAR(50) NOT NULL,
    "report_id" VARCHAR(50) NOT NULL,
    "checklist_item_id" VARCHAR(50) NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "photo_url" TEXT,
    "checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_report_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" VARCHAR(100),
    "actor_name" VARCHAR(200),
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "operation" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(50),
    "v1_status" "SyncStatus",
    "v2_status" "SyncStatus",
    "v1_response" JSONB,
    "v2_response" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outlets_code_key" ON "outlets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "areas_outlet_id_name_key" ON "areas"("outlet_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staff_id_key" ON "staff"("staff_id");

-- CreateIndex
CREATE INDEX "staff_outlet_id_idx" ON "staff"("outlet_id");

-- CreateIndex
CREATE INDEX "staff_status_idx" ON "staff"("status");

-- CreateIndex
CREATE INDEX "staff_wa_number_idx" ON "staff"("wa_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_user_id_key" ON "user_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_staff_id_key" ON "user_accounts"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_username_key" ON "user_accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_task_id_key" ON "tasks"("task_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");

-- CreateIndex
CREATE INDEX "tasks_outlet_id_idx" ON "tasks"("outlet_id");

-- CreateIndex
CREATE INDEX "tasks_task_id_token_idx" ON "tasks"("task_id", "token");

-- CreateIndex
CREATE INDEX "tasks_pic_wa_idx" ON "tasks"("pic_wa");

-- CreateIndex
CREATE INDEX "tasks_created_at_idx" ON "tasks"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_templates_template_id_key" ON "recurring_templates"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_template_id_key" ON "checklist_templates"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_checklist_item_id_key" ON "checklist_items"("checklist_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_template_id_item_order_key" ON "checklist_items"("template_id", "item_order");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_reports_report_id_key" ON "checklist_reports"("report_id");

-- CreateIndex
CREATE INDEX "checklist_reports_task_id_token_idx" ON "checklist_reports"("task_id", "token");

-- CreateIndex
CREATE INDEX "checklist_reports_status_idx" ON "checklist_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_report_items_report_item_id_key" ON "checklist_report_items"("report_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_report_items_report_id_checklist_item_id_key" ON "checklist_report_items"("report_id", "checklist_item_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "sync_logs_entity_type_entity_id_idx" ON "sync_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "sync_logs_created_at_idx" ON "sync_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_reports" ADD CONSTRAINT "checklist_reports_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_reports" ADD CONSTRAINT "checklist_reports_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_reports" ADD CONSTRAINT "checklist_reports_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_reports" ADD CONSTRAINT "checklist_reports_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_report_items" ADD CONSTRAINT "checklist_report_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "checklist_reports"("report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_report_items" ADD CONSTRAINT "checklist_report_items_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "checklist_items"("checklist_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;
