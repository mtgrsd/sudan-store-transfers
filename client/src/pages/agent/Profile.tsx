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
  USD: "دولار أمريكي",
  EUR: "يورو",
  USDT: "تيثر",
  AED: "درهم إماراتي",
  SAR: "ريال سعودي",
  SDG: "جنيه سوداني",
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  USDT: "💎",
  AED: "🇦🇪",
  SAR: "🇸🇦",
  SDG: "🇸🇩",
};

export default function AgentProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) setLocation("/");
  }, [user, setLocation]);

  const { data: transfers = [] } = trpc.receipt.getMyOfficeReceipts.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) return null;

  const wallets: any[] = [];
  const disbursedTransfers = (transfers as any[]).filter((t: any) => t.status === "received");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        fontFamily: "'Cairo', sans-serif",
        direction: "rtl",
      }}
    >
      <SudanStoreHeader navItems={AGENT_NAV} currentPath="/agent/profile" />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem" }}>
        {/* Profile Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a2e6b 0%, #2563eb 100%)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
            marginBottom: "1rem",
            color: "white",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
              fontSize: "2rem",
            }}
          >
            👤
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "0.25rem" }}>
            {user.name || "الوكيل"}
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "0.5rem" }}>
            {"وكيل معتمد"}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: "9999px",
              padding: "0.25rem 0.75rem",
              fontSize: "0.75rem",
              fontFamily: "monospace",
            }}
          >
            🏢 وكيل معتمد
          </div>
        </div>

        {/* Info Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1.25rem",
            padding: "1.25rem",
            marginBottom: "1rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#1a2e6b",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📋</span>
            <span>معلومات الحساب</span>
          </div>

          {[
            { label: "الاسم الكامل", value: user.name || "-" },
            { label: "البريد الإلكتروني", value: user.email || "-" },
            { label: "رقم الهاتف", value: user.phone || "-" },
            { label: "المكتب", value: "-" },
            { label: "الدولة", value: "-" },
            { label: "الحالة", value: "نشط ✅" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{item.label}</span>
              <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#1f2937" }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Wallets */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1.25rem",
            padding: "1.25rem",
            marginBottom: "1rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#1a2e6b",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>💰</span>
            <span>أرصدة المحافظ</span>
          </div>

          {wallets.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {wallets.map((wallet: any) => (
                <div
                  key={wallet.currencyCode}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.875rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.875rem",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ fontSize: "1.5rem" }}>
                      {CURRENCY_FLAGS[wallet.currencyCode] || "💵"}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "#1f2937" }}>
                        {CURRENCY_NAMES[wallet.currencyCode] || wallet.currencyCode}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                        {wallet.currencyCode}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "800",
                        color: parseFloat(wallet.balance || "0") > 0 ? "#065f46" : "#374151",
                      }}
                    >
                      {parseFloat(wallet.balance || "0").toLocaleString("ar-SA")}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>الرصيد الحالي</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
                color: "#9ca3af",
                fontSize: "0.875rem",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💳</div>
              <div>لا توجد محافظ مفعّلة</div>
            </div>
          )}
        </div>

        {/* Statement of Account */}
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
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#1a2e6b",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📊</span>
            <span>كشف الحساب - آخر العمليات</span>
          </div>

          {disbursedTransfers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {disbursedTransfers.slice(0, 10).map((transfer: any) => (
                <div
                  key={transfer.id}
                  style={{
                    padding: "0.875rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "0.75rem",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.4rem",
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
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.1rem" }}>
                        {new Date(transfer.createdAt).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#065f46" }}>
                        +{parseFloat(transfer.amount).toLocaleString("ar-SA")}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                        {transfer.currencyCode}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      backgroundColor: "#d1fae5",
                      borderRadius: "9999px",
                      padding: "0.15rem 0.5rem",
                      fontSize: "0.65rem",
                      color: "#065f46",
                      fontWeight: "600",
                    }}
                  >
                    ✅ تم الصرف
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#9ca3af",
                fontSize: "0.875rem",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
              <div>لا توجد عمليات مصروفة بعد</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
