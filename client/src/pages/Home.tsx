import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d0fc12.png";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else if (user.role === "agent") {
        setLocation("/agent");
      }
    }
  }, [user, setLocation]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #e8f0fe 100%)" }}>
      {/* Navigation */}
      <nav style={{ background: "white", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img src={LOGO_URL} alt="متجر السودان" style={{ height: "48px", width: "auto" }} />
          </div>
          <button
            onClick={() => window.location.href = getLoginUrl()}
            style={{
              background: "linear-gradient(135deg, #1a2e6b, #2563eb)",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1.5rem",
              fontWeight: "700",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
              transition: "all 0.2s ease"
            }}
          >
            تسجيل الدخول
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        <div style={{ display: "grid", gap: "3rem", gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
          <div>
            <div style={{
              display: "inline-block",
              background: "#dbeafe",
              color: "#1d4ed8",
              borderRadius: "9999px",
              padding: "0.3rem 1rem",
              fontSize: "0.8rem",
              fontWeight: "700",
              marginBottom: "1rem"
            }}>
              نظام تحويلات مالية احترافي
            </div>
            <h2 style={{ fontSize: "2.5rem", fontWeight: "900", color: "#1a2e6b", lineHeight: "1.2", marginBottom: "1rem" }}>
              متجر السودان
              <br />
              <span style={{ color: "#2563eb" }}>للتحويلات المالية</span>
            </h2>
            <p style={{ fontSize: "1.1rem", color: "#6b7280", lineHeight: "1.7", marginBottom: "2rem" }}>
              حل متكامل لإدارة التحويلات المالية متعددة العملات مع دعم كامل للمحاسبة
              بالقيد المزدوج والأمان العالي وإدارة الوكلاء
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button
                onClick={() => window.location.href = getLoginUrl()}
                style={{
                  background: "linear-gradient(135deg, #1a2e6b, #2563eb)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 2rem",
                  fontWeight: "700",
                  fontSize: "1rem",
                  cursor: "pointer",
                  fontFamily: "Cairo, sans-serif",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.3)"
                }}
              >
                ابدأ الآن ←
              </button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={LOGO_URL} alt="متجر السودان" style={{ maxWidth: "350px", width: "100%", filter: "drop-shadow(0 20px 40px rgba(26,46,107,0.15))" }} />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section style={{ background: "white", padding: "4rem 0" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", fontSize: "1.75rem", fontWeight: "800", color: "#1a2e6b", marginBottom: "0.5rem" }}>
            آلية عمل النظام
          </h2>
          <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "3rem" }}>
            من إنشاء الحوالة حتى إضافة المبلغ لرصيد الوكيل
          </p>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {[
              { step: "1", icon: "📝", title: "إنشاء الحوالة", desc: "يقوم المدير بإنشاء حوالة جديدة وتحديد بيانات المستلم والوكيل والمبلغ والعملة", color: "#dbeafe", textColor: "#1d4ed8" },
              { step: "2", icon: "🧾", title: "إصدار الإيصال", desc: "يتم إصدار إيصال يحتوي على جميع البيانات ورقم الإشعار والرقم السري والـ QR Code", color: "#d1fae5", textColor: "#065f46" },
              { step: "3", icon: "📲", title: "استلام الوكيل", desc: "يدخل الوكيل إلى حسابه ويرى الحوالات المخصصة له بحالة قيد الانتظار", color: "#fef3c7", textColor: "#92400e" },
              { step: "4", icon: "🔍", title: "التحقق من الحوالة", desc: "يمكن للوكيل البحث برقم الإشعار أو مسح QR Code للتحقق من صحة الحوالة", color: "#ede9fe", textColor: "#5b21b6" },
              { step: "5", icon: "✅", title: "تأكيد الصرف", desc: "عند التأكد يتم الضغط على زر تأكيد الصرف مع إدخال الرقم السري", color: "#d1fae5", textColor: "#065f46" },
              { step: "6", icon: "💰", title: "إضافة المبلغ", desc: "يتم إضافة المبلغ لرصيد الوكيل وخصمه من حساب الشركة مع تسجيل قيد محاسبي", color: "#fce7f3", textColor: "#9d174d" },
              { step: "7", icon: "🛡️", title: "منع التكرار", desc: "لا يمكن صرف نفس الحوالة مرة أخرى لنفس الوكيل أو أي وكيل آخر", color: "#fee2e2", textColor: "#991b1b" },
            ].map((item) => (
              <div key={item.step} style={{
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                padding: "1.25rem",
                textAlign: "center",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "9999px",
                  background: item.color,
                  color: item.textColor,
                  fontWeight: "800",
                  fontSize: "1rem",
                  marginBottom: "0.75rem"
                }}>
                  {item.step}
                </div>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{item.icon}</div>
                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1f2937", marginBottom: "0.4rem" }}>{item.title}</h3>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: "1.5" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "4rem 0", background: "#f8fafc" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", fontSize: "1.75rem", fontWeight: "800", color: "#1a2e6b", marginBottom: "2rem" }}>
            المميزات الرئيسية
          </h2>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {[
              { icon: "🌍", title: "عملات متعددة", desc: "EUR, USD, USDT, AED, SAR, SDG" },
              { icon: "🔒", title: "أمان عالي", desc: "تشفير كامل وسجل تدقيق شامل" },
              { icon: "📊", title: "محاسبة مزدوجة", desc: "Debit = Credit دائماً" },
              { icon: "📱", title: "Mobile First", desc: "واجهة متجاوبة على جميع الأجهزة" },
              { icon: "🔍", title: "QR Code", desc: "مسح سريع للتحقق من الحوالات" },
              { icon: "📄", title: "إيصالات PDF", desc: "طباعة إيصالات احترافية" },
            ].map((feature, idx) => (
              <div key={idx} style={{
                background: "white",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                padding: "1.5rem",
                textAlign: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{feature.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#1f2937", marginBottom: "0.4rem" }}>{feature.title}</h3>
                <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: "linear-gradient(135deg, #1a2e6b, #2563eb)", padding: "4rem 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <img src={LOGO_URL} alt="متجر السودان" style={{ height: "60px", marginBottom: "1.5rem", filter: "brightness(0) invert(1)" }} />
          <h2 style={{ fontSize: "2rem", fontWeight: "800", color: "white", marginBottom: "1rem" }}>
            ابدأ الآن مع متجر السودان
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2rem", fontSize: "1.1rem" }}>
            نظام موثوق وآمن لإدارة التحويلات المالية
          </p>
          <button
            onClick={() => window.location.href = getLoginUrl()}
            style={{
              background: "white",
              color: "#1a2e6b",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.875rem 2.5rem",
              fontWeight: "800",
              fontSize: "1rem",
              cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
            }}
          >
            تسجيل الدخول الآن
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#1a2e6b", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "1.5rem 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
            © 2026 متجر السودان - Sudan Store. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
