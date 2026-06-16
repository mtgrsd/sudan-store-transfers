import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
              <span className="text-2xl font-bold text-white">SD</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">متجر السودان</h1>
            <p className="mt-2 text-gray-600">نظام التحويلات المالية</p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <input
                type="email"
                placeholder="أدخل بريدك الإلكتروني"
                className="input-field mt-2"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                كلمة المرور
              </label>
              <input
                type="password"
                placeholder="أدخل كلمة المرور"
                className="input-field mt-2"
                disabled
              />
            </div>

            <Button
              onClick={() => window.location.href = getLoginUrl()}
              className="btn-primary w-full"
            >
              تسجيل الدخول عبر Manus
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-sm text-gray-600">
              نظام آمن ومحمي بأعلى معايير الأمان
            </p>
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            هل تواجه مشكلة في تسجيل الدخول؟{" "}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-700">
              اتصل بالدعم
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
