import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import SudanStoreHeader from "@/components/SudanStoreHeader";
import TransferReceipt from "@/components/TransferReceipt";
import QRScanner from "@/components/QRScanner";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

const AGENT_NAV = [
  { label: "الرئيسية", href: "/agent" },
  { label: "الحوالات", href: "/agent/transfers" },
  { label: "حسابي", href: "/agent/profile" },
];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: "بانتظار الإيداع", color: "#92400e", bg: "#fef3c7" },
  pending_deposit: { label: "بانتظار الإيداع", color: "#92400e", bg: "#fef3c7" },
  received:        { label: "تم الاستلام",     color: "#065f46", bg: "#d1fae5" },
  disbursed:       { label: "تم الاستلام",     color: "#065f46", bg: "#d1fae5" },
  cancelled:       { label: "ملغاة",           color: "#991b1b", bg: "#fee2e2" },
  expired:         { label: "منتهية الصلاحية", color: "#374151", bg: "#f3f4f6" },
};

export default function AgentTransfers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Step tracking: 'list' | 'search' | 'verify' | 'confirm' | 'success' | 'duplicate'
  const [step, setStep] = useState<"list" | "search" | "verify" | "confirm" | "success" | "duplicate">("list");
  const [searchInput, setSearchInput] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [foundTransfer, setFoundTransfer] = useState<any>(null);
  const [disbursedTransfer, setDisbursedTransfer] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "disbursed">("all");
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    if (!user) setLocation("/");
  }, [user, setLocation]);

  const { data: transfers = [], isLoading, refetch } = trpc.receipt.getMyOfficeReceipts.useQuery(
    undefined,
    { enabled: !!user }
  );

  const verifyMutation = trpc.receipt.agentVerify.useMutation({
    onSuccess: (data) => {
      if (data.receipt.status === "received") {
        setFoundTransfer(data.receipt);
        setStep("duplicate");
      } else {
        setFoundTransfer(data.receipt);
        setStep("verify");
      }
    },
    onError: (error) => {
      toast.error(error.message || "لم يتم العثور على الحوالة");
    },
  });

  const disburseMutation = trpc.receipt.confirmReceived.useMutation({
    onSuccess: (data) => {
      setDisbursedTransfer(data.receipt);
      setStep("success");
      refetch();
      toast.success("تم صرف الحوالة بنجاح!");
    },
    onError: (error) => {
      if (error.message?.includes("مصروفة") || error.message?.includes("disbursed")) {
        setStep("duplicate");
      } else {
        toast.error(error.message || "فشل تأكيد الصرف");
      }
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    verifyMutation.mutate({ notificationNumber: searchInput.trim() });
  };

  const handleConfirmDisburse = () => {
    if (!foundTransfer || !secretCode) return;
    disburseMutation.mutate({
      receiptId: foundTransfer.id,
      secretCode: secretCode.trim(),
    });
  };

  const filteredTransfers = transfers.filter((t: any) => {
    if (activeTab === "pending") return t.status === "pending_deposit";
    if (activeTab === "disbursed") return t.status === "received";
    return true;
  });

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Cairo', sans-serif" }}>
      <SudanStoreHeader navItems={AGENT_NAV} currentPath="/agent/transfers" />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem" }}>

        {/* STEP: LIST */}
        {step === "list" && (
          <>
            {/* Search Button */}
            <button
              onClick={() => setStep("search")}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #1a2e6b, #2563eb)",
                color: "white",
                border: "none",
                borderRadius: "1rem",
                padding: "1rem",
                fontSize: "1rem",
                fontWeight: "700",
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 15px rgba(26,46,107,0.3)",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🔍</span>
              التحقق من حوالة / صرف
            </button>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                backgroundColor: "white",
                borderRadius: "0.75rem",
                padding: "0.25rem",
                marginBottom: "1rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {[
                { key: "all", label: "الكل" },
                { key: "pending", label: "قيد الانتظار" },
                { key: "disbursed", label: "تم الصرف" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    fontFamily: "'Cairo', sans-serif",
                    cursor: "pointer",
                    backgroundColor: activeTab === tab.key ? "#1a2e6b" : "transparent",
                    color: activeTab === tab.key ? "white" : "#6b7280",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Transfers List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {isLoading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                  ⏳ جاري التحميل...
                </div>
              ) : filteredTransfers.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    backgroundColor: "white",
                    borderRadius: "1rem",
                    color: "#9ca3af",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
                  <div>لا توجد حوالات</div>
                </div>
              ) : (
                filteredTransfers.map((transfer: any) => {
                  const statusInfo = STATUS_LABELS[transfer.status] || STATUS_LABELS.pending;
                  return (
                    <div
                      key={transfer.id}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "1rem",
                        padding: "1rem",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                        border: `2px solid ${transfer.status === "pending_deposit" || transfer.status === "pending" ? "#bfdbfe" : "#bbf7d0"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div>
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                              fontWeight: "700",
                              color: "#1a2e6b",
                              marginBottom: "0.2rem",
                            }}
                          >
                            {transfer.notificationNumber}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            {new Date(transfer.createdAt).toLocaleDateString("ar-SA")} -{" "}
                            {new Date(transfer.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "600",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "9999px",
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#065f46" }}>
                            {parseFloat(transfer.amount).toLocaleString("ar-SA")}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#374151", fontWeight: "600" }}>
                            {transfer.currencyCode}
                          </div>
                        </div>
                        {(transfer.status === "pending_deposit" || transfer.status === "pending") && (
                          <button
                            onClick={() => {
                              setSearchInput(transfer.notificationNumber);
                              setFoundTransfer(transfer);
                              setStep("verify");
                            }}
                            style={{
                              background: "linear-gradient(135deg, #059669, #047857)",
                              color: "white",
                              border: "none",
                              borderRadius: "0.5rem",
                              padding: "0.5rem 1rem",
                              fontSize: "0.8rem",
                              fontWeight: "700",
                              fontFamily: "'Cairo', sans-serif",
                              cursor: "pointer",
                            }}
                          >
                            💰 صرف
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* STEP: SEARCH (Step 3 & 4 in workflow) */}
        {step === "search" && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <button
              onClick={() => { setStep("list"); setSearchInput(""); setFoundTransfer(null); }}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontFamily: "'Cairo', sans-serif",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              ← رجوع
            </button>

            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <img src={LOGO_URL} alt="متجر السودان" style={{ height: "50px", margin: "0 auto 0.75rem" }} />
              <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1a2e6b" }}>
                التحقق من الحوالة
              </h2>
              <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
                أدخل رقم الإشعار للتحقق
              </p>
            </div>

            {/* QR Scan Button */}
            <button
              type="button"
              onClick={() => setShowQRScanner(true)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #065f46, #10b981)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.875rem",
                fontSize: "0.95rem",
                fontWeight: "700",
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>📷</span>
              مسح رمز QR
            </button>

            <div style={{ textAlign: "center", marginBottom: "1rem", color: "#9ca3af", fontSize: "0.75rem" }}>
              — أو أدخل رقم الإشعار يدوياً —
            </div>

            <form onSubmit={handleSearch}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.8rem", fontWeight: "600", color: "#374151" }}>
                  رقم الإشعار
                </label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="SD69384752"
                  style={{
                    width: "100%",
                    borderRadius: "0.75rem",
                    border: "2px solid #e5e7eb",
                    padding: "0.75rem 1rem",
                    fontSize: "1rem",
                    fontFamily: "monospace",
                    color: "#1f2937",
                    textAlign: "center",
                    letterSpacing: "0.1em",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={verifyMutation.isPending || !searchInput.trim()}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #1a2e6b, #2563eb)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.75rem",
                  padding: "0.875rem",
                  fontSize: "1rem",
                  fontWeight: "700",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: verifyMutation.isPending ? "not-allowed" : "pointer",
                  opacity: verifyMutation.isPending ? 0.7 : 1,
                }}
              >
                {verifyMutation.isPending ? "⏳ جاري البحث..." : "🔍 تحقق"}
              </button>
            </form>
          </div>
        )}

        {/* STEP: VERIFY (Step 4 in workflow) */}
        {step === "verify" && foundTransfer && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <button
              onClick={() => { setStep("list"); setSecretCode(""); setFoundTransfer(null); }}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontFamily: "'Cairo', sans-serif",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              ← رجوع
            </button>

            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "#d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem",
                  fontSize: "1.75rem",
                }}
              >
                ✅
              </div>
              <h2 style={{ fontSize: "1rem", fontWeight: "800", color: "#065f46" }}>
                الحوالة صالحة وجاهزة للصرف
              </h2>
            </div>

            {/* Transfer Details */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1rem",
                border: "1px solid #e2e8f0",
              }}
            >
              {[
                { label: "رقم الإشعار", value: foundTransfer.notificationNumber, mono: true },
                { label: "المبلغ", value: `${parseFloat(foundTransfer.amount).toLocaleString("ar-SA")} ${foundTransfer.currencyCode}`, mono: false },
                { label: "الحالة", value: "قيد الانتظار", mono: false },
                { label: "التاريخ", value: new Date(foundTransfer.createdAt).toLocaleDateString("ar-SA"), mono: false },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{item.label}</span>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "700",
                      color: "#1f2937",
                      fontFamily: item.mono ? "monospace" : "'Cairo', sans-serif",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Warning about balance update */}
            <div
              style={{
                backgroundColor: "#fffbeb",
                borderRadius: "0.75rem",
                padding: "0.75rem",
                marginBottom: "1rem",
                border: "1px solid #fde68a",
                fontSize: "0.8rem",
                color: "#92400e",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <span>💡</span>
              <span>سيتم إضافة المبلغ لرصيدك وتحديث حالة الحوالة إلى "تم الصرف" بعد تأكيدك.</span>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setStep("confirm")}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #059669, #047857)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.75rem",
                  padding: "0.875rem",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                }}
              >
                💰 تأكيد الصرف
              </button>
              <button
                onClick={() => { setStep("list"); setFoundTransfer(null); setSearchInput(""); }}
                style={{
                  padding: "0.875rem 1rem",
                  backgroundColor: "#f1f5f9",
                  color: "#374151",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  fontSize: "0.875rem",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* STEP: CONFIRM (Step 5 in workflow) */}
        {step === "confirm" && foundTransfer && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <button
              onClick={() => setStep("verify")}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontFamily: "'Cairo', sans-serif",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              ← رجوع
            </button>

            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔐</div>
              <h2 style={{ fontSize: "1rem", fontWeight: "800", color: "#1a2e6b" }}>
                تأكيد الصرف
              </h2>
              <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                أدخل الرقم السري للحوالة
              </p>
            </div>

            {/* Summary */}
            <div
              style={{
                backgroundColor: "#eff6ff",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1rem",
                textAlign: "center",
                border: "2px solid #bfdbfe",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>رقم الإشعار</div>
              <div style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: "700", color: "#1a2e6b" }}>
                {foundTransfer.notificationNumber}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#065f46", marginTop: "0.5rem" }}>
                {parseFloat(foundTransfer.amount).toLocaleString("ar-SA")} {foundTransfer.currencyCode}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.8rem", fontWeight: "600", color: "#374151" }}>
                الرقم السري *
              </label>
              <input
                type="password"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="أدخل الرقم السري"
                style={{
                  width: "100%",
                  borderRadius: "0.75rem",
                  border: "2px solid #e5e7eb",
                  padding: "0.75rem 1rem",
                  fontSize: "1.1rem",
                  fontFamily: "monospace",
                  color: "#1f2937",
                  textAlign: "center",
                  letterSpacing: "0.2em",
                }}
              />
            </div>

            <button
              onClick={handleConfirmDisburse}
              disabled={disburseMutation.isPending || !secretCode.trim()}
              style={{
                width: "100%",
                background: disburseMutation.isPending
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #059669, #047857)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                padding: "1rem",
                fontSize: "1rem",
                fontWeight: "700",
                fontFamily: "'Cairo', sans-serif",
                cursor: disburseMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {disburseMutation.isPending ? "⏳ جاري الصرف..." : "✅ تأكيد الصرف"}
            </button>
          </div>
        )}

        {/* STEP: SUCCESS (Step 6 in workflow) */}
        {step === "success" && disbursedTransfer && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(5,150,105,0.2)",
              border: "2px solid #bbf7d0",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "#d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  fontSize: "2.5rem",
                }}
              >
                ✅
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#065f46" }}>
                تم صرف الحوالة بنجاح!
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                تمت إضافة المبلغ إلى رصيدك
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#f0fdf4",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1rem",
                border: "1px solid #bbf7d0",
              }}
            >
              {[
                { label: "رقم الإشعار", value: disbursedTransfer.notificationNumber, mono: true, highlight: false },
                { label: "المبلغ المضاف", value: `${parseFloat(disbursedTransfer.amount).toLocaleString("ar-SA")} ${disbursedTransfer.currencyCode}`, mono: false, highlight: true },
                { label: "الرصيد الجديد", value: disbursedTransfer.newBalance ? `${parseFloat(disbursedTransfer.newBalance).toLocaleString("ar-SA")} ${disbursedTransfer.currencyCode}` : "—", mono: false, highlight: false },
                { label: "وقت الصرف", value: new Date().toLocaleString("ar-SA"), mono: false, highlight: false },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #bbf7d0",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{item.label}</span>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "700",
                      color: item.highlight ? "#065f46" : "#1f2937",
                      fontFamily: item.mono ? "monospace" : "'Cairo', sans-serif",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowReceipt(true)}
                style={{
                  flex: 1,
                  background: "#1a2e6b",
                  color: "white",
                  border: "none",
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                }}
              >
                🧾 طباعة الإيصال
              </button>
              <button
                onClick={() => {
                  setStep("list");
                  setFoundTransfer(null);
                  setDisbursedTransfer(null);
                  setSearchInput("");
                  setSecretCode("");
                }}
                style={{
                  flex: 1,
                  background: "#f0fdf4",
                  color: "#065f46",
                  border: "2px solid #bbf7d0",
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                }}
              >
                ← العودة للقائمة
              </button>
            </div>
          </div>
        )}

        {/* STEP: DUPLICATE (Step 7 in workflow) */}
        {step === "duplicate" && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(220,38,38,0.15)",
              border: "2px solid #fecaca",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  fontSize: "2.5rem",
                }}
              >
                🚫
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#991b1b" }}>
                الحوالة غير متاحة
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                تم صرف هذه الحوالة مسبقاً ولا يمكن صرفها مرة أخرى
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#fef2f2",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1rem",
                border: "1px solid #fecaca",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>🛡️</span>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "#991b1b" }}>
                  تم منع التكرار بنجاح
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>
                  النظام يحمي من إعادة صرف نفس الحوالة لأي وكيل
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setStep("list");
                setFoundTransfer(null);
                setSearchInput("");
                setSecretCode("");
              }}
              style={{
                width: "100%",
                background: "#1a2e6b",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.875rem",
                fontSize: "0.95rem",
                fontWeight: "700",
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
              }}
            >
              ← العودة
            </button>
          </div>
        )}
      </main>

      {/* Receipt Modal */}
      {showReceipt && disbursedTransfer && (
        <TransferReceipt
          transfer={{
            notificationNumber: disbursedTransfer.notificationNumber,
            amount: disbursedTransfer.amount || "0",
            currencyCode: disbursedTransfer.currencyCode || "USD",
            status: "disbursed",
            createdAt: disbursedTransfer.createdAt || new Date(),
          }}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={(notificationNumber) => {
            setShowQRScanner(false);
            setSearchInput(notificationNumber);
            // Auto-trigger search
            verifyMutation.mutate(
              { notificationNumber },
              {
                onSuccess: (data) => {
                  if ((data.receipt as any).status === "received") {
                    setFoundTransfer(data.receipt);
                    setStep("duplicate");
                  } else {
                    setFoundTransfer(data.receipt);
                    setStep("verify");
                  }
                },
                onError: (err) => {
                  toast.error(err.message || "لم يتم العثور على الحوالة");
                  setStep("search");
                },
              }
            );
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}
