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
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  getRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  toggleRecurringTemplateStatus,
  getChecklistItems,
  saveChecklistItems,
  getStaff,
  getAreas,
  getCategories,
} from "@/lib/api";
import type {
  RecurringTemplate,
  CreateRecurringTemplatePayload,
  Outlet,
  Area,
  Category,
  RepeatType,
  DayOfWeek,
  Staff,
} from "@/lib/types";
import { outlets, daysOfWeek } from "@/lib/mock-data";
import {
  Plus,
  Edit2,
  Clock,
  Calendar,
  MapPin,
  User,
  RefreshCw,
  Loader2,
  ListChecks,
  ChevronDown,
  GripVertical,
  Trash2,
  Camera,
  Save,
  AlertCircle,
} from "lucide-react";

interface ChecklistItemForm {
  id: string;
  item_text: string;
  requires_photo: boolean;
  is_required: boolean;
  active_status: boolean;
}

const repeatTypeOptions: { value: RepeatType; label: string }[] = [
  { value: "daily", label: "Setiap Hari" },
  { value: "weekly", label: "Mingguan" },
  { value: "custom", label: "Pilih Hari" },
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

export default function RecurringTasksSettingsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [areaList, setAreaList] = useState<string[]>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [formData, setFormData] = useState<CreateRecurringTemplatePayload>(initialFormState);

  // Checklist panel state
  const [openChecklistId, setOpenChecklistId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, ChecklistItemForm[]>>({});
  const [checklistLoading, setChecklistLoading] = useState<Record<string, boolean>>({});
  const [checklistSaving, setChecklistSaving] = useState<Record<string, boolean>>({});
  const [checklistChanged, setChecklistChanged] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [templatesRes, staffRes, areasRes, categoriesRes] = await Promise.all([
      getRecurringTemplates(),
      getStaff(),
      getAreas(),
      getCategories(),
    ]);
    if (templatesRes.success && templatesRes.data) setTemplates(templatesRes.data);
    if (staffRes.success && staffRes.data) setStaffList(staffRes.data.filter((s) => s.status === "ACTIVE"));
    if (areasRes.success && areasRes.data) setAreaList(areasRes.data);
    if (categoriesRes.success && categoriesRes.data) setCategoryList(categoriesRes.data);
    setIsLoading(false);
  };

  // --- Template Dialog ---
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
        repeat_type: template.repeat_type.toLowerCase(),
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

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.template_name.trim() || !formData.task_title.trim()) {
      toast({ title: "Error", description: "Nama template dan judul tugas harus diisi", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        repeat_type: formData.repeat_type.toUpperCase(),
      };

      const result = editingTemplate
        ? await updateRecurringTemplate({ ...payload, template_id: editingTemplate.template_id })
        : await createRecurringTemplate(payload);

      if (result.success) {
        toast({ title: editingTemplate ? "Template Diperbarui" : "Template Dibuat" });
        setIsDialogOpen(false);
        loadAll();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({ title: "Gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (template: RecurringTemplate) => {
    try {
      const result = await toggleRecurringTemplateStatus(template.template_id, !template.active_status);
      if (result.success) {
        toast({ title: template.active_status ? "Template Dinonaktifkan" : "Template Diaktifkan" });
        loadAll();
      }
    } catch {
      toast({ title: "Gagal", description: "Gagal mengubah status template", variant: "destructive" });
    }
  };

  const handleRepeatTypeChange = (value: RepeatType) => {
    const newDays: DayOfWeek[] =
      value === "daily"
        ? ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]
        : value === "weekly"
        ? ["senin"]
        : [];
    setFormData({ ...formData, repeat_type: value, repeat_days: newDays });
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const newDays = formData.repeat_days.includes(day)
      ? formData.repeat_days.filter((d) => d !== day)
      : [...formData.repeat_days, day];
    setFormData({ ...formData, repeat_days: newDays });
  };

  const handleStaffSelect = (name: string) => {
    const staff = staffList.find((s) => s.name === name);
    if (staff) setFormData({ ...formData, pic_name: staff.name, pic_wa: staff.wa_number });
  };

  const getRepeatLabel = (t: RecurringTemplate) => {
    if (t.repeat_type === "daily") return "Setiap Hari";
    if (t.repeat_type === "weekly") {
      const day = daysOfWeek.find((d) => d.value === t.repeat_days[0]);
      return `Setiap ${day?.label || "Senin"}`;
    }
    return `${t.repeat_days.length} hari/minggu`;
  };

  // --- Checklist Panel ---
  const toggleChecklist = async (templateId: string) => {
    if (openChecklistId === templateId) {
      setOpenChecklistId(null);
      return;
    }
    setOpenChecklistId(templateId);

    if (checklistItems[templateId]) return; // already loaded

    setChecklistLoading((prev) => ({ ...prev, [templateId]: true }));
    try {
      const result = await getChecklistItems(templateId);
      if (result.success && result.data) {
        setChecklistItems((prev) => ({
          ...prev,
          [templateId]: result.data!.map((item) => ({
            id: item.checklist_item_id,
            item_text: item.item_text,
            requires_photo: item.requires_photo,
            is_required: item.is_required,
            active_status: item.active_status,
          })),
        }));
      } else {
        setChecklistItems((prev) => ({ ...prev, [templateId]: [] }));
      }
    } catch {
      setChecklistItems((prev) => ({ ...prev, [templateId]: [] }));
    } finally {
      setChecklistLoading((prev) => ({ ...prev, [templateId]: false }));
    }
  };

  const updateChecklistItem = (templateId: string, id: string, updates: Partial<ChecklistItemForm>) => {
    setChecklistItems((prev) => ({
      ...prev,
      [templateId]: (prev[templateId] || []).map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
    setChecklistChanged((prev) => ({ ...prev, [templateId]: true }));
  };

  const addChecklistItem = (templateId: string) => {
    setChecklistItems((prev) => ({
      ...prev,
      [templateId]: [
        ...(prev[templateId] || []),
        { id: `new-${Date.now()}`, item_text: "", requires_photo: false, is_required: true, active_status: true },
      ],
    }));
    setChecklistChanged((prev) => ({ ...prev, [templateId]: true }));
  };

  const removeChecklistItem = (templateId: string, id: string) => {
    setChecklistItems((prev) => ({
      ...prev,
      [templateId]: (prev[templateId] || []).filter((item) => item.id !== id),
    }));
    setChecklistChanged((prev) => ({ ...prev, [templateId]: true }));
  };

  const saveChecklist = async (templateId: string) => {
    const items = checklistItems[templateId] || [];
    const empty = items.filter((i) => !i.item_text.trim());
    if (empty.length > 0) {
      toast({ title: "Validasi Gagal", description: "Semua item checklist harus memiliki teks", variant: "destructive" });
      return;
    }

    setChecklistSaving((prev) => ({ ...prev, [templateId]: true }));
    try {
      const result = await saveChecklistItems(
        templateId,
        items.map((item, index) => ({
          item_order: index + 1,
          item_text: item.item_text.trim(),
          requires_photo: item.requires_photo,
          is_required: item.is_required,
          active_status: item.active_status,
        }))
      );
      if (result.success) {
        toast({ title: "Berhasil", description: `${items.length} item checklist disimpan` });
        setChecklistChanged((prev) => ({ ...prev, [templateId]: false }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({ title: "Gagal Menyimpan", description: error instanceof Error ? error.message : "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setChecklistSaving((prev) => ({ ...prev, [templateId]: false }));
    }
  };

  const filteredStaff = staffList.filter((s) => s.outlet === formData.outlet);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Template Tugas Berulang" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Tugas Berulang</h1>
            <p className="text-sm text-muted-foreground">Kelola template + checklist item per template</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Template
          </Button>
        </div>

        {/* Info */}
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              Setiap template bisa punya checklist item. Klik ikon daftar di kartu template untuk expand dan edit item checklist langsung di sini.
            </p>
          </div>
        </Card>

        {/* Template List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20" />
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
            {templates.map((template) => {
              const isChecklistOpen = openChecklistId === template.template_id;
              const items = checklistItems[template.template_id] || [];
              const isLoadingChecklist = checklistLoading[template.template_id];
              const isSavingChecklist = checklistSaving[template.template_id];
              const hasChanges = checklistChanged[template.template_id];

              return (
                <Card key={template.template_id} className={!template.active_status ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    {/* Template Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-foreground truncate">{template.template_name}</h3>
                          {!template.active_status && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                          <Badge variant="outline" className="text-xs">v{template.template_version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-1">{template.task_title}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {template.outlet} &ndash; {template.area}
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
                            {template.repeat_time} &ndash; {template.deadline_time}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={template.active_status}
                          onCheckedChange={() => handleToggleStatus(template)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(template)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={isChecklistOpen ? "secondary" : "ghost"}
                          size="icon"
                          onClick={() => toggleChecklist(template.template_id)}
                          title="Edit checklist items"
                        >
                          <ListChecks className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Inline Checklist Panel */}
                    {isChecklistOpen && (
                      <div className="mt-4 border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                            <ListChecks className="w-4 h-4" />
                            Item Checklist
                            <Badge variant="secondary" className="text-xs">{items.length} item</Badge>
                          </h4>
                          {hasChanges && (
                            <Button size="sm" onClick={() => saveChecklist(template.template_id)} disabled={isSavingChecklist}>
                              {isSavingChecklist ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3 mr-1" />
                              )}
                              Simpan
                            </Button>
                          )}
                        </div>

                        {isLoadingChecklist ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <>
                            {items.length === 0 ? (
                              <div className="text-center py-6 bg-muted/30 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-3">Belum ada item checklist</p>
                                <Button size="sm" variant="outline" onClick={() => addChecklistItem(template.template_id)}>
                                  <Plus className="w-3 h-3 mr-1" />
                                  Tambah Item Pertama
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {items.map((item, index) => (
                                  <div
                                    key={item.id}
                                    className={`flex items-start gap-2 p-2 rounded-lg bg-muted/30 ${!item.active_status ? "opacity-50" : ""}`}
                                  >
                                    <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-5 shrink-0">{index + 1}.</span>
                                        <Input
                                          value={item.item_text}
                                          onChange={(e) => updateChecklistItem(template.template_id, item.id, { item_text: e.target.value })}
                                          placeholder="Tulis item checklist..."
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <div className="flex items-center gap-4 pl-7">
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                          <Switch
                                            checked={item.requires_photo}
                                            onCheckedChange={(v) => updateChecklistItem(template.template_id, item.id, { requires_photo: v })}
                                            className="scale-75 origin-left"
                                          />
                                          <Camera className="w-3 h-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">Foto</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                          <Switch
                                            checked={item.is_required}
                                            onCheckedChange={(v) => updateChecklistItem(template.template_id, item.id, { is_required: v })}
                                            className="scale-75 origin-left"
                                          />
                                          <span className="text-muted-foreground">Wajib</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                          <Switch
                                            checked={item.active_status}
                                            onCheckedChange={(v) => updateChecklistItem(template.template_id, item.id, { active_status: v })}
                                            className="scale-75 origin-left"
                                          />
                                          <span className="text-muted-foreground">Aktif</span>
                                        </label>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                                      onClick={() => removeChecklistItem(template.template_id, item.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => addChecklistItem(template.template_id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Tambah Item
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Buat Template Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Nama Template *</Label>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v as Area })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {areaList.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PIC</Label>
                <Select value={formData.pic_name} onValueChange={handleStaffSelect} disabled={isLoading || staffList.length === 0}>
                  <SelectTrigger><SelectValue placeholder={staffList.length === 0 ? "Memuat staff..." : "Pilih PIC"} /></SelectTrigger>
                  <SelectContent>
                    {(filteredStaff.length > 0 ? filteredStaff : staffList).map((s) => (
                      <SelectItem key={s.staff_id} value={s.name}>{s.name} ({s.wa_number})</SelectItem>
                    ))}
                    {staffList.length === 0 && <div className="p-2 text-sm text-muted-foreground">Tidak ada staff tersedia</div>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_title">Judul Tugas *</Label>
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
              <Select value={formData.repeat_type} onValueChange={(v) => handleRepeatTypeChange(v as RepeatType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {repeatTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
                      variant={formData.repeat_days.includes(day.value as DayOfWeek) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleDayToggle(day.value as DayOfWeek)}
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
              ) : editingTemplate ? "Simpan Perubahan" : "Buat Template"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
