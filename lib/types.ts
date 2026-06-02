export type TaskStatus =
  | "CREATED"
  | "SENT"
  | "WA_FAILED"
  | "OPEN"
  | "OPENED"
  | "SUBMITTED"
  | "RESUBMITTED"
  | "WAITING_VERIFICATION"
  | "DONE"
  | "VERIFIED"
  | "REVISI"
  | "REVISION"
  | "REVISION_REQUESTED"
  | "LATE";

export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export type Outlet = "KBU" | "Kisamen" | "Samtaro Express";

export type Area =
  | "Dapur"
  | "Bar"
  | "Floor"
  | "Gudang"
  | "Toilet"
  | "Outdoor"
  | "Maintenance"
  | "Kebon"
  | "Kasir";

export type Category =
  | "Cleaning"
  | "Maintenance"
  | "Stock"
  | "Kitchen"
  | "Bar"
  | "Floor"
  | "Waste"
  | "General";

export interface Task {
  task_id: string;
  token: string;
  created_at: string;
  created_by: string;
  outlet: Outlet;
  area: Area;
  category: Category;
  task_title: string;
  task_description: string;
  priority: TaskPriority;
  pic_name: string;
  pic_wa: string;
  deadline: string;
  before_photo_url?: string;
  status: TaskStatus;
  report_link: string;
  wa_sent_at?: string;
  opened_at?: string;
  submitted_at?: string;
  after_photo_url?: string;
  staff_note?: string;
  leader_verification?: string;
  verified_by?: string;
  verified_at?: string;
  final_status?: string;
  is_late: boolean | string; // Can be boolean or "YES"/"NO" from GAS
  duration_minutes?: number;
  last_updated: string;
  checklist_mode?: string; // "YES" for checklist tasks, undefined/empty for manual tasks
}

export interface CreateTaskPayload {
  outlet: Outlet;
  area: Area;
  category: Category;
  task_title: string;
  task_description: string;
  priority: TaskPriority;
  pic_name: string;
  pic_wa: string;
  deadline: string;
  before_photo_base64?: string;
}

export interface SubmitReportPayload {
  task_id: string;
  token: string;
  after_photo_base64: string;
  staff_note?: string;
}

export interface TaskFilters {
  outlet?: Outlet;
  status?: TaskStatus;
  pic?: string;
  deadline?: string;
}

export interface DashboardSummary {
  total: number;
  open: number;
  submitted: number;
  done: number;
  late: number;
  revisi: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  name: string;
  role: "owner" | "leader" | "staff";
  outlet?: Outlet;
}

// Recurring Task Types
export type RepeatType = "daily" | "weekly" | "custom";

export type DayOfWeek = "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu";

export interface RecurringTemplate {
  template_id: string;
  template_name: string;
  outlet: Outlet;
  area: Area;
  category: Category;
  pic_name: string;
  pic_wa: string;
  task_title: string;
  task_description: string;
  repeat_type: RepeatType;
  repeat_days: DayOfWeek[];
  repeat_time: string; // HH:mm format
  deadline_time: string; // HH:mm format
  requires_photo: boolean;
  active_status: boolean;
  template_version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringTemplatePayload {
  template_name: string;
  outlet: Outlet;
  area: Area;
  category: Category;
  pic_name: string;
  pic_wa: string;
  task_title: string;
  task_description: string;
  repeat_type: RepeatType;
  repeat_days: DayOfWeek[];
  repeat_time: string;
  deadline_time: string;
  requires_photo: boolean;
}

export interface UpdateRecurringTemplatePayload extends CreateRecurringTemplatePayload {
  template_id: string;
}

// Checklist Types
export interface ChecklistItem {
  checklist_item_id: string;
  template_id: string;
  item_order: number;
  item_text: string;
  requires_photo: boolean;
  is_required: boolean;
  active_status: boolean;
}

export interface ChecklistTemplate {
  template_id: string;
  template_name: string;
  outlet: Outlet;
  area: Area;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistReportItem {
  checklist_item_id: string;
  is_checked: boolean;
  photo_url?: string;
}

export type ChecklistReportStatus = "OPEN" | "SUBMITTED" | "DONE" | "REVISI" | "LATE";

export interface ChecklistReport {
  report_id: string;
  task_id: string;
  template_id: string;
  token: string;
  pic_name: string;
  pic_wa: string;
  outlet: Outlet;
  area: Area;
  report_date: string;
  deadline: string;
  checklist_title: string;
  items: ChecklistItem[];
  submitted_at?: string;
  checked_items: ChecklistReportItem[];
  after_photo_url?: string;
  staff_note?: string;
  status: ChecklistReportStatus;
  verified_by?: string;
  verified_at?: string;
  revision_note?: string;
  revision_count: number;
  is_late: boolean;
}

export interface SubmitChecklistPayload {
  task_id: string;
  token: string;
  checked_items: ChecklistReportItem[];
  after_photo_base64?: string;
  staff_note?: string;
}

export interface ChecklistSummary {
  total: number;
  open: number;
  submitted: number;
  done: number;
  late: number;
  revisi: number;
}

// Combined Dashboard Summary
export interface FullDashboardSummary {
  tasks: DashboardSummary;
  checklists: ChecklistSummary;
}

// Staff Master Types
export type StaffRole = "STAFF" | "LEADER" | "ADMIN";
export type StaffStatus = "ACTIVE" | "INACTIVE";

export interface Staff {
  staff_id: string;
  name: string;
  position: string;
  outlet: Outlet;
  area: Area;
  wa_number: string;
  role: StaffRole;
  status: StaffStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffPayload {
  name: string;
  position: string;
  outlet: Outlet;
  area: Area;
  wa_number: string;
  role: StaffRole;
}

export interface UpdateStaffPayload extends CreateStaffPayload {
  staff_id: string;
}
