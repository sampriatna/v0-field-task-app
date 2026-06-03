"use client";

import type { Task } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, MapPin, User, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TaskCardProps {
  task: Task;
  className?: string;
  onDelete?: (taskId: string) => void;
}

const priorityColors: Record<string, string> = {
  Low: "border-l-slate-400",
  Medium: "border-l-blue-500",
  High: "border-l-orange-500",
  Urgent: "border-l-red-600",
};

export function TaskCard({ task, className, onDelete }: TaskCardProps) {
  const deadlineDate = new Date(task.deadline);
  const isOverdue = new Date() > deadlineDate && task.status === "OPEN";
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteTask", task_id: task.task_id }),
      });
      const data = await response.json();
      if (data.success) {
        onDelete?.(task.task_id);
      } else {
        alert("Gagal menghapus tugas: " + (data.error || "Terjadi kesalahan"));
      }
    } catch {
      alert("Gagal menghapus tugas. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card
      className={cn(
        "border-l-4 p-0 overflow-hidden",
        priorityColors[task.priority] || "border-l-slate-400",
        className
      )}
    >
      <div className="flex items-stretch">
        <Link href={`/tasks/${task.task_id}`} className="block flex-1 min-w-0">
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

        {onDelete && (
          <div className="flex items-center pr-3 pl-1 border-l border-border/50">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  disabled={isDeleting}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">Hapus tugas</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Tugas</AlertDialogTitle>
                  <AlertDialogDescription>
                    Yakin ingin menghapus tugas ini? Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-1 py-2 bg-muted rounded-md text-sm">
                  <p className="font-medium text-foreground">{task.task_title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{task.task_id}</p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Menghapus..." : "Hapus Tugas"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
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
