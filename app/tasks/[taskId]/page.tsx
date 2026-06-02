"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MobileHeader } from "@/components/mobile-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Send,
  Image as ImageIcon,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { getTaskDetail, verifyTask, resendWhatsApp } from "@/lib/api";
import type { Task } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface TimelineEvent {
  label: string;
  time: string | null;
  icon: React.ReactNode;
  completed: boolean;
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    setIsLoading(true);
    try {
      const result = await getTaskDetail(taskId);
      if (result.success && result.data) {
        setTask(result.data);
      }
    } catch (error) {
      console.error("Failed to load task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsActionLoading(true);
    try {
      const result = await verifyTask(taskId, "approved");
      if (result.success) {
        toast({
          title: "Tugas Disetujui",
          description: "Status tugas telah diperbarui menjadi DONE",
        });
        loadTask();
      } else {
        toast({
          title: "Gagal menyetujui",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Gagal menyetujui",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionNote.trim()) {
      toast({
        title: "Catatan diperlukan",
        description: "Harap isi alasan revisi",
        variant: "destructive",
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await verifyTask(taskId, "revision", revisionNote);
      if (result.success) {
        toast({
          title: "Permintaan Revisi Dikirim",
          description: "Staff akan menerima notifikasi untuk revisi",
        });
        setShowRevisionDialog(false);
        setRevisionNote("");
        loadTask();
      } else {
        toast({
          title: "Gagal mengirim revisi",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Gagal mengirim revisi",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResendWA = async () => {
    setIsActionLoading(true);
    try {
      const result = await resendWhatsApp(taskId);
      if (result.success) {
        toast({
          title: "WhatsApp Dikirim Ulang",
          description: "Notifikasi sedang diproses",
        });
      } else {
        toast({
          title: "Gagal mengirim ulang",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Gagal mengirim ulang",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Detail Tugas" showBack backHref="/dashboard" />
        <div className="p-4 space-y-4">
          <Card className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-24 bg-muted rounded" />
              <div className="h-8 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Detail Tugas" showBack backHref="/dashboard" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Tugas tidak ditemukan</p>
          </div>
        </div>
      </div>
    );
  }

  const deadlineDate = new Date(task.deadline);
  const isOverdue = new Date() > deadlineDate && task.status === "OPEN";

  const timeline: TimelineEvent[] = [
    {
      label: "Dibuat",
      time: task.created_at,
      icon: <Calendar className="w-4 h-4" />,
      completed: true,
    },
    {
      label: "WA Dikirim",
      time: task.wa_sent_at || null,
      icon: <Send className="w-4 h-4" />,
      completed: !!task.wa_sent_at,
    },
    {
      label: "Dibuka",
      time: task.opened_at || null,
      icon: <Clock className="w-4 h-4" />,
      completed: !!task.opened_at,
    },
    {
      label: "Laporan Dikirim",
      time: task.submitted_at || null,
      icon: <ImageIcon className="w-4 h-4" />,
      completed: !!task.submitted_at,
    },
    {
      label: "Diverifikasi",
      time: task.verified_at || null,
      icon: <CheckCircle2 className="w-4 h-4" />,
      completed: !!task.verified_at,
    },
  ];

  const canApprove = task.status === "SUBMITTED";
  const canResendWA = task.status === "OPEN" || task.status === "REVISI";

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobileHeader title="Detail Tugas" showBack backHref="/dashboard" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Header Card */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-xs text-muted-foreground font-mono">
                {task.task_id}
              </span>
              <h1 className="text-xl font-bold text-foreground mt-1">
                {task.task_title}
              </h1>
            </div>
            <StatusBadge status={task.status} />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>
                {task.outlet} - {task.area} - {task.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 shrink-0" />
              <span>
                {task.pic_name} ({task.pic_wa})
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
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                {deadlineDate.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-1">
              Deskripsi:
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.task_description}
            </p>
          </div>
        </Card>

        {/* Photos */}
        <div className="grid grid-cols-2 gap-3">
          {/* Before Photo */}
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Foto Before
            </p>
            {task.before_photo_url ? (
              <img
                src={task.before_photo_url}
                alt="Before"
                className="w-full aspect-video object-cover rounded-lg"
              />
            ) : (
              <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  Tidak ada foto
                </span>
              </div>
            )}
          </Card>

          {/* After Photo */}
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Foto After
            </p>
            {task.after_photo_url ? (
              <img
                src={task.after_photo_url}
                alt="After"
                className="w-full aspect-video object-cover rounded-lg"
              />
            ) : (
              <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  Belum ada foto
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Staff Note */}
        {task.staff_note && (
          <Card className="p-4">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Catatan Staff:
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {task.staff_note}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Timeline */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Timeline</h3>
          <div className="space-y-3">
            {timeline.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    event.completed
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {event.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      event.completed
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {event.label}
                  </p>
                  {event.time && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.time).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Buttons */}
        {(canApprove || canResendWA) && (
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Aksi</h3>
            <div className="flex flex-wrap gap-2">
              {canApprove && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={isActionLoading}
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Setujui
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRevisionDialog(true)}
                    disabled={isActionLoading}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Minta Revisi
                  </Button>
                </>
              )}
              {canResendWA && (
                <Button
                  variant="secondary"
                  onClick={handleResendWA}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Kirim Ulang WA
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Revision Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minta Revisi</DialogTitle>
            <DialogDescription>
              Berikan catatan untuk staff tentang apa yang perlu diperbaiki.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Tuliskan alasan revisi..."
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevisionDialog(false)}
            >
              Batal
            </Button>
            <Button onClick={handleRevision} disabled={isActionLoading}>
              {isActionLoading ? "Mengirim..." : "Kirim Revisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
