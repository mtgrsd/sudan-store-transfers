import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AgentTransfers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchNumber, setSearchNumber] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  useEffect(() => {
    if (!user || user.role !== "agent") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Fetch agent's transfers
  const { data: transfers = [], isLoading, refetch: refetchTransfers } = trpc.transfer.getMyTransfers.useQuery(
    undefined,
    { enabled: !!user && user.role === "agent" }
  );

  // Search transfer query
  const searchTransferQuery = trpc.transfer.getByNotificationNumber.useQuery(
    { notificationNumber: searchNumber },
    { enabled: false }
  );

  // Confirm transfer mutation
  const confirmTransferMutation = trpc.transfer.confirmTransfer.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد الصرف بنجاح");
      setSelectedTransfer(null);
      setSearchNumber("");
      setSecretCode("");
      refetchTransfers();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تأكيد الصرف");
    },
  });

  const handleSearch = () => {
    if (searchNumber.trim()) {
      searchTransferQuery.refetch().then((result) => {
        if (result.data) {
          setSelectedTransfer(result.data);
          setSecretCode("");
        }
      });
    }
  };

  const handleConfirmDisburse = () => {
    if (!selectedTransfer || !secretCode.trim()) {
      toast.error("يرجى إدخال الرقم السري");
      return;
    }

    confirmTransferMutation.mutate({
      notificationNumber: selectedTransfer.notificationNumber,
      secretCode: secretCode,
    });
  };

  if (!user || user.role !== "agent") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header style={{ borderBottom: "2px solid #f3f4f6", backgroundColor: "white", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        <div className="container py-4">
          <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "rgb(17 24 39)" }}>الحوالات</h1>
        </div>
      </header>
      <main className="container py-8">
        {/* Search Section */}
        <div style={{ marginBottom: "2rem", borderRadius: "0.5rem", border: "2px solid rgb(243 244 246)", backgroundColor: "white", padding: "1.5rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
          <h3 style={{ marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "600", color: "rgb(17 24 39)" }}>
            البحث عن حوالة
          </h3>
          <div style={{ display: "flex", gap: "1rem", flexDirection: window.innerWidth < 768 ? "column" : "row" }}>
            <input
              type="text"
              placeholder="أدخل رقم الإشعار"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              style={{
                flex: 1,
                borderRadius: "0.5rem",
                border: "2px solid rgb(209 213 219)",
                backgroundColor: "white",
                padding: "0.5rem 1rem",
                color: "rgb(17 24 39)",
                fontSize: "1rem",
              }}
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

        {/* Search Error */}
        {searchTransferQuery.isError && (
          <div style={{ marginBottom: "2rem", borderRadius: "0.5rem", border: "1px solid rgb(254 226 226)", backgroundColor: "rgb(254 242 242)", color: "rgb(220 38 38)", padding: "1rem" }}>
            حوالة غير موجودة أو رقم الإشعار غير صحيح
          </div>
        )}

        {/* Transfer Details Card */}
        {selectedTransfer && (
          <div style={{ marginBottom: "2rem", borderRadius: "0.5rem", border: "2px solid rgb(191 219 254)", backgroundColor: "rgb(239 246 255)", padding: "1.5rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "2px solid rgb(243 244 246)" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "rgb(17 24 39)" }}>تفاصيل الحوالة</h3>
              <Button
                onClick={() => {
                  setSelectedTransfer(null);
                  setSecretCode("");
                }}
                className="btn-secondary"
                style={{ fontSize: "0.875rem", padding: "0.25rem 0.75rem" }}
              >
                إغلاق
              </Button>
            </div>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: window.innerWidth >= 768 ? "repeat(2, 1fr)" : "1fr" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "500", color: "rgb(75 85 99)" }}>رقم الإشعار</label>
                <p style={{ fontSize: "1rem", color: "rgb(17 24 39)", fontWeight: "600" }}>{selectedTransfer.notificationNumber}</p>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "500", color: "rgb(75 85 99)" }}>المبلغ</label>
                <p style={{ fontSize: "1rem", color: "rgb(17 24 39)", fontWeight: "600" }}>
                  {selectedTransfer.amount} {selectedTransfer.currencyCode}
                </p>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "500", color: "rgb(75 85 99)" }}>الحالة</label>
                <p style={{
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "9999px",
                  padding: "0.25rem 0.75rem",
                  backgroundColor: selectedTransfer.status === "pending" ? "rgb(254 252 232)" : "rgb(220 252 231)",
                  color: selectedTransfer.status === "pending" ? "rgb(161 98 7)" : "rgb(22 163 74)",
                }}>
                  {selectedTransfer.status === "pending" ? "قيد الانتظار" : "مصروفة"}
                </p>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "500", color: "rgb(75 85 99)" }}>تاريخ الإنشاء</label>
                <p style={{ fontSize: "1rem", color: "rgb(17 24 39)" }}>
                  {new Date(selectedTransfer.createdAt).toLocaleDateString("ar-SA")}
                </p>
              </div>
            </div>

            {/* Secret Code Input (only for pending transfers) */}
            {selectedTransfer.status === "pending" && (
              <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "2px solid rgb(243 244 246)" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "500", color: "rgb(55 65 81)" }}>الرقم السري</label>
                  <input
                    type="password"
                    placeholder="أدخل الرقم السري"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: "0.5rem",
                      border: "2px solid rgb(209 213 219)",
                      backgroundColor: "white",
                      padding: "0.5rem 1rem",
                      color: "rgb(17 24 39)",
                      fontSize: "1rem",
                    }}
                  />
                </div>
                <Button
                  onClick={handleConfirmDisburse}
                  className="btn-success"
                  disabled={confirmTransferMutation.isPending}
                  style={{ width: "100%" }}
                >
                  {confirmTransferMutation.isPending ? "جاري التأكيد..." : "تأكيد الصرف"}
                </Button>
              </div>
            )}

            {selectedTransfer.status === "confirmed" && (
              <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "2px solid rgb(243 244 246)", paddingLeft: "1rem", paddingRight: "1rem", borderRadius: "0.5rem", backgroundColor: "rgb(220 252 231)", color: "rgb(22 163 74)" }}>
                تم تأكيد هذه الحوالة مسبقاً ولا يمكن تأكيدها مرة أخرى
              </div>
            )}
          </div>
        )}

        {/* Transfers List */}
        <div style={{ borderRadius: "0.5rem", border: "2px solid rgb(243 244 246)", backgroundColor: "white", padding: "1.5rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
          <h3 style={{ marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "600", color: "rgb(17 24 39)" }}>الحوالات المخصصة لك</h3>
          
          {isLoading ? (
            <p style={{ color: "rgb(107 114 128)", textAlign: "center", padding: "2rem" }}>جاري التحميل...</p>
          ) : transfers.length === 0 ? (
            <p style={{ color: "rgb(107 114 128)", textAlign: "center", padding: "2rem" }}>لا توجد حوالات</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "rgb(249 250 251)" }}>
                  <tr>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "rgb(17 24 39)", borderBottom: "2px solid rgb(243 244 246)" }}>رقم الإشعار</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "rgb(17 24 39)", borderBottom: "2px solid rgb(243 244 246)" }}>المبلغ</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "rgb(17 24 39)", borderBottom: "2px solid rgb(243 244 246)" }}>العملة</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "rgb(17 24 39)", borderBottom: "2px solid rgb(243 244 246)" }}>الحالة</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "rgb(17 24 39)", borderBottom: "2px solid rgb(243 244 246)" }}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((transfer: any) => (
                    <tr key={transfer.id} style={{ borderBottom: "2px solid rgb(243 244 246)" }}>
                      <td style={{ padding: "0.75rem 1rem", color: "rgb(55 65 81)" }}>{transfer.notificationNumber}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgb(55 65 81)" }}>{transfer.amount}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgb(55 65 81)" }}>{transfer.currencyCode}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: "9999px",
                          padding: "0.25rem 0.75rem",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          backgroundColor: transfer.status === "pending" ? "rgb(254 252 232)" : "rgb(220 252 231)",
                          color: transfer.status === "pending" ? "rgb(161 98 7)" : "rgb(22 163 74)",
                        }}>
                          {transfer.status === "pending" ? "قيد الانتظار" : "مصروفة"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "rgb(55 65 81)" }}>
                        {new Date(transfer.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
