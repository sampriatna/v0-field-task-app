"use client";

import { useEffect, useState, use } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  User,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Loader2,
  Check,
  X,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  getChecklistDetail,
  verifyChecklist,
  resendChecklistWhatsApp,
} from "@/lib/api";
import type { ChecklistReport } from "@/lib/types";

export default function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<ChecklistReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  useEffect(() => {
    loadChecklist();
  }, [taskId]);

  const loadChecklist = async () => {
    setIsLoading(true);
    try {
      const result = await getChecklistDetail(taskId);
      if (result.success && result.data) {
        setChecklist(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Checklist tidak ditemukan",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load checklist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!checklist) return;
    setIsVerifying(true);
    try {
      const result = await verifyChecklist(checklist.task_id, "approved");
      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Checklist telah di-approve",
        });
        loadChecklist();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!checklist || !revisionNote.trim()) return;
    setIsVerifying(true);
    try {
      const result = await verifyChecklist(checklist.task_id, "revision", revisionNote);
      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Permintaan revisi telah dikirim",
        });
        setShowRevisionDialog(false);
        setRevisionNote("");
        loadChecklist();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendWhatsApp = async () => {
    if (!checklist) return;
    setIsResending(true);
    try {
      const result = await resendChecklistWhatsApp(checklist.task_id);
      if (result.success) {
        toast({
          title: "Berhasil",
          description: "WhatsApp reminder telah dikirim ulang",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Loading..." showBack />
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Tidak Ditemukan" showBack />
        <div className="p-4 text-center py-12">
          <p className="text-muted-foreground">Checklist tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const checkedCount = checklist.checked_items.filter((i) => i.is_checked).length;
  const totalItems = checklist.items.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobileHeader title="Detail Checklist" showBack showSettings />

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Header Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <StatusBadge status={checklist.status} />
                <h1 className="text-lg font-semibold text-foreground mt-2">
                  {checklist.checklist_title}
                </h1>
                <p className="text-sm text-muted-foreground">{checklist.task_id}</p>
              </div>
              {checklist.revision_count > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  Revisi ke-{checklist.revision_count}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{checklist.outlet} - {checklist.area}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{checklist.pic_name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date(checklist.report_date).toLocaleDateString("id-ID")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Deadline: {new Date(checklist.deadline).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Item Checklist</span>
              <Badge variant="secondary">
                {checkedCount}/{totalItems} selesai
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.items.map((item) => {
              const reportItem = checklist.checked_items.find(
                (r) => r.checklist_item_id === item.checklist_item_id
              );
              const isChecked = reportItem?.is_checked || false;

              return (
                <div
                  key={item.checklist_item_id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    isChecked ? "bg-green-50" : "bg-muted/50"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isChecked ? "bg-green-500 text-white" : "bg-muted-foreground/20"
                    }`}
                  >
                    {isChecked ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isChecked ? "text-green-700" : "text-foreground"}`}>
                      {item.item_text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.is_required && (
                        <Badge variant="outline" className="text-xs">Wajib</Badge>
                      )}
                      {item.requires_photo && (
                        <Badge variant="outline" className="text-xs">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          Foto
                        </Badge>
                      )}
                    </div>
                    {reportItem?.photo_url && (
                      <div className="mt-2">
                        <Image
                          src={reportItem.photo_url}
                          alt="Foto item"
                          width={150}
                          height={100}
                          className="rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* After Photo */}
        {checklist.after_photo_url && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Foto Hasil</CardTitle>
            </CardHeader>
            <CardContent>
              <Image
                src={checklist.after_photo_url}
                alt="Foto hasil"
                width={400}
                height={300}
                className="rounded-lg object-cover w-full"
              />
            </CardContent>
          </Card>
        )}

        {/* Staff Note */}
        {checklist.staff_note && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Catatan Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{checklist.staff_note}</p>
            </CardContent>
          </Card>
        )}

        {/* Revision Note */}
        {checklist.revision_note && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                <RotateCcw className="w-4 h-4" />
                Catatan Revisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700">{checklist.revision_note}</p>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklist.submitted_at && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">
                    Submitted: {new Date(checklist.submitted_at).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              {checklist.verified_at && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">
                    Verified oleh {checklist.verified_by}: {new Date(checklist.verified_at).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {(checklist.status === "SUBMITTED" || checklist.status === "REVISI") && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleResendWhatsApp}
              disabled={isResending}
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Kirim Ulang WA
            </Button>

            <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 text-orange-600 border-orange-300">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Minta Revisi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Minta Revisi</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Tulis catatan revisi untuk staff..."
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleRequestRevision}
                    disabled={!revisionNote.trim() || isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Kirim Permintaan Revisi
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
