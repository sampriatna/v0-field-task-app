"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Info,
  Database,
  Users,
  Building2,
  Layers,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { outlets, areas, categories, staffList } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        {/* GAS Configuration Status */}
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
                Status koneksi ke backend Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-emerald-800 font-medium">
              Terhubung via Environment Variable
            </span>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-blue-800">
              GAS URL dan API Key dikonfigurasi melalui environment variables
              (GAS_WEB_APP_URL dan ADMIN_API_KEY). Token Fonnte disimpan di
              Google Apps Script.
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

        {/* Staff List - Link to Staff Master */}
        <Link href="/settings/staff">
          <Card className="p-4 space-y-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Master Staff</h3>
                  <p className="text-sm text-muted-foreground">
                    Kelola daftar staff, posisi, dan nomor WhatsApp
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              {staffList.slice(0, 3).map((staff) => (
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
              {staffList.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{staffList.length - 3} staff lainnya
                </p>
              )}
            </div>
          </Card>
        </Link>

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
