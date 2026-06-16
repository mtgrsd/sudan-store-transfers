import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import SudanStoreHeader from "@/components/SudanStoreHeader";

const ADMIN_NAV = [
  { label: "الرئيسية", href: "/admin" },
  { label: "الوكلاء", href: "/admin/agents" },
  { label: "العملاء", href: "/admin/customers" },
  { label: "الحوالات", href: "/admin/transfers" },
  { label: "سجل التدقيق", href: "/admin/audit-log" },
];

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  USDT: "💎",
  AED: "🇦🇪",
  SAR: "🇸🇦",
  SDG: "🇸🇩",
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "قيد الانتظار", color: "#92400e", bg: "#fef3c7" },
  confirmed: { label: "مؤكد", color: "#065f46", bg: "#d1fae5" },
  disbursed: { label: "تم الصرف", color: "#065f46", bg: "#d1fae5" },
  cancelled: { label: "ملغي", color: "#991b1b", bg: "#fee2e2" },
};

export default function AdminAgentStatement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ agentId: string }>();
  const agentId = parseInt(params.agentId || "0");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: agent, isLoading: agentLoading } = trpc.agent.getById.useQuery(
    { agentId },
    { enabled: !!user && user.role === "admin" && agentId > 0 }
  );

  const { data: agentTransfers = [], isLoading: transfersLoading } = trpc.agent.getAgentTransfers.useQuery(
    { agentId },
    { enabled: !!user && user.role === "admin" && agentId > 0 }
  );

  if (!user || user.role !== "admin") return null;

  const wallets: any[] = (agent as any)?.wallets || [];
  const disbursedTransfers = (agentTransfers as any[]).filter(
    (t: any) => t.status === "disbursed" || t.status === "confirmed"
  );
  const totalDisbursed = disbursedTransfers.length;
  const pendingCount = (agentTransfers as any[]).filter((t: any) => t.status === "pending").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        fontFamily: "'Cairo', sans-serif",
        direction: "rtl",
      }}
    >
      <SudanStoreHeader navItems={ADMIN_NAV} currentPath="/admin/agents" />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Back Button */}
        <button
          onClick={() => setLocation("/admin/agents")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "none",
            border: "none",
            color: "#2563eb",
            fontFamily: "'Cairo', sans-serif",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "1rem",
            padding: "0.5rem 0",
          }}
        >
          ← العودة إلى قائمة الوكلاء
        </button>

        {agentLoading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
            <div>جاري التحميل...</div>
          </div>
        ) : !agent ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>❌</div>
            <div>لم يتم العثور على الوكيل</div>
          </div>
        ) : (
          <>
            {/* Agent Profile Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #1a2e6b 0%, #2563eb 100%)",
                borderRadius: "1rem",
                padding: "1.5rem 2rem",
                marginBottom: "1.5rem",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                boxShadow: "0 4px 20px rgba(26,46,107,0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.75rem",
                  }}
                >
                  🏢
                </div>
                <div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "800" }}>
                    {(agent as any).agentName}
                  </div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                    {(agent as any).officeName || "وكيل معتمد"} · {(agent as any).city || ""} {(agent as any).country || ""}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: "9999px",
                      padding: "0.2rem 0.75rem",
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      marginTop: "0.4rem",
                    }}
                  >
                    🔑 {(agent as any).agentCode}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                {[
                  { label: "إجمالي الحوالات", value: (agentTransfers as any[]).length, icon: "💸" },
                  { label: "تم الصرف", value: totalDisbursed, icon: "✅" },
                  { label: "قيد الانتظار", value: pendingCount, icon: "⏳" },
                ].map((stat) => (
                  <div key={stat.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem" }}>{stat.icon}</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>{stat.value}</div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wallets Grid */}
            {wallets.length > 0 && (
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
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    color: "#1a2e6b",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  💰 أرصدة المحافظ
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  {wallets.map((wallet: any) => (
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
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
                        {CURRENCY_FLAGS[wallet.currencyCode] || "💵"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                        {wallet.currencyCode}
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "800",
                          color: parseFloat(wallet.balance || "0") > 0 ? "#065f46" : "#374151",
                        }}
                      >
                        {parseFloat(wallet.balance || "0").toLocaleString("ar-SA")}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.2rem" }}>
                        الرصيد الحالي
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transfers Table */}
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
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    color: "#1a2e6b",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  📋 كشف حساب الوكيل
                </h3>
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#eff6ff",
                    color: "#1a2e6b",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontWeight: "600",
                  }}
                >
                  {(agentTransfers as any[]).length} حوالة
                </span>
              </div>

              {transfersLoading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
                  <div>جاري التحميل...</div>
                </div>
              ) : (agentTransfers as any[]).length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
                  <div style={{ fontSize: "0.875rem" }}>لا توجد حوالات لهذا الوكيل بعد</div>
                </div>
              ) : (
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
                      {(agentTransfers as any[]).map((transfer: any) => {
                        const statusInfo = STATUS_MAP[transfer.status] || {
                          label: transfer.status,
                          color: "#374151",
                          bg: "#f1f5f9",
                        };
                        return (
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
                            <td
                              style={{
                                padding: "0.75rem 1rem",
                                fontWeight: "700",
                                color: "#065f46",
                                fontSize: "0.95rem",
                              }}
                            >
                              {parseFloat(transfer.amount).toLocaleString("ar-SA")}
                            </td>
                            <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                {CURRENCY_FLAGS[transfer.currencyCode] || "💵"}
                                {transfer.currencyCode}
                              </span>
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
                                  backgroundColor: statusInfo.bg,
                                  color: statusInfo.color,
                                }}
                              >
                                {statusInfo.label}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#6b7280" }}>
                              {new Date(transfer.createdAt).toLocaleDateString("ar-SA", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
