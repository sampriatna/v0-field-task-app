"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Camera,
  Loader2,
  XCircle,
  RefreshCw,
  Check,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getChecklistByToken, submitChecklistReport } from "@/lib/api";
import type { ChecklistReport, ChecklistReportItem } from "@/lib/types";

type PageState = "loading" | "ready" | "submitting" | "success" | "error";

export default function StaffChecklistPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [checklist, setChecklist] = useState<ChecklistReport | null>(null);
  
  // Form state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemPhotos, setItemPhotos] = useState<Record<string, string>>({});
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [staffNote, setStaffNote] = useState("");

  const loadChecklist = useCallback(async () => {
    setPageState("loading");
    setErrorMessage(""); // Clear previous errors
    try {
      const result = await getChecklistByToken(taskId, token);
      if (result.success && result.data) {
        // Validate that we have items after successful fetch
        const activeItems = (result.data.items || []).filter(item => item.active_status);
        if (activeItems.length === 0) {
          setErrorMessage("Checklist ditemukan tetapi tidak punya item");
          setPageState("error");
          return;
        }
        setChecklist(result.data);
        // Initialize checked items
        const initial: Record<string, boolean> = {};
        (result.data.items || []).forEach((item) => {
          initial[item.checklist_item_id] = false;
        });
        setCheckedItems(initial);
        setPageState("ready");
      } else {
        setErrorMessage(result.error || "Link checklist tidak valid");
        setPageState("error");
      }
    } catch {
      setErrorMessage("Terjadi kesalahan. Coba lagi nanti.");
      setPageState("error");
    }
  }, [taskId, token]);

  useEffect(() => {
    if (token) {
      loadChecklist();
    } else {
      setErrorMessage("Link checklist tidak valid");
      setPageState("error");
    }
  }, [token, loadChecklist]);

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleItemPhotoUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setItemPhotos((prev) => ({
        ...prev,
        [itemId]: result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAfterPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAfterPhoto(result);
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const getDeadlineInfo = () => {
    if (!checklist) return { text: "", isLate: false, urgent: false };
    
    const deadline = new Date(checklist.deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const isLate = diff < 0;
    const hoursLeft = Math.abs(diff) / (1000 * 60 * 60);

    if (isLate) {
      return { text: "TERLAMBAT!", isLate: true, urgent: true };
    }
    if (hoursLeft < 1) {
      const mins = Math.floor(hoursLeft * 60);
      return { text: `${mins} menit lagi`, isLate: false, urgent: true };
    }
    if (hoursLeft < 24) {
      return { text: `${Math.floor(hoursLeft)} jam lagi`, isLate: false, urgent: hoursLeft < 2 };
    }
    return { 
      text: deadline.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), 
      isLate: false, 
      urgent: false 
    };
  };

  const canSubmit = () => {
    if (!checklist) return false;
    
    // Check required items are checked
    const requiredItems = checklist.items.filter((item) => item.is_required && item.active_status);
    const allRequiredChecked = requiredItems.every((item) => checkedItems[item.checklist_item_id]);
    if (!allRequiredChecked) return false;

    // Check required per-item photos are uploaded (afterPhoto is optional, not gated)
    const photoRequiredItems = checklist.items.filter(
      (item) => item.requires_photo && item.active_status && checkedItems[item.checklist_item_id]
    );
    const allItemPhotosUploaded = photoRequiredItems.every((item) => itemPhotos[item.checklist_item_id]);
    if (!allItemPhotosUploaded) return false;

    return true;
  };

  const getSubmitButtonStatus = () => {
    if (!checklist) return { buttonText: "KIRIM LAPORAN", isBlocked: false, missingPhotos: [] };
    
    const requiredItems = checklist.items.filter((item) => item.is_required && item.active_status);
    const checkedCount = requiredItems.filter((item) => checkedItems[item.checklist_item_id]).length;
    
    if (checkedCount < requiredItems.length) {
      return { 
        buttonText: `CENTANG DULU (${checkedCount}/${requiredItems.length})`,
        isBlocked: true,
        missingPhotos: []
      };
    }

    // Check required per-item photos (only for checked items that require photos)
    // IMPORTANT: Exclude the final result photo ("Foto Hasil Akhir") which is optional
    // The final photo is identified as items where item_text contains "hasil" or is at the end of the list with that pattern
    const checkedItemsWithPhotoRequired = checklist.items.filter(
      (item) => {
        // Skip if not photo-required or not active or not checked
        if (!item.requires_photo || !item.active_status || !checkedItems[item.checklist_item_id]) {
          return false;
        }
        
        // Skip if this is the final result photo (optional)
        // Identify by checking if the item text indicates it's a final/result photo
        const itemTextLower = item.item_text?.toLowerCase() || "";
        const isFinalPhoto = itemTextLower.includes("hasil") || 
                            itemTextLower.includes("final") || 
                            itemTextLower.includes("akhir");
        
        return !isFinalPhoto;
      }
    );
    
    const uploadedPhotoCount = checkedItemsWithPhotoRequired.filter((item) => itemPhotos[item.checklist_item_id]).length;
    const missingItemPhotos = checkedItemsWithPhotoRequired.length - uploadedPhotoCount;
    
    if (missingItemPhotos > 0) {
      return { 
        buttonText: `UPLOAD FOTO DULU (${uploadedPhotoCount}/${checkedItemsWithPhotoRequired.length})`,
        isBlocked: true,
        missingPhotos: ["item"]
      };
    }

    return { buttonText: "KIRIM LAPORAN", isBlocked: false, missingPhotos: [] };
  };

  const getSubmitButtonText = () => {
    return getSubmitButtonStatus().buttonText;
  };

  const handleSubmit = async () => {
    if (!checklist || !canSubmit()) return;

    setPageState("submitting");

    try {
      const reportItems: ChecklistReportItem[] = checklist.items
        .filter((item) => item.active_status)
        .map((item) => ({
          checklist_item_id: item.checklist_item_id,
          is_checked: checkedItems[item.checklist_item_id] || false,
          photo_url: itemPhotos[item.checklist_item_id],
        }));

      const result = await submitChecklistReport({
        task_id: taskId,
        token,
        checked_items: reportItems,
        after_photo_base64: afterPhoto || undefined,
        staff_note: staffNote || undefined,
      });

      if (result.success) {
        setPageState("success");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengirim laporan");
      setPageState("error");
    }
  };

  // Loading State
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Memuat checklist...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Tidak Dapat Dibuka</h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <p className="text-sm text-muted-foreground mb-4">Hubungi leader jika masalah berlanjut.</p>
          <Button onClick={loadChecklist} variant="outline" className="h-12 px-6">
            <RefreshCw className="w-5 h-5 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  // Success State
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-14 h-14 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Checklist Terkirim!</h1>
          <p className="text-lg text-muted-foreground mb-2">
            Laporan checklist berhasil dikirim.
          </p>
          <p className="text-sm text-muted-foreground">
            Leader akan memeriksa laporan Anda.
          </p>
        </div>
      </div>
    );
  }

  // Submitting State
  if (pageState === "submitting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Mengirim Laporan...</h2>
          <p className="text-muted-foreground">Harap tunggu, jangan tutup halaman ini</p>
        </div>
      </div>
    );
  }

  // Ready State - Main Form
  if (!checklist) return null;

  const deadlineInfo = getDeadlineInfo();
  const activeItems = checklist.items.filter((item) => item.active_status);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Simple Header - No sidebar, no menu */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="p-4">
          <h1 className="text-lg font-bold text-foreground text-center truncate">
            {checklist.checklist_title}
          </h1>
        </div>
      </div>

      {/* Deadline Banner */}
      <div
        className={`p-4 text-center ${
          deadlineInfo.isLate
            ? "bg-destructive text-white"
            : deadlineInfo.urgent
            ? "bg-amber-500 text-white"
            : "bg-primary/10 text-primary"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {deadlineInfo.isLate ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
          <span className="font-bold text-lg">
            {deadlineInfo.isLate ? "TERLAMBAT!" : `Deadline: ${deadlineInfo.text}`}
          </span>
        </div>
      </div>

      {/* Location Info */}
      <div className="px-4 py-3 bg-muted/50 border-b">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{checklist.outlet} - {checklist.area}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Checklist Items */}
        <div className="space-y-3">
          {activeItems.map((item, index) => {
            const isChecked = checkedItems[item.checklist_item_id];
            const hasPhoto = itemPhotos[item.checklist_item_id];
            const needsPhoto = item.requires_photo && isChecked && !hasPhoto;

            return (
              <Card 
                key={item.checklist_item_id} 
                className={`transition-colors ${isChecked ? "border-green-500 bg-green-50/50" : ""}`}
              >
                <CardContent className="p-0">
                  {/* Checkbox Row - Large touch target */}
                  <button
                    type="button"
                    onClick={() => toggleItem(item.checklist_item_id)}
                    className="w-full p-4 flex items-start gap-4 text-left active:bg-muted/50"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-5 h-5" strokeWidth={3} />
                      ) : (
                        <Square className="w-5 h-5 text-transparent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-base leading-relaxed ${isChecked ? "text-green-700" : "text-foreground"}`}>
                        {index + 1}. {item.item_text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.is_required && (
                          <span className="text-xs text-destructive font-medium">Wajib</span>
                        )}
                        {item.requires_photo && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            Foto
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Photo Upload for Item */}
                  {item.requires_photo && isChecked && (
                    <div className="px-4 pb-4 pl-16">
                      {hasPhoto ? (
                        <div className="relative">
                          <Image
                            src={itemPhotos[item.checklist_item_id]}
                            alt="Foto item"
                            width={200}
                            height={150}
                            className="rounded-lg object-cover w-full max-w-[200px]"
                          />
                          <label className="absolute bottom-2 right-2 bg-card/90 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer">
                            Ganti
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleItemPhotoUpload(item.checklist_item_id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg cursor-pointer">
                          <Camera className="w-5 h-5 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">Upload Foto Item Ini</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleItemPhotoUpload(item.checklist_item_id, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* After Photo (if template requires) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-foreground mb-3">Foto Hasil Akhir (Opsional)</h3>
            {afterPhoto ? (
              <div className="relative">
                <Image
                  src={afterPhoto}
                  alt="Foto hasil"
                  width={400}
                  height={300}
                  className="rounded-lg object-cover w-full"
                />
                <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Foto siap
                </div>
                <label className="absolute bottom-2 right-2 bg-card/90 rounded-lg px-4 py-2 font-medium cursor-pointer">
                  Ganti Foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAfterPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer bg-muted/30 active:bg-muted/50">
                {isUploadingPhoto ? (
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-muted-foreground" />
                    <span className="text-muted-foreground">Ketuk untuk foto</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleAfterPhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Optional Note */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-foreground mb-2">Catatan (Opsional)</h3>
            <Textarea
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              placeholder="Tulis catatan jika ada..."
              rows={3}
              className="text-base"
            />
          </CardContent>
        </Card>
      </div>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg">
        {/* Photo Requirements Breakdown */}
        {!getSubmitButtonStatus().isBlocked && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <div className="font-medium text-green-900 mb-2">Foto yang diupload:</div>
            <div className="space-y-1 text-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Foto item wajib: lengkap</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">—</span>
                <span>Foto hasil akhir: opsional</span>
              </div>
            </div>
          </div>
        )}
        {getSubmitButtonStatus().isBlocked && getSubmitButtonStatus().missingPhotos.length > 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="font-medium text-amber-900 mb-2">Foto yang masih diperlukan:</div>
            <div className="space-y-1 text-amber-800">
              {getSubmitButtonStatus().missingPhotos.includes("item") && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Foto item wajib: belum lengkap</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">—</span>
                <span>Foto hasil akhir: opsional</span>
              </div>
            </div>
          </div>
        )}
        
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className={`w-full h-16 text-lg font-bold ${
            canSubmit()
              ? "bg-green-600 hover:bg-green-700"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {getSubmitButtonText()}
        </Button>
        {!canSubmit() && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Selesaikan semua item wajib untuk mengirim
          </p>
        )}
      </div>
    </div>
  );
}
