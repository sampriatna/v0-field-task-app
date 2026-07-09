-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('TASK', 'ISSUE', 'COACHING', 'CHECKLIST');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "ticket_type" "TicketType" NOT NULL DEFAULT 'TASK';

-- CreateIndex
CREATE INDEX "tasks_ticket_type_idx" ON "tasks"("ticket_type");
