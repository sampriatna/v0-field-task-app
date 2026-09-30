import { randomUUID } from "crypto";
import { getSupabaseClient } from "@/lib/daily-activity-db";
import type {
  MilestoneStatus,
  ProjectDetail,
  ProjectHealth,
  ProjectMilestone,
  ProjectStaffOption,
  ProjectStatus,
  ProjectSummary,
  ProjectWorkstream,
} from "@/lib/project-types";

type DbRow = Record<string, unknown>;

function client() {
  return getSupabaseClient();
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function mapMilestone(row: DbRow): ProjectMilestone {
  return {
    id: String(row.id),
    workstream_id: String(row.workstream_id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    weight: Number(row.weight || 1),
    status: (row.status || "NOT_STARTED") as MilestoneStatus,
    deadline: stringOrNull(row.deadline),
    evidence_url: stringOrNull(row.evidence_url),
    completed_at: stringOrNull(row.completed_at),
    sort_order: Number(row.sort_order || 10),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function workstreamProgress(
  status: ProjectStatus,
  milestones: ProjectMilestone[]
): number {
  if (status === "COMPLETED") return 100;
  if (milestones.length === 0) return 0;
  const total = milestones.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  const done = milestones
    .filter((item) => item.status === "DONE")
    .reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  return Math.round((done / total) * 100);
}

function mapWorkstream(row: DbRow, milestones: ProjectMilestone[]): ProjectWorkstream {
  const status = (row.status || "ACTIVE") as ProjectStatus;
  const ownMilestones = milestones
    .filter((m) => m.workstream_id === String(row.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: String(row.id),
    project_id: String(row.project_id),
    name: String(row.name || ""),
    owner_staff_id: stringOrNull(row.owner_staff_id),
    owner_name: stringOrNull(row.owner_name),
    weight: Number(row.weight || 1),
    status,
    health: (row.health || "ON_TRACK") as ProjectHealth,
    next_action: stringOrNull(row.next_action),
    blocker: stringOrNull(row.blocker),
    deadline: stringOrNull(row.deadline),
    sort_order: Number(row.sort_order || 10),
    progress: workstreamProgress(status, ownMilestones),
    milestones: ownMilestones,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function projectProgress(status: ProjectStatus, workstreams: ProjectWorkstream[]): number {
  if (status === "COMPLETED") return 100;
  if (workstreams.length === 0) return 0;
  const totalWeight = workstreams.reduce(
    (sum, item) => sum + Math.max(1, item.weight),
    0
  );
  const weightedProgress = workstreams.reduce(
    (sum, item) => sum + item.progress * Math.max(1, item.weight),
    0
  );
  return Math.round(weightedProgress / totalWeight);
}

function mapProject(row: DbRow, workstreams: ProjectWorkstream[]): ProjectDetail {
  const status = (row.status || "ACTIVE") as ProjectStatus;
  const ownWorkstreams = workstreams
    .filter((item) => item.project_id === String(row.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: String(row.id),
    project_key: String(row.project_key || ""),
    name: String(row.name || ""),
    goal: stringOrNull(row.goal),
    lead_staff_id: stringOrNull(row.lead_staff_id),
    lead_name: stringOrNull(row.lead_name),
    status,
    health: (row.health || "ON_TRACK") as ProjectHealth,
    start_date: stringOrNull(row.start_date),
    deadline: stringOrNull(row.deadline),
    next_action: stringOrNull(row.next_action),
    blocker: stringOrNull(row.blocker),
    progress: projectProgress(status, ownWorkstreams),
    workstream_count: ownWorkstreams.length,
    workstreams: ownWorkstreams,
    created_by: stringOrNull(row.created_by),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

async function fetchProjectGraph(projectId?: string): Promise<ProjectDetail[]> {
  let projectQuery = client().from("prj_projects").select("*").order("updated_at", {
    ascending: false,
  });
  if (projectId) projectQuery = projectQuery.eq("id", projectId);

  const { data: projectRows, error: projectError } = await projectQuery;
  if (projectError) throw new Error(`Gagal memuat project: ${projectError.message}`);
  if (!projectRows?.length) return [];

  const projectIds = projectRows.map((row) => String(row.id));
  const { data: workstreamRows, error: workstreamError } = await client()
    .from("prj_workstreams")
    .select("*")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (workstreamError) {
    throw new Error(`Gagal memuat workstream: ${workstreamError.message}`);
  }

  const workstreamIds = (workstreamRows || []).map((row) => String(row.id));
  let milestoneRows: DbRow[] = [];
  if (workstreamIds.length) {
    const { data, error } = await client()
      .from("prj_milestones")
      .select("*")
      .in("workstream_id", workstreamIds)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`Gagal memuat milestone: ${error.message}`);
    milestoneRows = (data || []) as DbRow[];
  }

  const milestones = milestoneRows.map(mapMilestone);
  const workstreams = ((workstreamRows || []) as DbRow[]).map((row) =>
    mapWorkstream(row, milestones)
  );

  return (projectRows as DbRow[]).map((row) => mapProject(row, workstreams));
}

export async function listProjects(ownerStaffId?: string): Promise<ProjectSummary[]> {
  const projects = await fetchProjectGraph();
  const filtered = ownerStaffId
    ? projects.filter(
        (project) =>
          project.lead_staff_id === ownerStaffId ||
          project.workstreams.some((workstream) => workstream.owner_staff_id === ownerStaffId)
      )
    : projects;

  return filtered.map(({ workstreams: _workstreams, ...project }) => project);
}

export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  const projects = await fetchProjectGraph(projectId);
  return projects[0] || null;
}

export async function listProjectStaff(): Promise<ProjectStaffOption[]> {
  const { data, error } = await client()
    .from("staff")
    .select("staff_id,name,position,status")
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  if (error) throw new Error(`Gagal memuat staff: ${error.message}`);
  return (data || []).map((row) => ({
    staff_id: String(row.staff_id),
    name: String(row.name || ""),
    position: String(row.position || ""),
  }));
}

async function resolveStaffName(staffId?: string | null): Promise<string | null> {
  if (!staffId) return null;
  const { data, error } = await client()
    .from("staff")
    .select("name")
    .eq("staff_id", staffId)
    .maybeSingle();
  if (error) throw new Error(`Gagal memuat POC: ${error.message}`);
  return data?.name ? String(data.name) : null;
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "project";
}

export async function createProject(input: {
  name: string;
  goal?: string | null;
  lead_staff_id?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  next_action?: string | null;
  created_by?: string | null;
}): Promise<ProjectDetail> {
  const leadName = await resolveStaffName(input.lead_staff_id);
  const projectKey = `${slugify(input.name)}-${randomUUID().slice(0, 6)}`;
  const { data, error } = await client()
    .from("prj_projects")
    .insert({
      project_key: projectKey,
      name: input.name.trim(),
      goal: input.goal || null,
      lead_staff_id: input.lead_staff_id || null,
      lead_name: leadName,
      start_date: input.start_date || null,
      deadline: input.deadline || null,
      next_action: input.next_action || null,
      created_by: input.created_by || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Gagal membuat project: ${error.message}`);
  return mapProject(data as DbRow, []);
}

export async function updateProject(
  projectId: string,
  patch: Partial<{
    name: string;
    goal: string | null;
    lead_staff_id: string | null;
    status: ProjectStatus;
    health: ProjectHealth;
    start_date: string | null;
    deadline: string | null;
    next_action: string | null;
    blocker: string | null;
  }>
): Promise<ProjectDetail | null> {
  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (Object.prototype.hasOwnProperty.call(patch, "lead_staff_id")) {
    payload.lead_name = await resolveStaffName(patch.lead_staff_id || null);
  }

  const { error } = await client()
    .from("prj_projects")
    .update(payload)
    .eq("id", projectId);
  if (error) throw new Error(`Gagal memperbarui project: ${error.message}`);
  return getProject(projectId);
}

export async function createWorkstream(
  projectId: string,
  input: {
    name: string;
    owner_staff_id?: string | null;
    weight?: number;
    deadline?: string | null;
    next_action?: string | null;
  }
): Promise<ProjectDetail | null> {
  const ownerName = await resolveStaffName(input.owner_staff_id);
  const { error } = await client().from("prj_workstreams").insert({
    project_id: projectId,
    name: input.name.trim(),
    owner_staff_id: input.owner_staff_id || null,
    owner_name: ownerName,
    weight: Math.max(1, Number(input.weight || 1)),
    deadline: input.deadline || null,
    next_action: input.next_action || null,
  });
  if (error) throw new Error(`Gagal membuat workstream: ${error.message}`);
  return getProject(projectId);
}

export async function updateWorkstream(
  workstreamId: string,
  patch: Partial<{
    name: string;
    owner_staff_id: string | null;
    weight: number;
    status: ProjectStatus;
    health: ProjectHealth;
    deadline: string | null;
    next_action: string | null;
    blocker: string | null;
  }>
): Promise<void> {
  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (Object.prototype.hasOwnProperty.call(patch, "owner_staff_id")) {
    payload.owner_name = await resolveStaffName(patch.owner_staff_id || null);
  }
  const { error } = await client()
    .from("prj_workstreams")
    .update(payload)
    .eq("id", workstreamId);
  if (error) throw new Error(`Gagal memperbarui workstream: ${error.message}`);
}

export async function createMilestone(
  workstreamId: string,
  input: {
    title: string;
    description?: string | null;
    weight?: number;
    deadline?: string | null;
  }
): Promise<void> {
  const { error } = await client().from("prj_milestones").insert({
    workstream_id: workstreamId,
    title: input.title.trim(),
    description: input.description || null,
    weight: Math.max(1, Number(input.weight || 1)),
    deadline: input.deadline || null,
  });
  if (error) throw new Error(`Gagal membuat milestone: ${error.message}`);
}

export async function updateMilestone(
  milestoneId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    weight: number;
    status: MilestoneStatus;
    deadline: string | null;
    evidence_url: string | null;
  }>
): Promise<void> {
  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    payload.completed_at = patch.status === "DONE" ? new Date().toISOString() : null;
  }
  const { error } = await client()
    .from("prj_milestones")
    .update(payload)
    .eq("id", milestoneId);
  if (error) throw new Error(`Gagal memperbarui milestone: ${error.message}`);
}
