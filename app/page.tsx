"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, LogIn, User } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoggingIn(true);
    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Store user in localStorage for MVP
    localStorage.setItem(
      "nusa_user",
      JSON.stringify({ name: name.trim(), role: "admin" })
    );

    router.push("/dashboard");
  };

  const handleQuickAccess = async () => {
    setIsLoggingIn(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    localStorage.setItem(
      "nusa_user",
      JSON.stringify({ name: "Admin", role: "admin" })
    );

    router.push("/dashboard");
  };

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

        {/* Login Card */}
        <Card className="p-6">
          {!showLogin ? (
            <div className="space-y-4">
              <Button
                onClick={handleQuickAccess}
                className="w-full h-12 text-base"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                    Masuk...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    Masuk ke Dashboard
                  </span>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    atau
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowLogin(true)}
                className="w-full h-12"
              >
                <User className="w-4 h-4 mr-2" />
                Login dengan Nama
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Pengguna</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Masukkan nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  disabled={isLoggingIn}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogin(false)}
                  disabled={isLoggingIn}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isLoggingIn || !name.trim()}
                  className="flex-1"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      Masuk...
                    </span>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Info Text */}
        <p className="text-center text-xs text-muted-foreground">
          Sistem operasional internal untuk manajemen tugas lapangan
        </p>
      </div>
    </main>
  );
}
