import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalTransfers: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch pending transfers
  const { data: pendingTransfers = [] } = trpc.transfer.getPending.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  useEffect(() => {
    if (pendingTransfers) {
      setStats((prev) => ({
        ...prev,
        pendingTransfers: pendingTransfers.length,
      }));
    }
  }, [pendingTransfers]);

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-lg font-bold text-white">SD</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button
              onClick={() => logout()}
              className="btn-secondary text-sm"
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container flex gap-8 overflow-x-auto">
          <a
            href="/admin"
            className="border-b-2 border-blue-600 px-4 py-4 font-medium text-blue-600 whitespace-nowrap"
          >
            الرئيسية
          </a>
          <a
            href="/admin/agents"
            className="border-b-2 border-transparent px-4 py-4 font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            الوكلاء
          </a>
          <a
            href="/admin/customers"
            className="border-b-2 border-transparent px-4 py-4 font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            العملاء
          </a>
          <a
            href="/admin/transfers"
            className="border-b-2 border-transparent px-4 py-4 font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            الحوالات
          </a>
          <a
            href="/admin/audit-log"
            className="border-b-2 border-transparent px-4 py-4 font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            سجل التدقيق
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">مرحباً بك في لوحة التحكم</h2>
          <p className="mt-2 text-gray-600">
            إدارة النظام والحوالات والوكلاء والعملاء
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-label">إجمالي الأرصدة</div>
            <div className="stat-value">${stats.totalBalance.toFixed(2)}</div>
            <div className="stat-change">↑ 0% من الشهر الماضي</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">إجمالي التحويلات</div>
            <div className="stat-value">{stats.totalTransfers}</div>
            <div className="stat-change">↑ {stats.completedTransfers} تحويل مكتمل</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">التحويلات المعلقة</div>
            <div className="stat-value">{stats.pendingTransfers}</div>
            <div className="stat-change">بانتظار التأكيد</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">التحويلات المصروفة</div>
            <div className="stat-value">{stats.completedTransfers}</div>
            <div className="stat-change">مكتملة بنجاح</div>
          </div>
        </div>

        {/* Recent Transfers */}
        <div className="mt-8 card">
          <div className="card-header">
            <h3 className="card-title">آخر التحويلات المعلقة</h3>
            <Button className="btn-secondary text-sm">عرض الكل</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الإشعار</th>
                  <th>الوكيل</th>
                  <th>المبلغ</th>
                  <th>العملة</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransfers && pendingTransfers.length > 0 ? (
                  pendingTransfers.slice(0, 5).map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="font-mono text-sm">
                        {transfer.notificationNumber}
                      </td>
                      <td>-</td>
                      <td>{transfer.amount}</td>
                      <td>{transfer.currencyCode}</td>
                      <td>
                        <span className="badge badge-warning">معلقة</span>
                      </td>
                      <td>
                        {new Date(transfer.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      لا توجد حوالات معلقة حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Button className="btn-primary py-3">إنشاء حوالة جديدة</Button>
          <Button className="btn-secondary py-3">إضافة وكيل جديد</Button>
          <Button className="btn-secondary py-3">إضافة عميل جديد</Button>
        </div>
      </main>
    </div>
  );
}
