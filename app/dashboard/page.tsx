"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { DashboardSummaryCards, ChecklistSummaryCards } from "@/components/dashboard-summary";
import { TaskCard, TaskCardSkeleton } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, X, RefreshCw, ListChecks, ClipboardList, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getTasks, getChecklistReports } from "@/lib/api";
import type { Task, DashboardSummary, TaskStatus, Outlet, ChecklistReport, ChecklistSummary } from "@/lib/types";
import { outlets } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";

const statusOptions: { value: TaskStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua Status" },
  { value: "OPEN", label: "Belum Dikerjakan" },
  { value: "SUBMITTED", label: "Terkirim" },
  { value: "DONE", label: "Selesai" },
  { value: "LATE", label: "Terlambat" },
  { value: "REVISI", label: "Perlu Revisi" },
];

type TimePeriod = "today" | "week" | "month";

// Helper function to check if task matches the filtered status
// Uses same grouping logic as calculateTaskSummary
function matchesStatusFilter(task: Task, selectedStatus: TaskStatus | "ALL"): boolean {
  if (selectedStatus === "ALL") return true;

  const openStatuses = ["CREATED", "SENT", "WA_FAILED", "OPEN", "OPENED"];
  const submittedStatuses = ["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION"];
  const doneStatuses = ["DONE", "VERIFIED"];
  const revisiStatuses = ["REVISI", "REVISION", "REVISION_REQUESTED"];
  const lateStatuses = ["LATE"];

  switch (selectedStatus) {
    case "OPEN":
      return openStatuses.includes(task.status) && !(task.is_late === true || task.is_late === "YES" || task.status === "LATE");
    case "SUBMITTED":
      return submittedStatuses.includes(task.status);
    case "DONE":
      return doneStatuses.includes(task.status);
    case "LATE":
      return task.status === "LATE" || task.is_late === true || task.is_late === "YES";
    case "REVISI":
      return revisiStatuses.includes(task.status);
    default:
      return true;
  }
}

// Helper function to extract date portion from deadline (YYYY-MM-DD)
function getTaskDate(deadline: string): string {
  const date = new Date(deadline);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

// Get today's date in YYYY-MM-DD format (local timezone)
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Check if a date is within the selected time period
function isWithinTimePeriod(deadline: string, period: TimePeriod): boolean {
  const today = new Date();
  const todayDate = getTodayDate();
  const taskDate = getTaskDate(deadline);
  
  if (!taskDate) return false;
  
  const taskDateObj = new Date(taskDate);
  
  switch (period) {
    case "today":
      return taskDate === todayDate;
    case "week": {
      // Get Monday of this week
      const currentDay = today.getDay();
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const weekStart = new Date(today.setDate(diff));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Compare dates
      const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
      const end = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
      
      return taskDateObj >= start && taskDateObj <= end;
    }
    case "month": {
      return taskDateObj.getFullYear() === today.getFullYear() && 
             taskDateObj.getMonth() === today.getMonth();
    }
    default:
      return false;
  }
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<ChecklistReport[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    total: 0,
    open: 0,
    submitted: 0,
    done: 0,
    late: 0,
    revisi: 0,
  });
  const [checklistSummary, setChecklistSummary] = useState<ChecklistSummary>({
    total: 0,
    open: 0,
    submitted: 0,
    done: 0,
    late: 0,
    revisi: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "checklists">("tasks");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "ALL">("ALL");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
  const [currentPage, setCurrentPage] = useState(1); // Pagination: 1-indexed
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  // Calculate summary from tasks array to ensure consistency
  const calculateTaskSummary = (taskList: Task[]): DashboardSummary => {
    const manualTasks = taskList.filter(t => t.checklist_mode !== "YES");
    
    // Status groupings per requirements
    const openStatuses = ["CREATED", "SENT", "WA_FAILED", "OPEN", "OPENED"];
    const submittedStatuses = ["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION"];
    const doneStatuses = ["DONE", "VERIFIED"];
    const revisiStatuses = ["REVISI", "REVISION", "REVISION_REQUESTED"];
    
    return {
      total: manualTasks.length,
      open: manualTasks.filter(t => openStatuses.includes(t.status)).length,
      submitted: manualTasks.filter(t => submittedStatuses.includes(t.status)).length,
      done: manualTasks.filter(t => doneStatuses.includes(t.status)).length,
      late: manualTasks.filter(t => t.status === "LATE" || t.is_late === true || t.is_late === "YES").length,
      revisi: manualTasks.filter(t => revisiStatuses.includes(t.status)).length,
    };
  };

  // Calculate checklist summary from tasks with checklist_mode === "YES"
  const calculateChecklistSummary = (taskList: Task[]): ChecklistSummary => {
    const checklistTasks = taskList.filter(t => t.checklist_mode === "YES" || t.task_id?.startsWith("CHK-TSK-"));
    
    const openStatuses = ["CREATED", "SENT", "WA_FAILED", "OPEN", "OPENED"];
    const submittedStatuses = ["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION"];
    const doneStatuses = ["DONE", "VERIFIED"];
    const revisiStatuses = ["REVISI", "REVISION", "REVISION_REQUESTED"];
    
    return {
      total: checklistTasks.length,
      open: checklistTasks.filter(t => openStatuses.includes(t.status)).length,
      submitted: checklistTasks.filter(t => submittedStatuses.includes(t.status)).length,
      done: checklistTasks.filter(t => doneStatuses.includes(t.status)).length,
      late: checklistTasks.filter(t => t.status === "LATE" || t.is_late === true || t.is_late === "YES").length,
      revisi: checklistTasks.filter(t => revisiStatuses.includes(t.status)).length,
    };
  };

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const tasksResult = await getTasks();

      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data);
        setSummary(calculateTaskSummary(tasksResult.data));
        setChecklistSummary(calculateChecklistSummary(tasksResult.data));
      } else {
        setTasks([]);
        setLoadError(tasksResult.error || "Gagal memuat tugas");
      }

      // Load checklists separately (non-blocking)
      try {
        const checklistsResult = await getChecklistReports();
        if (checklistsResult.success && checklistsResult.data) {
          setChecklists(checklistsResult.data);
        }
      } catch {
        // Checklist error is non-fatal
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Gagal memuat data");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tasks: manual tasks (non-checklist) and checklist tasks
  const manualTasks = tasks.filter(t => t.checklist_mode !== "YES");
  const checklistTasks = tasks.filter(t => t.checklist_mode === "YES" || t.task_id?.startsWith("CHK-TSK-"));

  const filteredTasks = manualTasks
    .filter((task) => {
      // Apply time period filter
      if (!isWithinTimePeriod(task.deadline, timePeriod)) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.task_title.toLowerCase().includes(query) ||
          task.task_id.toLowerCase().includes(query) ||
          task.pic_name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (selectedOutlet !== "ALL" && task.outlet !== selectedOutlet) return false;
      if (!matchesStatusFilter(task, selectedStatus)) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by deadline: oldest to newest
      const deadlineA = new Date(a.deadline).getTime();
      const deadlineB = new Date(b.deadline).getTime();
      return deadlineA - deadlineB;
    });

  const filteredChecklists = checklistTasks
    .filter((checklist) => {
      // Apply time period filter
      if (!isWithinTimePeriod(checklist.deadline, timePeriod)) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (checklist.checklist_title || checklist.task_title || '').toLowerCase().includes(query) ||
          checklist.task_id.toLowerCase().includes(query) ||
          checklist.pic_name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (selectedOutlet !== "ALL" && checklist.outlet !== selectedOutlet) return false;
      if (!matchesStatusFilter(checklist as unknown as Task, selectedStatus)) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by deadline: oldest to newest
      const deadlineA = new Date(a.deadline).getTime();
      const deadlineB = new Date(b.deadline).getTime();
      return deadlineA - deadlineB;
    });

  // Pagination: calculate total pages and slice current page
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOutlet, selectedStatus, searchQuery, timePeriod]);

  const hasActiveFilters = selectedOutlet !== "ALL" || selectedStatus !== "ALL" || searchQuery !== "" || timePeriod !== "today";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearFilters = () => {
    setSelectedOutlet("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
    setTimePeriod("today"); // Reset to today
  };

  const handleStatusClick = (status: TaskStatus | "ALL") => {
    // Toggle: if same status clicked, reset to ALL; otherwise set new status
    if (selectedStatus === status) {
      setSelectedStatus("ALL");
    } else {
      setSelectedStatus(status);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    // Remove task from local state immediately for instant feedback
    const updated = tasks.filter((t) => t.task_id !== taskId);
    setTasks(updated);
    setSummary(calculateTaskSummary(updated));
    setChecklistSummary(calculateChecklistSummary(updated));
    toast({
      title: "Tugas berhasil dihapus",
      description: `Tugas ${taskId} telah dihapus dari sistem.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Dashboard" showSettings />

      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        {/* Error Alert */}
        {loadError && tasks.length > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{loadError}</p>
                <Button 
                  variant="link" 
                  size="sm"
                  onClick={() => loadData()}
                  className="text-red-600 p-0 h-auto"
                >
                  Coba muat ulang
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/recurring">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Tugas Berulang</p>
                  <p className="text-xs text-muted-foreground">Template & jadwal</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/tasks/new">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Tugas Baru</p>
                  <p className="text-xs text-muted-foreground">Buat tugas manual</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/daily-reports" className="col-span-2">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Daily Report Staff</p>
                  <p className="text-xs text-muted-foreground">
                    Laporan harian via link permanen — pelengkap task
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tasks" | "checklists")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Tugas ({manualTasks.length})
            </TabsTrigger>
            <TabsTrigger value="checklists" className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Checklist ({checklists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 mt-4">
            {/* Task Summary Cards */}
            <DashboardSummaryCards 
              summary={summary} 
              isLoading={isLoading}
              onStatusClick={handleStatusClick}
            />

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
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="shrink-0"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
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
                {/* Time Period Selector */}
                <div className="flex gap-1 bg-card rounded p-1">
                  <Button
                    variant={timePeriod === "today" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod("today")}
                    className="text-xs"
                  >
                    Hari Ini
                  </Button>
                  <Button
                    variant={timePeriod === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod("week")}
                    className="text-xs"
                  >
                    Minggu Ini
                  </Button>
                  <Button
                    variant={timePeriod === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod("month")}
                    className="text-xs"
                  >
                    Bulan Ini
                  </Button>
                </div>
                
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
                      <SelectItem key={outlet} value={outlet}>{outlet}</SelectItem>
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
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
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
                  {filteredTasks.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({paginatedTasks.length}/{filteredTasks.length})
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
                  <h3 className="font-medium text-foreground mb-1">Tidak ada tugas ditemukan</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasActiveFilters ? "Coba ubah filter pencarian Anda" : "Belum ada tugas yang dibuat"}
                  </p>
                  {hasActiveFilters ? (
                    <Button variant="outline" onClick={clearFilters}>Reset Filter</Button>
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
                <>
                  <div className="space-y-3">
                    {paginatedTasks.map((task) => (
                      <TaskCard key={task.task_id} task={task} onDelete={handleDeleteTask} />
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-6 pb-4">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="checklists" className="space-y-4 mt-4">
            {/* Checklist Summary Cards */}
            <ChecklistSummaryCards 
              summary={checklistSummary} 
              isLoading={isLoading}
              onStatusClick={handleStatusClick}
            />

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari checklist, ID, atau PIC..."
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
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                {/* Time Period Selector */}
                <div className="flex gap-1 bg-card rounded p-1">
                  <Button
                    variant={timePeriod === "today" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod("today")}
                    className="text-xs"
                  >
                    Hari Ini
                  </Button>
                  <Button
                    variant={timePeriod === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod("week")}
                    className="text-xs"
                  >
                    Minggu Ini
                  </Button>
                  <Button
                    variant={timePeriod === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimePeriod("month")}
                    className="text-xs"
                  >
                    Bulan Ini
                  </Button>
                </div>

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
                      <SelectItem key={outlet} value={outlet}>{outlet}</SelectItem>
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
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <X className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            )}

            {/* Checklist List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Daftar Checklist Hari Ini
                  {hasActiveFilters && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filteredChecklists.length} hasil)
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
              ) : filteredChecklists.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <ListChecks className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Tidak ada checklist ditemukan</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasActiveFilters ? "Coba ubah filter pencarian Anda" : "Belum ada checklist"}
                  </p>
                  {hasActiveFilters ? (
                    <Button variant="outline" onClick={clearFilters}>Reset Filter</Button>
                  ) : (
                    <Link href="/recurring">
                      <Button>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Buat Template Recurring
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChecklists.map((checklist) => (
                    <Link key={checklist.task_id} href={`/checklists/${checklist.task_id}`}>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <StatusBadge status={checklist.status} />
                                <span className="text-xs text-muted-foreground">{checklist.task_id}</span>
                              </div>
                              <h3 className="font-medium text-foreground truncate">{checklist.checklist_title || checklist.task_title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {checklist.outlet} - {checklist.area} | PIC: {checklist.pic_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Deadline: {new Date(checklist.deadline).toLocaleString("id-ID")}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
