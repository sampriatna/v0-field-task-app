"use client";

import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  CheckCircle2,
  Info,
  Database,
  Users,
  Building2,
  Layers,
  LogOut,
} from "lucide-react";
import { setGasUrl, getStoredGasUrl } from "@/lib/api";
import { outlets, areas, categories, staffList } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [gasUrl, setGasUrlState] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const stored = getStoredGasUrl();
    setGasUrlState(stored);
  }, []);

  const handleSaveGasUrl = () => {
    setIsSaving(true);

    // Simulate save delay
    setTimeout(() => {
      setGasUrl(gasUrl);
      setIsSaving(false);
      toast({
        title: "Pengaturan Disimpan",
        description: "GAS Web App URL berhasil diperbarui",
      });
    }, 500);
  };

  const isValidGasUrl =
    gasUrl.includes("script.google.com") && !gasUrl.includes("PASTE_GAS_URL_HERE");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Gagal logout. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Pengaturan" showBack backHref="/dashboard" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* GAS Configuration */}
        <Card className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Google Apps Script
              </h3>
              <p className="text-sm text-muted-foreground">
                Konfigurasi koneksi ke backend Google Sheets
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>GAS Web App URL</Label>
            <Input
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gasUrl}
              onChange={(e) => setGasUrlState(e.target.value)}
            />
            {isValidGasUrl && (
              <div className="flex items-center gap-1 text-emerald-600 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                URL valid
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveGasUrl}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Menyimpan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Simpan
              </span>
            )}
          </Button>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-blue-800">
              Token Fonnte disimpan di Google Apps Script, bukan di frontend
              ini. Pastikan Anda sudah mengkonfigurasi Apps Script dengan benar.
            </p>
          </div>
        </Card>

        {/* Outlets */}
        <Card className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Daftar Outlet</h3>
              <p className="text-sm text-muted-foreground">
                Outlet yang tersedia dalam sistem
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {outlets.map((outlet) => (
              <Badge key={outlet} variant="secondary">
                {outlet}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Areas & Categories */}
        <Card className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Area & Kategori</h3>
              <p className="text-sm text-muted-foreground">
                Daftar area dan kategori tugas
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Area:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((area) => (
                <Badge key={area} variant="outline" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Kategori:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Staff List */}
        <Card className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Daftar Staff</h3>
              <p className="text-sm text-muted-foreground">
                Staff yang terdaftar (data dummy untuk MVP)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {staffList.map((staff) => (
              <div
                key={staff.name}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {staff.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{staff.wa}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {staff.outlet}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* System Info */}
        <Card className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            Nusa Food Task & Report System v1.0
            <br />
            Data disimpan ke Google Sheets via Apps Script
          </p>
        </Card>

        {/* Logout Button */}
        <Card className="p-4">
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full"
          >
            {isLoggingOut ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Keluar...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout dari Sistem
              </span>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
