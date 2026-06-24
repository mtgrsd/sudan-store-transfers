"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Users, Building2, KeyRound, Shield, Plus, UserX, UserCheck } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "مدير عام", color: "bg-purple-100 text-purple-800" },
  admin:       { label: "مدير النظام", color: "bg-blue-100 text-blue-800" },
  employee:    { label: "موظف", color: "bg-slate-100 text-slate-700" },
  agent:       { label: "وكيل", color: "bg-green-100 text-green-800" },
};

export default function AdminUsers() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "agent" as any, phone: "" });
  const [editUser, setEditUser] = useState<any>(null);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newOfficeId, setNewOfficeId] = useState<string>("none");

  const { data: users = [], isLoading: usersLoading } = trpc.user.getAll.useQuery(undefined, { enabled: !!user });
  const { data: offices = [] } = trpc.office.getAll.useQuery({});

  const createMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المستخدم بنجاح");
      utils.user.getAll.invalidate();
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "agent", phone: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rolesMutation = trpc.user.updateRole.useMutation({
    onSuccess: () => { toast.success("تم تحديث الدور"); utils.user.getAll.invalidate(); setEditUser(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const linkMutation = trpc.user.linkToOffice.useMutation({
    onSuccess: () => { toast.success("تم ربط المكتب"); utils.user.getAll.invalidate(); setEditUser(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = trpc.user.toggleActive.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
      utils.user.getAll.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetMutation = trpc.user.resetUserPassword.useMutation({
    onSuccess: () => { toast.success("تم تغيير كلمة المرور"); setResetTarget(null); setNewPassword(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (u: any) => {
    setEditUser(u);
    setNewRole(u.role);
    setNewOfficeId(u.linkedOffice ? String(u.linkedOffice.id) : "none");
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    const roleChanged = newRole !== editUser.role;
    const officeChanged = newOfficeId !== (editUser.linkedOffice ? String(editUser.linkedOffice.id) : "none");
    if (roleChanged) rolesMutation.mutate({ userId: editUser.id, role: newRole as any });
    if (officeChanged) linkMutation.mutate({ userId: editUser.id, officeId: newOfficeId !== "none" ? parseInt(newOfficeId) : 0 });
    if (!roleChanged && !officeChanged) setEditUser(null);
  };

  if (!user) return null;

  return (
    <AdminLayout
      title="إدارة المستخدمين"
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 ml-1" />
          مستخدم جديد
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            المستخدمون ({(users as any[]).length})
          </CardTitle>
          <p className="text-xs text-slate-500">
            حدد دور كل مستخدم واربط حسابات الوكلاء بمكاتبهم.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الاسم</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">البريد</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الدور</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">المكتب المرتبط</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">آخر دخول</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(users as any[]).map((u) => {
                    const roleInfo = ROLE_LABELS[u.role] ?? { label: u.role, color: "bg-slate-100 text-slate-700" };
                    return (
                      <tr key={u.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{u.name || "—"}</div>
                          {u.phone && <div className="text-xs text-slate-400">{u.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{u.email || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.linkedOffice ? (
                            <span className="flex items-center gap-1 text-xs text-blue-800 font-medium">
                              <Building2 className="w-3 h-3" />
                              {u.linkedOffice.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {u.role === "agent" ? "⚠️ غير مربوط بمكتب" : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("ar-SA") : "لم يسجل دخول"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {u.id !== user.id && (
                              <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="تعديل الدور والمكتب">
                                <Shield className="w-4 h-4" />
                              </Button>
                            )}
                            {u.id !== user.id && (
                              <Button size="sm" variant="ghost" onClick={() => { setResetTarget(u); setNewPassword(""); }} title="إعادة تعيين كلمة المرور">
                                <KeyRound className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: تعديل الدور والمكتب */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل المستخدم: {editUser.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الدور</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير النظام</SelectItem>
                    <SelectItem value="employee">موظف</SelectItem>
                    <SelectItem value="agent">وكيل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(newRole === "agent" || editUser.role === "agent") && (
                <div>
                  <Label>ربط بمكتب</Label>
                  <Select value={newOfficeId} onValueChange={setNewOfficeId}>
                    <SelectTrigger><SelectValue placeholder="اختر مكتبًا..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون ربط —</SelectItem>
                      {(offices as any[]).map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name} ({o.code})
                          {o.userId && o.userId !== editUser.id ? " ⚠️ مرتبط بمستخدم آخر" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1">
                    ربط المكتب يسمح للمستخدم برؤية إيصالاته والتأكيد عليها
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setEditUser(null)}>إلغاء</Button>
                <Button onClick={handleSaveEdit} disabled={rolesMutation.isPending || linkMutation.isPending}>
                  {(rolesMutation.isPending || linkMutation.isPending) ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: إعادة تعيين كلمة المرور */}
      {resetTarget && (
        <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>🔑 إعادة تعيين كلمة المرور</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                إعادة تعيين كلمة مرور: <strong>{resetTarget.name || resetTarget.email}</strong>
              </p>
              <div>
                <Label>كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setResetTarget(null)}>إلغاء</Button>
                <Button
                  disabled={newPassword.length < 6 || resetMutation.isPending}
                  onClick={() => resetMutation.mutate({ userId: resetTarget.id, newPassword })}
                >
                  {resetMutation.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: إنشاء مستخدم جديد */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div>
              <Label>كلمة المرور</Label>
              <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="6 أحرف على الأقل" />
            </div>
            <div>
              <Label>الدور</Label>
              <Select value={createForm.role} onValueChange={(role) => setCreateForm({ ...createForm, role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير النظام</SelectItem>
                  <SelectItem value="employee">موظف</SelectItem>
                  <SelectItem value="agent">وكيل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>رقم الهاتف (اختياري)</Label>
              <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
              <Button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending || !createForm.name || !createForm.email || !createForm.password}>
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
