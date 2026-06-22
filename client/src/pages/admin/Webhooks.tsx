import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Webhook, Plus, Trash2, Send, Edit, CheckCircle2, XCircle } from "lucide-react";

const EVENT_LABELS: Record<string, string> = {
  "receipt.created":   "إيصال جديد",
  "receipt.confirmed": "تأكيد الاستلام",
  "receipt.cancelled": "إلغاء إيصال",
  "receipt.expired":   "انتهاء الصلاحية",
};

const ALL_EVENTS = Object.keys(EVENT_LABELS) as any[];

function WebhookForm({ initial, onSave, onClose, isPending }: {
  initial?: any;
  onSave: (data: any) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    url: initial?.url ?? "",
    secret: "",
    events: (initial?.events ?? [...ALL_EVENTS]) as string[],
    isActive: initial?.isActive ?? true,
  });

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>الاسم *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: نظام ERP الداخلي" />
      </div>
      <div>
        <Label>رابط الـ Endpoint (URL) *</Label>
        <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://api.example.com/webhooks" dir="ltr" />
      </div>
      <div>
        <Label>المفتاح السري (اختياري)</Label>
        <Input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })}
          placeholder="سيُستخدم لتوقيع الطلب بـ HMAC-SHA256" dir="ltr" type="password" />
        <p className="text-xs text-slate-400 mt-1">
          إذا أدخلت مفتاحًا، سيُرسل header باسم X-Sudan-Signature مع كل طلب للتحقق من المصدر.
        </p>
      </div>
      <div>
        <Label className="mb-2 block">الأحداث المُشترَك بها *</Label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_EVENTS.map((ev) => (
            <button
              key={ev}
              onClick={() => toggleEvent(ev)}
              className={`text-right px-3 py-2 rounded-lg border text-sm transition-colors ${
                form.events.includes(ev)
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-slate-700 border-slate-300 hover:border-blue-400"
              }`}
            >
              {EVENT_LABELS[ev]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
        <Label>مُفعَّل</Label>
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button
          disabled={!form.name || !form.url || form.events.length === 0 || isPending}
          onClick={() => onSave(form)}
        >
          {isPending ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminWebhooks() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [editHook, setEditHook] = useState<any>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; status?: number; error?: string } | null>>({});

  const { data: hooks = [], isLoading } = trpc.webhook.getAll.useQuery(undefined, { enabled: !!user });

  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء Webhook"); utils.webhook.getAll.invalidate(); setShowCreate(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => { toast.success("تم التحديث"); utils.webhook.getAll.invalidate(); setEditHook(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => { toast.success("تم الحذف"); utils.webhook.getAll.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (result, vars) => {
      setTestResult((prev) => ({ ...prev, [vars.id]: result }));
      result.success ? toast.success(`✅ استجاب الـ endpoint بحالة ${result.status}`) : toast.error(`❌ فشل الاتصال (${result.status})`);
    },
    onError: (e: any, vars) => {
      setTestResult((prev) => ({ ...prev, [vars.id]: { success: false, error: e.message } }));
      toast.error("فشل الاتصال: " + e.message);
    },
  });

  if (!user) return null;

  return (
    <AdminLayout title="Webhooks — تكاملات خارجية" actions={
      <Button size="sm" onClick={() => setShowCreate(true)}>
        <Plus className="w-4 h-4 ml-1" />
        Webhook جديد
      </Button>
    }>
      {/* شرح المفهوم */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">🔗 ما هي Webhooks؟</p>
          <p>عند حدوث أحداث في النظام (إنشاء إيصال، تأكيد استلام، إلغاء...)، يُرسل النظام تلقائيًا طلب HTTP POST
          لعناوين URL التي تحددها هنا. هذا يسمح بالتكامل مع أي نظام خارجي (ERP، CRM، أتمتة، إشعارات مخصصة...)
          دون الحاجة لأي تعديل على هذا النظام.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-700" />
            Webhooks المُعرَّفة ({(hooks as any[]).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : (hooks as any[]).length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Webhook className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد webhooks بعد</p>
            </div>
          ) : (
            <div className="divide-y">
              {(hooks as any[]).map((h) => (
                <div key={h.id} className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{h.name}</span>
                        <Badge variant={h.isActive ? "default" : "secondary"}>
                          {h.isActive ? "نشط" : "معطّل"}
                        </Badge>
                        {testResult[h.id] && (
                          testResult[h.id]?.success
                            ? <span className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />نجح ({testResult[h.id]?.status})</span>
                            : <span className="text-xs text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" />فشل</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1 truncate" dir="ltr">{h.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {h.events.map((ev: string) => (
                          <Badge key={ev} variant="outline" className="text-xs">{EVENT_LABELS[ev] ?? ev}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" title="اختبار"
                        disabled={testMutation.isPending}
                        onClick={() => testMutation.mutate({ id: h.id })}>
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="تعديل" onClick={() => setEditHook(h)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500"
                        onClick={() => { if (confirm("حذف هذا Webhook؟")) deleteMutation.mutate({ id: h.id }); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payload Format */}
      <Card>
        <CardHeader><CardTitle className="text-sm">📋 شكل البيانات المُرسَلة (Payload)</CardTitle></CardHeader>
        <CardContent>
          <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto" dir="ltr">{`{
  "event": "receipt.created",
  "timestamp": 1718700000000,
  "receipt": {
    "id": 42,
    "notificationNumber": "SD12345001",
    "status": "pending_deposit",
    "amount": "500.00",
    "currencyCode": "USD",
    "payerName": "أحمد محمد",
    "payerPhone": "+249123456789",
    "createdAt": 1718700000000
  }
}`}</pre>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>إضافة Webhook جديد</DialogTitle></DialogHeader>
          <WebhookForm
            onSave={(data) => createMutation.mutate(data)}
            onClose={() => setShowCreate(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editHook && (
        <Dialog open={!!editHook} onOpenChange={() => setEditHook(null)}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader><DialogTitle>تعديل: {editHook.name}</DialogTitle></DialogHeader>
            <WebhookForm
              initial={editHook}
              onSave={(data) => updateMutation.mutate({ id: editHook.id, ...data })}
              onClose={() => setEditHook(null)}
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
