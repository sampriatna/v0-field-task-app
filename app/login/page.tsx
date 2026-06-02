"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Lock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password harus diisi");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Password salah");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Login Admin</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Masukkan password untuk mengakses dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                autoFocus
                disabled={isLoading}
                className="h-12 text-base"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full h-12 text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Memverifikasi...
                </span>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        </Card>

        {/* Info Text */}
        <p className="text-center text-xs text-muted-foreground">
          Sistem operasional internal untuk manajemen tugas lapangan
        </p>
      </div>
    </main>
  );
}
