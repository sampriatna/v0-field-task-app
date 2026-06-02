"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline";
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export function LogoutButton({
  variant = "ghost",
  showIcon = true,
  showText = true,
  className = "",
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : (
        <>
          {showIcon && <LogOut className="w-4 h-4" />}
          {showText && <span className={showIcon ? "ml-2" : ""}>Logout</span>}
        </>
      )}
    </Button>
  );
}
