import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import SudanStoreHeader from "@/components/SudanStoreHeader";

const ADMIN_NAV = [
  { label: "الرئيسية", href: "/admin" },
  { label: "الوكلاء", href: "/admin/agents" },
  { label: "العملاء", href: "/admin/customers" },
  { label: "الحوالات", href: "/admin/transfers" },
  { label: "سجل التدقيق", href: "/admin/audit-log" },
];

const CURRENCIES = ["USD", "EUR", "USDT", "AED", "SAR", "SDG"];
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", USDT: "₮", AED: "د.إ", SAR: "﷼", SDG: "ج.س",
};

export default function AdminAgents() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [formData, setFormData] = useState({
    agentName: "",
    agentCode: "",
    phone: "",
    email: "",
    branch: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: agents = [], isLoading, refetch } = trpc.agent.getAll.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const createAgentMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الوكيل بنجاح");
      setFormData({ agentName: "", agentCode: "", phone: "", email: "", branch: "" });
      setShowAddForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء إضافة الوكيل"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAgentMutation.mutate(formData);
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Cairo', sans-serif" }}>
      <SudanStoreHeader navItems={ADMIN_NAV} currentPath="/admin/agents" />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1a2e6b", marginBottom: "0.25rem" }}>
              🏢 إدارة الوكلاء
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              إدارة وكلاء ومكاتب متجر السودان للتحويلات المالية
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: showAddForm ? "#ef4444" : "linear-gradient(135deg, #1a2e6b 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "'Cairo', sans-serif",
              boxShadow: "0 4px 12px rgba(26,46,107,0.3)",
            }}
          >
            {showAddForm ? "❌ إلغاء" : "➕ إضافة وكيل جديد"}
          </button>
        </div>

        {/* Add Agent Form */}
        {showAddForm && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "2px solid #dbeafe",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1a2e6b", marginBottom: "1.25rem" }}>
              ➕ إضافة وكيل جديد
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                {[
                  { label: "اسم الوكيل *", key: "agentName", type: "text", placeholder: "مثال: علاء الدين شاكر", required: true },
                  { label: "كود الوكيل *", key: "agentCode", type: "text", placeholder: "مثال: AGT001", required: true },
                  { label: "رقم الهاتف", key: "phone", type: "tel", placeholder: "+249123456789", required: false },
                  { label: "البريد الإلكتروني", key: "email", type: "email", placeholder: "agent@example.com", required: false },
                  { label: "الفرع / المكتب", key: "branch", type: "text", placeholder: "مثال: مكتب أبنا", required: false },
                ].map((field) => (
                  <div key={field.key}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#374151", marginBottom: "0.4rem" }}>
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      value={(formData as any)[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.75rem",
                        border: "2px solid #e5e7eb",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        fontFamily: "'Cairo', sans-serif",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="submit"
                  disabled={createAgentMutation.isPending}
                  style={{
                    background: "linear-gradient(135deg, #1a2e6b 0%, #2563eb 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.65rem 1.5rem",
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontFamily: "'Cairo', sans-serif",
                    opacity: createAgentMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {createAgentMutation.isPending ? "⏳ جاري الحفظ..." : "✅ حفظ الوكيل"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.65rem 1.25rem",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Agents Table */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.25rem 1.5rem",
              borderBottom: "2px solid #f1f5f9",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1a2e6b" }}>
              📋 قائمة الوكلاء
            </h3>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "#6b7280",
                backgroundColor: "#f3f4f6",
                padding: "0.25rem 0.75rem",
                borderRadius: "9999px",
              }}
            >
              {agents.length} وكيل
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["اسم الوكيل", "كود الوكيل", "الهاتف", "الفرع", "الأرصدة", "الحالة", "الإجراءات"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "right",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                      ⏳ جاري التحميل...
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "3rem", textAlign: "center" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏢</div>
                      <div style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: "600" }}>
                        لا توجد وكلاء حالياً
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                        اضغط "إضافة وكيل جديد" لبدء إضافة الوكلاء
                      </div>
                    </td>
                  </tr>
                ) : (
                  agents.map((agent: any) => (
                    <tr
                      key={agent.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                    >
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: "700", color: "#1a2e6b", fontSize: "0.9rem" }}>
                          {agent.agentName}
                        </div>
                        {agent.email && (
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{agent.email}</div>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                            fontWeight: "700",
                            color: "#2563eb",
                            backgroundColor: "#eff6ff",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "0.25rem",
                          }}
                        >
                          {agent.agentCode}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#374151" }}>
                        {agent.phone || "-"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#374151" }}>
                        {agent.branch || "-"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                          {agent.wallets && agent.wallets.length > 0 ? (
                            agent.wallets.slice(0, 3).map((w: any) => (
                              <span
                                key={w.currencyCode}
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: "700",
                                  color: "#065f46",
                                  backgroundColor: "#d1fae5",
                                  padding: "0.15rem 0.4rem",
                                  borderRadius: "0.25rem",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {CURRENCY_SYMBOLS[w.currencyCode] || w.currencyCode}{" "}
                                {parseFloat(w.balance || "0").toLocaleString("ar-SA")}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>لا توجد محافظ</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: "9999px",
                            padding: "0.2rem 0.6rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            backgroundColor: agent.isActive !== false ? "#d1fae5" : "#fee2e2",
                            color: agent.isActive !== false ? "#065f46" : "#991b1b",
                          }}
                        >
                          {agent.isActive !== false ? "✅ نشط" : "❌ موقوف"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/admin/agents/${agent.id}`);
                          }}
                          style={{
                            background: "#eff6ff",
                            color: "#1a2e6b",
                            border: "1px solid #bfdbfe",
                            borderRadius: "0.4rem",
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "'Cairo', sans-serif",
                          }}
                        >
                          كشف حساب
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Agent Detail Expanded */}
          {selectedAgent && (
            <div
              style={{
                padding: "1.25rem 1.5rem",
                backgroundColor: "#f8fafc",
                borderTop: "2px solid #e5e7eb",
              }}
            >
              <h4 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1a2e6b", marginBottom: "1rem" }}>
                💼 تفاصيل محافظ الوكيل: {selectedAgent.agentName}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
                {CURRENCIES.map((currency) => {
                  const wallet = selectedAgent.wallets?.find((w: any) => w.currencyCode === currency);
                  return (
                    <div
                      key={currency}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "0.75rem",
                        padding: "0.85rem",
                        border: "2px solid #e5e7eb",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>
                        {CURRENCY_SYMBOLS[currency]}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: "0.2rem" }}>
                        {currency}
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: "800", color: wallet ? "#065f46" : "#9ca3af" }}>
                        {wallet ? parseFloat(wallet.balance || "0").toLocaleString("ar-SA") : "0"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
