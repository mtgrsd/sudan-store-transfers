"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Building2, Edit, BarChart2, Settings2, AlertTriangle, Clock } from "lucide-react";

export default function AdminOffices() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [editOffice, setEditOffice] = useState<any>(null);
  const [limitsOffice, setLimitsOffice] = useState<any>(null);
  const [limitsForm, setLimitsForm] = useState({
    allowedCurrencies: [] as string[],
    dailyLimit: "",
    monthlyLimit: "",
    notifyPhone: "",
  });
  const [form, setForm] = useState({
    name: "", code: "", city: "", country: "السودان",
    phone: "", managerName: "", notes: "",
  });

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const utils = trpc.useUtils();

  const { data: offices = [], isLoading } = trpc.office.getAllWithBalances.useQuery({});
  const { data: currencyList = [] } = trpc.currency.getAll.useQuery({});
  const { data: expiringReceipts = [] } = trpc.office.getExpiringReceipts.useQuery({});

  const createMutation = trpc.office.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المكتب بنجاح");
      utils.office.getAllWithBalances.invalidate();
      utils.office.getAll.invalidate();
      setShowCreate(false);
      setForm({ name: "", code: "", city: "", country: "السودان", phone: "", managerName: "", notes: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.office.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المكتب");
      utils.office.getAllWithBalances.invalidate();
      utils.office.getAll.invalidate();
      setEditOffice(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.name || !form.code) {
      toast.error("اسم المكتب والكود مطلوبان");
      return;
    }
    createMutation.mutate({ ...form });
  };

  const handleUpdate = () => {
    if (!editOffice) return;
    updateMutation.mutate({
      id: editOffice.id,
      name: editOffice.name,
      city: editOffice.city,
      country: editOffice.country,
      phone: editOffice.phone,
      managerName: editOffice.managerName,
      isActive: editOffice.isActive,
      notes: editOffice.notes,
    });
  };

  if (!user) return null;

  return (
    <AdminLayout
      title="إدارة المكاتب والوكلاء"
      actions={
        isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 ml-1" />
            مكتب جديد
          </Button>
        )
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المكاتب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المكاتب النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offices.filter((o: any) => o.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إيصالات منتهية الصلاحية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringReceipts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offices.reduce((sum: number, o: any) => sum + (o.totalBalance || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المكاتب</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : offices.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              لا توجد مكاتب. <button className="text-blue-600 hover:underline" onClick={() => setShowCreate(true)}>أنشئ واحداً الآن</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-right py-2">الاسم</th>
                    <th className="text-right py-2">الكود</th>
                    <th className="text-right py-2">المدينة</th>
                    <th className="text-right py-2">الهاتف</th>
                    <th className="text-right py-2">الحالة</th>
                    <th className="text-right py-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {offices.map((office: any) => (
                    <tr key={office.id} className="border-b hover:bg-slate-50">
                      <td className="py-3">{office.name}</td>
                      <td className="py-3">{office.code}</td>
                      <td className="py-3">{office.city}</td>
                      <td className="py-3">{office.phone}</td>
                      <td className="py-3">
                        <Badge variant={office.isActive ? "default" : "secondary"}>
                          {office.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {isAdmin && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditOffice(office)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setLocation(`/admin/offices/${office.id}`)}>
                                <BarChart2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء مكتب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المكتب</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الكود</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>المدينة</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>اسم المدير</Label>
              <Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "جاري..." : "إنشاء"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editOffice && (
        <Dialog open={!!editOffice} onOpenChange={() => setEditOffice(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحديث المكتب</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم المكتب</Label>
                <Input value={editOffice.name} onChange={(e) => setEditOffice({ ...editOffice, name: e.target.value })} />
              </div>
              <div>
                <Label>المدينة</Label>
                <Input value={editOffice.city} onChange={(e) => setEditOffice({ ...editOffice, city: e.target.value })} />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input value={editOffice.phone} onChange={(e) => setEditOffice({ ...editOffice, phone: e.target.value })} />
              </div>
              <div>
                <Label>اسم المدير</Label>
                <Input value={editOffice.managerName} onChange={(e) => setEditOffice({ ...editOffice, managerName: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editOffice.isActive} onCheckedChange={(checked) => setEditOffice({ ...editOffice, isActive: checked })} />
                <Label>نشط</Label>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea value={editOffice.notes} onChange={(e) => setEditOffice({ ...editOffice, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "جاري..." : "تحديث"}
                </Button>
                <Button variant="outline" onClick={() => setEditOffice(null)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
