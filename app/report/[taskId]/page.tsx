"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { getTaskByToken, markOpened, submitTaskReport } from "@/lib/api";
import type { Task } from "@/lib/types";

type PageState = "loading" | "error" | "form" | "success";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTask();
  }, [taskId, token]);

  const loadTask = async () => {
    if (!taskId || !token) {
      setErrorMessage("Link tugas tidak valid. Hubungi leader Anda.");
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
          result.error || "Link tugas tidak valid. Hubungi leader Anda."
        );
        setPageState("error");
      }
    } catch (error) {
      setErrorMessage("Gagal memuat data tugas. Coba lagi nanti.");
      setPageState("error");
    }
  };

  const handleSubmit = async () => {
    if (!afterPhoto) {
      alert("Harap upload foto bukti selesai");
      return;
    }

    setIsSubmitting(true);

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
        alert(result.error || "Gagal mengirim laporan. Coba lagi.");
      }
    } catch (error) {
      alert("Gagal mengirim laporan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Memuat data tugas...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Tugas Tidak Ditemukan
          </h2>
          <p className="text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Success State
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Laporan Berhasil Dikirim
          </h2>
          <p className="text-muted-foreground text-lg">
            Terima kasih sudah menyelesaikan tugas ini.
          </p>
          <p className="text-sm text-muted-foreground">
            Leader akan segera memeriksa laporan Anda.
          </p>
        </div>
      </div>
    );
  }

  // Form State
  const deadlineDate = task ? new Date(task.deadline) : new Date();
  const isOverdue = new Date() > deadlineDate;

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header for Staff */}
      <header className="bg-primary text-primary-foreground p-4">
        <h1 className="text-lg font-semibold text-center">
          Laporan Selesai Tugas
        </h1>
      </header>

      <div className="p-4 space-y-4 pb-24 max-w-lg mx-auto">
        {/* Task Info Card */}
        <Card className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-mono">
                {task?.task_id}
              </span>
              <h2 className="text-lg font-bold text-foreground mt-1">
                {task?.task_title}
              </h2>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>
                {task?.outlet} - {task?.area}
              </span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Deadline:{" "}
                {deadlineDate.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                {deadlineDate.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Task Description */}
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-1">
              Instruksi:
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task?.task_description}
            </p>
          </div>

          {/* Before Photo */}
          {task?.before_photo_url && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Foto Sebelum:
              </p>
              <img
                src={task.before_photo_url}
                alt="Foto sebelum"
                className="w-full rounded-lg border border-border"
              />
            </div>
          )}
        </Card>

        {/* Report Form */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-foreground text-lg">
            Kirim Bukti Selesai
          </h3>

          <PhotoUploader
            label="Foto Bukti Selesai"
            required
            value={afterPhoto}
            onChange={setAfterPhoto}
          />

          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              placeholder="Tulis catatan jika ada..."
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              rows={3}
            />
          </div>
        </Card>
      </div>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !afterPhoto}
            className="w-full h-14 text-lg font-semibold"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                Mengirim...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                Saya Sudah Selesai
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
