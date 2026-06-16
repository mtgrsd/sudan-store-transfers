import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

interface TransferReceiptProps {
  transfer: {
    notificationNumber: string;
    secretCode?: string;
    transferId?: string;
    amount: string;
    currencyCode: string;
    status: string;
    notes?: string | null;
    createdAt: Date | string;
    confirmedAt?: Date | string | null;
    senderName?: string;
    receiverName?: string;
    receiverPhone?: string;
    agentName?: string;
    customerName?: string;
    branch?: string;
  };
  onClose?: () => void;
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: "دولار أمريكي",
  EUR: "يورو",
  USDT: "تيثر",
  AED: "درهم إماراتي",
  SAR: "ريال سعودي",
  SDG: "جنيه سوداني",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "قيد الانتظار", color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  confirmed: { label: "تم الصرف", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  disbursed: { label: "تم الصرف", color: "#065f46", bg: "#d1fae5", icon: "✅" },
  cancelled: { label: "ملغاة", color: "#991b1b", bg: "#fee2e2", icon: "❌" },
};

export default function TransferReceipt({ transfer, onClose }: TransferReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>إيصال حوالة - ${transfer.notificationNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; background: white; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      if (!receiptRef.current) return;

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`إيصال-${transfer.notificationNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      handlePrint();
    }
  };

  const statusInfo = STATUS_LABELS[transfer.status] || STATUS_LABELS.pending;
  const qrValue = `${window.location.origin}/verify/${transfer.notificationNumber}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "1rem",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={handleDownloadPDF}
            style={{
              flex: 1,
              padding: "0.6rem",
              backgroundColor: "#1a2e6b",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              fontFamily: "'Cairo', sans-serif",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ⬇ تحميل PDF
          </button>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: "0.6rem",
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              fontFamily: "'Cairo', sans-serif",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🖨 طباعة
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "0.6rem 1rem",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                fontFamily: "'Cairo', sans-serif",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Receipt Content */}
        <div
          ref={receiptRef}
          style={{
            padding: "1.5rem",
            fontFamily: "'Cairo', sans-serif",
            direction: "rtl",
            backgroundColor: "white",
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "1.25rem",
              paddingBottom: "1.25rem",
              borderBottom: "2px dashed #e2e8f0",
            }}
          >
            <img
              src={LOGO_URL}
              alt="متجر السودان"
              style={{
                height: "60px",
                width: "auto",
                objectFit: "contain",
                marginBottom: "0.5rem",
              }}
              crossOrigin="anonymous"
            />
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "800",
                color: "#1a2e6b",
              }}
            >
              متجر السودان
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              Sudan Store · نظام التحويلات المالية
            </div>
            <div
              style={{
                marginTop: "0.75rem",
                display: "inline-block",
                padding: "0.35rem 1rem",
                borderRadius: "9999px",
                backgroundColor: statusInfo.bg,
                color: statusInfo.color,
                fontSize: "0.8rem",
                fontWeight: "700",
              }}
            >
              {statusInfo.label}
            </div>
          </div>

          {/* Notification Number */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "1.25rem",
              padding: "1rem",
              background: "linear-gradient(135deg, #1a2e6b 0%, #2563eb 100%)",
              borderRadius: "0.75rem",
              color: "white",
            }}
          >
            <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "0.25rem" }}>
              رقم الإشعار
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "800",
                letterSpacing: "0.1em",
                fontFamily: "monospace",
              }}
            >
              {transfer.notificationNumber}
            </div>
            {transfer.transferId && (
              <div
                style={{
                  fontSize: "0.7rem",
                  opacity: 0.7,
                  marginTop: "0.25rem",
                }}
              >
                {transfer.transferId}
              </div>
            )}
          </div>

          {/* Amount */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "1.25rem",
              padding: "1rem",
              backgroundColor: "#f0fdf4",
              borderRadius: "0.75rem",
              border: "2px solid #bbf7d0",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
              المبلغ
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: "800",
                color: "#065f46",
              }}
            >
              {parseFloat(transfer.amount).toLocaleString("ar-SA")}{" "}
              <span style={{ fontSize: "1.2rem" }}>{transfer.currencyCode}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
              {CURRENCY_NAMES[transfer.currencyCode] || transfer.currencyCode}
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            {[
              { label: "المرسل", value: transfer.senderName || transfer.customerName || "-" },
              { label: "المستلم", value: transfer.receiverName || "-" },
              { label: "رقم المستلم", value: transfer.receiverPhone || "-" },
              { label: "الوكيل / المكتب", value: transfer.agentName || "-" },
              { label: "تاريخ الإنشاء", value: formatDate(transfer.createdAt) },
              {
                label: "تاريخ الصرف",
                value: transfer.confirmedAt ? formatDate(transfer.confirmedAt) : "-",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#9ca3af",
                    marginBottom: "0.2rem",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: "#1f2937",
                    wordBreak: "break-all",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div
              style={{
                marginBottom: "1.25rem",
                padding: "0.75rem",
                backgroundColor: "#fffbeb",
                borderRadius: "0.5rem",
                border: "1px solid #fde68a",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "#92400e", marginBottom: "0.25rem" }}>
                ملاحظات
              </div>
              <div style={{ fontSize: "0.8rem", color: "#78350f" }}>{transfer.notes}</div>
            </div>
          )}

          {/* QR Code */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#f8fafc",
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
            }}
          >
            <QRCodeSVG
              value={qrValue}
              size={100}
              level="M"
              style={{ margin: "0 auto" }}
            />
            <div
              style={{
                fontSize: "0.65rem",
                color: "#9ca3af",
                marginTop: "0.5rem",
              }}
            >
              امسح للتحقق من الحوالة
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              paddingTop: "1rem",
              borderTop: "1px dashed #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
              جميع العمليات مسجلة وموثقة وفق معايير المحاسبة الدولية
            </div>
            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.2rem" }}>
              أمن · سرعة · موثوق
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "#d1d5db",
                marginTop: "0.5rem",
              }}
            >
              Sudan Store © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
