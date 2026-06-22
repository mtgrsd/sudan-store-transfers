import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palette, Eye, Save, RefreshCw } from "lucide-react";
import TransferReceipt from "@/components/TransferReceipt";

const TEMPLATE_KEYS = [
  "company_name", "company_phone", "company_email",
  "company_address", "company_logo_url",
  "brand_primary_color", "receipt_footer_text",
  "receipt_expiry_days", "receipt_prefix",
];

const FIELD_META: Record<string, { label: string; placeholder: string; type?: string; hint?: string }> = {
  company_name:       { label: "اسم الشركة", placeholder: "متجر السودان" },
  company_phone:      { label: "رقم الهاتف", placeholder: "+249..." },
  company_email:      { label: "البريد الإلكتروني", placeholder: "info@company.com" },
  company_address:    { label: "العنوان", placeholder: "الخرطوم، السودان" },
  company_logo_url:   { label: "رابط الشعار (URL)", placeholder: "https://...", hint: "يجب أن يكون متاحًا للعموم (HTTPS)" },
  brand_primary_color:{ label: "اللون الأساسي", placeholder: "#1a2e6b", type: "color", hint: "يؤثر على عنوان الإيصال والقيم" },
  receipt_footer_text:{ label: "نص التذييل", placeholder: "شكراً لاستخدام خدماتنا" },
  receipt_expiry_days:{ label: "صلاحية الإيصال (أيام)", placeholder: "7", type: "number" },
  receipt_prefix:     { label: "بادئة رقم الإيصال", placeholder: "SD", hint: "مثال: SD يعطي SD20240001" },
};

const DEMO_RECEIPT = {
  notificationNumber: "SD12345001",
  secretCode: "827461",
  amount: "500.00",
  currencyCode: "USD",
  status: "pending_deposit" as const,
  createdAt: new Date().toISOString(),
  senderName: "أحمد محمد علي",
  agentName: "مكتب الخرطوم",
  beneficiaryName: "فاطمة عبدالله",
  notes: "تحويل عائلي",
};

export default function AdminReceiptTemplate() {
  const utils = trpc.useUtils();
  const { data: settingsData, isLoading } = trpc.settings.getAll.useQuery();
  const setMutation = trpc.settings.set.useMutation({
    onSuccess: () => { utils.settings.getAll.invalidate(); },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsData) {
      const initial: Record<string, string> = {};
      for (const k of TEMPLATE_KEYS) initial[k] = settingsData[k] ?? "";
      setForm(initial);
      setDirty({});
    }
  }, [settingsData]);

  const handleChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty((d) => ({ ...d, [key]: true }));
  };

  const handleSaveAll = async () => {
    const changed = Object.entries(dirty).filter(([, v]) => v).map(([k]) => k);
    if (changed.length === 0) { toast.info("لا توجد تغييرات للحفظ"); return; }
    setSaving(true);
    try {
      await Promise.all(changed.map((k) => setMutation.mutateAsync({ key: k, value: form[k] })));
      setDirty({});
      toast.success(`تم حفظ ${changed.length} إعداد بنجاح`);
    } catch (e: any) {
      toast.error("فشل الحفظ: " + e.message);
    } finally { setSaving(false); }
  };

  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  return (
    <AdminLayout
      title="تخصيص قالب الإيصال"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 ml-1" />
            {showPreview ? "إخفاء المعاينة" : "معاينة"}
          </Button>
          <Button size="sm" onClick={handleSaveAll} disabled={saving || dirtyCount === 0}>
            {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
            حفظ {dirtyCount > 0 ? `(${dirtyCount})` : ""}
          </Button>
        </div>
      }
    >
      <div className={`grid grid-cols-1 ${showPreview ? "lg:grid-cols-2" : ""} gap-5`}>
        {/* الإعدادات */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-700" />
                هوية الشركة والإيصال
              </CardTitle>
              <p className="text-xs text-slate-500">
                هذه الإعدادات تظهر في كل إيصال مطبوع أو مصدَّر بصيغة PDF.
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {TEMPLATE_KEYS.map((key) => {
                    const meta = FIELD_META[key];
                    if (!meta) return null;
                    const changed = dirty[key];
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-sm font-medium">{meta.label}</Label>
                          {changed && <Badge variant="secondary" className="text-xs">معدَّل</Badge>}
                        </div>
                        {meta.hint && <p className="text-xs text-slate-400 mb-1">{meta.hint}</p>}
                        {key === "receipt_footer_text" ? (
                          <Textarea
                            value={form[key] ?? ""}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder={meta.placeholder}
                            rows={2}
                          />
                        ) : meta.type === "color" ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={form[key] || "#1a2e6b"}
                              onChange={(e) => handleChange(key, e.target.value)}
                              className="h-10 w-16 rounded border cursor-pointer"
                            />
                            <Input
                              value={form[key] ?? ""}
                              onChange={(e) => handleChange(key, e.target.value)}
                              placeholder={meta.placeholder}
                              dir="ltr"
                              className="font-mono flex-1"
                            />
                          </div>
                        ) : (
                          <Input
                            type={meta.type || "text"}
                            value={form[key] ?? ""}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder={meta.placeholder}
                            dir={key === "company_logo_url" || key === "brand_primary_color" ? "ltr" : undefined}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* شعار مرفوع */}
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-700 mb-1">💡 نصيحة: رفع الشعار</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                لرفع شعار الشركة: ارفعه على أي خدمة استضافة صور (مثل Imgur، Cloudinary، أو مجلد /public في مشروعك)،
                ثم ضع رابط الصورة المباشر في حقل "رابط الشعار" أعلاه. تأكد من أن الرابط يبدأ بـ https:// ومتاح للعموم.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* معاينة الإيصال */}
        {showPreview && (
          <div>
            <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              معاينة مباشرة — كيف سيبدو الإيصال بعد التخصيص
            </p>
            <div className="border rounded-xl overflow-hidden shadow-md scale-90 origin-top">
              <TransferReceipt transfer={DEMO_RECEIPT} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
