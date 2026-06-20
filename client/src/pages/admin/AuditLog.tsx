import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollText, FileText, Building2, Coins, Settings as SettingsIcon, Eye } from "lucide-react";

const entityLabels: Record<string, string> = {
  receipt: "إيصال",
  office: "مكتب / وكيل",
  currency: "عملة",
  settings: "إعدادات النظام",
  user: "مستخدم",
};

const entityIcons: Record<string, any> = {
  receipt: FileText,
  office: Building2,
  currency: Coins,
  settings: SettingsIcon,
};

const actionLabels: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  confirm_deposit: "تأكيد استلام الإيداع",
  confirm_received: "تأكيد الاستلام (رمز سري)",
  cancel: "إلغاء",
  delete: "حذف",
  add_attachment: "إضافة مرفق",
  upsert_profile: "تحديث ملف",
};

const actionVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  confirm_deposit: "default",
  confirm_received: "default",
  cancel: "destructive",
  delete: "destructive",
  add_attachment: "outline",
};

function formatJsonValue(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [entityType, setEntityType] = useState<string>("all");
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading } = trpc.audit.getAll.useQuery({
    entityType: entityType !== "all" ? entityType : undefined,
    limit: 100,
    offset: 0,
  });

  if (!user) return null;

  const rows = data ?? [];

  return (
    <AdminLayout title="سجل العمليات">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-blue-700" />
              سجل العمليات ({rows.length})
            </CardTitle>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="كل الأنواع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="receipt">الإيصالات</SelectItem>
                <SelectItem value="office">المكاتب والوكلاء</SelectItem>
                <SelectItem value="currency">العملات</SelectItem>
                <SelectItem value="settings">إعدادات النظام</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">النوع</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">الإجراء</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">المستخدم</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">ملاحظات</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">التاريخ</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log: any) => {
                    const Icon = entityIcons[log.entityType] ?? FileText;
                    return (
                      <tr key={log.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                            {entityLabels[log.entityType] ?? log.entityType}
                            {log.entityType === "receipt" && (
                              <button
                                className="text-blue-700 hover:underline text-xs"
                                onClick={() => setLocation(`/admin/transfers/${log.entityId}`)}
                              >
                                #{log.entityId}
                              </button>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={actionVariants[log.action] ?? "outline"}>
                            {actionLabels[log.action] ?? log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{log.actorName || "—"}</div>
                          <div className="text-xs text-slate-400">{log.actorRole || ""}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{log.notes || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("ar-SA")}
                        </td>
                        <td className="px-4 py-3">
                          {(log.previousValue || log.newValue) && (
                            <Button size="sm" variant="ghost" onClick={() => setDetail(log)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد عمليات مسجلة</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل العملية: {detail ? (actionLabels[detail.action] ?? detail.action) : ""}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              {detail.previousValue && (
                <div>
                  <p className="font-semibold text-slate-600 mb-1">القيمة قبل التعديل:</p>
                  <pre className="bg-slate-50 border rounded-lg p-3 text-xs overflow-x-auto" dir="ltr">
                    {formatJsonValue(detail.previousValue)}
                  </pre>
                </div>
              )}
              {detail.newValue && (
                <div>
                  <p className="font-semibold text-slate-600 mb-1">القيمة بعد التعديل:</p>
                  <pre className="bg-slate-50 border rounded-lg p-3 text-xs overflow-x-auto" dir="ltr">
                    {formatJsonValue(detail.newValue)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
