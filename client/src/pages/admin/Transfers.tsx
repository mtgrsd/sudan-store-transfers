import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminTransfers() {
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
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold text-gray-900">إدارة الحوالات</h1>
          <Button className="btn-primary">إنشاء حوالة جديدة</Button>
        </div>
      </header>
      <main className="container py-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">قائمة الحوالات</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الإشعار</th>
                  <th>الوكيل</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>العملة</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    لا توجد حوالات حالياً
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
