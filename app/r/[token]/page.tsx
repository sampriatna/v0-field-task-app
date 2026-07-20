"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  MapPin,
  Briefcase,
  User,
  Camera,
  ClipboardList,
  Clock,
  Target,
} from "lucide-react";
import { getStaffReportByToken, submitDailyReport } from "@/lib/api";
import type {
  ReportTemplate,
  DailyReportSubmission,
  ReportConditionStatus,
} from "@/lib/types";
import { REPORT_CONDITION_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";

type PageState = "loading" | "error" | "list" | "form" | "submitting" | "success";

export default function StaffStaticReportPage() {
  const params = useParams();
  const token = (params.token as string) || "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [staffName, setStaffName] = useState("");
  const [outlet, setOutlet] = useState("");
  const [position, setPosition] = useState("");
  const [positionGroup, setPositionGroup] = useState("");
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [todaySubmissions, setTodaySubmissions] = useState<DailyReportSubmission[]>([]);

  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [statusCondition, setStatusCondition] = useState<ReportConditionStatus | "">("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();

  useEffect(() => {
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadContext = async () => {
    if (!token) {
      setErrorMessage("Link tidak valid.\nHubungi atasan Anda.");
      setPageState("error");
      return;
    }

    setPageState("loading");
    try {
      const result = await getStaffReportByToken(token);
      if (result.success && result.data) {
        setStaffName(result.data.staff.name);
        setOutlet(result.data.staff.outlet);
        setPosition(result.data.staff.position);
        setPositionGroup(result.data.staff.position_group);
        setTemplates(result.data.templates);
        setTodaySubmissions(result.data.today_submissions || []);
        setPageState("list");
      } else {
        setErrorMessage(result.error || "Link tidak valid.\nHubungi atasan Anda.");
        setPageState("error");
      }
    } catch {
      setErrorMessage("Gagal memuat data.\nPeriksa koneksi internet Anda.");
      setPageState("error");
    }
  };

  const requiredTemplates = useMemo(
    () => templates.filter((t) => t.is_required_daily),
    [templates]
  );
  const otherTemplates = useMemo(
    () => templates.filter((t) => !t.is_required_daily),
    [templates]
  );

  const alreadySubmitted = (templateId: string) =>
    todaySubmissions.find((s) => s.report_template_id === templateId);

  const openForm = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    const existing = alreadySubmitted(template.id);
    const initial: Record<string, boolean> = {};
    for (const item of template.checklist_items || []) {
      const prev = existing?.checklist_answers?.find(
        (a) => a.checklist_item_id === item.id
      );
      initial[item.id] = Boolean(prev?.checked);
    }
    setCheckedMap(initial);
    setStatusCondition(existing?.status_condition || "");
    setNote(existing?.note || "");
    setPhoto(existing?.photo_url || undefined);
    setPageState("form");
  };

  const checkedCount = selectedTemplate
    ? (selectedTemplate.checklist_items || []).filter((i) => checkedMap[i.id]).length
    : 0;
  const totalCount = selectedTemplate?.checklist_items?.length || 0;

  const conditionNeedsNote =
    statusCondition &&
    REPORT_CONDITION_OPTIONS.find((o) => o.value === statusCondition)?.requiresNote;

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    if (!statusCondition) {
      alert("PILIH STATUS KONDISI");
      return;
    }

    if (selectedTemplate.requires_photo && !photo) {
      alert("HARAP UPLOAD FOTO BUKTI");
      return;
    }

    if (conditionNeedsNote && !note.trim()) {
      alert("ISI CATATAN KENDALA");
      return;
    }

    const answers = (selectedTemplate.checklist_items || []).map((item) => ({
      checklist_item_id: item.id,
      checked: Boolean(checkedMap[item.id]),
    }));

    if (answers.length > 0 && answers.every((a) => !a.checked)) {
      alert("Centang minimal beberapa checklist yang sudah dikerjakan.");
      return;
    }

    setPageState("submitting");
    try {
      const result = await submitDailyReport({
        token,
        report_template_id: selectedTemplate.id,
        status_condition: statusCondition,
        note,
        photo_base64: photo,
        checklist_answers: answers,
      });

      if (result.success) {
        setPageState("success");
      } else {
        setPageState("form");
        alert(result.error || "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setPageState("form");
      alert("Gagal mengirim. Periksa koneksi internet.");
    }
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-slate-600 font-medium">Memuat kegiatan...</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-100 p-6 text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-slate-900">Link Tidak Valid</h1>
          <p className="text-slate-600 whitespace-pre-line">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-emerald-100 p-6 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900">Kegiatan Terkirim</h1>
          <p className="text-slate-600">
            {selectedTemplate?.title} — {checkedCount}/{totalCount} checklist
          </p>
          <Button
            className="w-full h-12 text-base"
            onClick={() => {
              setSelectedTemplate(null);
              loadContext();
            }}
          >
            Kembali ke Daftar Kegiatan
          </Button>
        </div>
      </div>
    );
  }

  if ((pageState === "form" || pageState === "submitting") && selectedTemplate) {
    const items = selectedTemplate.checklist_items || [];
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 bg-emerald-700 text-white px-4 py-4">
          <button
            type="button"
            className="text-sm text-emerald-100 mb-2 disabled:opacity-50"
            onClick={() => pageState !== "submitting" && setPageState("list")}
            disabled={pageState === "submitting"}
          >
            ← Kembali
          </button>
          <h1 className="text-xl font-bold leading-tight">{selectedTemplate.title}</h1>
          {(selectedTemplate.target_time_start || selectedTemplate.target_time_end) && (
            <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Target {selectedTemplate.target_time_start || "—"}–
              {selectedTemplate.target_time_end || "—"}
            </p>
          )}
        </header>

        <div className="p-4 space-y-5 max-w-lg mx-auto pb-32">
          {/* Standar hasil */}
          <div className="bg-white rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Target className="h-4 w-4 text-emerald-700" />
              Standar hasil
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {selectedTemplate.standard_result || selectedTemplate.description}
            </p>
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Checklist kerja</h2>
              <span className="text-sm text-slate-500">
                {checkedCount}/{totalCount}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                    checkedMap[item.id]
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-slate-200"
                  )}
                >
                  <Checkbox
                    checked={Boolean(checkedMap[item.id])}
                    onCheckedChange={(v) =>
                      setCheckedMap((prev) => ({ ...prev, [item.id]: Boolean(v) }))
                    }
                    className="mt-0.5 h-5 w-5"
                    disabled={pageState === "submitting"}
                  />
                  <span className="text-base text-slate-800 leading-snug">
                    {item.item_text}
                  </span>
                </label>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-slate-500">Checklist belum diatur.</p>
              )}
            </div>
          </div>

          {/* Foto */}
          {selectedTemplate.requires_photo ? (
            <div className="space-y-2">
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Bukti foto (wajib)
              </p>
              <p className="text-sm text-slate-500">
                Upload foto kondisi setelah kegiatan selesai.
              </p>
              <PhotoUploader
                label=""
                required
                size="large"
                value={photo}
                onChange={setPhoto}
              />
            </div>
          ) : (
            <PhotoUploader
              label="Foto (opsional)"
              size="large"
              value={photo}
              onChange={setPhoto}
            />
          )}

          {/* Status kondisi — tombol besar */}
          <div className="space-y-2">
            <h2 className="font-semibold text-slate-900">Status kondisi</h2>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={pageState === "submitting"}
                  onClick={() => setStatusCondition(opt.value)}
                  className={cn(
                    "h-14 rounded-xl border-2 text-base font-semibold transition-colors",
                    statusCondition === opt.value
                      ? opt.value === "aman"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan — tambahan saja */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-800">
              Catatan kendala
              {conditionNeedsNote ? " *" : " (opsional)"}
            </label>
            <p className="text-xs text-slate-500">
              Bukan laporan utama. Isi hanya jika ada kendala / perlu follow up.
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: sabun tinggal sedikit / saluran agak mampet"
              className="min-h-24 text-base"
              disabled={pageState === "submitting"}
            />
          </div>
        </div>

        <div className="fixed bottom-0 inset-x-0 bg-white border-t p-4">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-14 text-lg font-semibold"
              disabled={pageState === "submitting"}
              onClick={handleSubmit}
            >
              {pageState === "submitting" ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Kirim Kegiatan
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // LIST
  const renderActivityCard = (template: ReportTemplate) => {
    const done = alreadySubmitted(template.id);
    return (
      <button
        key={template.id}
        type="button"
        onClick={() => openForm(template)}
        className="w-full text-left bg-white border rounded-xl p-4 hover:border-emerald-400 transition-colors active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="font-semibold text-slate-900 text-lg">{template.title}</h2>
              {template.is_required_daily && (
                <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Wajib
                </span>
              )}
              {done && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    done.status_condition === "aman"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  )}
                >
                  {done.status_condition === "aman" ? "Selesai" : "Ada kendala"}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 line-clamp-2">
              {template.standard_result || template.description}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
              <span>{template.checklist_items?.length || 0} checklist</span>
              {template.requires_photo && (
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Foto wajib
                </span>
              )}
              {(template.target_time_start || template.target_time_end) && (
                <span>
                  {template.target_time_start}–{template.target_time_end}
                </span>
              )}
            </div>
          </div>
          <span className="text-emerald-700 font-medium text-sm shrink-0">
            {done ? "Update →" : "Isi →"}
          </span>
        </div>
      </button>
    );
  };

  const doneRequired = requiredTemplates.filter((t) => alreadySubmitted(t.id)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-emerald-700 text-white px-4 py-5">
        <p className="text-emerald-100 text-sm mb-1">Kegiatan Harian</p>
        <h1 className="text-2xl font-bold">{staffName}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-lg px-3 py-1.5">
            <User className="h-3.5 w-3.5" />
            {staffName}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-lg px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {outlet}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-lg px-3 py-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            {position}
            {positionGroup ? ` · ${positionGroup}` : ""}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-5 max-w-lg mx-auto pb-10">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-slate-600">
            Ikuti standar kerja. Centang checklist, upload foto, pilih kondisi.{" "}
            <span className="font-medium text-slate-800">
              Wajib hari ini: {doneRequired}/{requiredTemplates.length}
            </span>
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Kegiatan wajib hari ini
          </h2>
          {requiredTemplates.length === 0 ? (
            <div className="bg-white border rounded-xl p-6 text-center text-slate-500 text-sm">
              Belum ada kegiatan wajib untuk jabatan Anda.
            </div>
          ) : (
            requiredTemplates.map(renderActivityCard)
          )}
        </section>

        {otherTemplates.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-800">Lainnya / Lapor kendala</h2>
            {otherTemplates.map(renderActivityCard)}
          </section>
        )}
      </div>
    </div>
  );
}
