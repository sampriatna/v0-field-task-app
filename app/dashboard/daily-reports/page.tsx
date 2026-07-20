"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Users,
  UserX,
  AlertTriangle,
  RefreshCw,
  Filter,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { getDailyReportDashboard, getStaff, getReportTemplates, syncDailyReportStaff } from "@/lib/api";
import { outlets } from "@/lib/mock-data";
import type {
  DailyReportDashboardData,
  DailyReportDashboardRow,
  DailyReportRowLabel,
  Outlet,
  ReportTemplate,
  Staff,
  ReportConditionStatus,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function conditionLabel(c?: ReportConditionStatus | null): string {
  switch (c) {
    case "aman":
      return "Aman";
    case "kendala_ringan":
      return "Kendala ringan";
    case "follow_up_leader":
      return "Follow up leader";
    case "perlu_belanja":
      return "Perlu belanja/perbaikan";
    default:
      return "—";
  }
}

function labelMeta(label: DailyReportRowLabel): {
  text: string;
  className: string;
} {
  switch (label) {
    case "selesai_lengkap":
      return { text: "Selesai lengkap", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    case "selesai_kendala":
      return { text: "Selesai ada kendala", className: "bg-amber-100 text-amber-900 border-amber-200" };
    case "belum_submit":
      return { text: "Belum submit", className: "bg-red-100 text-red-800 border-red-200" };
    case "tidak_wajib":
      return { text: "Tidak wajib", className: "bg-slate-100 text-slate-600 border-slate-200" };
  }
}

export default function DailyReportsDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DailyReportDashboardData | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [date, setDate] = useState(todayLocal());
  const [outlet, setOutlet] = useState<Outlet | "ALL">("ALL");
  const [staffId, setStaffId] = useState<string>("ALL");
  const [templateId, setTemplateId] = useState<string>("ALL");
  const [submitStatus, setSubmitStatus] = useState<"all" | "submitted" | "not_submitted">("all");

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      try {
        // Sync staff dulu (data client) — dashboard tidak nunggu GAS
        const staffRes = await getStaff({ status: "ACTIVE" });
        if (staffRes.success && staffRes.data) {
          setStaffList(staffRes.data);
          await syncDailyReportStaff(staffRes.data);
        }

        const [dash, tplRes] = await Promise.all([
          getDailyReportDashboard({
            date,
            outlet: outlet === "ALL" ? undefined : outlet,
            staff_id: staffId === "ALL" ? undefined : staffId,
            report_template_id: templateId === "ALL" ? undefined : templateId,
            submit_status: submitStatus,
          }),
          getReportTemplates(),
        ]);

        if (dash.success && dash.data) setData(dash.data);
        else {
          toast({
            title: "Error",
            description: dash.error || "Gagal memuat dashboard",
            variant: "destructive",
          });
        }
        if (tplRes.success && tplRes.data) setTemplates(tplRes.data);
      } catch {
        toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [date, outlet, staffId, templateId, submitStatus, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const rows = data?.rows || [];
  const missing = data?.missing_required || [];

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Daily Report" showBack backHref="/dashboard" showSettings />

      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-foreground">Kinerja per staff × kegiatan</h2>
            <p className="text-sm text-muted-foreground">
              Dashboard terpisah dari Task. Setiap baris = 1 orang + 1 kegiatan hari itu.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => load(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 text-sm text-blue-900">
            <strong>Terpisah dari Task.</strong> Ini audit Daily Activity SOP per person —
            siapa sudah/belum isi kegiatan standar hari ini. Task WA/deadline tetap di Dashboard
            utama.
          </CardContent>
        </Card>

        {/* Color legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded border bg-emerald-100 text-emerald-800">Hijau: selesai lengkap</span>
          <span className="px-2 py-1 rounded border bg-amber-100 text-amber-900">Kuning: ada kendala</span>
          <span className="px-2 py-1 rounded border bg-red-100 text-red-800">Merah: belum submit</span>
          <span className="px-2 py-1 rounded border bg-slate-100 text-slate-600">Abu: tidak wajib</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                <ClipboardList className="h-4 w-4" />
                Total submit hari ini
              </div>
              <p className="text-2xl font-bold">{isLoading ? "—" : summary?.total_today ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-emerald-700 text-xs mb-1">
                <CheckCircle2 className="h-4 w-4" />
                Selesai lengkap
              </div>
              <p className="text-2xl font-bold text-emerald-800">
                {isLoading ? "—" : summary?.complete_ok ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-amber-700 text-xs mb-1">
                <AlertTriangle className="h-4 w-4" />
                Selesai ada kendala
              </div>
              <p className="text-2xl font-bold text-amber-800">
                {isLoading ? "—" : summary?.complete_with_issue ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-red-700 text-xs mb-1">
                <UserX className="h-4 w-4" />
                Belum submit (wajib)
              </div>
              <p className="text-2xl font-bold text-red-800">
                {isLoading ? "—" : summary?.not_submitted ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="h-4 w-4" />
                Staff lengkap semua wajib
              </div>
              <p className="text-xl font-bold">{isLoading ? "—" : summary?.staff_submitted ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <UserX className="h-4 w-4" />
                Staff belum lengkap
              </div>
              <p className="text-xl font-bold">
                {isLoading ? "—" : summary?.staff_not_submitted ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {!isLoading && missing.length > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-900">
                <AlertTriangle className="h-4 w-4" />
                Belum submit kegiatan wajib ({missing.length})
              </div>
              <ul className="text-sm text-red-900 space-y-1">
                {missing.slice(0, 10).map((m) => (
                  <li key={`${m.staff_id}-${m.report_template_id}`}>
                    <span className="font-medium">{m.staff_name}</span>
                    {" — "}
                    {m.report_title}
                    {" — "}
                    {m.outlet}
                  </li>
                ))}
                {missing.length > 10 && (
                  <li className="text-red-700">+{missing.length - 10} lainnya</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        {showFilters && (
          <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Select value={outlet} onValueChange={(v) => setOutlet(v as Outlet | "ALL")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Outlet</SelectItem>
                    {outlets.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Staff</Label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Staff</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.staff_id} value={s.staff_id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kegiatan</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kegiatan</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Status Submit</Label>
                <Select
                  value={submitStatus}
                  onValueChange={(v) =>
                    setSubmitStatus(v as "all" | "submitted" | "not_submitted")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="submitted">Sudah submit</SelectItem>
                    <SelectItem value="not_submitted">Belum submit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

          <div className="flex gap-2 flex-wrap">
          <Link href="/settings/daily-activity">
            <Button variant="outline" size="sm">
              Super Admin Hub
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
          <Link href="/settings/report-links">
            <Button variant="outline" size="sm">
              Kelola Link Staff
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
          <Link href="/settings/report-templates">
            <Button variant="outline" size="sm">
              Edit Template
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">{rows.length} baris</h3>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Tidak ada data untuk filter ini
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-3 font-medium">Staff</th>
                      <th className="p-3 font-medium">Outlet</th>
                      <th className="p-3 font-medium">Kegiatan</th>
                      <th className="p-3 font-medium">Checklist</th>
                      <th className="p-3 font-medium">Jam</th>
                      <th className="p-3 font-medium">Kondisi</th>
                      <th className="p-3 font-medium">Foto</th>
                      <th className="p-3 font-medium">Catatan</th>
                      <th className="p-3 font-medium">Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <RowDesktop key={`${row.staff_id}-${row.report_template_id}`} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {rows.map((row) => (
                  <RowMobile key={`${row.staff_id}-${row.report_template_id}`} row={row} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RowDesktop({ row }: { row: DailyReportDashboardRow }) {
  const meta = labelMeta(row.label);
  return (
    <tr
      className={cn(
        "border-t",
        row.label === "belum_submit" && "bg-red-50/40",
        row.label === "selesai_kendala" && "bg-amber-50/40",
        row.label === "selesai_lengkap" && "bg-emerald-50/30"
      )}
    >
      <td className="p-3 font-medium">{row.staff_name}</td>
      <td className="p-3">{row.outlet}</td>
      <td className="p-3">
        {row.report_title}
        {row.is_required_daily && (
          <Badge variant="secondary" className="ml-1 text-[10px]">
            Wajib
          </Badge>
        )}
      </td>
      <td className="p-3 whitespace-nowrap">
        {row.submitted
          ? `${row.checklist_checked}/${row.checklist_total} (${row.checklist_percent}%)`
          : "—"}
      </td>
      <td className="p-3 whitespace-nowrap">{formatTime(row.submitted_at)}</td>
      <td className="p-3">{conditionLabel(row.status_condition)}</td>
      <td className="p-3">
        {row.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <a href={row.photo_url} target="_blank" rel="noreferrer">
            <img src={row.photo_url} alt="Foto" className="h-10 w-10 object-cover rounded" />
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 max-w-[180px] truncate" title={row.note || ""}>
        {row.note || "—"}
      </td>
      <td className="p-3">
        <span className={cn("text-xs font-medium px-2 py-1 rounded border", meta.className)}>
          {meta.text}
        </span>
      </td>
    </tr>
  );
}

function RowMobile({ row }: { row: DailyReportDashboardRow }) {
  const meta = labelMeta(row.label);
  return (
    <Card
      className={cn(
        row.label === "belum_submit" && "border-red-200 bg-red-50/40",
        row.label === "selesai_kendala" && "border-amber-200 bg-amber-50/40",
        row.label === "selesai_lengkap" && "border-emerald-200 bg-emerald-50/30"
      )}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{row.staff_name}</p>
            <p className="text-sm text-muted-foreground">
              {row.outlet} · {row.position}
            </p>
          </div>
          <span className={cn("text-xs font-medium px-2 py-1 rounded border shrink-0", meta.className)}>
            {meta.text}
          </span>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">Kegiatan: </span>
          {row.report_title}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Checklist: </span>
          {row.submitted
            ? `${row.checklist_checked}/${row.checklist_total} (${row.checklist_percent}%)`
            : "—"}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Jam: </span>
          {formatTime(row.submitted_at)}
          {" · "}
          <span className="text-muted-foreground">Kondisi: </span>
          {conditionLabel(row.status_condition)}
        </p>
        {row.note && (
          <p className="text-sm">
            <span className="text-muted-foreground">Catatan: </span>
            {row.note}
          </p>
        )}
        {row.photo_url && (
          <a
            href={row.photo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary"
          >
            <ImageIcon className="h-4 w-4" />
            Lihat foto
          </a>
        )}
      </CardContent>
    </Card>
  );
}
