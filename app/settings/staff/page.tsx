"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStaff, createStaff, updateStaff, deactivateStaff, activateStaff } from "@/lib/api";
import { outlets, areas } from "@/lib/mock-data";
import type { Staff, CreateStaffPayload, Outlet, Area, StaffRole } from "@/lib/types";
import { Plus, Pencil, UserX, UserCheck, Search, Users, Phone } from "lucide-react";

const roles: { value: StaffRole; label: string }[] = [
  { value: "STAFF", label: "Staff" },
  { value: "LEADER", label: "Leader" },
  { value: "ADMIN", label: "Admin" },
];

export default function StaffMasterPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOutlet, setFilterOutlet] = useState<Outlet | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffToDeactivate, setStaffToDeactivate] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CreateStaffPayload>({
    name: "",
    position: "",
    outlet: "KBU",
    area: "Dapur",
    wa_number: "",
    role: "STAFF",
  });

  const { toast } = useToast();

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const result = await getStaff();
      if (result.success && result.data) {
        setStaffList(result.data);
      }
    } catch (error) {
      console.error("Failed to load staff:", error);
      toast({
        title: "Error",
        description: "Gagal memuat daftar staff",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStaff = staffList.filter((staff) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        staff.name.toLowerCase().includes(query) ||
        staff.position.toLowerCase().includes(query) ||
        staff.wa_number.includes(query);
      if (!matchesSearch) return false;
    }
    if (filterOutlet !== "ALL" && staff.outlet !== filterOutlet) return false;
    if (filterStatus !== "ALL" && staff.status !== filterStatus) return false;
    return true;
  });

  const openAddForm = () => {
    setEditingStaff(null);
    setFormData({
      name: "",
      position: "",
      outlet: "KBU",
      area: "Dapur",
      wa_number: "",
      role: "STAFF",
    });
    setIsFormOpen(true);
  };

  const openEditForm = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      position: staff.position,
      outlet: staff.outlet,
      area: staff.area,
      wa_number: staff.wa_number,
      role: staff.role,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.wa_number.trim()) {
      toast({
        title: "Error",
        description: "Nama dan nomor WhatsApp wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const result = await updateStaff({
          staff_id: editingStaff.staff_id,
          ...formData,
        });
        if (result.success) {
          toast({ title: "Berhasil", description: "Staff berhasil diupdate" });
          loadStaff();
          setIsFormOpen(false);
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await createStaff(formData);
        if (result.success) {
          toast({ title: "Berhasil", description: "Staff berhasil ditambahkan" });
          loadStaff();
          setIsFormOpen(false);
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menyimpan staff",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!staffToDeactivate) return;
    
    setIsSubmitting(true);
    try {
      const result = await deactivateStaff(staffToDeactivate.staff_id);
      if (result.success) {
        toast({ title: "Berhasil", description: "Staff berhasil dinonaktifkan" });
        loadStaff();
        setIsDeactivateOpen(false);
        setStaffToDeactivate(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menonaktifkan staff",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (staff: Staff) => {
    try {
      const result = await activateStaff(staff.staff_id);
      if (result.success) {
        toast({ title: "Berhasil", description: "Staff berhasil diaktifkan" });
        loadStaff();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengaktifkan staff",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Master Staff" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Daftar Staff</h1>
            <p className="text-sm text-muted-foreground">
              {filteredStaff.length} staff {filterStatus !== "ALL" && `(${filterStatus.toLowerCase()})`}
            </p>
          </div>
          <Button onClick={openAddForm}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Staff
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, posisi, atau nomor WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterOutlet} onValueChange={(v) => setFilterOutlet(v as Outlet | "ALL")}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Outlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Outlet</SelectItem>
              {outlets.map((outlet) => (
                <SelectItem key={outlet} value={outlet}>{outlet}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "ALL" | "ACTIVE" | "INACTIVE")}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Staff List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-48 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Tidak ada staff ditemukan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filterOutlet !== "ALL" || filterStatus !== "ALL"
                ? "Coba ubah filter pencarian"
                : "Belum ada staff yang terdaftar"}
            </p>
            <Button onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Staff
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStaff.map((staff) => (
              <Card key={staff.staff_id} className={staff.status === "INACTIVE" ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{staff.name}</h3>
                        <Badge variant={staff.status === "ACTIVE" ? "default" : "secondary"}>
                          {staff.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                        </Badge>
                        <Badge variant="outline">{staff.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{staff.position}</p>
                      <p className="text-sm text-muted-foreground">
                        {staff.outlet} - {staff.area}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{staff.wa_number}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(staff)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {staff.status === "ACTIVE" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setStaffToDeactivate(staff);
                            setIsDeactivateOpen(true);
                          }}
                        >
                          <UserX className="w-4 h-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleActivate(staff)}>
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff" : "Tambah Staff Baru"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Edit informasi staff" : "Masukkan data staff baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama *</Label>
              <Input
                id="name"
                placeholder="Nama lengkap"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Posisi</Label>
              <Input
                id="position"
                placeholder="Contoh: Cook, Barista, Server"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Select
                  value={formData.outlet}
                  onValueChange={(v) => setFormData({ ...formData, outlet: v as Outlet })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet} value={outlet}>{outlet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Select
                  value={formData.area}
                  onValueChange={(v) => setFormData({ ...formData, area: v as Area })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa_number">Nomor WhatsApp *</Label>
              <Input
                id="wa_number"
                placeholder="628xxxxxxxxxx"
                value={formData.wa_number}
                onChange={(e) => setFormData({ ...formData, wa_number: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Format: 628xxxxxxxxxx (tanpa tanda +)</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as StaffRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : editingStaff ? "Update" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Staff?</AlertDialogTitle>
            <AlertDialogDescription>
              Staff <strong>{staffToDeactivate?.name}</strong> akan dinonaktifkan dan tidak akan muncul di pilihan PIC saat buat tugas.
              Staff tidak dihapus dan bisa diaktifkan kembali nanti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Nonaktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
