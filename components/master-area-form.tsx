"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { createArea, getAreas } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MasterAreaFormProps {
  areas: string[];
  onAreasUpdated: () => void;
}

export function MasterAreaForm({ areas, onAreasUpdated }: MasterAreaFormProps) {
  const [newArea, setNewArea] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddArea = async () => {
    if (!newArea.trim()) {
      toast({
        title: "Area diperlukan",
        description: "Masukkan nama area",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createArea(newArea.trim());
      if (result.success) {
        toast({
          title: "Area ditambahkan",
          description: `${newArea} berhasil ditambahkan`,
        });
        setNewArea("");
        onAreasUpdated();
      } else {
        toast({
          title: "Gagal menambah area",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add New Area */}
      <Card className="p-4">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Tambah Area Baru</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Nama area (contoh: Dapur, Bar, Ruang Tamu)"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
            />
            <Button
              onClick={handleAddArea}
              disabled={isLoading || !newArea.trim()}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>
        </div>
      </Card>

      {/* List of Areas */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3">
          Daftar Area ({areas.length})
        </h3>
        {areas.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted/50 rounded">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Belum ada area</span>
          </div>
        ) : (
          <div className="space-y-2">
            {areas.map((area, index) => {
              const label = typeof area === "string" ? area : (area as Record<string, unknown>).area_name as string || String(area);
              return (
              <div
                key={label || index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium text-foreground">
                  {label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
