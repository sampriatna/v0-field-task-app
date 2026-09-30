"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  FolderKanban,
  Plus,
  UserRound,
  AlertTriangle,
  CircleCheckBig,
  PauseCircle,
} from "lucide-react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type {
  ProjectHealth,
  ProjectStaffOption,
  ProjectSummary,
} from "@/lib/project-types";

const healthMeta: Record<ProjectHealth, { label: string; className: string }> = {
  ON_TRACK: { label: "On Track", className: "bg-emerald-100 text-emerald-800" },
  NEED_ATTENTION: { label: "Need Attention", className: "bg-amber-100 text-amber-800" },
  BLOCKED: { label: "Blocked", className: "bg-red-100 text-red-800" },
  COMPLETED: { label: "Completed", className: "bg-slate-100 text-slate-700" },
};

function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerFilter = searchParams.get("owner") || "";
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [staff, setStaff] = useState<ProjectStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    goal: "",
    lead_staff_id: "",
    start_date: "",
    deadline: "",
    next_action: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = ownerFilter ? `?owner=${encodeURIComponent(ownerFilter)}` : "";
      const [projectsRes, staffRes] = await Promise.all([
        fetch(`/api/projects${query}`, { credentials: "include", cache: "no-store" }),
        fetch("/api/projects/staff", { credentials: "include", cache: "no-store" }),
      ]);
      const projectsJson = await projectsRes.json();
      const staffJson = await staffRes.json();
      if (!projectsJson.success) throw new Error(projectsJson.error || "Gagal memuat project");
      setProjects(projectsJson.data || []);
      if (staffJson.success) setStaff(staffJson.data || []);
    } catch (error) {
      toast({
        title: "Project belum bisa dimuat",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [ownerFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedOwner = staff.find((item) => item.staff_id === ownerFilter);

  const createProject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal membuat project");
      router.push(`/projects/${json.data.id}`);
    } catch (error) {
      toast({
        title: "Gagal membuat project",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Project" showBack backHref="/dashboard" showSettings />

      <main className="mx-auto max-w-5xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Project Berjalan</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Goal besar → workstream → milestone. Tugas harian tetap berjalan terpisah.
            </p>
          </div>
          <Button onClick={() => setShowCreate((value) => !value)}>
            <Plus className="w-4 h-4 mr-2" />
            Project
          </Button>
        </div>

        {selectedOwner && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span>
              Menampilkan project yang dipegang <strong>{selectedOwner.name}</strong>
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">Lihat Semua</Link>
            </Button>
          </div>
        )}

        {showCreate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Buat Project Baru</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label>Nama project</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Bisnis Ikan"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Goal akhir</Label>
                <Textarea
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  placeholder="Hasil akhir yang membuat project dianggap berhasil"
                />
              </div>
              <div className="space-y-2">
                <Label>Project Lead / POC utama</Label>
                <Select
                  value={form.lead_staff_id || "NONE"}
                  onValueChange={(value) =>
                    setForm({ ...form, lead_staff_id: value === "NONE" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih POC" />
                  </SelectTrigger>
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
                <Label>Next action pertama</Label>
                <Input
                  value={form.next_action}
                  onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                  placeholder="Apa yang harus bergerak berikutnya?"
                />
              </div>
              <div className="space-y-2">
                <Label>Mulai</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Batal
                </Button>
                <Button onClick={createProject} disabled={saving || !form.name.trim()}>
                  {saving ? "Menyimpan..." : "Buat Project"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="animate-pulse">
                <CardContent className="p-5 h-44 bg-muted/20" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <FolderKanban className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold">Belum ada project</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Mulai dari project besar. Workstream dan milestone dibuat setelahnya.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => {
              const health = healthMeta[project.health];
              return (
                <Card key={project.id} className="overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-lg hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate">{project.name}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </Link>
                        {project.goal && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.goal}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${health.className}`}>
                        {health.label}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Progress</span>
                        <strong>{project.progress}%</strong>
                      </div>
                      <Progress value={project.progress} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Project Lead</p>
                        {project.lead_staff_id ? (
                          <Link
                            href={`/projects?owner=${encodeURIComponent(project.lead_staff_id)}`}
                            className="font-medium hover:underline inline-flex items-center gap-1"
                          >
                            <UserRound className="w-3.5 h-3.5" />
                            {project.lead_name || "POC"}
                          </Link>
                        ) : (
                          <p className="font-medium">Belum ditentukan</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Workstream</p>
                        <p className="font-medium">{project.workstream_count}</p>
                      </div>
                    </div>

                    {project.next_action && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Next Action
                        </p>
                        <p className="text-sm mt-1">{project.next_action}</p>
                      </div>
                    )}

                    {project.blocker && (
                      <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-red-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-sm">{project.blocker}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {project.deadline ? `Deadline ${project.deadline}` : "Tanpa deadline"}
                      </span>
                      {project.status === "COMPLETED" ? (
                        <CircleCheckBig className="w-4 h-4" />
                      ) : project.status === "PAUSED" ? (
                        <PauseCircle className="w-4 h-4" />
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ProjectsContent />
    </Suspense>
  );
}
