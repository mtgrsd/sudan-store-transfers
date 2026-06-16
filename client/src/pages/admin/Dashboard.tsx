import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import SudanStoreHeader from "@/components/SudanStoreHeader";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

const ADMIN_NAV = [
  { label: "الرئيسية", href: "/admin" },
  { label: "الوكلاء", href: "/admin/agents" },
  { label: "العملاء", href: "/admin/customers" },
  { label: "الحوالات", href: "/admin/transfers" },
  { label: "سجل التدقيق", href: "/admin/audit-log" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  USDT: "₮",
  AED: "د.إ",
  SAR: "﷼",
  SDG: "ج.س",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const navigate = (href: string) => setLocation(href);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: pendingTransfers = [] } = trpc.transfer.getPending.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const { data: agents = [] } = trpc.agent.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: stats } = trpc.transfer.getStats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: companyWallets = [] } = trpc.wallet.getCompanyWallets.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  if (!user || user.role !== "admin") return null;

  const completedTransfers = stats?.disbursed ?? 0;
  const totalTransfers = stats?.total ?? pendingTransfers.length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Cairo', sans-serif" }}>
      <SudanStoreHeader navItems={ADMIN_NAV} currentPath="/admin" />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a2e6b 0%, #2563eb 50%, #1a2e6b 100%)",
            borderRadius: "1rem",
            padding: "1.5rem 2rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 4px 20px rgba(26,46,107,0.3)",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "white", marginBottom: "0.25rem" }}>
              مرحباً، {user.name} 👋
            </h2>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.75)" }}>
              لوحة تحكم نظام التحويلات المالية - متجر السودان
            </p>
          </div>
          <img
            src={LOGO_URL}
            alt="متجر السودان"
            style={{ height: "50px", width: "auto", opacity: 0.9 }}
          />
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            {
              label: "إجمالي التحويلات",
              value: totalTransfers,
              icon: "💸",
              color: "#1a2e6b",
              bg: "#eff6ff",
            },
            {
              label: "قيد الانتظار",
              value: pendingTransfers.length,
              icon: "⏳",
              color: "#92400e",
              bg: "#fffbeb",
            },
            {
              label: "تم الصرف",
              value: completedTransfers,
              icon: "✅",
              color: "#065f46",
              bg: "#f0fdf4",
            },
            {
              label: "عدد الوكلاء",
              value: agents.length,
              icon: "🏢",
              color: "#6b21a8",
              bg: "#faf5ff",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "white",
                borderRadius: "0.75rem",
                padding: "1.25rem",
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                border: `2px solid ${stat.bg}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{stat.icon}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    color: stat.color,
                    backgroundColor: stat.bg,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "9999px",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "800", color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Workflow Steps */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "700",
              color: "#1a2e6b",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>⚙️</span> آلية عمل النظام
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {[
              { step: "1", title: "إنشاء الحوالة", desc: "المدير يُنشئ الحوالة", icon: "📝", color: "#1a2e6b" },
              { step: "2", title: "إصدار الإيصال", desc: "رقم إشعار + رمز QR", icon: "🧾", color: "#2563eb" },
              { step: "3", title: "استلام الوكيل", desc: "يرى الحوالة في حسابه", icon: "📥", color: "#7c3aed" },
              { step: "4", title: "التحقق", desc: "مسح QR أو رقم الإشعار", icon: "🔍", color: "#0891b2" },
              { step: "5", title: "تأكيد الصرف", desc: "الوكيل يضغط تأكيد", icon: "✅", color: "#059669" },
              { step: "6", title: "تحديث الرصيد", desc: "إضافة للوكيل، خصم من الشركة", icon: "💰", color: "#d97706" },
              { step: "7", title: "منع التكرار", desc: "الحوالة مصروفة نهائياً", icon: "🔒", color: "#dc2626" },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  border: `2px solid ${item.color}20`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: item.color,
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.5rem",
                  }}
                >
                  {item.step}
                </div>
                <div style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>{item.icon}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: item.color }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "0.65rem", color: "#6b7280", marginTop: "0.2rem" }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            { label: "إنشاء حوالة جديدة", href: "/admin/transfers", icon: "➕", color: "#1a2e6b" },
            { label: "إدارة الوكلاء", href: "/admin/agents", icon: "🏢", color: "#059669" },
            { label: "إدارة العملاء", href: "/admin/customers", icon: "👥", color: "#7c3aed" },
            { label: "سجل التدقيق", href: "/admin/audit-log", icon: "📋", color: "#d97706" },
          ].map((action) => (
            <button
              key={action.href}
              onClick={() => navigate(action.href)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                backgroundColor: "white",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                border: `2px solid ${action.color}20`,
                textDecoration: "none",
                transition: "all 0.2s",
                cursor: "pointer",
                width: "100%",
                textAlign: "right",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = action.color;
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${action.color}20`;
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>{action.icon}</span>
              <span style={{ fontSize: "0.9rem", fontWeight: "700", color: action.color }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Company Wallets - Multi-Currency Balances */}
        {companyWallets.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1a2e6b", marginBottom: "1rem" }}>
              🏦 أرصدة الشركة - متعددة العملات
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
              {companyWallets.map((wallet: any) => (
                <div
                  key={wallet.currencyCode}
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    border: "2px solid #e2e8f0",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
                    {CURRENCY_SYMBOLS[wallet.currencyCode] || wallet.currencyCode}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                    {wallet.currencyCode}
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1a2e6b" }}>
                    {parseFloat(wallet.balance || "0").toLocaleString("ar-SA")}
                  </div>
                  {parseFloat(wallet.frozenBalance || "0") > 0 && (
                    <div style={{ fontSize: "0.65rem", color: "#92400e", marginTop: "0.2rem" }}>
                      مجمد: {parseFloat(wallet.frozenBalance).toLocaleString("ar-SA")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Transfers Table */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              paddingBottom: "1rem",
              borderBottom: "2px solid #f1f5f9",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1a2e6b" }}>
              ⏳ الحوالات المعلقة
            </h3>
            <button
              onClick={() => navigate("/admin/transfers")}
              style={{
                fontSize: "0.8rem",
                color: "#2563eb",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              عرض الكل ←
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["رقم الإشعار", "المبلغ", "العملة", "الحالة", "التاريخ"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "right",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingTransfers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: "0.875rem",
                      }}
                    >
                      لا توجد حوالات معلقة حالياً
                    </td>
                  </tr>
                ) : (
                  pendingTransfers.slice(0, 5).map((transfer: any) => (
                    <tr
                      key={transfer.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td
                        style={{
                          padding: "0.75rem 1rem",
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color: "#1a2e6b",
                        }}
                      >
                        {transfer.notificationNumber}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#065f46" }}>
                        {parseFloat(transfer.amount).toLocaleString("ar-SA")}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>
                        {transfer.currencyCode}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: "9999px",
                            padding: "0.2rem 0.6rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          قيد الانتظار
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#6b7280" }}>
                        {new Date(transfer.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
