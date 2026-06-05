"use client";

import { useEffect, useState, use } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  GripVertical,
  Trash2,
  Camera,
  Check,
  Loader2,
  Save,
  ArrowLeft,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  getRecurringTemplate,
  getChecklistItems,
  saveChecklistItems,
  generateChecklistReport,
} from "@/lib/api";
import type { RecurringTemplate, ChecklistItem } from "@/lib/types";

interface ChecklistItemForm {
  id: string;
  item_text: string;
  requires_photo: boolean;
  is_required: boolean;
  active_status: boolean;
}

export default function ChecklistTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [template, setTemplate] = useState<RecurringTemplate | null>(null);
  const [items, setItems] = useState<ChecklistItemForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, [templateId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [templateResult, itemsResult] = await Promise.all([
        getRecurringTemplate(templateId),
        getChecklistItems(templateId),
      ]);

      if (templateResult.success && templateResult.data) {
        setTemplate(templateResult.data);
      }

      if (itemsResult.success && itemsResult.data) {
        setItems(
          itemsResult.data.map((item) => ({
            id: item.checklist_item_id,
            item_text: item.item_text,
            requires_photo: item.requires_photo,
            is_required: item.is_required,
            active_status: item.active_status,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Gagal",
        description: "Gagal memuat data template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    const newItem: ChecklistItemForm = {
      id: `new-${Date.now()}`,
      item_text: "",
      requires_photo: false,
      is_required: true,
      active_status: true,
    };
    setItems([...items, newItem]);
    setHasChanges(true);
  };

  const updateItem = (id: string, updates: Partial<ChecklistItemForm>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    setHasChanges(true);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setHasChanges(true);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const itemsToSave = items.map((item, index) => ({
        item_order: index + 1,
        item_text: item.item_text.trim(),
        requires_photo: item.requires_photo,
        is_required: item.is_required,
        active_status: item.active_status,
      }));

      const result = await saveChecklistItems(templateId, itemsToSave);

      if (result.success) {
        toast({
          title: "Berhasil Disimpan",
          description: `${items.length} item checklist berhasil disimpan`,
        });
        setHasChanges(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Gagal Menyimpan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateChecklist = async () => {
    setIsGenerating(true);
    try {
      const result = await generateChecklistReport(templateId);

      if (result.success) {
        const taskId = result.data?.task?.task_id;
        if (taskId) {
          toast({
            title: "Checklist Berhasil Dibuat",
            description: "Checklist telah dikirim ke staff",
          });
          router.push(`/checklists/${taskId}`);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Gagal Membuat Checklist",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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

  if (!template) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Template Tidak Ditemukan" showBack />
        <div className="p-4 text-center py-12">
          <p className="text-muted-foreground mb-4">Template tidak ditemukan</p>
          <Link href="/recurring">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobileHeader title="Item Checklist" showBack />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Template Info */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-foreground">{template.template_name}</h2>
            <p className="text-sm text-muted-foreground">
              {template.outlet} - {template.area}
            </p>
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Item Checklist</h3>
            <Badge variant="secondary">{items.length} item</Badge>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Check className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Belum ada item checklist
                </p>
                <Button onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Item Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <Card key={item.id} className={!item.active_status ? "opacity-60" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 pt-2">
                        <button
                          type="button"
                          onClick={() => moveItem(index, "up")}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <Input
                            value={item.item_text}
                            onChange={(e) => updateItem(item.id, { item_text: e.target.value })}
                            placeholder="Tulis item checklist..."
                            className="flex-1"
                          />
                        </div>

                        <div className="flex items-center gap-4 pl-8">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Switch
                              checked={item.requires_photo}
                              onCheckedChange={(checked) =>
                                updateItem(item.id, { requires_photo: checked })
                              }
                              className="scale-75"
                            />
                            <Camera className="w-3 h-3" />
                            <span className="text-muted-foreground">Foto</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Switch
                              checked={item.is_required}
                              onCheckedChange={(checked) =>
                                updateItem(item.id, { is_required: checked })
                              }
                              className="scale-75"
                            />
                            <span className="text-muted-foreground">Wajib</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Switch
                              checked={item.active_status}
                              onCheckedChange={(checked) =>
                                updateItem(item.id, { active_status: checked })
                              }
                              className="scale-75"
                            />
                            <span className="text-muted-foreground">Aktif</span>
                          </label>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Item Button */}
          <Button variant="outline" onClick={addItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Item
          </Button>
        </div>
      </div>

      {/* Fixed Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            onClick={handleGenerateChecklist}
            disabled={isGenerating || isSaving}
            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Membuat...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Kirim Checklist
              </>
            )}
          </Button>
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving || isGenerating}
              className="flex-1 h-12"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
