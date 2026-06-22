import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookText, Wallet } from "lucide-react";

const entryTypeLabels: Record<string, string> = {
  deposit_received: "إيداع مستلم",
};

export default function AdminAccounting() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [officeId, setOfficeId] = useState<string>("all");
  const [currencyCode, setCurrencyCode] = useState<string>("all");

  const { data: offices = [] } = trpc.office.getAll.useQuery({});
  const { data: currencyList = [] } = trpc.currency.getAll.useQuery({});

  const { data: ledgerResult, isLoading } = trpc.accounting.list.useQuery({
    officeId: officeId !== "all" ? parseInt(officeId) : undefined,
    currencyCode: currencyCode !== "all" ? currencyCode : undefined,
    limit: 150,
    offset: 0,
  });

  const { data: summary = [] } = trpc.accounting.summary.useQuery({});

  if (!user) return null;

  const rows = ledgerResult?.rows ?? [];

  return (
    <AdminLayout title="القيود المحاسبية">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary.length ? summary.map((s: any) => (
          <Card key={s.currencyCode} className="border-0 bg-blue-50 shadow-sm">
            <CardContent className="p-4 text-center">
              <Wallet className="w-5 h-5 text-blue-700 mx-auto mb-2" />
              <p className="text-xl font-extrabold text-slate-900">
                {parseFloat(s.totalAmount).toLocaleString("ar-SA")}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{s.currencyCode} — {s.entriesCount} قيد</p>
            </CardContent>
          </Card>
        )) : (
          <Card className="col-span-full"><CardContent className="py-8 text-center text-slate-400 text-sm">لا توجد قيود محاسبية بعد</CardContent></Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookText className="w-5 h-5 text-blue-700" />
              سجل القيود ({rows.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={officeId} onValueChange={setOfficeId}>
                <SelectTrigger className="w-44"><SelectValue placeholder="كل المكاتب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المكاتب</SelectItem>
                  {offices.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="w-32"><SelectValue placeholder="كل العملات" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل العملات</SelectItem>
                  {currencyList.map((c: any) => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">المكتب</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">النوع</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">المبلغ</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الرصيد قبل</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الرصيد بعد</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الإيصال</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e: any) => (
                    <tr key={e.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{e.officeName || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{entryTypeLabels[e.entryType] ?? e.entryType}</Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">+{parseFloat(e.amount).toLocaleString("ar-SA")} {e.currencyCode}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{parseFloat(e.balanceBefore).toLocaleString("ar-SA")}</td>
                      <td className="px-4 py-3 font-mono">{parseFloat(e.balanceAfter).toLocaleString("ar-SA")}</td>
                      <td className="px-4 py-3">
                        <button className="text-blue-700 hover:underline text-xs" onClick={() => setLocation(`/admin/transfers/${e.receiptId}`)}>
                          #{e.receiptId}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <BookText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد قيود محاسبية بعد — تُضاف تلقائيًا عند تأكيد استلام الإيداعات</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
