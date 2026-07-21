"use client";

import { useState, useTransition } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { seedDailyActivityTemplatesApi } from "@/lib/api";

type Props = {
  compact?: boolean;
  onDone?: () => void;
};

export function DailyActivitySeedButton({ compact = false, onDone }: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function runSeed() {
    startTransition(async () => {
      setResult(null);
      const res = await seedDailyActivityTemplatesApi();
      if (!res.success) {
        toast({
          title: "Seed gagal",
          description: res.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      const data = res.data;
      const summary = data
        ? `${data.templates} template · ${data.position_groups?.length || 0} posisi`
        : "";
      setResult(summary);
      toast({
        title: "Template kegiatan di-seed",
        description:
          summary ||
          "Checklist wajib harian sudah di-update dari seed bawaan (port v2)",
      });
      onDone?.();
    });
  }

  if (compact) {
    return (
      <Button onClick={runSeed} disabled={pending} variant="outline" size="sm">
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Database className="mr-2 size-4" />
        )}
        Seed template
      </Button>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold">Seed Template Kegiatan Harian</p>
          <p className="text-sm text-muted-foreground">
            Import / update semua template SOP dari nusafood-v2 (Waiters, Bar,
            Dapur, PA, Kasir, Purchasing, Gudang, Produksi, dll.). Aman dijalankan
            ulang — tidak duplikat.
          </p>
        </div>
        <Button onClick={runSeed} disabled={pending} className="w-full sm:w-auto">
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Database className="mr-2 size-4" />
          )}
          Seed Template Kegiatan
        </Button>
        {result ? <p className="text-sm text-muted-foreground">{result}</p> : null}
      </CardContent>
    </Card>
  );
}
