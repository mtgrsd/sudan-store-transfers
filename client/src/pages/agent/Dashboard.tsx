import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import SudanStoreHeader from "@/components/SudanStoreHeader";

const AGENT_NAV = [
  { label: "الرئيسية", href: "/agent" },
  { label: "الحوالات", href: "/agent/transfers" },
  { label: "حسابي", href: "/agent/profile" },
];

const CURRENCY_NAMES: Record<string, string> = {
  USD: "دولار",
  EUR: "يورو",
  USDT: "تيثر",
  AED: "درهم",
  SAR: "ريال",
  SDG: "جنيه",
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) setLocation("/");
  }, [user, setLocation]);

  const { data: transfers = [] } = trpc.receipt.getMyOfficeReceipts.useQuery(undefined, { enabled: !!user });
  const { data: enhancedStats } = trpc.office.getEnhancedStats.useQuery(undefined, { enabled: !!user });

  if (!user) return null;

  const pendingTransfers = (transfers as any[]).filter((t: any) => t.status === "pending_deposit");
  const disbursedTransfers = (transfers as any[]).filter((t: any) => t.status === "received");
  const wallets: any[] = [];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        fontFamily: "'Cairo', sans-serif",
        direction: "rtl",
      }}
    >
      <SudanStoreHeader navItems={AGENT_NAV} currentPath="/agent" />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem" }}>
        {/* Welcome Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a2e6b 0%, #2563eb 100%)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
            marginBottom: "1rem",
            color: "white",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: "-20px", left: "-20px", width: "120px", height: "120px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", bottom: "-30px", right: "-30px", width: "150px", height: "150px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "0.25rem" }}>مرحباً بك في متجر السودان</div>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "0.5rem" }}>{user.name || "الوكيل"}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "9999px", padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
              <span>🏢</span><span>وكيل معتمد</span>
            </div>
          </div>
        </div>

        {/* تحذير: إيصالات تنتهي اليوم */}
        {enhancedStats && enhancedStats.expiringToday > 0 && (
          <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "0.875rem", padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#92400e", fontWeight: 600 }}>
            <span>⚠️</span>
            <span>{enhancedStats.expiringToday} إيصال ستنتهي صلاحيتها اليوم</span>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          {[
            { label: "معلق اليوم", value: pendingTransfers.length, icon: "⏳", color: "#92400e" },
            { label: "مستلم اليوم", value: enhancedStats?.todayReceived ?? disbursedTransfers.length, icon: "✅", color: "#065f46" },
            { label: "مستلم هذا الشهر", value: enhancedStats?.monthReceived ?? 0, icon: "📅", color: "#1a2e6b" },
          ].map((stat) => (
            <div key={stat.label} style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.875rem 0.5rem", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "0.25rem", lineHeight: 1.3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* أرصدة المكتب المحسّنة */}
        {enhancedStats && enhancedStats.balances.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1a2e6b", marginBottom: "0.75rem" }}>💰 أرصدة المكتب</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "0.5rem" }}>
              {enhancedStats.balances.map((b: any) => (
                <div key={b.currencyCode} style={{ textAlign: "center", padding: "0.5rem", backgroundColor: "#f8fafc", borderRadius: "0.625rem", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "1rem", fontWeight: "800", color: "#0B1F4D" }}>{parseFloat(b.balance).toLocaleString("ar-SA")}</div>
                  <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "0.2rem" }}>{b.currencyCode}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* إيصالات معلقة حسب العملة */}
        {enhancedStats && enhancedStats.pendingByCurrency.length > 0 && (
          <div style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#9a3412", marginBottom: "0.5rem" }}>⏳ المعلق حسب العملة</div>
            {enhancedStats.pendingByCurrency.map((pc: any) => (
              <div key={pc.currencyCode} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid #fed7aa" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#9a3412" }}>{pc.currencyCode}</span>
                <span style={{ fontSize: "0.8rem", color: "#7c2d12" }}>{parseFloat(pc.total).toLocaleString("ar-SA")} ({pc.count} إيصال)</span>
              </div>
            ))}
          </div>
        )}
        {/* Quick Actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <button
            onClick={() => setLocation("/agent/transfers")}
            style={{
              background: "linear-gradient(135deg, #059669, #047857)",
              color: "white",
              border: "none",
              borderRadius: "1rem",
              padding: "1.25rem 1rem",
              fontSize: "0.875rem",
              fontWeight: "700",
              fontFamily: "'Cairo', sans-serif",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 15px rgba(5,150,105,0.3)",
            }}
          >
            <span style={{ fontSize: "1.75rem" }}>💰</span>
            <span>صرف حوالة</span>
          </button>
          <button
            onClick={() => setLocation("/agent/profile")}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "white",
              border: "none",
              borderRadius: "1rem",
              padding: "1.25rem 1rem",
              fontSize: "0.875rem",
              fontWeight: "700",
              fontFamily: "'Cairo', sans-serif",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
            }}
          >
            <span style={{ fontSize: "1.75rem" }}>📊</span>
            <span>كشف الحساب</span>
          </button>
        </div>

        {/* Pending Transfers */}
        {pendingTransfers.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1.25rem",
              padding: "1.25rem",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  color: "#1a2e6b",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>⏳</span>
                <span>الحوالات المعلقة ({pendingTransfers.length})</span>
              </div>
              <button
                onClick={() => setLocation("/agent/transfers")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "0.75rem",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                عرض الكل ←
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {pendingTransfers.slice(0, 3).map((transfer: any) => (
                <div
                  key={transfer.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    backgroundColor: "#fffbeb",
                    borderRadius: "0.75rem",
                    border: "1px solid #fde68a",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        color: "#1a2e6b",
                      }}
                    >
                      {transfer.notificationNumber}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      {new Date(transfer.createdAt).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: "800", color: "#065f46" }}>
                      {parseFloat(transfer.amount).toLocaleString("ar-SA")}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                      {transfer.currencyCode}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(transfers as any[]).length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              backgroundColor: "white",
              borderRadius: "1.25rem",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
            <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#374151" }}>
              لا توجد حوالات بعد
            </div>
            <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.25rem" }}>
              ستظهر هنا الحوالات المخصصة لك
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
