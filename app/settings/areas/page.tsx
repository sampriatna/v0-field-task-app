"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { MasterAreaForm } from "@/components/master-area-form";
import { getAreas } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function SettingsAreasPage() {
  const [areas, setAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAreas();
      if (result.success && result.data) {
        setAreas(result.data);
      } else {
        setError(result.error || "Gagal memuat area");
      }
    } catch (err) {
      setError("Gagal memuat area");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Master Area" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
                <button
                  onClick={loadAreas}
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
          <MasterAreaForm areas={areas} onAreasUpdated={loadAreas} />
        )}
      </div>
    </div>
  );
}
