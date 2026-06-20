import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from "recharts";
import {
  FileText, Clock, CheckCircle, XCircle, Building2, TrendingUp,
  Plus, Users, ScrollText, Search, BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";

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
  const { user } = useAuth();
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
    <AdminLayout
      title="لوحة التحكم"
      actions={
        <Button size="sm" onClick={() => setLocation("/admin/transfers/new")}>
          <Plus className="w-4 h-4 ml-1" />
          إيصال جديد
        </Button>
      }
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            مرحباً، {user.name?.split(" ")[0] || "بك"} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))
        ) : stats ? (
          <>
            <StatCard icon={<FileText className="w-6 h-6" />} label="إجمالي الإيصالات" value={stats.totalReceipts} color="primary" />
            <StatCard icon={<TrendingUp className="w-6 h-6" />} label="إيصالات اليوم" value={stats.todayReceipts} color="success" />
            <StatCard icon={<Clock className="w-6 h-6" />} label="بانتظار الإيداع" value={stats.pendingReceipts} color="warning" />
            <StatCard icon={<CheckCircle className="w-6 h-6" />} label="مستلمة" value={stats.receivedReceipts} color="success" />
            <StatCard icon={<XCircle className="w-6 h-6" />} label="ملغاة" value={stats.cancelledReceipts} color="danger" />
            <StatCard icon={<Building2 className="w-6 h-6" />} label="مكاتب نشطة" value={stats.activeOffices} color="navy" />
          </>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "إنشاء إيصال جديد", href: "/admin/transfers/new", icon: <Plus className="w-5 h-5" />, color: "sudan-bg-navy" },
          { label: "إدارة الوكلاء", href: "/admin/agents", icon: <Building2 className="w-5 h-5" />, color: "bg-green-600" },
          { label: "التقارير والإحصائيات", href: "/admin/reports", icon: <BarChart3 className="w-5 h-5" />, color: "bg-purple-600" },
          { label: "سجل العمليات", href: "/admin/audit-log", icon: <ScrollText className="w-5 h-5" />, color: "bg-amber-500" },
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
              <div className="space-y-1">
                {recent.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-3 px-3 border-b last:border-0 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                    onClick={() => setLocation(`/admin/transfers/${r.id}`)}
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
    </AdminLayout>
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
