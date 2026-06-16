import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function AgentProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user || user.role !== "agent") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch agent details
  const { data: agentDetails } = trpc.agent.getMyProfile.useQuery(undefined, {
    enabled: !!user && user.role === "agent",
  });

  if (!user || user.role !== "agent") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-gray-900">ملفي الشخصي</h1>
        </div>
      </header>
      <main className="container py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Profile Info */}
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              معلومات الملف الشخصي
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  الاسم
                </label>
                <p className="mt-1 text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  البريد الإلكتروني
                </label>
                <p className="mt-1 text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  كود الوكيل
                </label>
                <p className="mt-1 font-mono text-gray-900">
                  {agentDetails?.agentCode || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  الهاتف
                </label>
                <p className="mt-1 text-gray-900">
                  {agentDetails?.phone || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  الدور
                </label>
                <p className="mt-1 text-gray-900">وكيل</p>
              </div>
            </div>
          </div>

          {/* Balances */}
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              الأرصدة
            </h3>
            <div className="space-y-3">
              {agentDetails?.wallets && agentDetails.wallets.length > 0 ? (
                agentDetails.wallets.map((wallet: any) => (
                  <div
                    key={wallet.currencyCode}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                  >
                    <span className="font-medium text-gray-700">
                      {wallet.currencyCode}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {wallet.balance}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
                  لا توجد أرصدة حالياً
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statement of Account */}
        <div className="mt-8 card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            كشف الحساب
          </h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الوصف</th>
                  <th>المبلغ</th>
                  <th>العملة</th>
                  <th>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    لا توجد عمليات حالياً
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
