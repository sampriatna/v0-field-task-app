"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDot,
  Plus,
  Save,
  UserRound,
} from "lucide-react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type {
  MilestoneStatus,
  ProjectDetail,
  ProjectHealth,
  ProjectStaffOption,
  ProjectWorkstream,
} from "@/lib/project-types";

const healthOptions: { value: ProjectHealth; label: string }[] = [
  { value: "ON_TRACK", label: "On Track" },
  { value: "NEED_ATTENTION", label: "Need Attention" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "COMPLETED", label: "Completed" },
];

const milestoneOptions: { value: MilestoneStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Belum Mulai" },
  { value: "IN_PROGRESS", label: "Berjalan" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Selesai" },
];

function milestoneIcon(status: MilestoneStatus) {
  if (status === "DONE") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (status === "IN_PROGRESS") return <CircleDot className="w-4 h-4 text-amber-600" />;
  if (status === "BLOCKED") return <AlertTriangle className="w-4 h-4 text-red-600" />;
  return <Circle className="w-4 h-4 text-muted-foreground" />;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = String(params.projectId);
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [staff, setStaff] = useState<ProjectStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [projectEdit, setProjectEdit] = useState({
    lead_staff_id: "",
    health: "ON_TRACK" as ProjectHealth,
    next_action: "",
    blocker: "",
    deadline: "",
  });
  const [workstreamDrafts, setWorkstreamDrafts] = useState<Record<string, {
    owner_staff_id: string;
    health: ProjectHealth;
    next_action: string;
    blocker: string;
    deadline: string;
  }>>({});
  const [newWorkstream, setNewWorkstream] = useState({
    name: "",
    owner_staff_id: "",
    deadline: "",
    next_action: "",
  });
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, {
    title: string;
    deadline: string;
  }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, staffRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { credentials: "include", cache: "no-store" }),
        fetch("/api/projects/staff", { credentials: "include", cache: "no-store" }),
      ]);
      const projectJson = await projectRes.json();
      const staffJson = await staffRes.json();
      if (!projectJson.success) throw new Error(projectJson.error || "Project tidak ditemukan");

      const data = projectJson.data as ProjectDetail;
      setProject(data);
      setProjectEdit({
        lead_staff_id: data.lead_staff_id || "",
        health: data.health,
        next_action: data.next_action || "",
        blocker: data.blocker || "",
        deadline: data.deadline || "",
      });

      const nextDrafts: typeof workstreamDrafts = {};
      data.workstreams.forEach((workstream) => {
        nextDrafts[workstream.id] = {
          owner_staff_id: workstream.owner_staff_id || "",
          health: workstream.health,
          next_action: workstream.next_action || "",
          blocker: workstream.blocker || "",
          deadline: workstream.deadline || "",
        };
      });
      setWorkstreamDrafts(nextDrafts);
      if (staffJson.success) setStaff(staffJson.data || []);
    } catch (error) {
      toast({
        title: "Gagal memuat project",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const lead = useMemo(
    () => staff.find((item) => item.staff_id === project?.lead_staff_id),
    [staff, project?.lead_staff_id]
  );

  const patchProject = async () => {
    setSavingProject(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectEdit,
          lead_staff_id: projectEdit.lead_staff_id || null,
          deadline: projectEdit.deadline || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal menyimpan project");
      toast({ title: "Project diperbarui" });
      await load();
    } catch (error) {
      toast({
        title: "Gagal menyimpan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSavingProject(false);
    }
  };

  const saveWorkstream = async (workstream: ProjectWorkstream) => {
    const draft = workstreamDrafts[workstream.id];
    if (!draft) return;
    try {
      const res = await fetch(`/api/projects/workstreams/${workstream.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          owner_staff_id: draft.owner_staff_id || null,
          deadline: draft.deadline || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal memperbarui workstream");
      toast({ title: `${workstream.name} diperbarui` });
      await load();
    } catch (error) {
      toast({
        title: "Gagal menyimpan workstream",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const createWorkstream = async () => {
    if (!newWorkstream.name.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/workstreams`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newWorkstream,
          owner_staff_id: newWorkstream.owner_staff_id || null,
          deadline: newWorkstream.deadline || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal membuat workstream");
      setNewWorkstream({ name: "", owner_staff_id: "", deadline: "", next_action: "" });
      await load();
    } catch (error) {
      toast({
        title: "Gagal membuat workstream",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const createMilestone = async (workstreamId: string) => {
    const draft = milestoneDrafts[workstreamId] || { title: "", deadline: "" };
    if (!draft.title.trim()) return;
    try {
      const res = await fetch(`/api/projects/workstreams/${workstreamId}/milestones`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          deadline: draft.deadline || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal membuat milestone");
      setMilestoneDrafts((current) => ({
        ...current,
        [workstreamId]: { title: "", deadline: "" },
      }));
      await load();
    } catch (error) {
      toast({
        title: "Gagal membuat milestone",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const updateMilestoneStatus = async (milestoneId: string, status: MilestoneStatus) => {
    try {
      const res = await fetch(`/api/projects/milestones/${milestoneId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal memperbarui milestone");
      await load();
    } catch (error) {
      toast({
        title: "Gagal mengubah milestone",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  if (loading && !project) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Project" showBack backHref="/projects" />
        <div className="mx-auto max-w-5xl p-4">
          <Card className="animate-pulse"><CardContent className="h-60 bg-muted/20" /></Card>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Project" showBack backHref="/projects" />
        <div className="mx-auto max-w-5xl p-4">
          <Card><CardContent className="py-12 text-center">Project tidak ditemukan.</CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title={project.name} showBack backHref="/projects" showSettings />

      <main className="mx-auto max-w-5xl p-4 space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{project.name}</h2>
                  {project.goal && <p className="text-sm text-muted-foreground mt-1">{project.goal}</p>}
                </div>
                <span className="text-2xl font-bold">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="mt-3" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Project Lead / POC utama</Label>
                <Select
                  value={projectEdit.lead_staff_id || "NONE"}
                  onValueChange={(value) =>
                    setProjectEdit({
                      ...projectEdit,
                      lead_staff_id: value === "NONE" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Pilih POC" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Belum ditentukan</SelectItem>
                    {staff.map((item) => (
                      <SelectItem key={item.staff_id} value={item.staff_id}>
                        {item.name}{item.position ? ` — ${item.position}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lead && (
                  <Link
                    href={`/projects?owner=${encodeURIComponent(lead.staff_id)}`}
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    <UserRound className="w-3.5 h-3.5" />
                    Lihat semua project {lead.name}
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                <Label>Kondisi project</Label>
                <Select
                  value={projectEdit.health}
                  onValueChange={(value) =>
                    setProjectEdit({ ...projectEdit, health: value as ProjectHealth })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {healthOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next action</Label>
                <Textarea
                  value={projectEdit.next_action}
                  onChange={(e) => setProjectEdit({ ...projectEdit, next_action: e.target.value })}
                  placeholder="Satu langkah berikut yang harus bergerak"
                />
              </div>
              <div className="space-y-2">
                <Label>Blocker</Label>
                <Textarea
                  value={projectEdit.blocker}
                  onChange={(e) => setProjectEdit({ ...projectEdit, blocker: e.target.value })}
                  placeholder="Kosongkan jika tidak ada hambatan"
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={projectEdit.deadline}
                  onChange={(e) => setProjectEdit({ ...projectEdit, deadline: e.target.value })}
                />
              </div>
              <div className="flex items-end justify-end">
                <Button onClick={patchProject} disabled={savingProject}>
                  <Save className="w-4 h-4 mr-2" />
                  {savingProject ? "Menyimpan..." : "Simpan Project"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Workstream</h3>
            <p className="text-sm text-muted-foreground">
              Satu project boleh punya banyak penanggung jawab berdasarkan bagian kerja.
            </p>
          </div>
          <span className="text-sm text-muted-foreground">{project.workstreams.length} bagian</span>
        </div>

        {project.workstreams.map((workstream) => {
          const draft = workstreamDrafts[workstream.id] || {
            owner_staff_id: workstream.owner_staff_id || "",
            health: workstream.health,
            next_action: workstream.next_action || "",
            blocker: workstream.blocker || "",
            deadline: workstream.deadline || "",
          };
          const milestoneDraft = milestoneDrafts[workstream.id] || { title: "", deadline: "" };

          return (
            <Card key={workstream.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{workstream.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {workstream.milestones.filter((m) => m.status === "DONE").length}/{workstream.milestones.length} milestone selesai
                    </p>
                  </div>
                  <strong>{workstream.progress}%</strong>
                </div>
                <Progress value={workstream.progress} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Workstream Owner</Label>
                    <Select
                      value={draft.owner_staff_id || "NONE"}
                      onValueChange={(value) =>
                        setWorkstreamDrafts((current) => ({
                          ...current,
                          [workstream.id]: {
                            ...draft,
                            owner_staff_id: value === "NONE" ? "" : value,
                          },
                        }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih penanggung jawab" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Belum ditentukan</SelectItem>
                        {staff.map((item) => (
                          <SelectItem key={item.staff_id} value={item.staff_id}>
                            {item.name}{item.position ? ` — ${item.position}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kondisi</Label>
                    <Select
                      value={draft.health}
                      onValueChange={(value) =>
                        setWorkstreamDrafts((current) => ({
                          ...current,
                          [workstream.id]: { ...draft, health: value as ProjectHealth },
                        }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {healthOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Next action</Label>
                    <Input
                      value={draft.next_action}
                      onChange={(e) =>
                        setWorkstreamDrafts((current) => ({
                          ...current,
                          [workstream.id]: { ...draft, next_action: e.target.value },
                        }))
                      }
                      placeholder="Apa yang harus dilakukan berikutnya?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Blocker</Label>
                    <Input
                      value={draft.blocker}
                      onChange={(e) =>
                        setWorkstreamDrafts((current) => ({
                          ...current,
                          [workstream.id]: { ...draft, blocker: e.target.value },
                        }))
                      }
                      placeholder="Apa yang menahan bagian ini?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input
                      type="date"
                      value={draft.deadline}
                      onChange={(e) =>
                        setWorkstreamDrafts((current) => ({
                          ...current,
                          [workstream.id]: { ...draft, deadline: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button variant="outline" onClick={() => saveWorkstream(workstream)}>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan Bagian
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium">Milestone</p>
                  {workstream.milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada milestone.</p>
                  ) : (
                    <div className="space-y-2">
                      {workstream.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2">
                            <div className="mt-0.5">{milestoneIcon(milestone.status)}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{milestone.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {milestone.deadline ? `Deadline ${milestone.deadline}` : "Tanpa deadline"}
                              </p>
                            </div>
                          </div>
                          <Select
                            value={milestone.status}
                            onValueChange={(value) =>
                              updateMilestoneStatus(milestone.id, value as MilestoneStatus)
                            }
                          >
                            <SelectTrigger className="w-full sm:w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {milestoneOptions.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-2 pt-2 sm:grid-cols-[1fr_170px_auto]">
                    <Input
                      value={milestoneDraft.title}
                      onChange={(e) =>
                        setMilestoneDrafts((current) => ({
                          ...current,
                          [workstream.id]: { ...milestoneDraft, title: e.target.value },
                        }))
                      }
                      placeholder="Tambah milestone..."
                    />
                    <Input
                      type="date"
                      value={milestoneDraft.deadline}
                      onChange={(e) =>
                        setMilestoneDrafts((current) => ({
                          ...current,
                          [workstream.id]: { ...milestoneDraft, deadline: e.target.value },
                        }))
                      }
                    />
                    <Button
                      variant="secondary"
                      onClick={() => createMilestone(workstream.id)}
                      disabled={!milestoneDraft.title.trim()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Tambah
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tambah Workstream</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama bagian</Label>
              <Input
                value={newWorkstream.name}
                onChange={(e) => setNewWorkstream({ ...newWorkstream, name: e.target.value })}
                placeholder="Contoh: Ikan Hias / Produk & Pakan"
              />
            </div>
            <div className="space-y-2">
              <Label>Owner bagian</Label>
              <Select
                value={newWorkstream.owner_staff_id || "NONE"}
                onValueChange={(value) =>
                  setNewWorkstream({
                    ...newWorkstream,
                    owner_staff_id: value === "NONE" ? "" : value,
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Pilih owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Belum ditentukan</SelectItem>
                  {staff.map((item) => (
                    <SelectItem key={item.staff_id} value={item.staff_id}>
                      {item.name}{item.position ? ` — ${item.position}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Next action</Label>
              <Input
                value={newWorkstream.next_action}
                onChange={(e) => setNewWorkstream({ ...newWorkstream, next_action: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={newWorkstream.deadline}
                onChange={(e) => setNewWorkstream({ ...newWorkstream, deadline: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={createWorkstream} disabled={!newWorkstream.name.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Workstream
              </Button>
            </div>
          </CardContent>
        </Card>

        <Link href="/projects" className="inline-flex items-center text-sm text-primary hover:underline">
          Kembali ke semua project <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </main>
    </div>
  );
}
