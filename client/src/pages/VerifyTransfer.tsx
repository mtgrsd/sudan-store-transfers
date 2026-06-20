import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import QRScanner from "@/components/QRScanner";

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
  pending: { label: "قيد الانتظار", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  pending_deposit: { label: "بانتظار الإيداع", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  confirmed: { label: "تم الاستلام", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  disbursed: { label: "تم الاستلام", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  received: { label: "تم الاستلام", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  cancelled: { label: "ملغاة", color: "#991b1b", bg: "#fee2e2", icon: "❌" },
  expired: { label: "منتهية الصلاحية", color: "#374151", bg: "#f3f4f6", icon: "⌛" },
};

export default function VerifyTransfer() {
  const params = useParams<{ notificationNumber?: string }>();
  const [, setLocation] = useLocation();
  const [inputNumber, setInputNumber] = useState(params.notificationNumber || "");
  const [searchNumber, setSearchNumber] = useState(params.notificationNumber || "");
  const [searched, setSearched] = useState(!!params.notificationNumber);
  const [showQR, setShowQR] = useState(false);

  const handleQRScan = (result: string) => {
    // استخراج رقم الإشعار من URL أو القيمة المباشرة
    let code = result.trim();
    const urlMatch = code.match(/\/verify\/([A-Z0-9]+)/i);
    if (urlMatch) code = urlMatch[1].toUpperCase();
    setShowQR(false);
    setInputNumber(code);
    setSearchNumber(code);
    setSearched(true);
  };

  const { data: transfer, isLoading, error } = trpc.receipt.publicVerify.useQuery(
    { notificationNumber: searchNumber },
    { enabled: searched && !!searchNumber, retry: false }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNumber.trim()) return;
    setSearchNumber(inputNumber.trim().toUpperCase());
    setSearched(true);
  };

  const statusInfo = transfer ? (STATUS_MAP[transfer.status] || STATUS_MAP.pending) : null;

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
            {showQR ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <span style={{ fontWeight: "700", color: "#1a2e6b", fontSize: "0.9rem" }}>📷 مسح QR Code</span>
                  <button
                    onClick={() => setShowQR(false)}
                    style={{ background: "#f1f5f9", border: "none", borderRadius: "0.5rem", padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", fontFamily: "'Cairo', sans-serif" }}
                  >
                    إلغاء
                  </button>
                </div>
                <QRScanner onScan={handleQRScan} onClose={() => setShowQR(false)} />
              </div>
            ) : (
              <form onSubmit={handleSearch}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "700", color: "#1a2e6b", marginBottom: "0.5rem" }}>
                  رقم الإشعار
                </label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
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
              {/* زر مسح QR بالكاميرا */}
              <button
                type="button"
                onClick={() => setShowQR(true)}
                style={{
                  width: "100%",
                  marginTop: "0.75rem",
                  background: "#f8fafc",
                  color: "#1a2e6b",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "0.75rem",
                  padding: "0.65rem",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <span>📷</span>
                <span>مسح QR Code بالكاميرا</span>
              </button>
            </form>
            )}
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
                  {/* Step 7: Prevent reuse - show clear error */}
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
    </div>
  );
}
