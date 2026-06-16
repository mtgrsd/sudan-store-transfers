import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const CURRENCIES = ["USD", "EUR", "USDT", "AED", "SAR", "SDG"];

export default function AdminTransfers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    agentId: "",
    customerId: "",
    amount: "",
    currencyCode: "USD",
    notes: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch transfers
  const { data: transfers = [], isLoading } = trpc.transfer.getPending.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  // Fetch agents for dropdown
  const { data: agents = [] } = trpc.agent.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  // Fetch customers for dropdown
  const { data: customers = [] } = trpc.customer.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  // Create transfer mutation
  const createTransferMutation = trpc.transfer.create.useMutation({
    onSuccess: () => {
      setFormData({
        agentId: "",
        customerId: "",
        amount: "",
        currencyCode: "USD",
        notes: "",
      });
      setShowCreateForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTransferMutation.mutate({
      agentId: parseInt(formData.agentId) || 0,
      customerId: parseInt(formData.customerId) || 0,
      amount: formData.amount,
      currencyCode: formData.currencyCode,
      notes: formData.notes,
    });
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold text-gray-900">إدارة الحوالات</h1>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
          >
            {showCreateForm ? "إلغاء" : "إنشاء حوالة جديدة"}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* Create Transfer Form */}
        {showCreateForm && (
          <div className="mb-8 card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              إنشاء حوالة جديدة
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">الوكيل</label>
                  <select
                    required
                    value={formData.agentId}
                    onChange={(e) =>
                      setFormData({ ...formData, agentId: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="">اختر الوكيل</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.agentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">العميل</label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="">اختر العميل</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">المبلغ</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل المبلغ"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">العملة</label>
                  <select
                    value={formData.currencyCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currencyCode: e.target.value,
                      })
                    }
                    className="input-field"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group md:col-span-2">
                  <label className="form-label">الملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل ملاحظاتك (اختياري)"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={createTransferMutation.isPending}
                >
                  {createTransferMutation.isPending
                    ? "جاري الإنشاء..."
                    : "إنشاء الحوالة"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Transfers List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">قائمة الحوالات</h3>
            <span className="text-sm text-gray-600">
              {transfers?.length || 0} حوالة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الإشعار</th>
                  <th>الوكيل</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>العملة</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : transfers && transfers.length > 0 ? (
                  transfers.map((transfer: any) => (
                    <tr key={transfer.id}>
                      <td className="font-mono text-sm">
                        {transfer.notificationNumber}
                      </td>
                      <td>-</td>
                      <td>-</td>
                      <td>{transfer.amount}</td>
                      <td>{transfer.currencyCode}</td>
                      <td>
                        <span
                          className={
                            transfer.status === "pending"
                              ? "badge badge-warning"
                              : "badge badge-success"
                          }
                        >
                          {transfer.status === "pending"
                            ? "معلقة"
                            : "مصروفة"}
                        </span>
                      </td>
                      <td>
                        {new Date(transfer.createdAt).toLocaleDateString(
                          "ar-SA"
                        )}
                      </td>
                      <td>
                        <Button className="btn-secondary text-xs">
                          عرض
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      لا توجد حوالات حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
