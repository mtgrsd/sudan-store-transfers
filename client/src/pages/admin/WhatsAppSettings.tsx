import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowRight, MessageCircle, Send, Save, ShieldCheck } from "lucide-react";

export default function AdminWhatsAppSettings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: config, isLoading } = trpc.whatsapp.getConfig.useQuery(undefined, { enabled: !!user });

  const [form, setForm] = useState({
    whatsapp_enabled: "false",
    whatsapp_phone_number_id: "",
    whatsapp_access_token: "",
    whatsapp_business_account_id: "",
    whatsapp_notify_on_create: "false",
    whatsapp_notify_on_received: "false",
  });
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    if (config) {
      setForm({
        whatsapp_enabled: config.whatsapp_enabled || "false",
        whatsapp_phone_number_id: config.whatsapp_phone_number_id || "",
        whatsapp_access_token: config.whatsapp_access_token || "",
        whatsapp_business_account_id: config.whatsapp_business_account_id || "",
        whatsapp_notify_on_create: config.whatsapp_notify_on_create || "false",
        whatsapp_notify_on_received: config.whatsapp_notify_on_received || "false",
      });
    }
  }, [config]);

  const saveMutation = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => { toast.success("تم حفظ إعدادات واتساب"); utils.whatsapp.getConfig.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const testMutation = trpc.whatsapp.sendTest.useMutation({
    onSuccess: () => toast.success("تم إرسال الرسالة التجريبية بنجاح"),
    onError: (err: any) => toast.error("فشل الإرسال: " + err.message),
  });

  if (!user) return null;

  return (
    <AdminLayout title="إعدادات واتساب">
      <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/settings")} className="-mr-2">
        <ArrowRight className="w-4 h-4 ml-1" />
        رجوع لإعدادات النظام
      </Button>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  تكامل WhatsApp Business Cloud API
                </CardTitle>
                <p className="text-xs text-slate-500">
                  يُستخدم لإرسال إشعارات تلقائية للعملاء عند إنشاء الإيصال وعند تأكيد استلامه. يتطلب حساب WhatsApp Business API من Meta.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 border rounded-lg p-3">
                  <div>
                    <Label className="font-semibold">تفعيل إشعارات واتساب</Label>
                    <p className="text-xs text-slate-500">إيقاف هذا الخيار يوقف جميع رسائل واتساب فورًا</p>
                  </div>
                  <Switch
                    checked={form.whatsapp_enabled === "true"}
                    onCheckedChange={(v) => setForm({ ...form, whatsapp_enabled: v ? "true" : "false" })}
                  />
                </div>

                <div>
                  <Label>Phone Number ID</Label>
                  <Input value={form.whatsapp_phone_number_id} onChange={(e) => setForm({ ...form, whatsapp_phone_number_id: e.target.value })}
                    placeholder="من Meta Business Suite" dir="ltr" />
                </div>
                <div>
                  <Label>Access Token</Label>
                  <Input
                    type="password"
                    value={form.whatsapp_access_token}
                    onChange={(e) => setForm({ ...form, whatsapp_access_token: e.target.value })}
                    placeholder="●●●●●●●● (اتركه بدون تغيير للحفاظ على القيمة الحالية)"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>Business Account ID (اختياري)</Label>
                  <Input value={form.whatsapp_business_account_id} onChange={(e) => setForm({ ...form, whatsapp_business_account_id: e.target.value })} dir="ltr" />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label>إشعار عند إنشاء إيصال جديد</Label>
                    <Switch checked={form.whatsapp_notify_on_create === "true"}
                      onCheckedChange={(v) => setForm({ ...form, whatsapp_notify_on_create: v ? "true" : "false" })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>إشعار عند تأكيد استلام الإيداع</Label>
                    <Switch checked={form.whatsapp_notify_on_received === "true"}
                      onCheckedChange={(v) => setForm({ ...form, whatsapp_notify_on_received: v ? "true" : "false" })} />
                  </div>
                </div>

                <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 ml-1" />
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" />إرسال رسالة تجريبية</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+249..." dir="ltr" />
                </div>
                <Button
                  variant="outline" className="w-full"
                  disabled={!testPhone || testMutation.isPending}
                  onClick={() => testMutation.mutate({ phoneNumber: testPhone })}
                >
                  {testMutation.isPending ? "جاري الإرسال..." : "إرسال رسالة تجريبية"}
                </Button>
                <p className="text-xs text-slate-400">
                  يجب حفظ الإعدادات أعلاه أولًا قبل التجربة.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-0">
              <CardContent className="p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> ملاحظة أمان</p>
                <p>يُمكن أيضًا ضبط Access Token كمتغير بيئة (Environment Variable) باسم WHATSAPP_ACCESS_TOKEN في Railway بدل حفظه هنا، وله الأولوية إن وُجد.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
