// server/whatsapp.ts
// تكامل اختياري مع WhatsApp Cloud API (Meta) لإرسال إشعارات نصية للعملاء.
// لا يعتمد عليه أي مسار أساسي في النظام؛ إن لم تُضبط الإعدادات، تُرفض العملية
// بخطأ واضح يُمسك دائماً في نقاط الاستدعاء (best-effort، لا يكسر تدفق الإيصالات).
import { getSetting } from "./db";

export class WhatsAppNotConfiguredError extends Error {}

async function getCredentials() {
  // التوكن يمكن ضبطه كمتغير بيئة لأمان أفضل في الإنتاج، وإلا يُقرأ من إعدادات النظام
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || (await getSetting("whatsapp_access_token"));
  const phoneNumberId = await getSetting("whatsapp_phone_number_id");
  if (!accessToken || !phoneNumberId) {
    throw new WhatsAppNotConfiguredError("لم يتم ضبط إعدادات واتساب (Access Token / Phone Number ID)");
  }
  return { accessToken, phoneNumberId };
}

function normalizePhone(phone: string): string {
  // يزيل المسافات والرموز ويحتفظ بالأرقام فقط، مع علامة + إن وجدت في البداية
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  return digits;
}

export async function sendWhatsAppText(toPhone: string, message: string) {
  const { accessToken, phoneNumberId } = await getCredentials();
  const to = normalizePhone(toPhone);
  if (!to) throw new Error("رقم هاتف غير صالح");

  const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const errMsg = json?.error?.message || `فشل الإرسال (${resp.status})`;
    throw new Error(errMsg);
  }
  return json;
}

// إرسال إشعار "أفضل مجهود" — لا يرمي استثناءً أبداً، يُستخدم داخل عمليات
// إنشاء/تأكيد الإيصال دون التأثير على نجاح العملية الأساسية.
export async function sendWhatsAppBestEffort(toPhone: string | null | undefined, message: string) {
  if (!toPhone) return { sent: false, reason: "لا يوجد رقم هاتف للدافع" };
  try {
    await sendWhatsAppText(toPhone, message);
    return { sent: true };
  } catch (err: any) {
    console.warn("[WhatsApp] best-effort notify failed:", err?.message ?? err);
    return { sent: false, reason: err?.message ?? "خطأ غير معروف" };
  }
}
