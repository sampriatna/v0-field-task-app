"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getReportTemplates,
  createReportTemplate,
  updateReportTemplate,
} from "@/lib/api";
import { outlets } from "@/lib/mock-data";
import type { CreateReportTemplatePayload, Outlet, ReportTemplate } from "@/lib/types";
import { Plus, Pencil, FileText } from "lucide-react";

const emptyForm: CreateReportTemplatePayload = {
  title: "",
  description: "",
  outlet_id: null,
  position_group: null,
  requires_photo: false,
  is_required_daily: true,
  active: true,
  sort_order: 10,
};

export default function ReportTemplatesSettingsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState<CreateReportTemplatePayload>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await getReportTemplates();
      if (result.success && result.data) setTemplates(result.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat template", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (t: ReportTemplate) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description,
      outlet_id: t.outlet_id,
      position_group: t.position_group,
      requires_photo: t.requires_photo,
      is_required_daily: t.is_required_daily,
      active: t.active,
      sort_order: t.sort_order,
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editing) {
        const result = await updateReportTemplate({ ...form, id: editing.id });
        if (!result.success) {
          toast({ title: "Gagal", description: result.error, variant: "destructive" });
          return;
        }
        toast({ title: "Template diupdate" });
      } else {
        const result = await createReportTemplate(form);
        if (!result.success) {
          toast({ title: "Gagal", description: result.error, variant: "destructive" });
          return;
        }
        toast({ title: "Template ditambahkan" });
      }
      setIsOpen(false);
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (t: ReportTemplate) => {
    const result = await updateReportTemplate({ id: t.id, active: !t.active });
    if (result.success) {
      await load();
    } else {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Template Report" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Jenis Report Harian</h2>
            <p className="text-sm text-muted-foreground">
              Filter otomatis by outlet & jabatan (position_group)
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 mb-2 opacity-40" />
              Belum ada template
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id} className={!t.active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium">{t.title}</h3>
                        {t.is_required_daily && (
                          <Badge variant="secondary">Wajib harian</Badge>
                        )}
                        {t.requires_photo && <Badge variant="outline">Wajib foto</Badge>}
                        <Badge variant={t.active ? "default" : "secondary"}>
                          {t.active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Outlet: {t.outlet_id || "Semua"} · Jabatan:{" "}
                        {t.position_group || "Semua"} · Urutan: {t.sort_order}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Aktif</span>
                        <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "Tambah Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul *</Label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Laporan Dapur Harian"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Petunjuk singkat untuk staff"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Select
                  value={form.outlet_id || "ALL"}
                  onValueChange={(v) =>
                    setForm({ ...form, outlet_id: v === "ALL" ? null : (v as Outlet) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua</SelectItem>
                    {outlets.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jabatan (position_group)</Label>
                <Input
                  value={form.position_group || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      position_group: e.target.value.trim() || null,
                    })
                  }
                  placeholder="Cook / Barista / kosong=semua"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Urutan tampil</Label>
              <Input
                type="number"
                value={form.sort_order ?? 10}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Wajib foto</Label>
              <Switch
                checked={Boolean(form.requires_photo)}
                onCheckedChange={(v) => setForm({ ...form, requires_photo: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Wajib harian</Label>
              <Switch
                checked={Boolean(form.is_required_daily)}
                onCheckedChange={(v) => setForm({ ...form, is_required_daily: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={form.active !== false}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
