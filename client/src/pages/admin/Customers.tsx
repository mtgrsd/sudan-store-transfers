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

export default function AdminCustomers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    phone: "",
    email: "",
    address: "",
    idNumber: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: customers = [], isLoading, refetch } = trpc.customer.getAll.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const createCustomerMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة العميل بنجاح");
      setFormData({ customerId: "", customerName: "", phone: "", email: "", address: "", idNumber: "" });
      setShowAddForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message || "حدث خطأ أثناء إضافة العميل"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate({
      customerId: formData.customerId,
      customerName: formData.customerName,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
    });
  };

  const filteredCustomers = customers.filter((c: any) =>
    !searchQuery ||
    c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  if (!user || user.role !== "admin") return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Cairo', sans-serif" }}>
      <SudanStoreHeader navItems={ADMIN_NAV} currentPath="/admin/customers" />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1a2e6b", marginBottom: "0.25rem" }}>
              👥 إدارة العملاء
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              إدارة بيانات المرسلين والمستفيدين في نظام التحويلات
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
            {showAddForm ? "❌ إلغاء" : "➕ إضافة عميل جديد"}
          </button>
        </div>

        {/* Add Customer Form */}
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
              ➕ إضافة عميل جديد
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                {[
                  { label: "معرف العميل *", key: "customerId", type: "text", placeholder: "مثال: CUS001", required: true },
                  { label: "اسم العميل *", key: "customerName", type: "text", placeholder: "الاسم الكامل", required: true },
                  { label: "رقم الهاتف", key: "phone", type: "tel", placeholder: "+249123456789", required: false },
                  { label: "البريد الإلكتروني", key: "email", type: "email", placeholder: "customer@example.com", required: false },
                  { label: "رقم الهوية / الجواز", key: "idNumber", type: "text", placeholder: "رقم الوثيقة", required: false },
                  { label: "العنوان", key: "address", type: "text", placeholder: "المدينة / الدولة", required: false },
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
                  disabled={createCustomerMutation.isPending}
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
                    opacity: createCustomerMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {createCustomerMutation.isPending ? "⏳ جاري الحفظ..." : "✅ حفظ العميل"}
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

        {/* Search Bar */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="🔍 البحث باسم العميل أو المعرف أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              border: "2px solid #e5e7eb",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontFamily: "'Cairo', sans-serif",
              outline: "none",
              backgroundColor: "white",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Customers Table */}
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
              📋 قائمة العملاء
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
              {filteredCustomers.length} عميل
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["اسم العميل", "معرف العميل", "الهاتف", "البريد الإلكتروني", "تاريخ التسجيل", "الحالة"].map((h) => (
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
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "3rem", textAlign: "center" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>👥</div>
                      <div style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: "600" }}>
                        {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد عملاء حالياً"}
                      </div>
                      {!searchQuery && (
                        <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                          اضغط "إضافة عميل جديد" لبدء إضافة العملاء
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer: any) => (
                    <tr
                      key={customer.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: "700", color: "#1a2e6b", fontSize: "0.9rem" }}>
                          {customer.customerName}
                        </div>
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
                          {customer.customerId}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#374151" }}>
                        {customer.phone || "-"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#374151" }}>
                        {customer.email || "-"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "#6b7280" }}>
                        {customer.createdAt
                          ? new Date(customer.createdAt).toLocaleDateString("ar-SA")
                          : "-"}
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
                            backgroundColor: "#d1fae5",
                            color: "#065f46",
                          }}
                        >
                          ✅ نشط
                        </span>
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
