import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-lg font-bold text-white">SD</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">متجر السودان</h1>
          </div>
          <Button onClick={() => window.location.href = getLoginUrl()}>
            تسجيل الدخول
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              نظام تحويلات مالية احترافي
            </h2>
            <p className="mb-6 text-lg text-gray-600">
              حل متكامل لإدارة التحويلات المالية متعددة العملات مع دعم كامل للمحاسبة
              الحديثة والأمان العالي
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => window.location.href = getLoginUrl()}
                className="btn-primary"
              >
                ابدأ الآن
              </Button>
              <Button className="btn-secondary">تعرف أكثر</Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 p-12 text-white shadow-lg">
              <div className="text-center">
                <div className="mb-4 text-5xl">💰</div>
                <h3 className="mb-2 text-2xl font-bold">تحويلات آمنة</h3>
                <p>نظام محمي بأعلى معايير الأمان الدولية</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            المميزات الرئيسية
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: "🌍",
                title: "عملات متعددة",
                desc: "دعم 6 عملات عالمية: EUR, USD, USDT, AED, SAR, SDG",
              },
              {
                icon: "🔒",
                title: "أمان عالي",
                desc: "تشفير كامل وسجل تدقيق شامل لكل عملية",
              },
              {
                icon: "📊",
                title: "تقارير شاملة",
                desc: "لوحة تحكم متقدمة مع إحصائيات تفصيلية",
              },
              {
                icon: "📱",
                title: "Mobile First",
                desc: "واجهة متجاوبة تعمل بكفاءة على جميع الأجهزة",
              },
              {
                icon: "⚡",
                title: "سرعة عالية",
                desc: "معالجة فورية للتحويلات والعمليات المالية",
              },
              {
                icon: "✅",
                title: "موثوقية",
                desc: "نظام محاسبي دقيق بالقيد المزدوج",
              },
            ].map((feature, idx) => (
              <div key={idx} className="card text-center">
                <div className="mb-4 text-4xl">{feature.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12">
        <div className="container">
          <div className="text-center">
            <p className="text-gray-600">
              © 2026 متجر السودان. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
