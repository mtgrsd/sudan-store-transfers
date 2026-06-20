import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
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

export default function AdminReceipts() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCancel, setShowCancel] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const utils = trpc.useUtils();

  const { data: searchResult, isLoading } = trpc.receipt.search.useQuery({
    query: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
    offset: 0,
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
    } catch {
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
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!user) return null;

  return (
    <AdminLayout
      title="إدارة الإيصالات"
      actions={
        <Button size="sm" onClick={() => setLocation("/admin/transfers/new")}>
          <Plus className="w-4 h-4 ml-1" />
          إيصال جديد
        </Button>
      }
    >
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
              <SelectTrigger className="w-full sm:w-52">
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => utils.receipt.search.invalidate()} title="تحديث">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleExportCsv} disabled={exportLoading} title="تصدير CSV">
                {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline mr-1">تصدير CSV</span>
              </Button>
            </div>
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
                    <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/admin/transfers/${r.id}`)}>
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setLocation(`/admin/transfers/${r.id}`)}>
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
              <Button className="mt-4" onClick={() => setLocation("/admin/transfers/new")}>
                <Plus className="w-4 h-4 ml-1" />
                إنشاء أول إيصال
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
    </AdminLayout>
  );
}
