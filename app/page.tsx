"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, LogIn, Shield } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo and Branding */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Nusa Food
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Task & Report System
            </p>
          </div>
        </div>

        {/* Brand List */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Kopi Buri Umah</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>Kisamen</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>Samtaro</span>
        </div>

        {/* Main Card */}
        <Card className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Sistem operasional internal untuk manajemen tugas lapangan
            </p>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full h-12 text-base">
              <Link href="/login">
                <LogIn className="w-5 h-5 mr-2" />
                Masuk ke Dashboard
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>
              Staff mengakses tugas melalui link WhatsApp yang dikirim otomatis
            </span>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Nusa Food Group - Internal System
        </p>
      </div>
    </main>
  );
}
