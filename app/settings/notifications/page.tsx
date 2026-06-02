"use client";

import { useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Bell,
  CalendarCheck,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface NotificationMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  recommended?: boolean;
  comingSoon?: boolean;
  leaderOnly?: boolean;
}

export default function NotificationSettingsPage() {
  const [methods, setMethods] = useState<NotificationMethod[]>([
    {
      id: "whatsapp",
      name: "WhatsApp via Fonnte",
      description: "Notifikasi tugas dan reminder dikirim via WhatsApp. Paling mudah untuk staf lapangan.",
      icon: <MessageCircle className="w-6 h-6" />,
      enabled: true,
      recommended: true,
    },
    {
      id: "push",
      name: "Browser Push Notification",
      description: "Notifikasi browser untuk admin dan leader yang sering buka dashboard.",
      icon: <Bell className="w-6 h-6" />,
      enabled: false,
      comingSoon: true,
    },
    {
      id: "google_tasks",
      name: "Google Tasks Sync",
      description: "Sinkronisasi tugas ke Google Tasks untuk tracking personal.",
      icon: <CalendarCheck className="w-6 h-6" />,
      enabled: false,
      leaderOnly: true,
    },
  ]);

  const toggleMethod = (id: string) => {
    setMethods(
      methods.map((m) =>
        m.id === id && !m.comingSoon ? { ...m, enabled: !m.enabled } : m
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Notifikasi" showBack showSettings />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pengaturan Notifikasi</h1>
          <p className="text-sm text-muted-foreground">
            Pilih metode notifikasi untuk tugas dan checklist
          </p>
        </div>

        {/* Important Note */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Untuk staf lapangan, metode utama adalah <strong>WhatsApp</strong> karena paling mudah dipakai dan tidak perlu install aplikasi tambahan.
          </AlertDescription>
        </Alert>

        {/* Notification Methods */}
        <div className="space-y-3">
          {methods.map((method) => (
            <Card
              key={method.id}
              className={`${method.comingSoon ? "opacity-60" : ""} ${
                method.enabled && !method.comingSoon ? "border-primary/50" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      method.enabled && !method.comingSoon
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {method.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">{method.name}</h3>
                      {method.recommended && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          Recommended
                        </Badge>
                      )}
                      {method.comingSoon && (
                        <Badge variant="secondary" className="text-xs">
                          Coming Soon
                        </Badge>
                      )}
                      {method.leaderOnly && (
                        <Badge variant="outline" className="text-xs">
                          Leader Only
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={() => toggleMethod(method.id)}
                    disabled={method.comingSoon}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* WhatsApp Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Detail WhatsApp Notification
            </CardTitle>
            <CardDescription>
              Notifikasi yang dikirim via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Tugas Baru</p>
                <p className="text-xs text-muted-foreground">
                  Dikirim saat admin/leader membuat tugas baru
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Reminder Deadline</p>
                <p className="text-xs text-muted-foreground">
                  Dikirim 1 jam sebelum deadline jika belum submit
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Checklist Harian</p>
                <p className="text-xs text-muted-foreground">
                  Dikirim sesuai jadwal template recurring
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-sm">Request Revisi</p>
                <p className="text-xs text-muted-foreground">
                  Dikirim saat leader meminta revisi laporan
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fonnte Info */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 mb-1">Tentang Fonnte</h4>
                <p className="text-sm text-green-700">
                  Sistem ini menggunakan Fonnte API untuk mengirim pesan WhatsApp. 
                  Pastikan API Key Fonnte sudah dikonfigurasi di Google Apps Script.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
