import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch audit logs
  const { data: auditLogs = [], isLoading } = trpc.audit.getLog.useQuery(
    { limit: 100, offset: 0 },
    { enabled: !!user && user.role === "admin" }
  );

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-gray-900">سجل التدقيق</h1>
        </div>
      </header>
      <main className="container py-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">سجل العمليات</h3>
            <span className="text-sm text-gray-600">
              {auditLogs?.length || 0} عملية
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الإجراء</th>
                  <th>نوع الكيان</th>
                  <th>التفاصيل</th>
                  <th>التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="font-medium text-gray-900">
                        {log.userId}
                      </td>
                      <td>
                        <span className="badge badge-info">{log.action}</span>
                      </td>
                      <td>{log.entityType}</td>
                      <td className="text-sm text-gray-600">
                        {log.details || "-"}
                      </td>
                      <td className="text-sm">
                        {new Date(log.createdAt).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      لا توجد عمليات حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
