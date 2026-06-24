import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRight, FileText, User, Users, AlertTriangle } from "lucide-react";

export default function AdminTransferNew() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    payerName: "",
    payerPhone: "",
    payerCountry: "",
    beneficiaryName: "",
    beneficiaryPhone: "",
    beneficiaryId: "",
    amount: "",
    currencyCode: "USD",
    officeId: "",
    validityDays: "7",
    notes: "",
  });

  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const { data: offices = [] } = trpc.office.getAll.useQuery({ activeOnly: true });
  const { data: currencyList = [] } = trpc.currency.getAll.useQuery({ activeOnly: true });

  // تحديد العملات المسموح بها للمكتب المختار
  const selectedOffice = (offices as any[]).find((o) => String(o.id) === form.officeId);
  let allowedCurrencies: string[] = [];
  if (selectedOffice?.allowedCurrencies) {
    try { allowedCurrencies = JSON.parse(selectedOffice.allowedCurrencies); } catch {}
  }
  const filteredCurrencies = allowedCurrencies.length > 0
    ? (currencyList as any[]).filter((c) => allowedCurrencies.includes(c.code))
    : currencyList as any[];

  // عند تغيير المكتب: تحديث العملة إذا لم تعد مسموحة
  useEffect(() => {
    if (allowedCurrencies.length > 0 && !allowedCurrencies.includes(form.currencyCode)) {
      setForm((f) => ({ ...f, currencyCode: allowedCurrencies[0] || "USD" }));
    }
    // عرض حدود المكتب
    if (selectedOffice?.dailyLimit || selectedOffice?.monthlyLimit) {
      const parts = [];
      if (selectedOffice.dailyLimit) parts.push(`يومي: ${parseFloat(selectedOffice.dailyLimit).toLocaleString("ar-SA")}`);
      if (selectedOffice.monthlyLimit) parts.push(`شهري: ${parseFloat(selectedOffice.monthlyLimit).toLocaleString("ar-SA")}`);
      setLimitWarning(parts.join(" | "));
    } else {
      setLimitWarning(null);
    }
  }, [form.officeId]);

  const createMutation = trpc.receipt.create.useMutation({
    onSuccess: (receipt) => {
      toast.success(`تم إنشاء الإيصال: ${receipt.notificationNumber}`);
      setLocation(`/admin/transfers/${receipt.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.payerName || !form.amount || !form.officeId) {
      toast.error("يرجى ملء الحقول المطلوبة: اسم الدافع، المبلغ، المكتب");
      return;
    }
    createMutation.mutate({
      payerName: form.payerName,
      payerPhone: form.payerPhone || undefined,
      payerCountry: form.payerCountry || undefined,
      amount: form.amount,
      currencyCode: form.currencyCode,
      officeId: parseInt(form.officeId),
      validityDays: parseInt(form.validityDays) || 7,
      notes: form.notes || undefined,
    });
  };

  if (!user) return null;

  return (
    <AdminLayout title="إنشاء إيصال جديد">
      <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/transfers")} className="-mr-2">
        <ArrowRight className="w-4 h-4 ml-1" />
        رجوع إلى قائمة الإيصالات
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
        {/* بيانات الدافع */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-700" />
              بيانات الدافع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>الاسم الكامل *</Label>
              <Input value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })}
                placeholder="اسم الدافع الكامل" />
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <Input value={form.payerPhone} onChange={(e) => setForm({ ...form, payerPhone: e.target.value })}
                placeholder="+249..." dir="ltr" />
            </div>
            <div>
              <Label>الدولة</Label>
              <Input value={form.payerCountry} onChange={(e) => setForm({ ...form, payerCountry: e.target.value })}
                placeholder="السودان" />
            </div>
          </CardContent>
        </Card>

        {/* بيانات المستفيد */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-green-700" />
              بيانات المستفيد
              <Badge variant="outline" className="text-xs font-normal">اختياري</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>اسم المستفيد</Label>
              <Input value={form.beneficiaryName} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                placeholder="من سيستلم المبلغ" />
            </div>
            <div>
              <Label>هاتف المستفيد</Label>
              <Input value={form.beneficiaryPhone} onChange={(e) => setForm({ ...form, beneficiaryPhone: e.target.value })}
                placeholder="+249..." dir="ltr" />
            </div>
            <div>
              <Label>رقم الهوية / جواز السفر</Label>
              <Input value={form.beneficiaryId} onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })}
                placeholder="رقم الهوية الوطنية أو جواز السفر" dir="ltr" />
            </div>
          </CardContent>
        </Card>

        {/* بيانات الإيصال */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700" />
              بيانات الإيصال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>المكتب / الوكيل المستلم *</Label>
                <Select value={form.officeId} onValueChange={(v) => setForm({ ...form, officeId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المكتب..." /></SelectTrigger>
                  <SelectContent>
                    {(offices as any[]).map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name} {o.city ? `— ${o.city}` : ""}
                        {o.allowedCurrencies ? ` (${JSON.parse(o.allowedCurrencies).join(",")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {limitWarning && (
                  <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    حدود المكتب: {limitWarning}
                  </p>
                )}
              </div>
              <div>
                <Label>المبلغ *</Label>
                <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" type="number" min="0" step="0.01" dir="ltr" />
              </div>
              <div>
                <Label>العملة *</Label>
                <Select value={form.currencyCode} onValueChange={(v) => setForm({ ...form, currencyCode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {filteredCurrencies.map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} {c.name && c.name !== c.code ? `— ${c.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allowedCurrencies.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    هذا المكتب يقبل: {allowedCurrencies.join("، ")} فقط
                  </p>
                )}
              </div>
              <div>
                <Label>مدة الصلاحية (أيام)</Label>
                <Input value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
                  type="number" min="1" max="365" dir="ltr" />
              </div>
              <div className="sm:col-span-2">
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..." rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4 mt-4 border-t">
              <Button variant="outline" onClick={() => setLocation("/admin/transfers")}>إلغاء</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الإيصال"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
