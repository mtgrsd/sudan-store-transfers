import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from "recharts";
import {
  FileText, Clock, CheckCircle, XCircle, Building2, TrendingUp,
  Plus, Users, ClipboardList, Search
} from "lucide-react";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

const COLORS = ["#f59e0b", "#10b981", "#ef4444", "#6366f1"];

const statusLabels: Record<string, string> = {
  pending_deposit: "بانتظار الإيداع",
  received: "مستلم",
  cancelled: "ملغى",
  expired: "منتهي الصلاحية",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_deposit: "secondary",
  received: "default",
  cancelled: "destructive",
  expired: "outline",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // super_admin, admin, employee all have access to admin dashboard
  // No redirect needed here - App.tsx handles routing by role

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery(
    undefined, { enabled: !!user }
  );
  const { data: recent, isLoading: recentLoading } = trpc.dashboard.getRecentReceipts.useQuery(
    { limit: 8 }, { enabled: !!user }
  );

  if (!user) return null;

  const pieData = stats ? [
    { name: "بانتظار الإيداع", value: stats.pendingReceipts },
    { name: "مستلم", value: stats.receivedReceipts },
    { name: "ملغى", value: stats.cancelledReceipts },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Header */}
      <header className="bg-gradient-to-l from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="متجر السودان" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-bold">متجر السودان</h1>
              <p className="text-xs text-blue-200">نظام إدارة الإيصالات</p>
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
                className="px-3 py-1.5 text-sm rounded-md hover:bg-white/20 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-200">{user.name}</span>
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-100">
              {user.role === "super_admin" ? "مدير عام" : user.role === "admin" ? "مدير" : "موظف"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">لوحة التحكم</h2>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Button onClick={() => setLocation("/admin/transfers")} className="bg-blue-700 hover:bg-blue-800">
            <Plus className="w-4 h-4 ml-1" />
            إيصال جديد
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : stats ? (
            <>
              <StatCard icon={<FileText className="w-5 h-5 text-blue-600" />} label="إجمالي الإيصالات" value={stats.totalReceipts} />
              <StatCard icon={<TrendingUp className="w-5 h-5 text-purple-600" />} label="إيصالات اليوم" value={stats.todayReceipts} />
              <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />} label="بانتظار الإيداع" value={stats.pendingReceipts} />
              <StatCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} label="مستلمة" value={stats.receivedReceipts} />
              <StatCard icon={<XCircle className="w-5 h-5 text-red-500" />} label="ملغاة" value={stats.cancelledReceipts} />
              <StatCard icon={<Building2 className="w-5 h-5 text-indigo-600" />} label="مكاتب نشطة" value={stats.activeOffices} />
            </>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إنشاء إيصال جديد", href: "/admin/transfers", icon: <Plus className="w-5 h-5" />, color: "bg-blue-700" },
            { label: "إدارة المكاتب", href: "/admin/agents", icon: <Building2 className="w-5 h-5" />, color: "bg-green-700" },
            { label: "سجل التدقيق", href: "/admin/audit-log", icon: <ClipboardList className="w-5 h-5" />, color: "bg-amber-600" },
            { label: "إعدادات النظام", href: "/admin/settings", icon: <Users className="w-5 h-5" />, color: "bg-slate-700" },
          ].map((action) => (
            <button
              key={action.href}
              onClick={() => setLocation(action.href)}
              className={`${action.color} text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity shadow-md text-right`}
            >
              {action.icon}
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Charts + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">توزيع حالات الإيصالات</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">آخر الإيصالات</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/receipts")}>
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
                    <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-slate-50 rounded px-1"
                      onClick={() => setLocation(`/admin/transfers`)}>
                      <div>
                        <p className="text-sm font-semibold text-blue-800">{r.notificationNumber}</p>
                        <p className="text-xs text-slate-500">{r.payerName} — {r.officeName}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{r.amount} {r.currencyCode}</p>
                        <Badge variant={statusVariants[r.status] ?? "outline"} className="text-xs">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚙️ آلية عمل النظام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {[
                { step: "1", title: "إنشاء الإيصال", desc: "الإدارة تُنشئ الإيصال", icon: "📝", color: "#1a2e6b" },
                { step: "2", title: "إصدار الإيصال", desc: "رقم إشعار + QR Code", icon: "🧾", color: "#2563eb" },
                { step: "3", title: "استلام الزبون", desc: "يحصل على الإيصال", icon: "📄", color: "#7c3aed" },
                { step: "4", title: "التوجه للمكتب", desc: "المكتب المحدد", icon: "🏢", color: "#0891b2" },
                { step: "5", title: "التحقق", desc: "مسح QR أو رقم الإشعار", icon: "🔍", color: "#059669" },
                { step: "6", title: "تأكيد الاستلام", desc: "الوكيل يضغط تأكيد", icon: "✅", color: "#d97706" },
                { step: "7", title: "تحديث الرصيد", desc: "إضافة للمكتب فقط عند التأكيد", icon: "💰", color: "#dc2626" },
              ].map((item) => (
                <div key={item.step} className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto mb-2"
                    style={{ backgroundColor: item.color }}>
                    {item.step}
                  </div>
                  <div className="text-lg mb-1">{item.icon}</div>
                  <div className="text-xs font-bold" style={{ color: item.color }}>{item.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">{icon}</div>
        <p className="text-2xl font-bold text-slate-800">{value.toLocaleString("ar-SA")}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
