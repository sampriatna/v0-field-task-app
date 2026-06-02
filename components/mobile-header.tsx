"use client";

import { ArrowLeft, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  backHref?: string;
}

export function MobileHeader({
  title,
  showBack = false,
  showSettings = false,
  backHref,
}: MobileHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-2"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold text-lg text-foreground truncate">
            {title}
          </h1>
        </div>

        {showSettings && (
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
