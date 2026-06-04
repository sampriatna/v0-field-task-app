"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getStaff, updateStaff } from "@/lib/api";
import type { Staff, StaffRole } from "@/lib/types";
import { ShieldCheck, Pencil, Phone, Users, Search, Eye, EyeOff } from "lucide-react";

const roleLabels: Record<StaffRole, string> = {
  ADMIN: "Admin",
  LEADER: "Leader",
  STAFF: "Staff",
};

const roleBadgeVariant: Record<StaffRole, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  LEADER: "secondary",
  STAFF: "outline",
};

export default function UsersPage() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "STAFF" as StaffRole,
    login_enabled: false,
  });

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
    } catch {
      toast({ title: "Error", description: "Gagal memuat daftar staff", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditForm = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      username: staff.wa_number, // default username = nomor WA
      password: "",
      role: staff.role,
      login_enabled: staff.login_enabled ?? false,
    });
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingStaff) return;
    if (!formData.username.trim()) {
      toast({ title: "Error", description: "Username harus diisi", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateStaff({
        staff_id: editingStaff.staff_id,
        name: editingStaff.name,
        position: editingStaff.position,
        outlet: editingStaff.outlet,
        area: editingStaff.area,
        wa_number: editingStaff.wa_number,
        role: formData.role,
        login_pin: formData.password || undefined,
        login_enabled: formData.login_enabled,
      });

      if (result.success) {
        toast({ title: "Berhasil", description: `Akses login ${editingStaff.name} berhasil diupdate` });
        loadStaff();
        setIsFormOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLogin = async (staff: Staff) => {
    try {
      const result = await updateStaff({
        staff_id: staff.staff_id,
        name: staff.name,
        position: staff.position,
        outlet: staff.outlet,
        area: staff.area,
        wa_number: staff.wa_number,
        role: staff.role,
        login_enabled: !(staff.login_enabled ?? false),
      });
      if (result.success) {
        toast({
          title: "Berhasil",
          description: `Login ${staff.name} ${staff.login_enabled ? "dinonaktifkan" : "diaktifkan"}`,
        });
        loadStaff();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const filtered = staffList.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.wa_number.includes(q) || s.outlet.toLowerCase().includes(q);
  });

  const activeLoginCount = staffList.filter((s) => s.login_enabled).length;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Manajemen User Login" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Summary */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Akses Login Staff</p>
              <p className="text-sm text-muted-foreground">
                {activeLoginCount} dari {staffList.length} staff aktif memiliki akses login
              </p>
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card className="p-3 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800 leading-relaxed">
            Aktifkan login untuk staff/leader yang perlu mengakses dashboard. Username default adalah nomor WA. 
            Password bisa diset di sini dan akan disimpan ke sheet via GAS action <code className="bg-blue-100 px-1 rounded">updateUserLogin</code>.
          </p>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, nomor WA, atau outlet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Staff List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Tidak ada staff ditemukan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((staff) => (
              <Card key={staff.staff_id} className={staff.status === "INACTIVE" ? "opacity-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-foreground">{staff.name}</span>
                        <Badge variant={roleBadgeVariant[staff.role]}>{roleLabels[staff.role]}</Badge>
                        {staff.login_enabled && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">
                            Login Aktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{staff.position} &mdash; {staff.outlet}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{staff.wa_number}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={staff.login_enabled ?? false}
                        onCheckedChange={() => handleToggleLogin(staff)}
                        aria-label={`Toggle login ${staff.name}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(staff)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Akses Login</DialogTitle>
            <DialogDescription>{editingStaff?.name} &mdash; {editingStaff?.outlet}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Nomor WA atau username khusus"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Default: nomor WhatsApp tanpa +</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Kosongkan jika tidak diubah"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role / Hak Akses</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as StaffRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff — hanya lihat tugas sendiri</SelectItem>
                  <SelectItem value="LEADER">Leader — kelola tugas outlet</SelectItem>
                  <SelectItem value="ADMIN">Admin — akses penuh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-foreground">Aktifkan Login</p>
                <p className="text-xs text-muted-foreground">Staff bisa login ke dashboard</p>
              </div>
              <Switch
                checked={formData.login_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, login_enabled: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
