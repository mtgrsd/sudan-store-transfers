import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

const CURRENCY_NAMES: Record<string, string> = {
  USD: "دولار أمريكي",
  EUR: "يورو",
  USDT: "تيثر",
  AED: "درهم إماراتي",
  SAR: "ريال سعودي",
  SDG: "جنيه سوداني",
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_deposit: { label: "قيد الانتظار", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  pending_receipt: { label: "قيد الانتظار", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  pending: { label: "قيد الانتظار", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  confirmed: { label: "تم الصرف", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  received: { label: "تم الاستلام", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  disbursed: { label: "تم الصرف", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  cancelled: { label: "ملغاة", color: "#991b1b", bg: "#fee2e2", icon: "❌" },
  expired: { label: "منتهية الصلاحية", color: "#7c2d12", bg: "#fed7aa", icon: "⚠️" },
};

export default function VerifyTransfer() {
  const params = useParams<{ notificationNumber?: string }>();
  const [, setLocation] = useLocation();
  const [inputNumber, setInputNumber] = useState(params.notificationNumber || "");
  const [searchNumber, setSearchNumber] = useState(params.notificationNumber || "");
  const [searched, setSearched] = useState(!!params.notificationNumber);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const { data: transfer, isLoading, error, refetch } = trpc.receipt.publicVerify.useQuery(
    { notificationNumber: searchNumber },
    { enabled: searched && !!searchNumber, retry: false }
  );

  const confirmMutation = trpc.receipt.confirmWithPin.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد الاستلام بنجاح!");
      setPinInput("");
      setShowConfirmDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تأكيد الاستلام");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNumber.trim()) return;
    setSearchNumber(inputNumber.trim().toUpperCase());
    setSearched(true);
  };

  const handleConfirmReceipt = () => {
    if (pinInput.length !== 4) {
      toast.error("الرقم السري يجب أن يكون 4 أرقام");
      return;
    }
    if (!transfer) return;
    confirmMutation.mutate({
      notificationNumber: transfer.notificationNumber,
      pin: pinInput,
    });
  };

  const statusInfo = transfer ? (STATUS_MAP[transfer.status] || STATUS_MAP.pending_deposit) : null;
  const canConfirm = transfer && transfer.status === "pending_deposit" && !transfer.receivedAt;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a2e6b 0%, #0f1d4a 50%, #1a2e6b 100%)",
        fontFamily: "'Cairo', sans-serif",
        direction: "rtl",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
          onClick={() => setLocation("/")}
        >
          <img
            src={LOGO_URL}
            alt="متجر السودان"
            style={{ height: "40px", width: "auto", objectFit: "contain" }}
          />
          <div>
            <div style={{ fontSize: "1rem", fontWeight: "800", color: "white" }}>متجر السودان</div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.65)" }}>
              Sudan Store · التحقق من الحوالة
            </div>
          </div>
        </div>
        <button
          onClick={() => setLocation("/")}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "0.5rem",
            color: "white",
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontFamily: "'Cairo', sans-serif",
            cursor: "pointer",
          }}
        >
          الرئيسية
        </button>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "480px" }}>
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "white", marginBottom: "0.5rem" }}>
              التحقق من الحوالة
            </h1>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>
              أدخل رقم الإشعار للتحقق من حالة الحوالة
            </p>
          </div>

          {/* Search Form */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1.25rem",
              padding: "1.5rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              marginBottom: "1.5rem",
            }}
          >
            <form onSubmit={handleSearch}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  color: "#1a2e6b",
                  marginBottom: "0.5rem",
                }}
              >
                رقم الإشعار
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value.toUpperCase())}
                  placeholder="مثال: SD69384752"
                  style={{
                    flex: 1,
                    borderRadius: "0.75rem",
                    border: "2px solid #e5e7eb",
                    padding: "0.75rem 1rem",
                    fontSize: "0.9rem",
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    color: "#1f2937",
                    outline: "none",
                    textAlign: "center",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#1a2e6b"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                />
                <button
                  type="submit"
                  disabled={!inputNumber.trim() || isLoading}
                  style={{
                    background: "linear-gradient(135deg, #1a2e6b, #2563eb)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.875rem",
                    fontWeight: "700",
                    fontFamily: "'Cairo', sans-serif",
                    cursor: !inputNumber.trim() || isLoading ? "not-allowed" : "pointer",
                    opacity: !inputNumber.trim() || isLoading ? 0.7 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isLoading ? "⏳" : "تحقق"}
                </button>
              </div>
            </form>
          </div>

          {/* Result */}
          {searched && (
            <>
              {isLoading && (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "1.25rem",
                    padding: "2rem",
                    textAlign: "center",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
                  <p style={{ color: "#6b7280", fontFamily: "'Cairo', sans-serif" }}>جاري التحقق...</p>
                </div>
              )}

              {error && (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "1.25rem",
                    padding: "2rem",
                    textAlign: "center",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                    border: "2px solid #fee2e2",
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "800",
                      color: "#991b1b",
                      marginBottom: "0.5rem",
                    }}
                  >
                    الحوالة غير متاحة
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
                    {error.message || "لم يتم العثور على الحوالة بهذا الرقم"}
                  </p>
                  <div
                    style={{
                      backgroundColor: "#fef2f2",
                      borderRadius: "0.75rem",
                      padding: "0.75rem",
                      fontSize: "0.8rem",
                      color: "#991b1b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      justifyContent: "center",
                    }}
                  >
                    <span>🛡️</span>
                    <span>تم منع التكرار بنجاح</span>
                  </div>
                </div>
              )}

              {transfer && statusInfo && (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "1.25rem",
                    padding: "1.5rem",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                    border: `2px solid ${transfer.status === "pending_deposit" ? "#fcd34d" : transfer.status === "received" ? "#6ee7b7" : "#fca5a5"}`,
                  }}
                >
                  {/* Status Badge */}
                  <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{statusInfo.icon}</div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color,
                        borderRadius: "9999px",
                        padding: "0.4rem 1.25rem",
                        fontSize: "0.875rem",
                        fontWeight: "700",
                      }}
                    >
                      {statusInfo.label}
                    </div>
                  </div>

                  {/* Transfer Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                      { label: "رقم الإشعار", value: transfer.notificationNumber, mono: true },
                      {
                        label: "المبلغ",
                        value: `${parseFloat(transfer.amount).toLocaleString("ar-SA")} ${transfer.currencyCode}`,
                        highlight: true,
                      },
                      {
                        label: "العملة",
                        value: `${transfer.currencyCode} - ${CURRENCY_NAMES[transfer.currencyCode] || transfer.currencyCode}`,
                      },
                      {
                        label: "تاريخ الإنشاء",
                        value: new Date(transfer.createdAt).toLocaleString("ar-SA"),
                      },
                      transfer.receivedAt
                        ? {
                            label: "تاريخ الاستلام",
                            value: new Date(transfer.receivedAt).toLocaleString("ar-SA"),
                          }
                        : null,
                    ]
                      .filter(Boolean)
                      .map((item: any) => (
                        <div
                          key={item.label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem",
                            backgroundColor: item.highlight ? "#eff6ff" : "#f8fafc",
                            borderRadius: "0.75rem",
                            border: item.highlight ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                          }}
                        >
                          <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: "600" }}>
                            {item.label}
                          </span>
                          <span
                            style={{
                              fontSize: item.highlight ? "1rem" : "0.875rem",
                              fontWeight: item.highlight ? "800" : "600",
                              color: item.highlight ? "#1a2e6b" : "#1f2937",
                              fontFamily: item.mono ? "monospace" : "'Cairo', sans-serif",
                              letterSpacing: item.mono ? "0.1em" : "normal",
                            }}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* Confirm Button - Only show if pending and not received */}
                  {canConfirm && (
                    <div
                      style={{
                        marginTop: "1.5rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <button
                        onClick={() => setShowConfirmDialog(true)}
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "white",
                          border: "none",
                          borderRadius: "0.75rem",
                          padding: "0.75rem 1.25rem",
                          fontSize: "0.875rem",
                          fontWeight: "700",
                          fontFamily: "'Cairo', sans-serif",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, #059669, #047857)";
                          (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, #10b981, #059669)";
                          (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                        }}
                      >
                        ✅ تأكيد الاستلام
                      </button>
                    </div>
                  )}

                  {/* Security Note */}
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.75rem",
                      backgroundColor: "#f0f9ff",
                      borderRadius: "0.75rem",
                      fontSize: "0.75rem",
                      color: "#0369a1",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>🔒</span>
                    <span>
                      {transfer.status === "pending_deposit"
                        ? "الإيصال صالح وبانتظار الاستلام من المكتب المحدد"
                        : transfer.status === "received"
                        ? "تم استلام هذا الإيصال بنجاح ولا يمكن استلامه مرة أخرى"
                        : "هذا الإيصال ملغى أو منتهي الصلاحية"}
                    </span>
                  </div>

                  {/* Sudan Store Branding */}
                  <div
                    style={{
                      marginTop: "1.5rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <img src={LOGO_URL} alt="متجر السودان" style={{ height: "24px", width: "auto" }} />
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      متجر السودان · نظام التحويلات المالية
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowConfirmDialog(false);
            setPinInput("");
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1.25rem",
              padding: "2rem",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#1a2e6b", marginBottom: "1rem", textAlign: "center" }}>
              تأكيد الاستلام
            </h2>

            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem", textAlign: "center" }}>
              أدخل الرقم السري المكون من 4 أرقام لتأكيد استلام المبلغ
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "700", color: "#1a2e6b", marginBottom: "0.5rem" }}>
                الرقم السري
              </label>
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="0000"
                maxLength={4}
                style={{
                  width: "100%",
                  borderRadius: "0.75rem",
                  border: "2px solid #e5e7eb",
                  padding: "0.75rem 1rem",
                  fontSize: "1.5rem",
                  fontFamily: "monospace",
                  letterSpacing: "0.5em",
                  color: "#1f2937",
                  outline: "none",
                  textAlign: "center",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#1a2e6b"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPinInput("");
                }}
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                  backgroundColor: "white",
                  color: "#1f2937",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmReceipt}
                disabled={pinInput.length < 4 || confirmMutation.isPending}
                style={{
                  borderRadius: "0.75rem",
                  border: "none",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: pinInput.length < 4 || confirmMutation.isPending ? "not-allowed" : "pointer",
                  backgroundColor: pinInput.length < 4 || confirmMutation.isPending ? "#d1d5db" : "linear-gradient(135deg, #10b981, #059669)",
                  color: "white",
                  opacity: pinInput.length < 4 || confirmMutation.isPending ? 0.6 : 1,
                }}
              >
                {confirmMutation.isPending ? "جاري التأكيد..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
