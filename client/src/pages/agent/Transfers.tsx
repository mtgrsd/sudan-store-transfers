import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AgentTransfers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchNumber, setSearchNumber] = useState("");

  useEffect(() => {
    if (!user || user.role !== "agent") {
      setLocation("/");
    }
  }, [user, setLocation]);

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
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="أدخل رقم الإشعار"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="input-field flex-1"
            />
            <Button className="btn-primary">بحث</Button>
            <Button className="btn-secondary">مسح QR Code</Button>
          </div>
        </div>

        {/* Transfers List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">الحوالات المخصصة لي</h3>
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
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    لا توجد حوالات حالياً
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
