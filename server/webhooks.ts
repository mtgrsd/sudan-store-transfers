// server/webhooks.ts
// نظام Webhooks: إرسال إشعارات HTTP للأنظمة الخارجية عند أحداث الإيصالات.
// الإعدادات مخزّنة في system_settings (مفتاح: webhooks_config) كـ JSON.

import { getSetting, setSetting } from "./db";

export type WebhookEvent =
  | "receipt.created"
  | "receipt.confirmed"
  | "receipt.cancelled"
  | "receipt.expired";

export type WebhookConfig = {
  id: string;
  name: string;
  url: string;
  secret?: string;           // مفتاح سري لتوقيع الطلب (HMAC-SHA256)
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: number;
};

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: number;
  receipt: {
    id: number;
    notificationNumber: string;
    status: string;
    amount: string;
    currencyCode: string;
    payerName: string;
    payerPhone?: string | null;
    officeName?: string;
    createdAt: number;
  };
};

const SETTING_KEY = "webhooks_config";

export async function getWebhooks(): Promise<WebhookConfig[]> {
  const raw = await getSetting(SETTING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveWebhooks(hooks: WebhookConfig[]) {
  await setSetting(SETTING_KEY, JSON.stringify(hooks));
}

export async function addWebhook(data: Omit<WebhookConfig, "id" | "createdAt">) {
  const hooks = await getWebhooks();
  const newHook: WebhookConfig = {
    ...data,
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  hooks.push(newHook);
  await saveWebhooks(hooks);
  return newHook;
}

export async function updateWebhook(id: string, data: Partial<WebhookConfig>) {
  const hooks = await getWebhooks();
  const idx = hooks.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Webhook غير موجود");
  hooks[idx] = { ...hooks[idx], ...data };
  await saveWebhooks(hooks);
  return hooks[idx];
}

export async function deleteWebhook(id: string) {
  const hooks = await getWebhooks();
  const updated = hooks.filter((h) => h.id !== id);
  if (updated.length === hooks.length) throw new Error("Webhook غير موجود");
  await saveWebhooks(updated);
  return { success: true };
}

// توقيع HMAC-SHA256 للتحقق من مصدر الطلب
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", keyMaterial, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// إرسال webhook واحد مع إعادة المحاولة مرة واحدة
async function sendOne(hook: WebhookConfig, payload: WebhookPayload): Promise<{ id: string; success: boolean; status?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Sudan-Event": payload.event,
    "X-Sudan-Timestamp": String(payload.timestamp),
  };
  if (hook.secret) {
    headers["X-Sudan-Signature"] = `sha256=${await signPayload(body, hook.secret)}`;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(hook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) return { id: hook.id, success: true, status: resp.status };
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000)); // انتظر ثانية قبل إعادة المحاولة
    } catch (err: any) {
      if (attempt === 1) return { id: hook.id, success: false, error: err.message };
    }
  }
  return { id: hook.id, success: false, error: "فشل الاتصال بعد محاولتين" };
}

// إرسال الحدث لكل webhooks المفعّلة المشتركة في هذا الحدث
export async function dispatchWebhookEvent(event: WebhookEvent, payload: WebhookPayload) {
  const hooks = await getWebhooks();
  const targets = hooks.filter((h) => h.isActive && h.events.includes(event));
  if (targets.length === 0) return;
  // إرسال بالتوازي (best-effort، لا يوقف تدفق النظام)
  Promise.allSettled(targets.map((h) => sendOne(h, payload))).catch(() => {});
}
