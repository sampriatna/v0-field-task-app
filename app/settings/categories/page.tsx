"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { MasterCategoryForm } from "@/components/master-category-form";
import { getCategories } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function SettingsCategoriesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        setError(result.error || "Gagal memuat kategori");
      }
    } catch (err) {
      setError("Gagal memuat kategori");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Master Kategori" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
                <button
                  onClick={loadCategories}
                  className="text-xs text-destructive/80 underline mt-1"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <Card className="p-8">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          </Card>
        ) : (
          <MasterCategoryForm
            categories={categories}
            onCategoriesUpdated={loadCategories}
          />
        )}
      </div>
    </div>
  );
}
