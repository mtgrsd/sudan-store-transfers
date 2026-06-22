import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  FileText, Clock, CheckCircle, XCircle, Building2, TrendingUp,
  Plus, Users, ClipboardList, Search, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

const COLORS = ["#F59E0B", "#16A34A", "#DC2626", "#6B7280"];

const statusLabels: Record<string, string> = {
  pending_deposit: "بانتظار الإيداع",
  received: "مستلم",
  cancelled: "ملغى",
  expired: "منتهي الصلاحية",
};

const statusColors: Record<string, string> = {
  pending_deposit: "status-pending",
  received: "status-received",
  cancelled: "status-cancelled",
  expired: "status-expired",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery(
    undefined, { enabled: !!user }
  );
  const { data: recent, isLoading: recentLoading } = trpc.dashboard.getRecentReceipts.useQuery(
    { limit: 8 }, { enabled: !!user }
  );

  if (!user) return null;

  const pieData = stats ? [
    { name: "مستلم", value: stats.receivedReceipts, fill: "#16A34A" },
    { name: "بانتظار الإيداع", value: stats.pendingReceipts, fill: "#F59E0B" },
    { name: "ملغى", value: stats.cancelledReceipts, fill: "#DC2626" },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <header className="sudan-gradient text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="متجر السودان" className="h-12 w-auto" />
            <div>
              <h1 className="text-lg font-bold">متجر السودان</h1>
              <p className="text-xs opacity-90">نظام التحويلات المالية</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "الرئيسية", href: "/admin" },
              { label: "الإيصالات", href: "/admin/transfers" },
              { label: "المكاتب", href: "/admin/agents" },
              { label: "سجل التدقيق", href: "/admin/audit-log" },
              { label: "الإعدادات", href: "/admin/settings" },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className="px-4 py-2 text-sm rounded-lg hover:bg-white/20 transition-all duration-200"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{user.name}</span>
            <Badge className="bg-white/20 text-white border-0 text-xs">
              {user.role === "super_admin" ? "مدير عام" : user.role === "admin" ? "مدير" : "موظف"}
            </Badge>
            <button
              onClick={() => logout()}
              style={{
                background: "#dc2626",
                border: "2px solid #991b1b",
                borderRadius: "0.5rem",
                color: "white",
                padding: "0.6rem 1.2rem",
                fontSize: "0.9rem",
                fontWeight: "600",
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#991b1b";
                (e.target as HTMLButtonElement).style.boxShadow = "0 6px 16px rgba(220, 38, 38, 0.6)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "#dc2626";
                (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.4)";
              }}
            >
              🚪 تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم</h1>
            <p className="text-sm text-slate-500 mt-1">
              {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Button onClick={() => setLocation("/admin/transfers")} className="btn-primary">
            <Plus className="w-4 h-4 ml-2" />
            إيصال جديد
          </Button>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))
          ) : stats ? (
            <>
              <StatCard 
                icon={<FileText className="w-6 h-6" />} 
                label="إجمالي الإيصالات" 
                value={stats.totalReceipts} 
                color="primary" 
              />
              <StatCard 
                icon={<TrendingUp className="w-6 h-6" />} 
                label="إيصالات اليوم" 
                value={stats.todayReceipts} 
                color="success" 
              />
              <StatCard 
                icon={<Clock className="w-6 h-6" />} 
                label="بانتظار الإيداع" 
                value={stats.pendingReceipts} 
                color="warning" 
              />
              <StatCard 
                icon={<CheckCircle className="w-6 h-6" />} 
                label="مستلمة" 
                value={stats.receivedReceipts} 
                color="success" 
              />
              <StatCard 
                icon={<XCircle className="w-6 h-6" />} 
                label="ملغاة" 
                value={stats.cancelledReceipts} 
                color="danger" 
              />
              <StatCard 
                icon={<Building2 className="w-6 h-6" />} 
                label="مكاتب نشطة" 
                value={stats.activeOffices} 
                color="navy" 
              />
            </>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إنشاء إيصال جديد", href: "/admin/transfers", icon: <Plus className="w-5 h-5" />, color: "sudan-bg-navy" },
            { label: "إدارة المكاتب", href: "/admin/agents", icon: <Building2 className="w-5 h-5" />, color: "bg-green-600" },
            { label: "سجل التدقيق", href: "/admin/audit-log", icon: <ClipboardList className="w-5 h-5" />, color: "bg-amber-500" },
            { label: "إعدادات النظام", href: "/admin/settings", icon: <Users className="w-5 h-5" />, color: "bg-slate-600" },
          ].map((action) => (
            <button
              key={action.href}
              onClick={() => setLocation(action.href)}
              className={`${action.color} text-white rounded-lg p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-200 shadow-md text-right`}
            >
              {action.icon}
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">توزيع حالات الإيصالات</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                  لا توجد بيانات بعد
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Receipts */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">آخر الإيصالات</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/transfers")}>
                <Search className="w-4 h-4 ml-1" />
                عرض الكل
              </Button>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recent && recent.length > 0 ? (
                <div className="space-y-2">
                  {recent.map((r) => (
                    <div 
                      key={r.id} 
                      className="flex items-center justify-between py-3 px-3 border-b last:border-0 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                      onClick={() => setLocation(`/admin/transfers`)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{r.notificationNumber}</p>
                        <p className="text-xs text-slate-500">{r.payerName} — {r.officeName}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{r.amount} {r.currencyCode}</p>
                        <Badge className={`text-xs ${statusColors[r.status] || "status-neutral"}`}>
                          {statusLabels[r.status] ?? r.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                  لا توجد إيصالات بعد
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workflow Steps */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">⚙️ آلية عمل النظام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {[
                { step: "1", title: "إنشاء الإيصال", desc: "الإدارة تُنشئ الإيصال", icon: "📝", color: "#0B1F4D" },
                { step: "2", title: "إصدار الإيصال", desc: "رقم إشعار + QR Code", icon: "🧾", color: "#1D4ED8" },
                { step: "3", title: "استلام الزبون", desc: "يحصل على الإيصال", icon: "📄", color: "#7c3aed" },
                { step: "4", title: "التوجه للمكتب", desc: "المكتب المحدد", icon: "🏢", color: "#0891b2" },
                { step: "5", title: "التحقق", desc: "مسح QR أو رقم الإشعار", icon: "🔍", color: "#16A34A" },
                { step: "6", title: "تأكيد الاستلام", desc: "الوكيل يضغط تأكيد", icon: "✅", color: "#F59E0B" },
                { step: "7", title: "تحديث الرصيد", desc: "إضافة للمكتب فقط عند التأكيد", icon: "💰", color: "#DC2626" },
              ].map((item) => (
                <div key={item.step} className="text-center p-3 rounded-lg bg-slate-50 border border-slate-200 hover:shadow-md transition-shadow">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto mb-2"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.step}
                  </div>
                  <div className="text-lg mb-1">{item.icon}</div>
                  <div className="text-xs font-bold" style={{ color: item.color }}>{item.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, { bg: string; iconColor: string }> = {
    primary: { bg: "bg-blue-50", iconColor: "text-blue-600" },
    success: { bg: "bg-green-50", iconColor: "text-green-600" },
    warning: { bg: "bg-amber-50", iconColor: "text-amber-600" },
    danger: { bg: "bg-red-50", iconColor: "text-red-600" },
    navy: { bg: "bg-slate-50", iconColor: "text-slate-700" },
  };
  const { bg, iconColor } = colorMap[color] || colorMap.primary;
  
  return (
    <Card className={`${bg} border-0 shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconColor} bg-white mb-3`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-slate-900">{value.toLocaleString("ar-SA")}</p>
        <p className="text-xs text-slate-600 mt-2 font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}
