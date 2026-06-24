import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Coins, Trash2, Save } from "lucide-react";

export default function AdminCurrencies() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: currencyList = [], isLoading } = trpc.currency.getAll.useQuery({});

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ code: "", name: "", symbol: "", exchangeRateToBase: "1" });
  const [editedRates, setEditedRates] = useState<Record<string, string>>({});

  const createMutation = trpc.currency.create.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة العملة");
      utils.currency.getAll.invalidate();
      setShowCreate(false);
      setCreateForm({ code: "", name: "", symbol: "", exchangeRateToBase: "1" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.currency.update.useMutation({
    onSuccess: () => { toast.success("تم الحفظ"); utils.currency.getAll.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.currency.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف العملة"); utils.currency.getAll.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  if (!user) return null;
  const isAdmin = user.role === "admin" || user.role === "super_admin";

  const handleSaveRate = (code: string) => {
    const rate = editedRates[code];
    if (!rate) return;
    updateMutation.mutate({ code, name: rate });
    setEditedRates((prev) => { const c = { ...prev }; delete c[code]; return c; });
  };

  return (
    <AdminLayout
      title="العملات وأسعار الصرف"
      actions={isAdmin ? (
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 ml-1" />
          عملة جديدة
        </Button>
      ) : undefined}
    >
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 text-sm text-amber-800">
          ⚠️ سعر الصرف هنا هو قيمة مرجعية اختيارية لاستخدامها داخليًا في التقارير (مثلاً لتحويل كل العملات لعملة أساس).
          هذا الحقل لا يُغيّر تلقائيًا أي مبلغ في الإيصالات الحالية أو القادمة.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-700" />
            العملات المتاحة ({currencyList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الكود</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الاسم</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الرمز</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">سعر الصرف المرجعي</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">نشطة</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-semibold text-slate-600">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {currencyList.map((c: any) => (
                    <tr key={c.code} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-800">{c.code}</td>
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3">{c.symbol || "—"}</td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="w-28 h-8"
                              value={editedRates[c.code] ?? c.exchangeRateToBase}
                              onChange={(e) => setEditedRates((prev) => ({ ...prev, [c.code]: e.target.value }))}
                              dir="ltr"
                            />
                            {editedRates[c.code] !== undefined && editedRates[c.code] !== c.exchangeRateToBase && (
                              <Button size="sm" variant="ghost" onClick={() => handleSaveRate(c.code)}>
                                <Save className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono">{c.exchangeRateToBase}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <Switch
                            checked={c.isActive}
                            onCheckedChange={(v) => updateMutation.mutate({ code: c.code, name: c.name })}
                          />
                        ) : (
                          <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "نشطة" : "متوقفة"}</Badge>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <Button
                            size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`حذف العملة ${c.code}؟ سيفشل الحذف إذا كانت مستخدمة في إيصالات سابقة.`)) {
                                deleteMutation.mutate({ code: c.code });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة عملة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>كود العملة (3 أحرف) *</Label>
              <Input value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                placeholder="مثال: EGP" dir="ltr" maxLength={10} />
            </div>
            <div>
              <Label>اسم العملة *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="جنيه مصري" />
            </div>
            <div>
              <Label>الرمز</Label>
              <Input value={createForm.symbol} onChange={(e) => setCreateForm({ ...createForm, symbol: e.target.value })}
                placeholder="ج.م" />
            </div>
            <div>
              <Label>سعر الصرف المرجعي</Label>
              <Input value={createForm.exchangeRateToBase} onChange={(e) => setCreateForm({ ...createForm, exchangeRateToBase: e.target.value })}
                dir="ltr" />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
              <Button
                disabled={!createForm.code || !createForm.name || createMutation.isPending}
                onClick={() => createMutation.mutate(createForm)}
              >
                {createMutation.isPending ? "جاري الإضافة..." : "إضافة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
