import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import SudanStoreHeader from "@/components/SudanStoreHeader";
import TransferReceipt from "@/components/TransferReceipt";

const CURRENCIES = ["USD", "EUR", "USDT", "AED", "SAR", "SDG"];

const CURRENCY_NAMES: Record<string, string> = {
  USD: "دولار أمريكي",
  EUR: "يورو",
  USDT: "تيثر",
  AED: "درهم إماراتي",
  SAR: "ريال سعودي",
  SDG: "جنيه سوداني",
};

const ADMIN_NAV = [
  { label: "الرئيسية", href: "/admin" },
  { label: "الوكلاء", href: "/admin/agents" },
  { label: "العملاء", href: "/admin/customers" },
  { label: "الحوالات", href: "/admin/transfers" },
  { label: "سجل التدقيق", href: "/admin/audit-log" },
];

export default function AdminTransfers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdTransfer, setCreatedTransfer] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [formData, setFormData] = useState({
    agentId: "",
    customerId: "",
    amount: "",
    currencyCode: "USD",
    notes: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: transfers = [], isLoading, refetch } = trpc.transfer.getPending.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const { data: agents = [] } = trpc.agent.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: customers = [] } = trpc.customer.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const createTransferMutation = trpc.transfer.create.useMutation({
    onSuccess: (data) => {
      setCreatedTransfer(data.transfer);
      setShowCreateForm(false);
      setFormData({ agentId: "", customerId: "", amount: "", currencyCode: "USD", notes: "" });
      refetch();
      toast.success("تم إنشاء الحوالة بنجاح!");
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء الحوالة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTransferMutation.mutate({
      agentId: parseInt(formData.agentId) || 0,
      customerId: parseInt(formData.customerId) || 0,
      amount: formData.amount,
      currencyCode: formData.currencyCode,
      notes: formData.notes,
    });
  };

  if (!user || user.role !== "admin") return null;

  const selectedAgent = agents.find((a: any) => a.id === parseInt(formData.agentId));
  const selectedCustomer = customers.find((c: any) => c.id === parseInt(formData.customerId));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Cairo', sans-serif" }}>
      <SudanStoreHeader navItems={ADMIN_NAV} currentPath="/admin/transfers" />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Page Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#1a2e6b" }}>
              💸 إدارة الحوالات
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.2rem" }}>
              إنشاء وإدارة التحويلات المالية
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              background: showCreateForm
                ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                : "linear-gradient(135deg, #1a2e6b, #2563eb)",
              color: "white",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.9rem",
              fontWeight: "700",
              fontFamily: "'Cairo', sans-serif",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(26,46,107,0.3)",
            }}
          >
            {showCreateForm ? "✕ إلغاء" : "➕ إنشاء حوالة جديدة"}
          </button>
        </div>

        {/* Created Transfer Success Card */}
        {createdTransfer && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
              border: "2px solid #bbf7d0",
              boxShadow: "0 4px 20px rgba(5,150,105,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem" }}>✅</span>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#065f46" }}>
                  تم إنشاء الحوالة بنجاح!
                </h3>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setShowReceipt(true)}
                  style={{
                    background: "#1a2e6b",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    fontFamily: "'Cairo', sans-serif",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  🧾 طباعة الإيصال
                </button>
                <button
                  onClick={() => setCreatedTransfer(null)}
                  style={{
                    background: "#f1f5f9",
                    color: "#374151",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    fontFamily: "'Cairo', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  ✕ إغلاق
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
              }}
            >
              {[
                { label: "رقم الإشعار", value: createdTransfer.notificationNumber, mono: true, highlight: true },
                { label: "الرقم السري", value: createdTransfer.secretCode, mono: true, highlight: true },
                { label: "معرّف الحوالة", value: createdTransfer.transferId, mono: true, highlight: false },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    backgroundColor: item.highlight ? "#f0fdf4" : "#f8fafc",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    border: item.highlight ? "2px solid #bbf7d0" : "1px solid #e2e8f0",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: "0.4rem" }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: item.highlight ? "1.1rem" : "0.8rem",
                      fontWeight: "800",
                      color: item.highlight ? "#065f46" : "#374151",
                      fontFamily: item.mono ? "monospace" : "'Cairo', sans-serif",
                      letterSpacing: item.mono ? "0.1em" : "normal",
                      wordBreak: "break-all",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                backgroundColor: "#fef3c7",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
                color: "#92400e",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>⚠️</span>
              <span>احتفظ بالرقم السري وأرسله للوكيل بشكل آمن. لن يُعرض مرة أخرى.</span>
            </div>
          </div>
        )}

        {/* Create Transfer Form */}
        {showCreateForm && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "2px solid #bfdbfe",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "700",
                color: "#1a2e6b",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>📝</span> إنشاء حوالة جديدة
            </h3>
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                {/* Agent */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    الوكيل المستلم *
                  </label>
                  <select
                    required
                    value={formData.agentId}
                    onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                    style={{
                      width: "100%",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e7eb",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.875rem",
                      fontFamily: "'Cairo', sans-serif",
                      color: "#1f2937",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="">اختر الوكيل</option>
                    {agents.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.agentName} ({agent.agentCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    العميل المرسل *
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    style={{
                      width: "100%",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e7eb",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.875rem",
                      fontFamily: "'Cairo', sans-serif",
                      color: "#1f2937",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="">اختر العميل</option>
                    {customers.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    المبلغ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="أدخل المبلغ"
                    style={{
                      width: "100%",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e7eb",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.875rem",
                      fontFamily: "'Cairo', sans-serif",
                      color: "#1f2937",
                    }}
                  />
                </div>

                {/* Currency */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    العملة *
                  </label>
                  <select
                    value={formData.currencyCode}
                    onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                    style={{
                      width: "100%",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e7eb",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.875rem",
                      fontFamily: "'Cairo', sans-serif",
                      color: "#1f2937",
                      backgroundColor: "white",
                    }}
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr} - {CURRENCY_NAMES[curr]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    الملاحظات
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أدخل ملاحظاتك (اختياري)"
                    rows={2}
                    style={{
                      width: "100%",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e7eb",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.875rem",
                      fontFamily: "'Cairo', sans-serif",
                      color: "#1f2937",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              {/* Preview */}
              {formData.agentId && formData.amount && (
                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    marginBottom: "1rem",
                    border: "1px solid #bfdbfe",
                    fontSize: "0.85rem",
                    color: "#1e40af",
                  }}
                >
                  <strong>معاينة:</strong> إرسال {formData.amount} {formData.currencyCode} إلى{" "}
                  {selectedAgent?.agentName || "الوكيل"} من{" "}
                  {selectedCustomer?.customerName || "العميل"}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="submit"
                  disabled={createTransferMutation.isPending}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #1a2e6b, #2563eb)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.75rem",
                    padding: "0.75rem",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    fontFamily: "'Cairo', sans-serif",
                    cursor: createTransferMutation.isPending ? "not-allowed" : "pointer",
                    opacity: createTransferMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {createTransferMutation.isPending ? "⏳ جاري الإنشاء..." : "✅ إنشاء الحوالة"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#f1f5f9",
                    color: "#374151",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    fontSize: "0.9rem",
                    fontFamily: "'Cairo', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transfers List */}
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
              📋 قائمة الحوالات
            </h3>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                backgroundColor: "#f1f5f9",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
              }}
            >
              {transfers.length} حوالة
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["رقم الإشعار", "المبلغ", "العملة", "الحالة", "التاريخ", "إجراء"].map((h) => (
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
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                      ⏳ جاري التحميل...
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                      لا توجد حوالات حالياً
                    </td>
                  </tr>
                ) : (
                  transfers.map((transfer: any) => (
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
                            backgroundColor:
                              transfer.status === "pending" ? "#fef3c7" : "#d1fae5",
                            color:
                              transfer.status === "pending" ? "#92400e" : "#065f46",
                          }}
                        >
                          {transfer.status === "pending" ? "⏳ قيد الانتظار" : "✅ تم الصرف"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#6b7280" }}>
                        {new Date(transfer.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <button
                          onClick={() => {
                            setCreatedTransfer({
                              ...transfer,
                              notificationNumber: transfer.notificationNumber,
                            });
                            setShowReceipt(true);
                          }}
                          style={{
                            background: "#eff6ff",
                            color: "#1a2e6b",
                            border: "1px solid #bfdbfe",
                            borderRadius: "0.4rem",
                            padding: "0.3rem 0.75rem",
                            fontSize: "0.75rem",
                            fontFamily: "'Cairo', sans-serif",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          🧾 إيصال
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Receipt Modal */}
      {showReceipt && createdTransfer && (
        <TransferReceipt
          transfer={{
            notificationNumber: createdTransfer.notificationNumber,
            secretCode: createdTransfer.secretCode,
            transferId: createdTransfer.transferId,
            amount: createdTransfer.amount || "0",
            currencyCode: createdTransfer.currencyCode || "USD",
            status: createdTransfer.status || "pending",
            notes: createdTransfer.notes,
            createdAt: createdTransfer.createdAt || new Date(),
            agentName: selectedAgent?.agentName,
          }}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
