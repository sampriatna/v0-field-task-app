"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { DashboardSummaryCards } from "@/components/dashboard-summary";
import { TaskCard, TaskCardSkeleton } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, X } from "lucide-react";
import Link from "next/link";
import { getTasks, getDashboardSummary } from "@/lib/api";
import type { Task, DashboardSummary, TaskStatus, Outlet } from "@/lib/types";
import { outlets } from "@/lib/mock-data";

const statusOptions: { value: TaskStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua Status" },
  { value: "OPEN", label: "Open" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "DONE", label: "Done" },
  { value: "LATE", label: "Late" },
  { value: "REVISI", label: "Revisi" },
];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    total: 0,
    open: 0,
    submitted: 0,
    done: 0,
    late: 0,
    revisi: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "ALL">("ALL");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksResult, summaryResult] = await Promise.all([
        getTasks(),
        getDashboardSummary(),
      ]);

      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data);
      }
      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        task.task_title.toLowerCase().includes(query) ||
        task.task_id.toLowerCase().includes(query) ||
        task.pic_name.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Outlet filter
    if (selectedOutlet !== "ALL" && task.outlet !== selectedOutlet) {
      return false;
    }

    // Status filter
    if (selectedStatus !== "ALL" && task.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  const hasActiveFilters =
    selectedOutlet !== "ALL" || selectedStatus !== "ALL" || searchQuery !== "";

  const clearFilters = () => {
    setSelectedOutlet("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Dashboard" showSettings />

      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        {/* Summary Cards */}
        <DashboardSummaryCards summary={summary} isLoading={isLoading} />

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari tugas, ID, atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Link href="/tasks/new">
            <Button size="icon" className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            <Select
              value={selectedOutlet}
              onValueChange={(v) => setSelectedOutlet(v as Outlet | "ALL")}
            >
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Outlet</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet} value={outlet}>
                    {outlet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatus}
              onValueChange={(v) => setSelectedStatus(v as TaskStatus | "ALL")}
            >
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Daftar Tugas
              {hasActiveFilters && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredTasks.length} hasil)
                </span>
              )}
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">
                Tidak ada tugas ditemukan
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Coba ubah filter pencarian Anda"
                  : "Belum ada tugas yang dibuat"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Reset Filter
                </Button>
              ) : (
                <Link href="/tasks/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Tugas Baru
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <TaskCard key={task.task_id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <Link href="/tasks/new" className="fixed bottom-6 right-6 lg:hidden">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
          <Plus className="w-6 h-6" />
        </Button>
      </Link>
    </div>
  );
}
