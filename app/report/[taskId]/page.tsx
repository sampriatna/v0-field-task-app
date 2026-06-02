"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";
import { getTaskByToken, markOpened, submitTaskReport } from "@/lib/api";
import type { Task } from "@/lib/types";

type PageState = "loading" | "error" | "form" | "submitting" | "success";

export default function StaffReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const taskId = params.taskId as string;
  const token = searchParams.get("token") || "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [task, setTask] = useState<Task | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [afterPhoto, setAfterPhoto] = useState<string | undefined>();
  const [staffNote, setStaffNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, token]);

  const loadTask = async () => {
    if (!taskId || !token) {
      setErrorMessage("Link tidak valid.\nHubungi atasan Anda.");
      setPageState("error");
      return;
    }

    try {
      const result = await getTaskByToken(taskId, token);

      if (result.success && result.data) {
        setTask(result.data);
        setPageState("form");

        // Mark as opened
        await markOpened(taskId, token);
      } else {
        setErrorMessage(
          result.error || "Link tidak valid.\nHubungi atasan Anda."
        );
        setPageState("error");
      }
    } catch {
      setErrorMessage("Gagal memuat tugas.\nPeriksa koneksi internet Anda.");
      setPageState("error");
    }
  };

  const handleSubmit = async () => {
    if (!afterPhoto) {
      alert("HARAP UPLOAD FOTO BUKTI SELESAI");
      return;
    }

    setPageState("submitting");

    try {
      const result = await submitTaskReport({
        task_id: taskId,
        token,
        after_photo_base64: afterPhoto,
        staff_note: staffNote,
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

  // ===================
  // LOADING STATE
  // ===================
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
        <p className="text-xl font-medium text-foreground mt-6">
          Memuat Tugas...
        </p>
        <p className="text-muted-foreground mt-2">Harap tunggu sebentar</p>
      </div>
    );
  }

  // ===================
  // ERROR STATE
  // ===================
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-6 text-center">
          Tugas Tidak Ditemukan
        </h1>
        <p className="text-lg text-muted-foreground mt-3 text-center whitespace-pre-line">
          {errorMessage}
        </p>
        <Button
          onClick={loadTask}
          variant="outline"
          size="lg"
          className="mt-8 h-14 px-8 text-lg"
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  // ===================
  // SUBMITTING STATE
  // ===================
  if (pageState === "submitting") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary border-t-transparent" />
        <p className="text-2xl font-bold text-foreground mt-8">
          Mengirim Laporan...
        </p>
        <p className="text-lg text-muted-foreground mt-3 text-center">
          Harap tunggu, jangan tutup halaman ini
        </p>
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Mengupload foto...</span>
        </div>
      </div>
    );
  }

  // ===================
  // SUCCESS STATE
  // ===================
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-success/5 flex flex-col items-center justify-center p-6">
        <div className="w-28 h-28 rounded-full bg-success/20 flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-16 h-16 text-success" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mt-8 text-center">
          BERHASIL!
        </h1>
        <p className="text-xl text-muted-foreground mt-4 text-center">
          Laporan Anda sudah terkirim
        </p>
        <div className="mt-8 p-4 bg-card rounded-xl border border-border text-center">
          <p className="text-muted-foreground">
            Atasan Anda akan memeriksa laporan ini.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Anda bisa menutup halaman ini.
          </p>
        </div>
      </div>
    );
  }

  // ===================
  // FORM STATE - Main UI for Staff
  // ===================
  const deadlineDate = task ? new Date(task.deadline) : new Date();
  const now = new Date();
  const isOverdue = now > deadlineDate;
  
  // Calculate time remaining
  const timeDiff = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER - Simple, No Navigation */}
      <header className="bg-primary text-primary-foreground p-4 text-center shrink-0">
        <h1 className="text-lg font-bold">LAPORAN TUGAS</h1>
      </header>

      {/* DEADLINE BANNER - Very Prominent */}
      <div className={`p-4 ${isOverdue ? 'bg-destructive/10 border-b-2 border-destructive' : 'bg-warning/10 border-b-2 border-warning'}`}>
        <div className="flex items-center justify-center gap-3">
          <Clock className={`w-6 h-6 ${isOverdue ? 'text-destructive' : 'text-warning-foreground'}`} />
          <div className="text-center">
            {isOverdue ? (
              <>
                <p className="text-lg font-bold text-destructive">TERLAMBAT!</p>
                <p className="text-sm text-destructive/80">Segera selesaikan tugas ini</p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-warning-foreground">
                  Deadline: {deadlineDate.toLocaleDateString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  {deadlineDate.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-warning-foreground/80">
                  Sisa waktu: {hoursRemaining > 0 ? `${hoursRemaining} jam ` : ""}{minutesRemaining} menit
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-5 max-w-lg mx-auto pb-32">
          {/* TASK TITLE - Large and Clear */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground font-mono mb-1">
              {task?.task_id}
            </p>
            <h2 className="text-xl font-bold text-foreground leading-tight">
              {task?.task_title}
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              {task?.outlet} - {task?.area}
            </p>
          </div>

          {/* TASK INSTRUCTIONS - Collapsible for simplicity */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <span className="font-semibold text-foreground">
                Lihat Instruksi Tugas
              </span>
              {showDetails ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            {showDetails && (
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {/* Instructions */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    INSTRUKSI:
                  </p>
                  <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                    {task?.task_description}
                  </p>
                </div>

                {/* Before Photo */}
                {task?.before_photo_url && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      FOTO SEBELUM:
                    </p>
                    <img
                      src={task.before_photo_url}
                      alt="Foto sebelum"
                      className="w-full rounded-lg border border-border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PHOTO UPLOAD - Large and Prominent */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <PhotoUploader
              label="UPLOAD FOTO BUKTI SELESAI"
              required
              value={afterPhoto}
              onChange={setAfterPhoto}
              size="large"
            />
          </div>

          {/* OPTIONAL NOTE - Simple */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Catatan (tidak wajib)
            </label>
            <Textarea
              placeholder="Tulis catatan jika ada..."
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              rows={2}
              className="text-base"
            />
          </div>
        </div>
      </div>

      {/* FIXED SUBMIT BUTTON - Super Large */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t-2 border-border shadow-lg">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={!afterPhoto}
            size="lg"
            className={`w-full h-16 text-xl font-bold transition-all ${
              afterPhoto 
                ? 'bg-success hover:bg-success/90 text-success-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Send className="w-6 h-6 mr-3" />
            {afterPhoto ? "KIRIM LAPORAN" : "UPLOAD FOTO DULU"}
          </Button>
          {!afterPhoto && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Ambil foto bukti selesai untuk mengirim laporan
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
