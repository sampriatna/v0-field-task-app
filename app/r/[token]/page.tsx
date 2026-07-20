"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  MapPin,
  Briefcase,
  User,
  Camera,
  ClipboardList,
} from "lucide-react";
import { getStaffReportByToken, submitDailyReport } from "@/lib/api";
import type { ReportTemplate, DailyReportSubmission } from "@/lib/types";

type PageState = "loading" | "error" | "list" | "form" | "submitting" | "success";

export default function StaffStaticReportPage() {
  const params = useParams();
  const token = (params.token as string) || "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [staffName, setStaffName] = useState("");
  const [outlet, setOutlet] = useState("");
  const [position, setPosition] = useState("");
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [todaySubmissions, setTodaySubmissions] = useState<
    Pick<
      DailyReportSubmission,
      "id" | "report_template_id" | "report_title" | "submitted_at" | "status"
    >[]
  >([]);

  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
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

  const openForm = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setNote("");
    setPhoto(undefined);
    setPageState("form");
  };

  const alreadySubmitted = (templateId: string) =>
    todaySubmissions.some((s) => s.report_template_id === templateId);

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    if (selectedTemplate.requires_photo && !photo) {
      alert("HARAP UPLOAD FOTO");
      return;
    }

    setPageState("submitting");
    try {
      const result = await submitDailyReport({
        token,
        report_template_id: selectedTemplate.id,
        note,
        photo_base64: photo,
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
          <p className="text-slate-600 font-medium">Memuat laporan...</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Laporan Terkirim</h1>
          <p className="text-slate-600">
            {selectedTemplate?.title} sudah masuk ke dashboard.
          </p>
          <Button
            className="w-full h-12 text-base"
            onClick={() => {
              setSelectedTemplate(null);
              loadContext();
            }}
          >
            Kembali ke Daftar Report
          </Button>
        </div>
      </div>
    );
  }

  if ((pageState === "form" || pageState === "submitting") && selectedTemplate) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 bg-emerald-700 text-white px-4 py-4">
          <button
            type="button"
            className="text-sm text-emerald-100 mb-2"
            onClick={() => pageState !== "submitting" && setPageState("list")}
            disabled={pageState === "submitting"}
          >
            ← Kembali
          </button>
          <h1 className="text-xl font-bold leading-tight">{selectedTemplate.title}</h1>
          <p className="text-emerald-100 text-sm mt-1">{selectedTemplate.description}</p>
        </header>

        <div className="p-4 space-y-5 max-w-lg mx-auto pb-28">
          <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4" />
              <span className="font-medium">{staffName}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4" />
              <span>{outlet}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Briefcase className="h-4 w-4" />
              <span>{position}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-slate-800">Catatan</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tulis catatan singkat... (opsional)"
              className="min-h-28 text-base"
              disabled={pageState === "submitting"}
            />
          </div>

          {selectedTemplate.requires_photo && (
            <PhotoUploader
              label="Foto Bukti"
              required
              size="large"
              value={photo}
              onChange={setPhoto}
            />
          )}

          {!selectedTemplate.requires_photo && (
            <PhotoUploader
              label="Foto (opsional)"
              size="large"
              value={photo}
              onChange={setPhoto}
            />
          )}
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
                  Kirim Laporan
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // LIST
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-emerald-700 text-white px-4 py-5">
        <p className="text-emerald-100 text-sm mb-1">Laporan Harian</p>
        <h1 className="text-2xl font-bold">{staffName}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-lg px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {outlet}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-emerald-800/50 rounded-lg px-3 py-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            {position}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-10">
        <p className="text-slate-600 text-sm">
          Pilih jenis laporan yang ingin dikirim hari ini.
        </p>

        {templates.length === 0 ? (
          <div className="bg-white border rounded-xl p-6 text-center text-slate-500">
            <ClipboardList className="mx-auto h-10 w-10 mb-2 opacity-50" />
            Belum ada template report untuk jabatan Anda.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-slate-900 text-lg">
                          {template.title}
                        </h2>
                        {template.is_required_daily && (
                          <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            Wajib
                          </span>
                        )}
                        {done && (
                          <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            Sudah kirim
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                      )}
                      {template.requires_photo && (
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                          <Camera className="h-3.5 w-3.5" />
                          Wajib foto
                        </p>
                      )}
                    </div>
                    <span className="text-emerald-700 font-medium text-sm shrink-0">
                      {done ? "Update →" : "Isi →"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
