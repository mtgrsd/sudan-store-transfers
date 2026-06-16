import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function AdminCustomers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch customers
  const { data: customers = [], isLoading } = trpc.customer.getAll.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  // Create customer mutation
  const createCustomerMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      setFormData({ customerId: "", customerName: "", phone: "", email: "" });
      setShowAddForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomerMutation.mutate(formData);
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold text-gray-900">إدارة العملاء</h1>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? "إلغاء" : "إضافة عميل جديد"}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* Add Customer Form */}
        {showAddForm && (
          <div className="mb-8 card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              إضافة عميل جديد
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">معرف العميل</label>
                  <input
                    type="text"
                    required
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل معرف العميل"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">اسم العميل</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل اسم العميل"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">الهاتف</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل رقم الهاتف"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل البريد الإلكتروني"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={createCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Customers List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">قائمة العملاء</h3>
            <span className="text-sm text-gray-600">
              {customers?.length || 0} عميل
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>اسم العميل</th>
                  <th>معرف العميل</th>
                  <th>الهاتف</th>
                  <th>البريد الإلكتروني</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : customers && customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="font-medium text-gray-900">
                        {customer.customerName}
                      </td>
                      <td className="font-mono text-sm">
                        {customer.customerId}
                      </td>
                      <td>{customer.phone || "-"}</td>
                      <td>{customer.email || "-"}</td>
                      <td>
                        <span className="badge badge-success">نشط</span>
                      </td>
                      <td>
                        <Button className="btn-secondary text-xs">
                          تعديل
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      لا توجد عملاء حالياً
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
