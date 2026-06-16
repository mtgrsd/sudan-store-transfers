import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user || user.role !== "agent") {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (!user || user.role !== "agent") {
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
            <h1 className="text-xl font-bold text-gray-900">لوحة الوكيل</h1>
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
        <div className="container flex gap-8">
          <a
            href="/agent"
            className="border-b-2 border-blue-600 px-4 py-4 font-medium text-blue-600"
          >
            الرئيسية
          </a>
          <a
            href="/agent/transfers"
            className="border-b-2 border-transparent px-4 py-4 font-medium text-gray-600 hover:text-gray-900"
          >
            الحوالات
          </a>
          <a
            href="/agent/profile"
            className="border-b-2 border-transparent px-4 py-4 font-medium text-gray-600 hover:text-gray-900"
          >
            ملفي الشخصي
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">مرحباً بك</h2>
          <p className="mt-2 text-gray-600">
            إدارة حوالاتك والتحقق من أرصدتك
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-label">الرصيد المتاح (USD)</div>
            <div className="stat-value">$0.00</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">الرصيد المتاح (SDG)</div>
            <div className="stat-value">£0.00</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">إجمالي الحوالات</div>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">الحوالات المعلقة</div>
            <div className="stat-value">0</div>
          </div>
        </div>

        {/* Recent Transfers */}
        <div className="mt-8 card">
          <div className="card-header">
            <h3 className="card-title">آخر الحوالات</h3>
            <Button className="btn-secondary text-sm">عرض الكل</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الإشعار</th>
                  <th>المبلغ</th>
                  <th>العملة</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
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
