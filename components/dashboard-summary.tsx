"use client";

import type { DashboardSummary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Send,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
  isLoading?: boolean;
}

interface SummaryCard {
  key: keyof DashboardSummary;
  label: string;
  icon: React.ReactNode;
  className: string;
  textClass: string;
}

const cards: SummaryCard[] = [
  {
    key: "total",
    label: "Total Tugas",
    icon: <ClipboardList className="h-5 w-5" />,
    className: "bg-slate-50 border-slate-200",
    textClass: "text-slate-700",
  },
  {
    key: "open",
    label: "Open",
    icon: <Clock className="h-5 w-5" />,
    className: "bg-blue-50 border-blue-200",
    textClass: "text-blue-700",
  },
  {
    key: "submitted",
    label: "Submitted",
    icon: <Send className="h-5 w-5" />,
    className: "bg-amber-50 border-amber-200",
    textClass: "text-amber-700",
  },
  {
    key: "done",
    label: "Done",
    icon: <CheckCircle2 className="h-5 w-5" />,
    className: "bg-emerald-50 border-emerald-200",
    textClass: "text-emerald-700",
  },
  {
    key: "late",
    label: "Late",
    icon: <AlertTriangle className="h-5 w-5" />,
    className: "bg-red-50 border-red-200",
    textClass: "text-red-700",
  },
  {
    key: "revisi",
    label: "Revisi",
    icon: <RotateCcw className="h-5 w-5" />,
    className: "bg-orange-50 border-orange-200",
    textClass: "text-orange-700",
  },
];

export function DashboardSummaryCards({
  summary,
  isLoading = false,
}: DashboardSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <Card
            key={card.key}
            className={cn("p-3 border", card.className)}
          >
            <div className="animate-pulse">
              <div className="h-4 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-8 w-12 bg-slate-200 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <Card
          key={card.key}
          className={cn("p-3 border", card.className)}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={card.textClass}>{card.icon}</span>
            <span className={cn("text-xs font-medium", card.textClass)}>
              {card.label}
            </span>
          </div>
          <p className={cn("text-2xl font-bold", card.textClass)}>
            {summary[card.key]}
          </p>
        </Card>
      ))}
    </div>
  );
}
