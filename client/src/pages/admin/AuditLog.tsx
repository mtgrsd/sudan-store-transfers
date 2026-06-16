import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

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
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    لا توجد عمليات حالياً
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
