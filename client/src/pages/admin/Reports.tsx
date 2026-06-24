import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Download, TrendingUp, FileText, Building2 } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending_deposit: "بانتظار الإيداع",
  received: "مستلم",
  cancelled: "ملغى",
  expired: "منتهي الصلاحية",
  draft: "مسودة",
};

const statusColors: Record<string, string> = {
  pending_deposit: "#F59E0B",
  received: "#16A34A",
  cancelled: "#DC2626",
  expired: "#6B7280",
  draft: "#94A3B8",
};

function toDayStart(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
function toDayEnd(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.getTime(); }

export default function AdminReports() {
  const { user } = useAuth();
  const today = new Date();
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 29);

  const [fromDate, setFromDate] = useState(monthAgo.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [officeId, setOfficeId] = useState<string>("all");
  const [exportLoading, setExportLoading] = useState(false);

  const { data: offices = [] } = trpc.office.getAll.useQuery({});

  const fromTs = toDayStart(new Date(fromDate));
  const toTs = toDayEnd(new Date(toDate));

  const { data: summary, isLoading } = trpc.reports.getSummary.useQuery({
    fromDate: fromTs,
    toDate: toTs,
  });

  const { refetch: fetchCsv } = trpc.receipt.exportCsv.useQuery(
    { fromDate: fromTs, toDate: toTs },
    { enabled: false }
  );

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const result = await fetchCsv();
      if (!result.data?.csv) { toast.error("لا توجد بيانات للتصدير"); return; }
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `report_${fromDate}_${toDate}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${result.data.count} إيصال`);
    } catch { toast.error("فشل التصدير"); } finally { setExportLoading(false); }
  };

  if (!user) return null;

  const totalCount = summary?.byStatus.reduce((s: number, r: any) => s + r.count, 0) ?? 0;
  const totalReceived = summary?.byCurrency.reduce((s: number, r: any) => s + parseFloat(r.totalAmount), 0) ?? 0;

  const pieData = summary?.byStatus.map((s: any) => ({
    name: statusLabels[s.status] ?? s.status,
    value: s.count,
    fill: statusColors[s.status] ?? "#94A3B8",
  })) ?? [];

  return (
    <AdminLayout
      title="التقارير والإحصائيات"
      actions={
        <Button size="sm" variant="outline" onClick={handleExport} disabled={exportLoading}>
          <Download className="w-4 h-4 ml-1" />
          {exportLoading ? "جاري التصدير..." : "تصدير CSV"}
        </Button>
      }
    >
      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">المكتب</Label>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="كل المكاتب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المكاتب</SelectItem>
                {offices.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : summary ? (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-blue-50 border-0">
              <CardContent className="p-4 text-center">
                <FileText className="w-5 h-5 text-blue-700 mx-auto mb-2" />
                <p className="text-2xl font-extrabold">{totalCount.toLocaleString("ar-SA")}</p>
                <p className="text-xs text-slate-500 mt-1">إجمالي الإيصالات</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-0">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-green-700 mx-auto mb-2" />
                <p className="text-2xl font-extrabold">{totalReceived.toLocaleString("ar-SA")}</p>
                <p className="text-xs text-slate-500 mt-1">إجمالي المستلم (كل العملات)</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-extrabold">
                  {(summary.byStatus as any[]).find((s: any) => s.status === "pending_deposit")?.count ?? 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">بانتظار الإيداع</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 border-0">
              <CardContent className="p-4 text-center">
                <Building2 className="w-5 h-5 text-slate-700 mx-auto mb-2" />
                <p className="text-2xl font-extrabold">{summary.byOffice.length}</p>
                <p className="text-xs text-slate-500 mt-1">مكاتب نشطة بالفترة</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle className="text-base">توزيع الحالات</CardTitle></CardHeader>
              <CardContent>
                {pieData.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-slate-400 text-center py-16">لا توجد بيانات في هذه الفترة</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">الإيصالات حسب العملة</CardTitle></CardHeader>
              <CardContent>
                {summary.byCurrency.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={summary.byCurrency.map((c: any) => ({ name: c.currencyCode, count: c.count, total: parseFloat(c.totalAmount) }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" /><YAxis />
                      <Tooltip />
                      <Bar dataKey="total" name="إجمالي المستلم" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-slate-400 text-center py-16">لا توجد بيانات في هذه الفترة</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">الاتجاه اليومي</CardTitle></CardHeader>
            <CardContent>
              {summary.daily.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={summary.daily.map((d: any) => ({ day: d.day, count: d.count, total: parseFloat(d.totalAmount) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" /><YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="عدد الإيصالات" stroke="#0B1F4D" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 text-center py-16">لا توجد بيانات في هذه الفترة</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">أفضل المكاتب نشاطًا</CardTitle></CardHeader>
            <CardContent className="p-0">
              {summary.byOffice.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-right px-4 py-2 font-semibold text-slate-600">المكتب</th>
                        <th className="text-right px-4 py-2 font-semibold text-slate-600">إجمالي الإيصالات</th>
                        <th className="text-right px-4 py-2 font-semibold text-slate-600">المستلمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byOffice.map((o: any) => (
                        <tr key={o.officeId} className="border-b">
                          <td className="px-4 py-2 font-medium">{o.officeName || "—"}</td>
                          <td className="px-4 py-2">{o.count}</td>
                          <td className="px-4 py-2 text-green-700 font-semibold">{o.receivedCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-slate-400 text-center py-10">لا توجد بيانات</p>}
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminLayout>
  );
}
