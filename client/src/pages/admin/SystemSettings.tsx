import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, DollarSign, Building2, Info, Save, RefreshCw } from "lucide-react";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

const DEFAULT_SETTINGS: Record<string, string> = {
  // معلومات الشركة
  company_name: "متجر السودان",
  company_phone: "",
  company_email: "",
  company_address: "",
  company_whatsapp: "",
  // العملات المدعومة
  supported_currencies: "SDG,USD,SAR,AED,EGP",
  default_currency: "SDG",
  // إعدادات الإيصال
  receipt_prefix: "SD",
  receipt_expiry_days: "30",
  receipt_footer_text: "شكراً لاستخدام خدمات متجر السودان",
  // الرسوم
  fee_percentage: "0",
  fee_fixed: "0",
  min_amount: "0",
  max_amount: "999999999",
};

const SETTING_LABELS: Record<string, { label: string; description?: string; type?: string }> = {
  company_name: { label: "اسم الشركة", description: "يظهر في الإيصالات والواجهة" },
  company_phone: { label: "رقم الهاتف", description: "رقم التواصل الرسمي" },
  company_email: { label: "البريد الإلكتروني" },
  company_address: { label: "العنوان", description: "العنوان الكامل للشركة" },
  company_whatsapp: { label: "واتساب", description: "رقم واتساب للتواصل" },
  supported_currencies: { label: "العملات المدعومة", description: "مفصولة بفاصلة (SDG,USD,SAR)" },
  default_currency: { label: "العملة الافتراضية" },
  receipt_prefix: { label: "بادئة رقم الإيصال", description: "مثال: SD → SD20240001" },
  receipt_expiry_days: { label: "مدة صلاحية الإيصال (أيام)", type: "number" },
  receipt_footer_text: { label: "نص تذييل الإيصال" },
  fee_percentage: { label: "نسبة الرسوم (%)", type: "number", description: "0 = بدون رسوم" },
  fee_fixed: { label: "رسوم ثابتة", type: "number" },
  min_amount: { label: "الحد الأدنى للمبلغ", type: "number" },
  max_amount: { label: "الحد الأقصى للمبلغ", type: "number" },
};

export default function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});

  const { data: settingsData, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const setMutation = trpc.settings.set.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`تم حفظ "${SETTING_LABELS[vars.key]?.label || vars.key}" بنجاح`);
      setSaving(null);
      setHasChanges((prev) => ({ ...prev, [vars.key]: false }));
      refetch();
    },
    onError: (err) => {
      toast.error("فشل الحفظ: " + err.message);
      setSaving(null);
    },
  });

  useEffect(() => {
    if (settingsData) {
      setSettings((prev) => ({ ...prev, ...settingsData }));
    }
  }, [settingsData]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges((prev) => ({ ...prev, [key]: true }));
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    setMutation.mutate({ key, value: settings[key] });
  };

  const handleSaveAll = async (keys: string[]) => {
    for (const key of keys) {
      if (hasChanges[key]) {
        await setMutation.mutateAsync({ key, value: settings[key] });
      }
    }
    toast.success("تم حفظ جميع الإعدادات");
  };

  const renderField = (key: string) => {
    const meta = SETTING_LABELS[key] || { label: key };
    const changed = hasChanges[key];
    return (
      <div key={key} className="space-y-1">
        <Label htmlFor={key} className="text-sm font-medium">
          {meta.label}
          {changed && <Badge variant="secondary" className="mr-2 text-xs">تم التعديل</Badge>}
        </Label>
        {meta.description && (
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        )}
        <div className="flex gap-2">
          <Input
            id={key}
            type={meta.type || "text"}
            value={settings[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value)}
            className="flex-1"
            dir="ltr"
          />
          <Button
            size="sm"
            variant={changed ? "default" : "outline"}
            onClick={() => handleSave(key)}
            disabled={saving === key || !changed}
          >
            {saving === key ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  };

  const companyKeys = ["company_name", "company_phone", "company_email", "company_address", "company_whatsapp"];
  const currencyKeys = ["supported_currencies", "default_currency"];
  const receiptKeys = ["receipt_prefix", "receipt_expiry_days", "receipt_footer_text"];
  const feeKeys = ["fee_percentage", "fee_fixed", "min_amount", "max_amount"];

  const changedCount = Object.values(hasChanges).filter(Boolean).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="متجر السودان" className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إعدادات النظام</h1>
            <p className="text-sm text-muted-foreground">تخصيص إعدادات متجر السودان</p>
          </div>
        </div>
        {changedCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {changedCount} تعديل غير محفوظ
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري تحميل الإعدادات...</div>
      ) : (
        <Tabs defaultValue="company" dir="rtl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">الشركة</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">العملات</span>
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex items-center gap-1">
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">الإيصال</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-1">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">الرسوم</span>
            </TabsTrigger>
          </TabsList>

          {/* معلومات الشركة */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  معلومات الشركة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {companyKeys.map(renderField)}
                <Separator />
                <Button
                  onClick={() => handleSaveAll(companyKeys)}
                  disabled={!companyKeys.some((k) => hasChanges[k])}
                  className="w-full"
                >
                  <Save className="w-4 h-4 ml-2" />
                  حفظ معلومات الشركة
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* العملات */}
          <TabsContent value="currency">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  إعدادات العملات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currencyKeys.map(renderField)}
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium mb-2">العملات المتاحة حالياً:</p>
                  <div className="flex flex-wrap gap-2">
                    {(settings.supported_currencies || "SDG,USD,SAR,AED,EGP")
                      .split(",")
                      .map((c) => c.trim())
                      .filter(Boolean)
                      .map((c) => (
                        <Badge key={c} variant="outline">{c}</Badge>
                      ))}
                  </div>
                </div>
                <Separator />
                <Button
                  onClick={() => handleSaveAll(currencyKeys)}
                  disabled={!currencyKeys.some((k) => hasChanges[k])}
                  className="w-full"
                >
                  <Save className="w-4 h-4 ml-2" />
                  حفظ إعدادات العملات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إعدادات الإيصال */}
          <TabsContent value="receipt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  إعدادات الإيصال
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {receiptKeys.map(renderField)}
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-1">مثال على رقم الإيصال:</p>
                  <code className="text-primary font-mono">
                    {settings.receipt_prefix || "SD"}20240001
                  </code>
                </div>
                <Separator />
                <Button
                  onClick={() => handleSaveAll(receiptKeys)}
                  disabled={!receiptKeys.some((k) => hasChanges[k])}
                  className="w-full"
                >
                  <Save className="w-4 h-4 ml-2" />
                  حفظ إعدادات الإيصال
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* الرسوم */}
          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  إعدادات الرسوم والحدود
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {feeKeys.map(renderField)}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">ملاحظة:</p>
                  <p>الرسوم الحالية للأغراض المستقبلية فقط. لا تؤثر على الإيصالات الحالية.</p>
                </div>
                <Separator />
                <Button
                  onClick={() => handleSaveAll(feeKeys)}
                  disabled={!feeKeys.some((k) => hasChanges[k])}
                  className="w-full"
                >
                  <Save className="w-4 h-4 ml-2" />
                  حفظ إعدادات الرسوم
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
