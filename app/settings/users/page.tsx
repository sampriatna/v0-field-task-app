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
import { getUsers, createUser, updateUser, deleteUser, getStaff } from "@/lib/api";
import type { UserLogin, CreateUserPayload, UpdateUserPayload, Staff, StaffRole } from "@/lib/types";
import {
  ShieldCheck,
  Pencil,
  Plus,
  Trash2,
  Users,
  Search,
  Eye,
  EyeOff,
  Phone,
} from "lucide-react";

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

type FormMode = "create" | "edit";

export default function UsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserLogin[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingUser, setEditingUser] = useState<UserLogin | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    staff_id: "",
    username: "",
    password: "",
    role: "STAFF" as StaffRole,
    login_enabled: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersResult, staffResult] = await Promise.all([getUsers(), getStaff()]);
      if (usersResult.success && usersResult.data) setUsers(usersResult.data);
      if (staffResult.success && staffResult.data) setStaffList(staffResult.data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingUser(null);
    setFormData({ staff_id: "", username: "", password: "", role: "STAFF", login_enabled: true });
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const openEdit = (user: UserLogin) => {
    setFormMode("edit");
    setEditingUser(user);
    setFormData({
      staff_id: user.staff_id,
      username: user.username,
      password: "",
      role: user.role,
      login_enabled: user.login_enabled,
    });
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const handleStaffSelect = (staffId: string) => {
    const staff = staffList.find((s) => s.staff_id === staffId);
    if (staff) {
      const username = staff.wa_number.replace(/\D/g, "");
      setFormData({
        ...formData,
        staff_id: staff.staff_id,
        username: username,
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.username.trim()) {
      toast({ title: "Error", description: "Username harus diisi", variant: "destructive" });
      return;
    }
    if (formMode === "create" && !formData.password.trim()) {
      toast({ title: "Error", description: "Password harus diisi untuk user baru", variant: "destructive" });
      return;
    }
    if (formMode === "create" && !formData.staff_id) {
      toast({ title: "Error", description: "Pilih staff terlebih dahulu", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (formMode === "create") {
        const payload: CreateUserPayload = {
          staff_id: formData.staff_id,
          username: formData.username.trim(),
          password: formData.password,
          role: formData.role,
          login_enabled: formData.login_enabled,
        };
        const result = await createUser(payload);
        if (!result.success) throw new Error(result.error);
        toast({ title: "Berhasil", description: "User login berhasil dibuat" });
      } else {
        if (!editingUser) return;
        const payload: UpdateUserPayload = {
          user_id: editingUser.user_id,
          username: formData.username.trim(),
          role: formData.role,
          login_enabled: formData.login_enabled,
        };
        if (formData.password.trim()) payload.password = formData.password;
        const result = await updateUser(payload);
        if (!result.success) throw new Error(result.error);
        toast({ title: "Berhasil", description: "User berhasil diupdate" });
      }
      loadData();
      setIsFormOpen(false);
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

  const handleToggle = async (user: UserLogin) => {
    try {
      const result = await updateUser({ user_id: user.user_id, login_enabled: !user.login_enabled });
      if (!result.success) throw new Error(result.error);
      toast({
        title: "Berhasil",
        description: `Login ${user.name || user.username} ${user.login_enabled ? "dinonaktifkan" : "diaktifkan"}`,
      });
      loadData();
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (user: UserLogin) => {
    if (!confirm(`Hapus akses login ${user.name || user.username}?`)) return;
    try {
      const result = await deleteUser(user.user_id);
      if (!result.success) throw new Error(result.error);
      toast({ title: "Berhasil", description: "User dihapus" });
      loadData();
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Gagal menghapus user",
        variant: "destructive",
      });
    }
  };

  const filtered = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.username || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.outlet || "").toLowerCase().includes(q)
    );
  });

  const activeCount = users.filter((u) => u.login_enabled).length;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Manajemen User Login" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-3xl mx-auto">

        {/* Summary */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Akses Login</p>
                <p className="text-sm text-muted-foreground">
                  {activeCount} dari {users.length} user aktif
                </p>
              </div>
            </div>
            <Button onClick={openCreate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Tambah User
            </Button>
          </div>
        </Card>

        {/* Info */}
        <Card className="p-3 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800 leading-relaxed">
            User login disimpan ke sheet via GAS actions{" "}
            <code className="bg-blue-100 px-1 rounded">getUsers</code>,{" "}
            <code className="bg-blue-100 px-1 rounded">createUser</code>,{" "}
            <code className="bg-blue-100 px-1 rounded">updateUser</code>.
            Login menggunakan <code className="bg-blue-100 px-1 rounded">loginUser</code>.
          </p>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari username, nama, atau outlet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User List */}
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
            <p className="text-muted-foreground font-medium">Belum ada user login</p>
            <p className="text-sm text-muted-foreground mt-1">Klik &quot;Tambah User&quot; untuk membuat akun pertama</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((user) => (
              <Card key={user.user_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-foreground">{user.name || user.username}</span>
                        <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                        {user.login_enabled ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">Nonaktif</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                        {user.outlet ? ` — ${user.outlet}` : ""}
                      </p>
                      {user.wa_number && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{user.wa_number}</span>
                        </div>
                      )}
                      {user.last_login && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Login terakhir: {new Date(user.last_login).toLocaleDateString("id-ID")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={user.login_enabled}
                        onCheckedChange={() => handleToggle(user)}
                        aria-label={`Toggle login ${user.username}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Tambah User Login" : "Edit User Login"}</DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Buat akun login baru untuk staff"
                : `Edit akun: ${editingUser?.name || editingUser?.username}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Staff picker — only for create */}
            {formMode === "create" && (
              <div className="space-y-2">
                <Label>Staff</Label>
                <Select value={formData.staff_id} onValueChange={handleStaffSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih staff..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList
                      .filter((s) => s.status === "ACTIVE")
                      .map((s) => (
                        <SelectItem key={s.staff_id} value={s.staff_id}>
                          {s.name} — {s.outlet}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Nomor WA atau username khusus"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Diisi otomatis dari nomor WA saat pilih staff</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {formMode === "create" ? "Password" : "Password Baru"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={formMode === "edit" ? "Kosongkan jika tidak diubah" : "Masukkan password..."}
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
                <p className="text-xs text-muted-foreground">User bisa login ke dashboard</p>
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
              {isSubmitting ? "Menyimpan..." : formMode === "create" ? "Buat User" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
