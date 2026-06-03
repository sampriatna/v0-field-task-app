"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/mobile-header";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Send, Copy, AlertTriangle, ExternalLink, User } from "lucide-react";
import { createTask, buildReportLink, getStaff } from "@/lib/api";
import { outlets, areas, categories, priorities } from "@/lib/mock-data";
import type { CreateTaskPayload, Outlet, Area, Category, TaskPriority, Task, Staff } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function CreateTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  
  // Staff data from API
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [manualMode, setManualMode] = useState(false);

  // Form state
  const [outlet, setOutlet] = useState<Outlet | "">("");
  const [area, setArea] = useState<Area | "">("");
  const [category, setCategory] = useState<Category | "">("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [picName, setPicName] = useState("");
  const [picWa, setPicWa] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [beforePhoto, setBeforePhoto] = useState<string | undefined>();

  // Load staff data on mount
  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setIsLoadingStaff(true);
    try {
      const result = await getStaff({ status: "ACTIVE" });
      if (result.success && result.data) {
        setStaffList(result.data);
      }
    } catch (error) {
      console.error("Failed to load staff:", error);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Get filtered staff based on selected outlet
  const filteredStaff = outlet
    ? staffList.filter((s) => s.outlet === outlet && s.status === "ACTIVE")
    : staffList.filter((s) => s.status === "ACTIVE");

  const handleStaffSelect = (staffId: string) => {
    const staff = staffList.find((s) => s.staff_id === staffId);
    if (staff) {
      setSelectedStaffId(staffId);
      setPicName(staff.name);
      setPicWa(staff.wa_number);
      // Auto-fill outlet and area if not already set
      if (!outlet) setOutlet(staff.outlet);
      if (!area) setArea(staff.area);
    }
  };

  const isFormValid =
    outlet &&
    area &&
    category &&
    taskTitle.trim() &&
    taskDescription.trim() &&
    picName.trim() &&
    picWa.trim() &&
    deadline;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast({
        title: "Form belum lengkap",
        description: "Harap isi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateTaskPayload = {
        outlet: outlet as Outlet,
        area: area as Area,
        category: category as Category,
        task_title: taskTitle,
        task_description: taskDescription,
        priority,
        pic_name: picName,
        pic_wa: picWa,
        deadline: new Date(deadline).toISOString(),
        before_photo_base64: beforePhoto,
      };

      const result = await createTask(payload);

      if (result.success) {
        const created = result.data ?? null;
        console.log("[v0] created task_id:", created?.task_id);
        console.log("[v0] created status:", created?.status);
        console.log("[v0] created report_link (raw):", created?.report_link);
        setCreatedTask(created);
        setIsSuccess(true);
      } else {
        toast({
          title: "Gagal membuat tugas",
          description: result.error || "Terjadi kesalahan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Gagal membuat tugas",
        description: "Terjadi kesalahan saat mengirim data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const hasToken = Boolean(createdTask?.token);
    // Always use the correct frontend route, falling back to a locally built
    // link if GAS returned an empty or wrong-format report_link.
    const reportLink =
      createdTask?.task_id && createdTask?.token
        ? buildReportLink(createdTask.task_id, createdTask.token)
        : "";

    const copyLink = () => {
      if (reportLink) {
        navigator.clipboard?.writeText(reportLink);
        toast({ title: "Link disalin", description: "Link report sudah disalin." });
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Buat Tugas" showBack backHref="/dashboard" />

        <div className="flex flex-col items-center justify-center p-4 min-h-[80vh]">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Tugas Berhasil Dibuat
            </h2>
            <p className="text-muted-foreground">
              Notifikasi WhatsApp sedang diproses dan akan dikirim ke {picName}.
            </p>

            {hasToken && reportLink ? (
              <div className="text-left bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Link Report Staff
                </p>
                <p className="text-xs font-mono break-all text-foreground">
                  {reportLink}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Salin
                  </Button>
                  <a href={reportLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button type="button" variant="outline" size="sm" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Buka
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-left bg-warning/10 border border-warning/30 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-warning-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-warning-foreground">
                  Tugas tersimpan, tetapi server tidak mengembalikan token/link
                  report. Periksa Google Sheet atau hubungi admin.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false);
                  setCreatedTask(null);
                  setOutlet("");
                  setArea("");
                  setCategory("");
                  setTaskTitle("");
                  setTaskDescription("");
                  setPriority("Medium");
                  setPicName("");
                  setPicWa("");
                  setSelectedStaffId("");
                  setDeadline("");
                  setBeforePhoto(undefined);
                  setManualMode(false);
                }}
                className="flex-1"
              >
                Buat Lagi
              </Button>
              <Button onClick={() => router.push("/dashboard")} className="flex-1">
                Ke Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Buat Tugas Baru" showBack backHref="/dashboard" />

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-2xl mx-auto pb-24">
        {/* Location Section */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Lokasi & Kategori</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>
                Outlet <span className="text-red-500">*</span>
              </Label>
              <Select
                value={outlet}
                onValueChange={(v) => {
                  setOutlet(v as Outlet);
                  // Reset staff selection when outlet changes
                  if (!manualMode) {
                    setPicName("");
                    setPicWa("");
                    setSelectedStaffId("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Area <span className="text-red-500">*</span>
              </Label>
              <Select value={area} onValueChange={(v) => setArea(v as Area)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih area" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>
                Kategori <span className="text-red-500">*</span>
              </Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as Category)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Prioritas <span className="text-red-500">*</span>
              </Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Task Details Section */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Detail Tugas</h3>

          <div className="space-y-2">
            <Label>
              Judul Tugas <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Contoh: Bersihkan Kitchen Hood"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Deskripsi Tugas <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Jelaskan detail tugas yang harus dikerjakan..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
            />
          </div>

          <PhotoUploader
            label="Foto Before (opsional)"
            value={beforePhoto}
            onChange={setBeforePhoto}
          />
        </Card>

        {/* PIC Section */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Penanggung Jawab</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="manual-mode" className="text-sm text-muted-foreground">
                Input Manual
              </Label>
              <Switch
                id="manual-mode"
                checked={manualMode}
                onCheckedChange={(checked) => {
                  setManualMode(checked);
                  if (!checked) {
                    // Reset to staff selection mode
                    setPicName("");
                    setPicWa("");
                    setSelectedStaffId("");
                  }
                }}
              />
            </div>
          </div>

          {!manualMode ? (
            <>
              {isLoadingStaff ? (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Memuat daftar staff...</p>
                </div>
              ) : filteredStaff.length > 0 ? (
                <div className="space-y-2">
                  <Label>Pilih Staff <span className="text-red-500">*</span></Label>
                  <Select value={selectedStaffId} onValueChange={handleStaffSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStaff.map((s) => (
                        <SelectItem key={s.staff_id} value={s.staff_id}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{s.name}</span>
                            <span className="text-muted-foreground">- {s.position}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStaffId && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <p className="text-muted-foreground">
                        <strong>Nama:</strong> {picName}
                      </p>
                      <p className="text-muted-foreground">
                        <strong>WhatsApp:</strong> {picWa}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    {outlet ? `Tidak ada staff aktif di outlet ${outlet}.` : "Pilih outlet terlebih dahulu atau aktifkan mode manual."}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-amber-800 underline"
                    onClick={() => setManualMode(true)}
                  >
                    Input manual
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  Mode manual: Anda bisa memasukkan nama dan nomor WhatsApp secara langsung.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>
                    Nama PIC <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Nama penanggung jawab"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    No. WhatsApp <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="628xxx"
                    value={picWa}
                    onChange={(e) => setPicWa(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Deadline <span className="text-red-500">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </Card>

        {/* Submit Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full h-12 text-base"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Membuat Tugas...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Buat Tugas & Kirim WA
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
