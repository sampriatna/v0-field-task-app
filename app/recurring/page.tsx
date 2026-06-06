"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Clock,
  Calendar,
  MapPin,
  User,
  RefreshCw,
  ChevronRight,
  Loader2,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  getRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  toggleRecurringTemplateStatus,
} from "@/lib/api";
import type {
  RecurringTemplate,
  CreateRecurringTemplatePayload,
  Outlet,
  Area,
  Category,
  RepeatType,
  DayOfWeek,
} from "@/lib/types";
import { outlets, areas, categories, staffList, daysOfWeek } from "@/lib/mock-data";

const repeatTypeOptions: { value: RepeatType; label: string }[] = [
  { value: "daily", label: "Harian (Setiap Hari)" },
  { value: "weekdays", label: "Hari Kerja (Senin-Jumat)" },
  { value: "weekends", label: "Akhir Pekan (Sabtu-Minggu)" },
  { value: "weekly", label: "Pilih Hari Tertentu" },
  { value: "monthly", label: "Bulanan (Pilih Tanggal)" },
];

const initialFormState: CreateRecurringTemplatePayload = {
  template_name: "",
  outlet: "KBU",
  area: "Dapur",
  category: "Cleaning",
  pic_name: "",
  pic_wa: "",
  task_title: "",
  task_description: "",
  repeat_type: "daily",
  repeat_days: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"],
  repeat_time: "08:00",
  deadline_time: "10:00",
  requires_photo: true,
};

export default function RecurringPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [formData, setFormData] = useState<CreateRecurringTemplatePayload>(initialFormState);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const result = await getRecurringTemplates();
      if (result.success && result.data) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (template?: RecurringTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        template_name: template.template_name,
        outlet: template.outlet,
        area: template.area,
        category: template.category,
        pic_name: template.pic_name,
        pic_wa: template.pic_wa,
        task_title: template.task_title,
        task_description: template.task_description,
        repeat_type: (template.repeat_type || "daily").toLowerCase(),
        repeat_days: template.repeat_days,
        repeat_time: template.repeat_time,
        deadline_time: template.deadline_time,
        requires_photo: template.requires_photo,
      });
    } else {
      setEditingTemplate(null);
      setFormData(initialFormState);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      if (editingTemplate) {
        result = await updateRecurringTemplate({
          ...formData,
          template_id: editingTemplate.template_id,
        });
      } else {
        result = await createRecurringTemplate(formData);
      }

      if (result.success) {
        toast({
          title: editingTemplate ? "Template Diperbarui" : "Template Dibuat",
          description: editingTemplate
            ? "Template berhasil diperbarui dengan versi baru"
            : "Template tugas berulang berhasil dibuat",
        });
        setIsDialogOpen(false);
        loadTemplates();
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
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (template: RecurringTemplate) => {
    try {
      const result = await toggleRecurringTemplateStatus(
        template.template_id,
        !template.active_status
      );
      if (result.success) {
        toast({
          title: template.active_status ? "Template Dinonaktifkan" : "Template Diaktifkan",
          description: `Template ${template.template_name} berhasil diubah statusnya`,
        });
        loadTemplates();
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Gagal mengubah status template",
        variant: "destructive",
      });
    }
  };

  const handleRepeatTypeChange = (value: RepeatType) => {
    let newDays: DayOfWeek[] = [];
    if (value === "daily") {
      newDays = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
    } else if (value === "weekly") {
      newDays = ["senin"];
    }
    setFormData({ ...formData, repeat_type: value, repeat_days: newDays });
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const isSelected = formData.repeat_days.includes(day);
    let newDays: DayOfWeek[];
    if (isSelected) {
      newDays = formData.repeat_days.filter((d) => d !== day);
    } else {
      newDays = [...formData.repeat_days, day];
    }
    setFormData({ ...formData, repeat_days: newDays });
  };

  const handleStaffSelect = (name: string) => {
    const staff = staffList.find((s) => s.name === name);
    if (staff) {
      setFormData({ ...formData, pic_name: staff.name, pic_wa: staff.wa });
    }
  };

  const getRepeatLabel = (template: RecurringTemplate) => {
    const rt = (template.repeat_type || "daily").toLowerCase();
    if (rt === "daily") return "Setiap Hari";
    if (rt === "weekdays") return "Senin - Jumat (5 hari/minggu)";
    if (rt === "weekends") return "Sabtu & Minggu";
    if (rt === "monthly") {
      const days = Array.isArray(template.repeat_days) ? template.repeat_days : (template.repeat_days || "").split(",").map((d: string) => d.trim()).filter(Boolean);
      return days.length > 0 ? "Tgl " + days.join(", ") + " setiap bulan" : "Bulanan";
    }
    if (rt === "weekly" || rt === "custom") {
      const daysOfWeek = [
        { value: "senin", label: "Senin" }, { value: "selasa", label: "Selasa" },
        { value: "rabu", label: "Rabu" }, { value: "kamis", label: "Kamis" },
        { value: "jumat", label: "Jumat" }, { value: "sabtu", label: "Sabtu" },
        { value: "minggu", label: "Minggu" },
      ];
      const dayList = Array.isArray(template.repeat_days) ? template.repeat_days : (template.repeat_days || "").split(",").map((d: string) => d.trim()).filter(Boolean);
      if (dayList.length === 1) {
        const day = daysOfWeek.find(d => d.value === dayList[0]);
        return "Setiap " + (day ? day.label : dayList[0]);
      }
      return dayList.length + " hari/minggu";
    }
    return template.repeat_days ? String(template.repeat_days) + " (tidak dikenal)" : "Tidak diset";
  };

  const filteredStaff = staffList.filter((s) => s.outlet === formData.outlet);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Tugas Berulang" showBack showSettings />

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Template Tugas Berulang</h1>
            <p className="text-sm text-muted-foreground">Atur tugas yang akan berulang otomatis</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Buat Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Buat Template Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template_name">Nama Template</Label>
                  <Input
                    id="template_name"
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    placeholder="Contoh: Checklist Opening Dapur"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Outlet</Label>
                    <Select
                      value={formData.outlet}
                      onValueChange={(v) => setFormData({ ...formData, outlet: v as Outlet, pic_name: "", pic_wa: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    <Select
                      value={formData.area}
                      onValueChange={(v) => setFormData({ ...formData, area: v as Area })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v as Category })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>PIC</Label>
                    <Select
                      value={formData.pic_name}
                      onValueChange={handleStaffSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih PIC" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStaff.map((s) => (
                          <SelectItem key={s.wa} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_title">Judul Tugas</Label>
                  <Input
                    id="task_title"
                    value={formData.task_title}
                    onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                    placeholder="Contoh: Checklist Opening Dapur"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task_description">Deskripsi Tugas</Label>
                  <Textarea
                    id="task_description"
                    value={formData.task_description}
                    onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                    placeholder="Jelaskan tugas yang harus dilakukan..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pengulangan</Label>
                  <Select
                    value={formData.repeat_type}
                    onValueChange={(v) => handleRepeatTypeChange(v as RepeatType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {repeatTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formData.repeat_type === "weekly" || formData.repeat_type === "custom") && (
                  <div className="space-y-2">
                    <Label>Pilih Hari</Label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day) => (
                        <Badge
                          key={day.value}
                          variant={formData.repeat_days.includes(day.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleDayToggle(day.value)}
                        >
                          {day.label.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="repeat_time">Waktu Mulai</Label>
                    <Input
                      id="repeat_time"
                      type="time"
                      value={formData.repeat_time}
                      onChange={(e) => setFormData({ ...formData, repeat_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline_time">Deadline</Label>
                    <Input
                      id="deadline_time"
                      type="time"
                      value={formData.deadline_time}
                      onChange={(e) => setFormData({ ...formData, deadline_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label htmlFor="requires_photo">Wajib Foto Bukti</Label>
                    <p className="text-xs text-muted-foreground">Staff harus upload foto saat submit</p>
                  </div>
                  <Switch
                    id="requires_photo"
                    checked={formData.requires_photo}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_photo: checked })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : editingTemplate ? (
                    "Simpan Perubahan"
                  ) : (
                    "Buat Template"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Template List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground mb-1">Belum Ada Template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Buat template tugas berulang untuk mengotomatisasi pekerjaan rutin
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Buat Template Pertama
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.template_id} className={!template.active_status ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                          {template.template_name}
                        </h3>
                        {!template.active_status && (
                          <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">v{template.template_version}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {template.task_title}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {template.outlet} - {template.area}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {template.pic_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {getRepeatLabel(template)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {template.repeat_time} - {template.deadline_time}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.active_status}
                        onCheckedChange={() => handleToggleStatus(template)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(template)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Link href={`/checklist-template/${template.template_id}`}>
                        <Button variant="ghost" size="icon">
                          <ListChecks className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
