import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
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
import { Plus, Building2, Edit, BarChart2 } from "lucide-react";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

export default function AdminOffices() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [editOffice, setEditOffice] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", code: "", city: "", country: "السودان",
    phone: "", managerName: "", notes: "",
  });

  const utils = trpc.useUtils();

  const { data: offices = [], isLoading } = trpc.office.getAll.useQuery({});

  const createMutation = trpc.office.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء المكتب بنجاح");
      utils.office.getAll.invalidate();
      setShowCreate(false);
      setForm({ name: "", code: "", city: "", country: "السودان", phone: "", managerName: "", notes: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.office.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث المكتب");
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
    <div className="min-h-screen bg-slate-50" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <header className="bg-gradient-to-l from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="متجر السودان" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold">متجر السودان</h1>
              <p className="text-xs text-blue-200">إدارة المكاتب والوكلاء</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "الرئيسية", href: "/admin" },
              { label: "الإيصالات", href: "/admin/receipts" },
              { label: "المكاتب", href: "/admin/offices" },
              { label: "سجل التدقيق", href: "/admin/audit-log" },
            ].map((item) => (
              <button key={item.href} onClick={() => setLocation(item.href)}
                className="px-3 py-1.5 text-sm rounded-md hover:bg-white/20 transition-colors">
                {item.label}
              </button>
            ))}
          </nav>
          {user.role === "admin" && (
            <Button onClick={() => setShowCreate(true)} className="bg-white text-blue-800 hover:bg-blue-50">
              <Plus className="w-4 h-4 ml-1" />
              مكتب جديد
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              المكاتب والوكلاء ({offices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : offices.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">الكود</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">اسم المكتب</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">المدينة</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">المدير</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">الهاتف</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">الحالة</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(offices as any[]).map((o) => (
                      <tr key={o.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-blue-800 font-bold">{o.code}</td>
                        <td className="px-4 py-3 font-medium">{o.name}</td>
                        <td className="px-4 py-3 text-slate-600">{o.city || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{o.managerName || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{o.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={o.isActive ? "default" : "secondary"}>
                            {o.isActive ? "نشط" : "موقوف"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost"
                              onClick={() => setLocation(`/admin/offices/${o.id}`)}>
                              <BarChart2 className="w-4 h-4" />
                            </Button>
                            {user.role === "admin" && (
                              <Button size="sm" variant="ghost" onClick={() => setEditOffice({ ...o })}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد مكاتب بعد</p>
                {user.role === "admin" && (
                  <Button className="mt-4 bg-blue-700 hover:bg-blue-800" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة أول مكتب
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={LOGO_URL} alt="" className="h-8 w-auto" />
              إضافة مكتب / وكيل جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>اسم المكتب *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: مكتب الخرطوم" />
              </div>
              <div>
                <Label>كود المكتب *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="OFF-001" dir="ltr" />
              </div>
              <div>
                <Label>المدينة</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="الخرطوم" />
              </div>
              <div>
                <Label>الدولة</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+249..." dir="ltr" />
              </div>
              <div className="col-span-2">
                <Label>اسم المدير</Label>
                <Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                  placeholder="اسم مدير المكتب" />
              </div>
              <div className="col-span-2">
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="ملاحظات إضافية..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-blue-700 hover:bg-blue-800">
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء المكتب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editOffice && (
        <Dialog open={!!editOffice} onOpenChange={() => setEditOffice(null)}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل المكتب: {editOffice.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>اسم المكتب</Label>
                  <Input value={editOffice.name || ""} onChange={(e) => setEditOffice({ ...editOffice, name: e.target.value })} />
                </div>
                <div>
                  <Label>المدينة</Label>
                  <Input value={editOffice.city || ""} onChange={(e) => setEditOffice({ ...editOffice, city: e.target.value })} />
                </div>
                <div>
                  <Label>الدولة</Label>
                  <Input value={editOffice.country || ""} onChange={(e) => setEditOffice({ ...editOffice, country: e.target.value })} />
                </div>
                <div>
                  <Label>الهاتف</Label>
                  <Input value={editOffice.phone || ""} onChange={(e) => setEditOffice({ ...editOffice, phone: e.target.value })} dir="ltr" />
                </div>
                <div>
                  <Label>اسم المدير</Label>
                  <Input value={editOffice.managerName || ""} onChange={(e) => setEditOffice({ ...editOffice, managerName: e.target.value })} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <Switch checked={editOffice.isActive} onCheckedChange={(v) => setEditOffice({ ...editOffice, isActive: v })} />
                  <Label>المكتب نشط</Label>
                </div>
                <div className="col-span-2">
                  <Label>ملاحظات</Label>
                  <Textarea value={editOffice.notes || ""} onChange={(e) => setEditOffice({ ...editOffice, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setEditOffice(null)}>إلغاء</Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="bg-blue-700 hover:bg-blue-800">
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
