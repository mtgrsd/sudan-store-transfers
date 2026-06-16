import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, Eye, XCircle, RefreshCw, FileText, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import TransferReceipt from "@/components/TransferReceipt";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

const statusLabels: Record<string, string> = {
  pending_deposit: "بانتظار الإيداع",
  received: "مستلم",
  cancelled: "ملغى",
  expired: "منتهي الصلاحية",
  draft: "مسودة",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_deposit: "secondary",
  received: "default",
  cancelled: "destructive",
  expired: "outline",
  draft: "outline",
};

const CURRENCIES = ["USD", "EUR", "USDT", "AED", "SAR", "SDG", "GBP"];

export default function AdminReceipts() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showCancel, setShowCancel] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showReceiptPrint, setShowReceiptPrint] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [form, setForm] = useState({
    payerName: "",
    payerPhone: "",
    payerCountry: "",
    amount: "",
    currencyCode: "USD",
    officeId: "",
    validityDays: "7",
    notes: "",
  });

  const utils = trpc.useUtils();

  const { data: offices = [] } = trpc.office.getAll.useQuery({ activeOnly: true });

  const { data: searchResult, isLoading } = trpc.receipt.search.useQuery({
    query: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
    offset: 0,
  });

  const createMutation = trpc.receipt.create.useMutation({
    onSuccess: (receipt) => {
      toast.success(`تم إنشاء الإيصال: ${receipt.notificationNumber}`);
      utils.receipt.search.invalidate();
      utils.dashboard.getStats.invalidate();
      setShowCreate(false);
      setForm({ payerName: "", payerPhone: "", payerCountry: "", amount: "", currencyCode: "USD", officeId: "", validityDays: "7", notes: "" });
      setSelectedReceipt(receipt);
    },
    onError: (err) => toast.error(err.message),
  });

  const { refetch: fetchCsv } = trpc.receipt.exportCsv.useQuery(
    { status: statusFilter !== "all" ? statusFilter : undefined },
    { enabled: false }
  );

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const result = await fetchCsv();
      if (!result.data || !result.data.csv) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipts_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${result.data.count} إيصال`);
    } catch (err) {
      toast.error("فشل التصدير");
    } finally {
      setExportLoading(false);
    }
  };

  const cancelMutation = trpc.receipt.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الإيصال");
      utils.receipt.search.invalidate();
      setShowCancel(null);
      setCancelReason("");
      setSelectedReceipt(null);
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "staff") {
      setLocation("/");
    }
  }, [user, setLocation]);

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
    <div className="min-h-screen bg-slate-50" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <header className="bg-gradient-to-l from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="متجر السودان" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold">متجر السودان</h1>
              <p className="text-xs text-blue-200">إدارة الإيصالات</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "الرئيسية", href: "/admin" },
              { label: "الإيصالات", href: "/admin/transfers" },
              { label: "المكاتب", href: "/admin/agents" },
              { label: "سجل التدقيق", href: "/admin/audit-log" },
              { label: "الإعدادات", href: "/admin/settings" },
            ].map((item) => (
              <button key={item.href} onClick={() => setLocation(item.href)}
                className="px-3 py-1.5 text-sm rounded-md hover:bg-white/20 transition-colors">
                {item.label}
              </button>
            ))}
          </nav>
          <Button onClick={() => setShowCreate(true)} className="bg-white text-blue-800 hover:bg-blue-50">
            <Plus className="w-4 h-4 ml-1" />
            إيصال جديد
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Search & Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="بحث برقم الإشعار، اسم الدافع، رقم الهاتف، كود التحقق..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending_deposit">بانتظار الإيداع</SelectItem>
                  <SelectItem value="received">مستلم</SelectItem>
                  <SelectItem value="cancelled">ملغى</SelectItem>
                  <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => utils.receipt.search.invalidate()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleExportCsv} disabled={exportLoading} title="تصدير CSV">
                {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline mr-1">تصدير CSV</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              الإيصالات {searchResult?.total ? `(${searchResult.total.toLocaleString("ar-SA")})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : searchResult?.rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">رقم الإشعار</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">اسم الدافع</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">المكتب</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">المبلغ</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">الحالة</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">التاريخ</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.rows.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-800">{r.notificationNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.payerName}</div>
                          {r.payerPhone && <div className="text-xs text-slate-400">{r.payerPhone}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.officeName}</td>
                        <td className="px-4 py-3 font-bold">{r.amount} {r.currencyCode}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariants[r.status] ?? "outline"}>
                            {statusLabels[r.status] ?? r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(r.createdAt).toLocaleDateString("ar-SA")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedReceipt(r)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {r.status === "pending_deposit" && (
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                                onClick={() => setShowCancel(r.id)}>
                                <XCircle className="w-4 h-4" />
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
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد إيصالات</p>
                <Button className="mt-4 bg-blue-700 hover:bg-blue-800" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 ml-1" />
                  إنشاء أول إيصال
                </Button>
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
              إنشاء إيصال جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>اسم الدافع *</Label>
                <Input value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })}
                  placeholder="الاسم الكامل للدافع" />
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
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>المكتب / الوكيل المستلم *</Label>
                <Select value={form.officeId} onValueChange={(v) => setForm({ ...form, officeId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المكتب..." /></SelectTrigger>
                  <SelectContent>
                    {offices.map((o: any) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name} {o.city ? `— ${o.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>مدة الصلاحية (أيام)</Label>
                <Input value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
                  type="number" min="1" max="365" dir="ltr" />
              </div>
              <div className="col-span-2">
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..." rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-blue-700 hover:bg-blue-800">
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الإيصال"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Detail Dialog */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <img src={LOGO_URL} alt="" className="h-8 w-auto" />
                تفاصيل الإيصال
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="border-2 border-blue-200 rounded-xl p-3 bg-white text-center">
                  <QRCodeSVG
                    value={`${window.location.origin}/verify/${selectedReceipt.notificationNumber}`}
                    size={160}
                    level="M"
                  />
                  <p className="text-xs text-slate-500 mt-2">امسح للتحقق من الإيصال</p>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2 border border-blue-100">
                <InfoRow label="رقم الإشعار" value={selectedReceipt.notificationNumber} mono highlight />
                <InfoRow label="كود التحقق" value={selectedReceipt.verificationCode} mono highlight />
                {selectedReceipt.secretPin && <InfoRow label="الرقم السري" value={selectedReceipt.secretPin} mono />}
                <InfoRow label="اسم الدافع" value={selectedReceipt.payerName} />
                {selectedReceipt.payerPhone && <InfoRow label="الهاتف" value={selectedReceipt.payerPhone} />}
                {selectedReceipt.payerCountry && <InfoRow label="الدولة" value={selectedReceipt.payerCountry} />}
                <InfoRow label="المبلغ" value={`${selectedReceipt.amount} ${selectedReceipt.currencyCode}`} />
                <InfoRow label="الحالة" value={statusLabels[selectedReceipt.status] ?? selectedReceipt.status} />
                <InfoRow label="تاريخ الإنشاء" value={new Date(selectedReceipt.createdAt).toLocaleDateString("ar-SA")} />
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
                <span>⚠️</span>
                <span>احتفظ بالرقم السري وأرسله للمكتب بشكل آمن. لن يُعرض مرة أخرى في هذه الواجهة.</span>
              </div>

              <div className="flex gap-2 justify-end">
                {selectedReceipt.status === "pending_deposit" && (
                  <Button variant="destructive" size="sm"
                    onClick={() => { setShowCancel(selectedReceipt.id); setSelectedReceipt(null); }}>
                    <XCircle className="w-4 h-4 ml-1" />
                    إلغاء الإيصال
                  </Button>
                )}
                <Button variant="outline" size="sm"
                  onClick={() => setShowReceiptPrint(selectedReceipt)}>
                  🖨️ طباعة الإيصال
                </Button>
                <Button variant="outline" onClick={() => setSelectedReceipt(null)}>إغلاق</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Print Receipt Dialog */}
      {showReceiptPrint && (
        <Dialog open={!!showReceiptPrint} onOpenChange={() => setShowReceiptPrint(null)}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <TransferReceipt
              transfer={{
                notificationNumber: showReceiptPrint.notificationNumber,
                secretCode: showReceiptPrint.verificationCode,
                amount: showReceiptPrint.amount,
                currencyCode: showReceiptPrint.currencyCode,
                status: showReceiptPrint.status,
                notes: showReceiptPrint.notes,
                createdAt: showReceiptPrint.createdAt,
                senderName: showReceiptPrint.payerName,
                agentName: showReceiptPrint.officeName,
              }}
              onClose={() => setShowReceiptPrint(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Dialog */}
      <Dialog open={!!showCancel} onOpenChange={() => setShowCancel(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إلغاء الإيصال</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              هل أنت متأكد من إلغاء هذا الإيصال؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div>
              <Label>سبب الإلغاء</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اذكر سبب الإلغاء..." rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancel(null)}>تراجع</Button>
              <Button variant="destructive" disabled={cancelMutation.isPending}
                onClick={() => showCancel && cancelMutation.mutate({
                  receiptId: showCancel,
                  cancelReason: cancelReason || undefined,
                })}>
                {cancelMutation.isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${mono ? "font-mono tracking-wider" : ""} ${highlight ? "text-blue-800" : ""}`}>
        {value}
      </span>
    </div>
  );
}
