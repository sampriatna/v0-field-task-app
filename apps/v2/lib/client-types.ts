// Shared client-side shapes matching the serializers in lib/serializers.ts.

export interface Summary {
  total: number
  open: number
  submitted: number
  done: number
  late: number
  revisi: number
}

export interface FullSummary {
  tasks: Summary
  checklists: Summary
}

export interface Outlet {
  id?: string
  code: string
  name: string
}

// Row shape used in list/dashboard tables (subset of the full task).
export interface TaskRow {
  task_id: string
  outlet: string | null
  area: string | null
  category: string | null
  task_title: string
  ticket_type: string
  priority: string
  pic_name: string
  deadline: string | null
  status: string
  is_late: boolean
}

// Full task detail as returned by serializeTask.
export interface TaskDetail extends TaskRow {
  token: string
  created_by: string | null
  task_description: string
  pic_wa: string
  before_photo_url: string | null
  report_link: string | null
  wa_sent_at: string | null
  opened_at: string | null
  submitted_at: string | null
  after_photo_url: string | null
  staff_note: string | null
  leader_verification: string | null
  verified_by: string | null
  verified_at: string | null
  final_status: string | null
  duration_minutes: number | null
  checklist_mode: boolean
  created_at: string | null
  updated_at: string | null
}
