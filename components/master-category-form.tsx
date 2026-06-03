"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { createCategory } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MasterCategoryFormProps {
  categories: string[];
  onCategoriesUpdated: () => void;
}

export function MasterCategoryForm({
  categories,
  onCategoriesUpdated,
}: MasterCategoryFormProps) {
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast({
        title: "Kategori diperlukan",
        description: "Masukkan nama kategori",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCategory(newCategory.trim());
      if (result.success) {
        toast({
          title: "Kategori ditambahkan",
          description: `${newCategory} berhasil ditambahkan`,
        });
        setNewCategory("");
        onCategoriesUpdated();
      } else {
        toast({
          title: "Gagal menambah kategori",
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
      {/* Add New Category */}
      <Card className="p-4">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Tambah Kategori Baru</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Nama kategori (contoh: Cleaning, Maintenance, Setup)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <Button
              onClick={handleAddCategory}
              disabled={isLoading || !newCategory.trim()}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>
        </div>
      </Card>

      {/* List of Categories */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3">
          Daftar Kategori ({categories.length})
        </h3>
        {categories.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted/50 rounded">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Belum ada kategori</span>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium text-foreground">
                  {category}
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
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
