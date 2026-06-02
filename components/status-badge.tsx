"use client";

import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  REVISI: {
    label: "Revisi",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  LATE: {
    label: "Late",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
