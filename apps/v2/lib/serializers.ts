import type { Prisma } from "@prisma/client"

// v1-compatible serialization (snake_case, name strings) so the existing frontend
// contract in docs/V2_API_SPEC.md is preserved.

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null)

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: { outlet: true; area: true; category: true }
}>

export function serializeTask(t: TaskWithRelations) {
  return {
    task_id: t.taskId,
    token: t.token,
    created_by: t.createdBy ?? null,
    outlet: t.outlet?.code ?? t.outletName ?? null,
    area: t.area?.name ?? t.areaName ?? null,
    category: t.category?.name ?? t.categoryName ?? null,
    task_title: t.taskTitle,
    task_description: t.taskDescription ?? "",
    ticket_type: t.ticketType,
    priority: t.priority,
    pic_name: t.picName,
    pic_wa: t.picWa,
    deadline: iso(t.deadline),
    before_photo_url: t.beforePhotoUrl ?? null,
    status: t.status,
    report_link: t.reportLink ?? null,
    wa_sent_at: iso(t.waSentAt),
    opened_at: iso(t.openedAt),
    submitted_at: iso(t.submittedAt),
    after_photo_url: t.afterPhotoUrl ?? null,
    staff_note: t.staffNote ?? null,
    leader_verification: t.leaderVerification ?? null,
    verified_by: t.verifiedBy ?? null,
    verified_at: iso(t.verifiedAt),
    final_status: t.finalStatus ?? null,
    is_late: t.isLate,
    duration_minutes: t.durationMinutes ?? null,
    checklist_mode: t.checklistMode,
    created_at: iso(t.createdAt),
    updated_at: iso(t.updatedAt),
  }
}

export type StaffWithRelations = Prisma.StaffGetPayload<{
  include: { outlet: true; area: true }
}>

export function serializeStaff(s: StaffWithRelations) {
  return {
    staff_id: s.staffId,
    name: s.name,
    position: s.position ?? "",
    outlet: s.outlet?.code ?? null,
    area: s.area?.name ?? null,
    wa_number: s.waNumber,
    role: s.role,
    status: s.status,
    login_enabled: s.loginEnabled,
    created_at: iso(s.createdAt),
    updated_at: iso(s.updatedAt),
  }
}
