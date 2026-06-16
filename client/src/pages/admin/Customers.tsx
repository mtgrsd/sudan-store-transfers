// صفحة العملاء لم تعد مستخدمة - النظام الجديد لا يحتوي على تسجيل عملاء
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Customers() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/admin/receipts");
  }, [setLocation]);
  return null;
}
