import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function AdminAgents() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    agentName: "",
    agentCode: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch agents
  const { data: agents = [], isLoading } = trpc.agent.getAll.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  // Create agent mutation
  const createAgentMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      setFormData({ agentName: "", agentCode: "", phone: "", email: "" });
      setShowAddForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAgentMutation.mutate(formData);
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold text-gray-900">إدارة الوكلاء</h1>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? "إلغاء" : "إضافة وكيل جديد"}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* Add Agent Form */}
        {showAddForm && (
          <div className="mb-8 card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              إضافة وكيل جديد
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">اسم الوكيل</label>
                  <input
                    type="text"
                    required
                    value={formData.agentName}
                    onChange={(e) =>
                      setFormData({ ...formData, agentName: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل اسم الوكيل"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">كود الوكيل</label>
                  <input
                    type="text"
                    required
                    value={formData.agentCode}
                    onChange={(e) =>
                      setFormData({ ...formData, agentCode: e.target.value })
                    }
                    className="input-field"
                    placeholder="أدخل كود الوكيل"
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
                  disabled={createAgentMutation.isPending}
                >
                  {createAgentMutation.isPending ? "جاري الحفظ..." : "حفظ"}
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

        {/* Agents List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">قائمة الوكلاء</h3>
            <span className="text-sm text-gray-600">
              {agents?.length || 0} وكيل
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>اسم الوكيل</th>
                  <th>كود الوكيل</th>
                  <th>الهاتف</th>
                  <th>الرصيد (USD)</th>
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
                ) : agents && agents.length > 0 ? (
                  agents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="font-medium text-gray-900">
                        {agent.agentName}
                      </td>
                      <td className="font-mono text-sm">{agent.agentCode}</td>
                      <td>{agent.phone || "-"}</td>
                      <td>
                        $
                        {agent.wallets
                          ?.find((w) => w.currencyCode === "USD")
                          ?.balance.toString() || "0.00"}
                      </td>
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
                      لا توجد وكلاء حالياً
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
