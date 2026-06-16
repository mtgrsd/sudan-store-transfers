import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function AgentTransfers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchNumber, setSearchNumber] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  useEffect(() => {
    if (!user || user.role !== "agent") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch agent's transfers
  const { data: transfers = [], isLoading } = trpc.transfer.getMyTransfers.useQuery(
    undefined,
    { enabled: !!user && user.role === "agent" }
  );

  // Search transfer query
  const searchTransferQuery = trpc.transfer.getByNotificationNumber.useQuery(
    { notificationNumber: searchNumber },
    { enabled: false }
  );

  const handleSearch = () => {
    if (searchNumber.trim()) {
      searchTransferQuery.refetch().then((result) => {
        if (result.data) {
          setSelectedTransfer(result.data);
        }
      });
    }
  };

  const handleConfirmDisburse = () => {
    if (selectedTransfer) {
      // This would call the confirm disbursement mutation
      // For now, just show a message
      alert("تم تأكيد الصرف بنجاح");
      setSelectedTransfer(null);
      setSearchNumber("");
    }
  };

  if (!user || user.role !== "agent") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-gray-900">الحوالات</h1>
        </div>
      </header>
      <main className="container py-8">
        {/* Search Section */}
        <div className="mb-8 card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            البحث عن حوالة
          </h3>
          <div className="flex gap-4 flex-col md:flex-row">
            <input
              type="text"
              placeholder="أدخل رقم الإشعار"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="input-field flex-1"
            />
            <Button
              onClick={handleSearch}
              className="btn-primary"
              disabled={searchTransferQuery.isFetching}
            >
              {searchTransferQuery.isFetching ? "جاري البحث..." : "بحث"}
            </Button>
            <Button className="btn-secondary">مسح QR Code</Button>
          </div>
        </div>

        {/* Transfer Details Modal */}
        {selectedTransfer && (
          <div className="mb-8 card border-2 border-blue-200 bg-blue-50">
            <div className="card-header">
              <h3 className="card-title">تفاصيل الحوالة</h3>
              <Button
                onClick={() => setSelectedTransfer(null)}
                className="btn-secondary text-sm"
              >
                إغلاق
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  رقم الإشعار
                </label>
                <p className="mt-1 font-mono text-gray-900">
                  {selectedTransfer.notificationNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  الرقم السري
                </label>
                <p className="mt-1 font-mono text-gray-900">
                  {selectedTransfer.secretNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  المبلغ
                </label>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {selectedTransfer.amount} {selectedTransfer.currencyCode}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  الحالة
                </label>
                <p className="mt-1">
                  <span
                    className={
                      selectedTransfer.status === "pending"
                        ? "badge badge-warning"
                        : "badge badge-success"
                    }
                  >
                    {selectedTransfer.status === "pending"
                      ? "معلقة"
                      : "مصروفة"}
                  </span>
                </p>
              </div>
            </div>
            {selectedTransfer.status === "pending" && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <Button
                  onClick={handleConfirmDisburse}
                  className="btn-success w-full"
                >
                  تأكيد الصرف
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Transfers List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">الحوالات المخصصة لي</h3>
            <span className="text-sm text-gray-600">
              {transfers?.length || 0} حوالة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الإشعار</th>
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
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : transfers && transfers.length > 0 ? (
                  transfers.map((transfer: any) => (
                    <tr key={transfer.id}>
                      <td className="font-mono text-sm">
                        {transfer.notificationNumber}
                      </td>
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
                        <Button
                          onClick={() => setSelectedTransfer(transfer)}
                          className="btn-secondary text-xs"
                        >
                          عرض
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
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
