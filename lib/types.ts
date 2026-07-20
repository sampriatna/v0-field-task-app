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
export type RepeatType = "daily" | "weekdays" | "weekly" | "monthly" | "custom";

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
  login_pin?: string;           // 4-6 digit PIN untuk leader login
  login_enabled?: boolean;       // Toggle akses login untuk staff
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
  login_pin?: string;
  login_enabled?: boolean;
}

// Leader/Multi-user login session
export interface LeaderSession {
  staff_id: string;
  name: string;
  wa_number: string;
  outlet: Outlet;
  role: StaffRole;
  login_time: number; // timestamp
}

// User login record from GAS getUsers / createUser / updateUser
export interface UserLogin {
  user_id: string;
  staff_id: string;
  username: string;
  role: StaffRole;
  outlet?: string;
  name?: string;
  wa_number?: string;
  login_enabled: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export interface CreateUserPayload {
  staff_id: string;
  username: string;
  password: string;
  role: StaffRole;
  login_enabled?: boolean;
}

export interface UpdateUserPayload {
  user_id: string;
  username?: string;
  password?: string;
  role?: StaffRole;
  login_enabled?: boolean;
}

// =============================================
// STAFF STATIC REPORT LINK (Daily Report / SOP)
// Report = kegiatan standar + checklist + foto + kondisi
// Bukan input teks bebas.
// =============================================

/** Kondisi hasil kerja — pilihan tombol, bukan teks bebas */
export type ReportConditionStatus =
  | "aman"
  | "kendala_ringan"
  | "follow_up_leader"
  | "perlu_belanja";

export type ReportTemplateCategory =
  | "Cleaning"
  | "Opening"
  | "Closing"
  | "Stock"
  | "Production"
  | "Maintenance"
  | "Kendala"
  | "Special"
  | "General";

/** Jenis report: wajib harian | tugas khusus | quick kendala */
export type ReportTemplateKind = "daily_required" | "special_task" | "issue_quick";

export interface StaffReportLink {
  id: string;
  staff_id: string;
  /** Token aman panjang (internal / fallback) */
  token: string;
  /** Kode pendek dari nama, contoh: dul → /r/dul */
  short_code: string;
  is_active: boolean;
  created_at: string;
  revoked_at?: string | null;
  staff_name?: string;
  outlet?: Outlet | string;
  position?: string;
  /** URL pendek untuk dibagikan */
  report_url?: string;
  /** URL panjang (token) — cadangan */
  report_url_long?: string;
}

export interface ReportTemplateChecklistItem {
  id: string;
  report_template_id: string;
  item_text: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  title: string;
  category: ReportTemplateCategory;
  /** Outlet code e.g. "KBU", null = semua outlet */
  outlet_id: string | null;
  /** Jabatan/group: Waiters | Bar | Dapur | null = semua */
  position_group: string | null;
  /** Standar hasil kerja (SOP mini) */
  standard_result: string;
  /** Deskripsi singkat / tujuan — legacy alias display */
  description: string;
  requires_photo: boolean;
  is_required_daily: boolean;
  kind: ReportTemplateKind;
  target_time_start?: string | null; // "09:00"
  target_time_end?: string | null; // "10:00"
  active: boolean;
  sort_order: number;
  created_at: string;
  checklist_items?: ReportTemplateChecklistItem[];
}

export interface CreateReportTemplatePayload {
  title: string;
  category?: ReportTemplateCategory;
  outlet_id?: string | null;
  position_group?: string | null;
  standard_result?: string;
  description?: string;
  requires_photo?: boolean;
  is_required_daily?: boolean;
  kind?: ReportTemplateKind;
  target_time_start?: string | null;
  target_time_end?: string | null;
  active?: boolean;
  sort_order?: number;
  checklist_items?: { item_text: string; is_required?: boolean; sort_order?: number }[];
}

export interface UpdateReportTemplatePayload {
  id: string;
  title?: string;
  category?: ReportTemplateCategory;
  outlet_id?: string | null;
  position_group?: string | null;
  standard_result?: string;
  description?: string;
  requires_photo?: boolean;
  is_required_daily?: boolean;
  kind?: ReportTemplateKind;
  target_time_start?: string | null;
  target_time_end?: string | null;
  active?: boolean;
  sort_order?: number;
  checklist_items?: { item_text: string; is_required?: boolean; sort_order?: number }[];
}

export interface DailyReportChecklistAnswer {
  id: string;
  submission_id: string;
  checklist_item_id: string;
  checked: boolean;
  created_at: string;
  /** Denormalized */
  item_text?: string;
}

export interface DailyReportSubmission {
  id: string;
  staff_id: string;
  outlet_id: string;
  report_template_id: string;
  report_date: string;
  status_condition: ReportConditionStatus;
  note: string;
  photo_url?: string | null;
  submitted_at: string;
  created_at: string;
  checklist_answers?: DailyReportChecklistAnswer[];
  /** Denormalized for dashboard */
  staff_name?: string;
  outlet?: string;
  report_title?: string;
  position?: string;
  checklist_total?: number;
  checklist_checked?: number;
  checklist_percent?: number;
}

export interface SubmitDailyReportPayload {
  token: string;
  report_template_id: string;
  status_condition: ReportConditionStatus;
  note?: string;
  photo_base64?: string;
  checklist_answers: { checklist_item_id: string; checked: boolean }[];
}

export interface StaffReportLinkContext {
  link: StaffReportLink;
  staff: {
    staff_id: string;
    name: string;
    outlet: string;
    position: string;
    position_group: string;
  };
  templates: ReportTemplate[];
  today_submissions: DailyReportSubmission[];
}

export interface DailyReportFilters {
  date?: string;
  outlet?: string;
  staff_id?: string;
  report_template_id?: string;
  submit_status?: "submitted" | "not_submitted" | "all";
}

export interface DailyReportDashboardSummary {
  total_today: number;
  staff_submitted: number;
  staff_not_submitted: number;
  reports_with_issue: number;
  complete_ok: number;
  complete_with_issue: number;
  not_submitted: number;
}

/** Label warna dashboard */
export type DailyReportRowLabel =
  | "selesai_lengkap" // hijau
  | "selesai_kendala" // kuning
  | "belum_submit" // merah
  | "tidak_wajib"; // abu

export interface DailyReportDashboardRow {
  staff_id: string;
  staff_name: string;
  outlet: string;
  position: string;
  report_template_id: string;
  report_title: string;
  category?: string;
  is_required_daily: boolean;
  submitted: boolean;
  submission?: DailyReportSubmission | null;
  submitted_at?: string | null;
  photo_url?: string | null;
  note?: string | null;
  status_condition?: ReportConditionStatus | null;
  checklist_total: number;
  checklist_checked: number;
  checklist_percent: number;
  label: DailyReportRowLabel;
}

export interface DailyReportDashboardData {
  summary: DailyReportDashboardSummary;
  rows: DailyReportDashboardRow[];
  submissions: DailyReportSubmission[];
  missing_required: DailyReportDashboardRow[];
}

/** @deprecated use status_condition */
export type DailyReportStatus = "submitted" | "issue" | "reviewed";

export const REPORT_CONDITION_OPTIONS: {
  value: ReportConditionStatus;
  label: string;
  requiresNote: boolean;
}[] = [
  { value: "aman", label: "Aman", requiresNote: false },
  { value: "kendala_ringan", label: "Ada kendala ringan", requiresNote: true },
  { value: "follow_up_leader", label: "Perlu follow up leader", requiresNote: true },
  { value: "perlu_belanja", label: "Perlu belanja/perbaikan", requiresNote: true },
];

export const REPORT_POSITION_GROUPS = ["Waiters", "Bar", "Dapur"] as const;
