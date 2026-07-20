"use client";

import { useState, useEffect } from "react";
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
  RepeatIcon,
  ShieldCheck,
  Link2,
  FileText,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStaff } from "@/lib/api";
import type { Staff } from "@/lib/types";

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [staffPreview, setStaffPreview] = useState<Staff[]>([]);

  useEffect(() => {
    getStaff().then((result) => {
      if (result.success && result.data) {
        setStaffPreview(result.data.filter((s) => s.status === "ACTIVE").slice(0, 3));
      }
    });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/login");
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Gagal logout. Silakan coba lagi.", variant: "destructive" });
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
              <h3 className="font-semibold text-foreground">Google Apps Script</h3>
              <p className="text-sm text-muted-foreground">Status koneksi ke backend Google Sheets</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-emerald-800 font-medium">Terhubung via Environment Variable</span>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-blue-800">
              GAS URL dan API Key dikonfigurasi melalui environment variables (GAS_WEB_APP_URL dan ADMIN_API_KEY).
            </p>
          </div>
        </Card>

        {/* Master Area */}
        <Link href="/settings/areas">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Master Area</h3>
                  <p className="text-sm text-muted-foreground">Kelola daftar area kerja (Dapur, Bar, Ruang Tamu, dll)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* Master Kategori */}
        <Link href="/settings/categories">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Master Kategori</h3>
                  <p className="text-sm text-muted-foreground">Kelola kategori tugas (Cleaning, Maintenance, Setup, dll)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* Master Staff */}
        <Link href="/settings/staff">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Master Staff</h3>
                  <p className="text-sm text-muted-foreground">Kelola daftar staff, posisi, dan nomor WhatsApp</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            {staffPreview.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {staffPreview.map((staff) => (
                  <div key={staff.staff_id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{staff.name}</p>
                      <p className="text-xs text-muted-foreground">{staff.wa_number}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{staff.outlet}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Link>

        {/* Daily Activity SOP — lapisan tambahan (bukan pengganti task) */}
        <div className="pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Daily Activity SOP · lapisan tambahan
          </p>
        </div>

        <Link href="/settings/daily-activity">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Kelola Daily Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    Super admin: edit template SOP, link staff, dashboard audit
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* Link Report Staff */}
        <Link href="/settings/report-links">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Link Report Staff</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate link permanen /r/[token] untuk laporan harian cepat
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* Template Report Harian */}
        <Link href="/settings/report-templates">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Template Kegiatan SOP</h3>
                  <p className="text-sm text-muted-foreground">
                    Kegiatan standar: checklist, standar hasil, foto, target waktu
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* Daily Report Dashboard shortcut */}
        <Link href="/dashboard/daily-reports">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Dashboard Daily Report</h3>
                  <p className="text-sm text-muted-foreground">
                    Lihat siapa sudah/belum submit kegiatan hari ini
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/leader-monitoring">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer border-slate-300">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Leader Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Kontrol lapangan: Opening, Jam Ramai, Spot Check, Closing, Issue Log
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* Manajemen User Login */}
        <Link href="/settings/users">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Manajemen User Login</h3>
                  <p className="text-sm text-muted-foreground">Atur username, password, dan hak akses per staff</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* Tugas Berulang */}
        <Link href="/settings/recurring-tasks">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <RepeatIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Template Tugas Berulang</h3>
                  <p className="text-sm text-muted-foreground">Buat dan kelola checklist + PIC untuk tugas berulang</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        {/* System Info */}
        <Card className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            Nusa Food Task &amp; Report System v1.0
            <br />
            Data disimpan ke Google Sheets via Apps Script
          </p>
        </Card>

        {/* Logout */}
        <Card className="p-4">
          <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut} className="w-full">
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
