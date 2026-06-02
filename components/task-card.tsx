"use client";

import type { Task } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  className?: string;
}

const priorityColors: Record<string, string> = {
  Low: "border-l-slate-400",
  Medium: "border-l-blue-500",
  High: "border-l-orange-500",
  Urgent: "border-l-red-600",
};

export function TaskCard({ task, className }: TaskCardProps) {
  const deadlineDate = new Date(task.deadline);
  const isOverdue = new Date() > deadlineDate && task.status === "OPEN";

  return (
    <Card
      className={cn(
        "border-l-4 p-0 overflow-hidden",
        priorityColors[task.priority] || "border-l-slate-400",
        className
      )}
    >
      <Link href={`/tasks/${task.task_id}`} className="block">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {task.task_id}
                </span>
                <StatusBadge status={task.status} />
              </div>
              <h3 className="font-semibold text-foreground truncate text-base">
                {task.task_title}
              </h3>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {task.outlet} - {task.area}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate">{task.pic_name}</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 text-sm",
                isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
              )}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {deadlineDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                {deadlineDate.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

export function TaskCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-slate-200 p-4">
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
        <div className="h-5 w-3/4 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
          <div className="h-4 w-2/5 bg-muted rounded" />
        </div>
      </div>
    </Card>
  );
}
