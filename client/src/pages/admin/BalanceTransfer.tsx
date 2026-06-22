import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeftRight, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AdminBalanceTransfer() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    fromOfficeId: "",
    toOfficeId: "",
    currencyCode: "USD",
    amount: "",
    notes: "",
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<{ fromBalance: string; toBalance: string } | null>(null);

  const { data: offices = [], isLoading: officesLoading } = trpc.office.getAllWithBalances.useQuery({});
  const { data: currencyList = [] } = trpc.currency.getAll.useQuery({ activeOnly: true });

  const transferMutation = trpc.office.transferBalance.useMutation({
    onSuccess: (result) => {
      toast.success("تم نقل الرصيد بنجاح");
      setLastResult(result);
      setShowConfirm(false);
      setForm({ fromOfficeId: "", toOfficeId: "", currencyCode: "USD", amount: "", notes: "" });
      utils.office.getAllWithBalances.invalidate();
      utils.office.getAll.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const fromOffice = (offices as any[]).find((o) => String(o.id) === form.fromOfficeId);
  const toOffice = (offices as any[]).find((o) => String(o.id) === form.toOfficeId);

  const fromBalance = fromOffice?.balances?.find((b: any) => b.currencyCode === form.currencyCode);
  const fromBalanceNum = parseFloat(fromBalance?.balance ?? "0");
  const amountNum = parseFloat(form.amount || "0");
  const insufficient = amountNum > 0 && fromBalanceNum < amountNum;

  const canSubmit = form.fromOfficeId && form.toOfficeId
    && form.fromOfficeId !== form.toOfficeId
    && form.amount && amountNum > 0 && !insufficient;

  if (!user) return null;

  return (
    <AdminLayout title="نقل الرصيد بين المكاتب">
      <div className="max-w-2xl space-y-5">
        {/* نموذج النقل */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-700" />
              تفاصيل النقل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>المكتب المصدر (من) *</Label>
                <Select value={form.fromOfficeId} onValueChange={(v) => setForm({ ...form, fromOfficeId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المكتب..." /></SelectTrigger>
                  <SelectContent>
                    {(offices as any[]).filter((o) => o.isActive).map((o) => (
                      <SelectItem key={o.id} value={String(o.id)} disabled={String(o.id) === form.toOfficeId}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fromOffice && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-600">الأرصدة الحالية:</p>
                    {fromOffice.balances?.length ? fromOffice.balances.map((b: any) => (
                      <span key={b.currencyCode} className="ml-2 font-mono">
                        {parseFloat(b.balance).toLocaleString("ar-SA")} {b.currencyCode}
                      </span>
                    )) : <span className="text-slate-400">لا أرصدة</span>}
                  </div>
                )}
              </div>

              <div>
                <Label>المكتب المستهدف (إلى) *</Label>
                <Select value={form.toOfficeId} onValueChange={(v) => setForm({ ...form, toOfficeId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المكتب..." /></SelectTrigger>
                  <SelectContent>
                    {(offices as any[]).filter((o) => o.isActive).map((o) => (
                      <SelectItem key={o.id} value={String(o.id)} disabled={String(o.id) === form.fromOfficeId}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {toOffice && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-600">الأرصدة الحالية:</p>
                    {toOffice.balances?.length ? toOffice.balances.map((b: any) => (
                      <span key={b.currencyCode} className="ml-2 font-mono">
                        {parseFloat(b.balance).toLocaleString("ar-SA")} {b.currencyCode}
                      </span>
                    )) : <span className="text-slate-400">لا أرصدة</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>المبلغ *</Label>
                <Input
                  type="number" min="0" step="0.01" dir="ltr"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className={insufficient ? "border-red-400" : ""}
                />
                {insufficient && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    رصيد غير كافٍ ({fromBalanceNum.toLocaleString("ar-SA")} {form.currencyCode})
                  </p>
                )}
                {fromBalance && amountNum > 0 && !insufficient && (
                  <p className="text-xs text-green-700 mt-1">
                    الرصيد بعد النقل: {(fromBalanceNum - amountNum).toLocaleString("ar-SA")} {form.currencyCode}
                  </p>
                )}
              </div>
              <div>
                <Label>العملة *</Label>
                <Select value={form.currencyCode} onValueChange={(v) => setForm({ ...form, currencyCode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(currencyList as any[]).map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="سبب النقل أو ملاحظات إضافية..."
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              disabled={!canSubmit}
              onClick={() => setShowConfirm(true)}
            >
              <ArrowLeftRight className="w-4 h-4 ml-2" />
              متابعة — مراجعة وتأكيد النقل
            </Button>
          </CardContent>
        </Card>

        {/* آخر عملية ناجحة */}
        {lastResult && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                <CheckCircle2 className="w-5 h-5" />
                تم النقل بنجاح
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>رصيد {fromOffice?.name ?? "المصدر"} الجديد: <strong>{parseFloat(lastResult.fromBalance).toLocaleString("ar-SA")}</strong></p>
                <p>رصيد {toOffice?.name ?? "الوجهة"} الجديد: <strong>{parseFloat(lastResult.toBalance).toLocaleString("ar-SA")}</strong></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* أرصدة كل المكاتب */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-700" />
              أرصدة كل المكاتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            {officesLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right px-4 py-2 font-semibold text-slate-600">المكتب</th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-600">الأرصدة</th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-600">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(offices as any[]).map((o) => (
                      <tr key={o.id} className="border-b">
                        <td className="px-4 py-2">
                          <div className="font-medium">{o.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{o.code}</div>
                        </td>
                        <td className="px-4 py-2">
                          {o.balances?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {o.balances.map((b: any) => (
                                <Badge key={b.currencyCode} variant="outline" className="font-mono text-xs">
                                  {parseFloat(b.balance).toLocaleString("ar-SA")} {b.currencyCode}
                                </Badge>
                              ))}
                            </div>
                          ) : <span className="text-xs text-slate-400">لا أرصدة</span>}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={o.isActive ? "default" : "secondary"}>
                            {o.isActive ? "نشط" : "موقوف"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: تأكيد النقل */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>⚠️ تأكيد نقل الرصيد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              هذه العملية لا يمكن التراجع عنها. تحقق من التفاصيل قبل المتابعة.
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">من:</span><strong>{fromOffice?.name}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">إلى:</span><strong>{toOffice?.name}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">المبلغ:</span>
                <strong className="text-blue-800 font-mono">{parseFloat(form.amount || "0").toLocaleString("ar-SA")} {form.currencyCode}</strong>
              </div>
              {form.notes && <div className="flex justify-between"><span className="text-slate-500">ملاحظات:</span><span className="text-right max-w-[60%]">{form.notes}</span></div>}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>إلغاء</Button>
              <Button
                className="flex-1"
                disabled={transferMutation.isPending}
                onClick={() => transferMutation.mutate({
                  fromOfficeId: parseInt(form.fromOfficeId),
                  toOfficeId: parseInt(form.toOfficeId),
                  currencyCode: form.currencyCode,
                  amount: form.amount,
                  notes: form.notes || undefined,
                })}
              >
                {transferMutation.isPending ? "جاري النقل..." : "تأكيد النقل"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
