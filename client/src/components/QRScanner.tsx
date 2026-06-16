import { useEffect, useRef, useState } from "react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const containerId = "qr-scanner-container";

  useEffect(() => {
    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            // Extract notification number from URL or use directly
            let notificationNumber = decodedText;
            try {
              const url = new URL(decodedText);
              const parts = url.pathname.split("/");
              const verifyIndex = parts.indexOf("verify");
              if (verifyIndex !== -1 && parts[verifyIndex + 1]) {
                notificationNumber = parts[verifyIndex + 1];
              }
            } catch {
              // Not a URL, use as-is
            }
            onScan(notificationNumber);
          },
          () => {
            // QR not found yet, continue scanning
          }
        );
        setIsStarting(false);
      } catch (err: any) {
        console.error("QR Scanner error:", err);
        setError(
          err?.message?.includes("permission")
            ? "لم يتم منح إذن الكاميرا. يرجى السماح بالوصول إلى الكاميرا."
            : "تعذر تشغيل الكاميرا. يرجى التحقق من إعدادات المتصفح."
        );
        setIsStarting(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "1rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h2
          style={{
            color: "white",
            fontSize: "1.1rem",
            fontWeight: "700",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          📷 مسح رمز QR
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            color: "white",
            fontSize: "1.1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      {/* Scanner Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "black",
          borderRadius: "1rem",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isStarting && !error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#111",
              zIndex: 10,
              color: "white",
              fontFamily: "'Cairo', sans-serif",
              gap: "0.75rem",
            }}
          >
            <div style={{ fontSize: "2rem" }}>📷</div>
            <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              جاري تشغيل الكاميرا...
            </div>
          </div>
        )}

        {error ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "white",
              fontFamily: "'Cairo', sans-serif",
              minHeight: "280px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <div style={{ fontSize: "2.5rem" }}>📵</div>
            <div style={{ fontSize: "0.875rem", color: "#fca5a5" }}>{error}</div>
            <button
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg, #1a2e6b, #2563eb)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: "600",
                fontFamily: "'Cairo', sans-serif",
                cursor: "pointer",
              }}
            >
              إدخال يدوي
            </button>
          </div>
        ) : (
          <div
            id={containerId}
            style={{
              width: "100%",
              minHeight: "280px",
            }}
          />
        )}
      </div>

      {/* Hint */}
      {!error && (
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "0.8rem",
            fontFamily: "'Cairo', sans-serif",
            marginTop: "1rem",
            textAlign: "center",
          }}
        >
          وجّه الكاميرا نحو رمز QR الموجود على الإيصال
        </p>
      )}
    </div>
  );
}
