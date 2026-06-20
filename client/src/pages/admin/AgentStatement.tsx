import { useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowRight, Building2, Phone, MapPin, Wallet,
  FileText, BookText, Download, Printer,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pending_deposit: "بانتظار الإيداع",
  received: "مستلم",
  cancelled: "ملغى",
  expired: "منتهي الصلاحية",
};
const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_deposit: "secondary", received: "default", cancelled: "destructive", expired: "outline",
};
const entryTypeLabels: Record<string, string> = { deposit_received: "إيداع مستلم" };

async function exportPDF(el: HTMLElement, filename: string) {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - 20;
  const imgH = (canvas.height * imgW) / canvas.width;
  let y = 10;
  let remaining = imgH;
  while (remaining > 0) {
    const sliceH = Math.min(remaining, pageH - 20);
    const srcY = (imgH - remaining) * (canvas.height / imgH);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceH * (canvas.height / imgH);
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
    if (imgH - remaining > 0) pdf.addPage();
    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 10, y, imgW, sliceH);
    remaining -= sliceH;
  }
  pdf.save(filename);
}

export default function AdminAgentStatement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ agentId: string }>();
  const officeId = parseInt(params.agentId || "0");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: office, isLoading: officeLoading } = trpc.office.getById.useQuery(
    { id: officeId }, { enabled: !!user && officeId > 0 }
  );
  const { data: balances = [], isLoading: balancesLoading } = trpc.office.getBalances.useQuery(
    { officeId }, { enabled: !!user && officeId > 0 }
  );
  const { data: receiptsResult, isLoading: receiptsLoading } = trpc.receipt.search.useQuery(
    { officeId, limit: 50 }, { enabled: !!user && officeId > 0 }
  );
  const { data: ledgerResult, isLoading: ledgerLoading } = trpc.accounting.list.useQuery(
    { officeId, limit: 50 }, { enabled: !!user && officeId > 0 }
  );

  const handlePDF = async () => {
    if (!printRef.current || !office) return;
    toast.info("جاري تحضير PDF...");
    try {
      await exportPDF(printRef.current, `كشف-حساب-${office.code}-${new Date().toLocaleDateString("ar-SA").replace(/\//g, "-")}.pdf`);
      toast.success("تم تصدير PDF بنجاح");
    } catch (e: any) {
      toast.error("فشل تصدير PDF: " + e.message);
    }
  };

  const handlePrint = () => window.print();

  if (!user) return null;

  return (
    <AdminLayout
      title="كشف حساب الوكيل"
      actions={
        office ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
            <Button size="sm" onClick={handlePDF}>
              <Download className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">تصدير PDF</span>
            </Button>
          </div>
        ) : undefined
      }
    >
      <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/agents")} className="-mr-2">
        <ArrowRight className="w-4 h-4 ml-1" />
        رجوع إلى المكاتب
      </Button>

      {officeLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !office ? (
        <Card><CardContent className="py-16 text-center text-slate-400">المكتب غير موجود</CardContent></Card>
      ) : (
        <div ref={printRef} className="space-y-5">
          {/* ترويسة الكشف */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0B1F4D] text-white flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">{office.name}</h2>
                    <p className="text-sm text-slate-500 font-mono">{office.code}</p>
                  </div>
                </div>
                <div className="text-left text-xs text-slate-400">
                  <p>تاريخ الكشف: {new Date().toLocaleDateString("ar-SA")}</p>
                  <Badge variant={office.isActive ? "default" : "secondary"} className="mt-1">
                    {office.isActive ? "نشط" : "موقوف"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {office.city || "—"}{office.country ? `، ${office.country}` : ""}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span dir="ltr">{office.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {office.managerName || "—"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الأرصدة */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-700" />
                الأرصدة الحالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : balances.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {balances.map((b: any) => (
                    <div key={b.currencyCode} className="border rounded-lg p-3 bg-slate-50 text-center">
                      <p className="text-xl font-extrabold text-slate-900">
                        {parseFloat(b.balance).toLocaleString("ar-SA")}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">{b.currencyCode}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">لا توجد أرصدة مسجلة</p>
              )}
            </CardContent>
          </Card>

          {/* ملخص الإيصالات */}
          {receiptsResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  ملخص الإيصالات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "إجمالي", value: receiptsResult.total, color: "bg-blue-50 text-blue-800" },
                    { label: "مستلمة", value: receiptsResult.rows.filter((r: any) => r.status === "received").length, color: "bg-green-50 text-green-800" },
                    { label: "معلقة", value: receiptsResult.rows.filter((r: any) => r.status === "pending_deposit").length, color: "bg-amber-50 text-amber-800" },
                    { label: "ملغاة", value: receiptsResult.rows.filter((r: any) => r.status === "cancelled").length, color: "bg-red-50 text-red-800" },
                  ].map((s) => (
                    <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                      <p className="text-2xl font-extrabold">{s.value}</p>
                      <p className="text-xs mt-1 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* القيود المحاسبية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookText className="w-4 h-4 text-blue-700" />
                  القيود المحاسبية ({ledgerResult?.total ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ledgerLoading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : ledgerResult?.rows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">النوع</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">المبلغ</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">الرصيد بعد</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerResult.rows.map((e: any) => (
                          <tr key={e.id} className="border-b hover:bg-slate-50 cursor-pointer"
                            onClick={() => setLocation(`/admin/transfers/${e.receiptId}`)}>
                            <td className="px-3 py-2">{entryTypeLabels[e.entryType] ?? e.entryType}</td>
                            <td className="px-3 py-2 font-bold text-green-700">
                              +{parseFloat(e.amount).toLocaleString("ar-SA")} {e.currencyCode}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700">{parseFloat(e.balanceAfter).toLocaleString("ar-SA")}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">{new Date(e.createdAt).toLocaleDateString("ar-SA")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-10">لا توجد قيود محاسبية</p>
                )}
              </CardContent>
            </Card>

            {/* آخر الإيصالات */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  الإيصالات ({receiptsResult?.total ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {receiptsLoading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : receiptsResult?.rows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">الإشعار</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">الدافع</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">المبلغ</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">الحالة</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptsResult.rows.map((r: any) => (
                          <tr key={r.id} className="border-b hover:bg-slate-50 cursor-pointer"
                            onClick={() => setLocation(`/admin/transfers/${r.id}`)}>
                            <td className="px-3 py-2 font-mono text-blue-800 text-xs">{r.notificationNumber}</td>
                            <td className="px-3 py-2 text-xs">{r.payerName}</td>
                            <td className="px-3 py-2 font-bold text-xs">{r.amount} {r.currencyCode}</td>
                            <td className="px-3 py-2">
                              <Badge variant={statusVariants[r.status] ?? "outline"} className="text-xs">
                                {statusLabels[r.status] ?? r.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {new Date(r.createdAt).toLocaleDateString("ar-SA")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-10">لا توجد إيصالات</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* تذييل PDF */}
          <div className="border-t pt-4 text-center text-xs text-slate-400">
            كشف حساب — {office.name} — {new Date().toLocaleDateString("ar-SA")} — متجر السودان للتحويلات المالية
          </div>
        </div>
      )}

      {/* CSS خاص بالطباعة */}
      <style>{`
        @media print {
          nav, header, button, [role="navigation"] { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </AdminLayout>
  );
}
