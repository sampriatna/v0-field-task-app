export type TaskStatus = "OPEN" | "SUBMITTED" | "DONE" | "REVISI" | "LATE";

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
  is_late: boolean;
  duration_minutes?: number;
  last_updated: string;
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
