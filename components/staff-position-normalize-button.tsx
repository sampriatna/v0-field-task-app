"use client";

import { useState, useTransition } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getStaff, normalizeStaffPositionsApi, updateStaff } from "@/lib/api";
import type { Staff } from "@/lib/types";

export function StaffPositionNormalizeButton() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function runNormalize() {
    startTransition(async () => {
      setResult(null);
      const staffRes = await getStaff({ status: "ACTIVE" });
      const staff = staffRes.success && staffRes.data ? staffRes.data : [];

      const res = await normalizeStaffPositionsApi(staff);
      if (!res.success || !res.data) {
        toast({
          title: "Normalisasi gagal",
          description: res.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }

      const data = res.data;
      let persisted = 0;
      for (const s of data.updated_staff || []) {
        const up = await updateStaff({
          staff_id: s.staff_id,
          name: s.name,
          position: s.position,
          outlet: s.outlet as Staff["outlet"],
          area: s.area,
          wa_number: s.wa_number,
          role: s.role,
        });
        if (up.success) persisted += 1;
      }

      const summary = [
        `${data.updated} diperbarui di cache`,
        persisted ? `${persisted} disimpan ke Master Staff` : null,
        data.unchanged != null ? `${data.unchanged} sudah benar` : null,
        data.unresolved?.length
          ? `${data.unresolved.length} perlu edit manual`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      setResult(summary);
      toast({
        title: "Jabatan staff dinormalisasi",
        description: summary || "Selesai",
      });
    });
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/80">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold">Samakan Jabatan dengan Posisi Kegiatan</p>
          <p className="text-sm text-muted-foreground">
            Konversi otomatis jabatan lama ke posisi standar — mis. &quot;Public
            Area&quot; → PA, &quot;Kasir&quot; → Kasir. Yang tidak terpetakan perlu
            diedit manual.
          </p>
        </div>
        <Button
          onClick={runNormalize}
          disabled={pending}
          variant="outline"
          className="w-full bg-background sm:w-auto"
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 size-4" />
          )}
          Normalisasi Jabatan Staff
        </Button>
        {result ? <p className="text-sm text-muted-foreground">{result}</p> : null}
      </CardContent>
    </Card>
  );
}
