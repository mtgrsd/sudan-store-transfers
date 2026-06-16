import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import SudanStoreHeader from "@/components/SudanStoreHeader";

const ADMIN_NAV = [
  { label: "الرئيسية", href: "/admin" },
  { label: "الوكلاء", href: "/admin/agents" },
  { label: "العملاء", href: "/admin/customers" },
  { label: "الحوالات", href: "/admin/transfers" },
  { label: "سجل التدقيق", href: "/admin/audit-log" },
];

const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  CREATE_TRANSFER: { bg: "#dbeafe", color: "#1e40af", label: "إنشاء حوالة" },
  DISBURSE_TRANSFER: { bg: "#d1fae5", color: "#065f46", label: "صرف حوالة" },
  VERIFY_TRANSFER: { bg: "#fef9c3", color: "#854d0e", label: "تحقق من حوالة" },
  CREATE_AGENT: { bg: "#ede9fe", color: "#5b21b6", label: "إضافة وكيل" },
  CREATE_CUSTOMER: { bg: "#fce7f3", color: "#9d174d", label: "إضافة عميل" },
  CANCEL_TRANSFER: { bg: "#fee2e2", color: "#991b1b", label: "إلغاء حوالة" },
  LOGIN: { bg: "#f0fdf4", color: "#166534", label: "تسجيل دخول" },
  LOGOUT: { bg: "#f9fafb", color: "#374151", label: "تسجيل خروج" },
};

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [filterAction, setFilterAction] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: auditLogs = [], isLoading } = trpc.audit.getAll.useQuery(
    { limit: 200, offset: 0 },
    { enabled: !!user && isAdmin }
  );

  if (!user || !isAdmin) return null;

  const filteredLogs = auditLogs.filter((log: any) => {
    const matchesAction = !filterAction || log.action === filterAction;
    const matchesSearch =
      !searchQuery ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userId?.toString().includes(searchQuery);
    return matchesAction && matchesSearch;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map((l: any) => l.action)));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Cairo', sans-serif" }}>
      <SudanStoreHeader navItems={ADMIN_NAV} currentPath="/admin/audit-log" />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1a2e6b", marginBottom: "0.25rem" }}>
            🔍 سجل التدقيق
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            سجل شامل لجميع العمليات المالية والإدارية في النظام
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "إجمالي العمليات", value: auditLogs.length, icon: "📊", color: "#1a2e6b" },
            { label: "حوالات منشأة", value: auditLogs.filter((l: any) => l.action === "CREATE_TRANSFER").length, icon: "💸", color: "#2563eb" },
            { label: "حوالات مصروفة", value: auditLogs.filter((l: any) => l.action === "DISBURSE_TRANSFER").length, icon: "✅", color: "#059669" },
            { label: "عمليات اليوم", value: auditLogs.filter((l: any) => new Date(l.createdAt).toDateString() === new Date().toDateString()).length, icon: "📅", color: "#d97706" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "white",
                borderRadius: "0.75rem",
                padding: "1rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍 البحث في السجل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: "1",
              minWidth: "200px",
              padding: "0.65rem 1rem",
              border: "2px solid #e5e7eb",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontFamily: "'Cairo', sans-serif",
              outline: "none",
              backgroundColor: "white",
            }}
          />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              padding: "0.65rem 1rem",
              border: "2px solid #e5e7eb",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontFamily: "'Cairo', sans-serif",
              outline: "none",
              backgroundColor: "white",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <option value="">جميع العمليات</option>
            {uniqueActions.map((action: any) => (
              <option key={action} value={action}>
                {ACTION_COLORS[action]?.label || action}
              </option>
            ))}
          </select>
        </div>

        {/* Audit Log Table */}
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
              📋 سجل العمليات
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
              {filteredLogs.length} عملية
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["الإجراء", "نوع الكيان", "معرف الكيان", "التفاصيل", "المستخدم", "التاريخ والوقت"].map((h) => (
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
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "3rem", textAlign: "center" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
                      <div style={{ fontSize: "0.9rem", color: "#6b7280", fontWeight: "600" }}>
                        {searchQuery || filterAction ? "لا توجد نتائج مطابقة" : "لا توجد عمليات حالياً"}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => {
                    const actionStyle = ACTION_COLORS[log.action] || { bg: "#f3f4f6", color: "#374151", label: log.action };
                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              borderRadius: "0.4rem",
                              padding: "0.2rem 0.6rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              backgroundColor: actionStyle.bg,
                              color: actionStyle.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {actionStyle.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "#374151" }}>
                          {log.entityType || "-"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          {log.entityId ? (
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
                                color: "#2563eb",
                                backgroundColor: "#eff6ff",
                                padding: "0.15rem 0.4rem",
                                borderRadius: "0.25rem",
                              }}
                            >
                              {log.entityId}
                            </span>
                          ) : "-"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "#6b7280", maxWidth: "250px" }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.details || "-"}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "#374151" }}>
                          {log.userId || "-"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString("ar-SA", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
