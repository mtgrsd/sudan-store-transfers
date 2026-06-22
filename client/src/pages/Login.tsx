import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail } from "lucide-react";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Clear cache on page load to prevent stale session
  useEffect(() => {
    localStorage.removeItem("manus-runtime-user-info");
    localStorage.clear();
    sessionStorage.clear();
  }, []);

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (meQuery.data) {
      const role = meQuery.data.role;
      if (role === "super_admin" || role === "admin" || role === "employee") {
        window.location.href = "/admin";
      } else if (role === "agent") {
        window.location.href = "/agent";
      }
    }
  }, [meQuery.data]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "فشل تسجيل الدخول");
        return;
      }

      // Refresh the page to ensure clean session
      const role = data.user?.role;
      if (role === "super_admin" || role === "admin" || role === "employee") {
        window.location.href = "/admin?t=" + Date.now();
      } else if (role === "agent") {
        window.location.href = "/agent?t=" + Date.now();
      } else {
        window.location.href = "/?t=" + Date.now();
      }
    } catch {
      setError("خطأ في الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center sudan-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center sudan-gradient p-4" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-4">
            <img src={LOGO_URL} alt="متجر السودان" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">متجر السودان</h1>
          <p className="text-white/80 text-sm font-medium">نظام التحويلات المالية</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white shadow-2xl border-0">
          <CardHeader className="pb-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 text-center">تسجيل الدخول</h2>
            <p className="text-slate-600 text-sm text-center mt-2">أدخل بيانات حسابك للمتابعة</p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium">
                  البريد الإلكتروني
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@sudanstore.com"
                    required
                    autoComplete="email"
                    className="pr-10 input-field"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pr-10 input-field"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3 mt-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  "دخول"
                )}
              </Button>
            </form>

            {/* Footer Info */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-center text-slate-600 text-xs">
                للحصول على حساب، تواصل مع الإدارة
              </p>
              <p className="text-center text-slate-500 text-xs mt-2">
                لا يوجد تسجيل ذاتي
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Copyright */}
        <p className="text-center text-white/70 text-xs mt-8">
          © {new Date().getFullYear()} متجر السودان - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
