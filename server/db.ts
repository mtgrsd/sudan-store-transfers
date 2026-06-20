import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  offices,
  officeBalances,
  receipts,
  receiptAttachments,
  auditLog,
  accountingEntries,
  systemSettings,
} from "../drizzle/schema";
import { eq, and, or, like, desc, asc, gte, lte, sql } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(data: {
  id?: string;
  openId?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  lastSignedIn?: Date | null;
}) {
  const d = await D();
  const now = new Date();
  const id = data.id ?? data.openId ?? String(Date.now());
  await d
    .insert(users)
    .values({
      id,
      openId: data.openId ?? undefined,
      name: data.name ?? undefined,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      avatar: data.avatar ?? undefined,
      lastSignedIn: data.lastSignedIn ?? undefined,
      role: "employee",
    })
    .onDuplicateKeyUpdate({
      set: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        avatar: data.avatar ?? undefined,
        lastSignedIn: data.lastSignedIn ?? undefined,
        updatedAt: now,
      },
    });
  const lookupId = data.openId ?? id;
  return d.select().from(users).where(
    data.openId ? eq(users.openId, data.openId) : eq(users.id, id)
  ).then((r) => r[0]);
}

export async function getUserByOpenId(openId: string) {
  const d = await D();
  return d.select().from(users).where(eq(users.openId, openId)).then((r) => r[0] ?? null);
}

export async function getUserById(id: string) {
  const d = await D();
  return d.select().from(users).where(eq(users.id, id)).then((r) => r[0] ?? null);
}

export async function getUserByEmail(email: string) {
  const d = await D();
  return d.select().from(users).where(eq(users.email, email.toLowerCase())).then((r) => r[0] ?? null);
}

export async function getUserByIdOrOpenId(idOrOpenId: string) {
  const d = await D();
  // Try numeric id first (local auth), then openId (OAuth)
  const numericId = parseInt(idOrOpenId);
  if (!isNaN(numericId)) {
    const user = await d.select().from(users).where(eq(users.id, idOrOpenId)).then((r) => r[0] ?? null);
    if (user) return user;
  }
  return d.select().from(users).where(eq(users.openId, idOrOpenId)).then((r) => r[0] ?? null);
}

export async function updateUserLastSignedIn(id: string) {
  const d = await D();
  await d.update(users).set({ lastSignedIn: new Date(), updatedAt: new Date() }).where(eq(users.id, id));
}

export async function getAllUsers() {
  const d = await D();
  return d.select().from(users).orderBy(asc(users.name));
}

export async function updateUserRole(id: string, role: "super_admin" | "admin" | "employee" | "agent") {
  const d = await D();
  await d.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function updateUserPassword(id: string, passwordHash: string) {
  const d = await D();
  await d.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "employee" | "agent";
  phone?: string;
}) {
  const d = await D();
  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await d.insert(users).values({
    id,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    role: data.role,
    phone: data.phone,
    loginMethod: "local",
    isActive: true,
  });
  return d.select().from(users).where(eq(users.id, id)).then((r) => r[0]);
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const d = await D();
  await d.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id));
}

// ─── Offices ──────────────────────────────────────────────────────────────────

export async function createOffice(data: {
  code: string;
  name: string;
  city?: string;
  country?: string;
  phone?: string;
  managerName?: string;
  userId?: string;
  notes?: string;
}) {
  const d = await D();
  const result = await d.insert(offices).values(data);
  return d.select().from(offices).where(eq(offices.id, result[0].insertId)).then((r) => r[0]);
}

export async function getAllOffices(activeOnly = false) {
  const d = await D();
  if (activeOnly) return d.select().from(offices).where(eq(offices.isActive, true)).orderBy(asc(offices.name));
  return d.select().from(offices).orderBy(asc(offices.name));
}

export async function getOfficeById(id: number) {
  const d = await D();
  return d.select().from(offices).where(eq(offices.id, id)).then((r) => r[0] ?? null);
}

export async function getOfficeByUserId(userId: string) {
  const d = await D();
  return d.select().from(offices).where(eq(offices.userId, userId)).then((r) => r[0] ?? null);
}

export async function updateOffice(id: number, data: Partial<typeof offices.$inferInsert>) {
  const d = await D();
  await d.update(offices).set({ ...data, updatedAt: Date.now() }).where(eq(offices.id, id));
  return getOfficeById(id);
}

export async function getAllOfficesWithBalances(activeOnly = false) {
  const officesList = await getAllOffices(activeOnly);
  const d = await D();
  const balances = await d.select().from(officeBalances);
  const map = new Map<number, { currencyCode: string; balance: string }[]>();
  for (const b of balances) {
    const arr = map.get(b.officeId) ?? [];
    arr.push({ currencyCode: b.currencyCode, balance: b.balance });
    map.set(b.officeId, arr);
  }
  return officesList.map((o) => ({ ...o, balances: map.get(o.id) ?? [] }));
}

// فحص الحدود اليومية/الشهرية للمكتب قبل إنشاء إيصال
export async function checkOfficeLimits(officeId: number, currencyCode: string, amount: string): Promise<{ allowed: boolean; reason?: string }> {
  const office = await getOfficeById(officeId);
  if (!office) return { allowed: false, reason: "المكتب غير موجود" };

  // فحص العملات المسموح بها
  if (office.allowedCurrencies) {
    try {
      const allowed: string[] = JSON.parse(office.allowedCurrencies);
      if (allowed.length > 0 && !allowed.includes(currencyCode.toUpperCase())) {
        return { allowed: false, reason: `المكتب لا يقبل عملة ${currencyCode}. العملات المسموح بها: ${allowed.join(", ")}` };
      }
    } catch { /* JSON تالف، نتجاهله */ }
  }

  const d = await D();
  const amt = parseFloat(amount);

  if (office.dailyLimit) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const [todaySum] = await d.select({
      total: sql<string>`COALESCE(SUM(${receipts.amount}), 0)`,
    }).from(receipts).where(
      and(
        eq(receipts.officeId, officeId),
        eq(receipts.currencyCode, currencyCode),
        gte(receipts.createdAt, dayStart.getTime()),
        or(eq(receipts.status, "pending_deposit"), eq(receipts.status, "received"))
      )
    );
    const todayTotal = parseFloat(todaySum?.total ?? "0") + amt;
    if (todayTotal > parseFloat(office.dailyLimit)) {
      return { allowed: false, reason: `تجاوز الحد اليومي للمكتب: ${office.dailyLimit} ${currencyCode}` };
    }
  }

  if (office.monthlyLimit) {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [monthSum] = await d.select({
      total: sql<string>`COALESCE(SUM(${receipts.amount}), 0)`,
    }).from(receipts).where(
      and(
        eq(receipts.officeId, officeId),
        eq(receipts.currencyCode, currencyCode),
        gte(receipts.createdAt, monthStart.getTime()),
        or(eq(receipts.status, "pending_deposit"), eq(receipts.status, "received"))
      )
    );
    const monthTotal = parseFloat(monthSum?.total ?? "0") + amt;
    if (monthTotal > parseFloat(office.monthlyLimit)) {
      return { allowed: false, reason: `تجاوز الحد الشهري للمكتب: ${office.monthlyLimit} ${currencyCode}` };
    }
  }

  return { allowed: true };
}

// إيصالات قاربت على الانتهاء (خلال 24 ساعة) لإرسال تحذيرات
export async function getExpiringReceipts(hoursAhead = 24) {
  const d = await D();
  const now = Date.now();
  const threshold = now + hoursAhead * 60 * 60 * 1000;
  return d.select().from(receipts)
    .where(
      and(
        eq(receipts.status, "pending_deposit"),
        lte(receipts.expiresAt, threshold),
        gte(receipts.expiresAt, now)
      )
    )
    .orderBy(asc(receipts.expiresAt))
    .limit(100);
}

// إحصائيات الوكيل المحسّنة (أسبوع + أرصدة + إيصالات قادمة)
export async function getEnhancedOfficeDashboardStats(officeId: number) {
  const d = await D();
  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [todayTotal, todayReceived, weekReceived, monthReceived, allPending, expiringToday, balances] = await Promise.all([
    d.select({ count: sql<number>`count(*)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), gte(receipts.createdAt, todayStart.getTime()))),

    d.select({ count: sql<number>`count(*)`, total: sql<string>`COALESCE(SUM(amount), 0)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), eq(receipts.status, "received"), gte(receipts.receivedAt, todayStart.getTime()))),

    d.select({ count: sql<number>`count(*)`, total: sql<string>`COALESCE(SUM(amount), 0)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), eq(receipts.status, "received"), gte(receipts.receivedAt, weekStart.getTime()))),

    d.select({ count: sql<number>`count(*)`, total: sql<string>`COALESCE(SUM(amount), 0)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), eq(receipts.status, "received"), gte(receipts.receivedAt, monthStart.getTime()))),

    d.select({ count: sql<number>`count(*)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), eq(receipts.status, "pending_deposit"))),

    d.select({ count: sql<number>`count(*)` }).from(receipts)
      .where(and(
        eq(receipts.officeId, officeId),
        eq(receipts.status, "pending_deposit"),
        lte(receipts.expiresAt, now + 24 * 60 * 60 * 1000),
        gte(receipts.expiresAt, now)
      )),

    getOfficeBalances(officeId),
  ]);

  // الإيصالات المعلقة حسب العملة
  const pendingByCurrency = await d.select({
    currencyCode: receipts.currencyCode,
    count: sql<number>`COUNT(*)`,
    total: sql<string>`COALESCE(SUM(amount), 0)`,
  }).from(receipts)
    .where(and(eq(receipts.officeId, officeId), eq(receipts.status, "pending_deposit")))
    .groupBy(receipts.currencyCode);

  return {
    todayTotal: Number(todayTotal[0]?.count ?? 0),
    todayReceived: Number(todayReceived[0]?.count ?? 0),
    todayReceivedAmount: todayReceived[0]?.total ?? "0",
    weekReceived: Number(weekReceived[0]?.count ?? 0),
    weekReceivedAmount: weekReceived[0]?.total ?? "0",
    monthReceived: Number(monthReceived[0]?.count ?? 0),
    monthReceivedAmount: monthReceived[0]?.total ?? "0",
    allPending: Number(allPending[0]?.count ?? 0),
    expiringToday: Number(expiringToday[0]?.count ?? 0),
    pendingByCurrency: pendingByCurrency.map((r) => ({
      currencyCode: r.currencyCode,
      count: Number(r.count),
      total: r.total,
    })),
    balances,
  };
}

// الإشعارات: جلب الإيصالات الجديدة منذ timestamp معين (للـ polling)
export async function getNewReceiptsSince(officeId: number | null, sinceTs: number) {
  const d = await D();
  const conditions = [gte(receipts.createdAt, sinceTs)];
  if (officeId) conditions.push(eq(receipts.officeId, officeId));
  return d.select({
    id: receipts.id,
    notificationNumber: receipts.notificationNumber,
    payerName: receipts.payerName,
    amount: receipts.amount,
    currencyCode: receipts.currencyCode,
    status: receipts.status,
    createdAt: receipts.createdAt,
    officeId: receipts.officeId,
  }).from(receipts)
    .where(and(...conditions))
    .orderBy(desc(receipts.createdAt))
    .limit(20);
}

// ─── Office Balances ──────────────────────────────────────────────────────────

export async function getOfficeBalance(officeId: number, currencyCode: string) {
  const d = await D();
  return d
    .select()
    .from(officeBalances)
    .where(and(eq(officeBalances.officeId, officeId), eq(officeBalances.currencyCode, currencyCode)))
    .then((r) => r[0] ?? null);
}

export async function getOfficeBalances(officeId: number) {
  const d = await D();
  return d.select().from(officeBalances).where(eq(officeBalances.officeId, officeId));
}

export async function incrementOfficeBalance(officeId: number, currencyCode: string, amount: string) {
  const d = await D();
  await d
    .insert(officeBalances)
    .values({ officeId, currencyCode, balance: amount })
    .onDuplicateKeyUpdate({
      set: { balance: sql`balance + ${amount}`, updatedAt: Date.now() },
    });
  return getOfficeBalance(officeId, currencyCode);
}

// نقل رصيد بين مكتبين: خصم من المصدر وإضافة للوجهة مع قيد محاسبي
export async function transferBalanceBetweenOffices(params: {
  fromOfficeId: number;
  toOfficeId: number;
  currencyCode: string;
  amount: string;
  notes?: string;
  actorUserId: string;
}) {
  const d = await D();
  const amt = parseFloat(params.amount);
  if (amt <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  const fromBal = await getOfficeBalance(params.fromOfficeId, params.currencyCode);
  const fromBalance = parseFloat(fromBal?.balance ?? "0");
  if (fromBalance < amt) {
    throw new Error(`رصيد غير كافٍ: الرصيد الحالي ${fromBalance.toLocaleString("ar-SA")} ${params.currencyCode}`);
  }

  // خصم من المصدر
  await d.update(officeBalances)
    .set({ balance: sql`balance - ${params.amount}`, updatedAt: Date.now() })
    .where(and(eq(officeBalances.officeId, params.fromOfficeId), eq(officeBalances.currencyCode, params.currencyCode)));

  // إضافة للوجهة
  await d.insert(officeBalances)
    .values({ officeId: params.toOfficeId, currencyCode: params.currencyCode, balance: params.amount })
    .onDuplicateKeyUpdate({
      set: { balance: sql`balance + ${params.amount}`, updatedAt: Date.now() },
    });

  const [newFrom, newTo] = await Promise.all([
    getOfficeBalance(params.fromOfficeId, params.currencyCode),
    getOfficeBalance(params.toOfficeId, params.currencyCode),
  ]);

  return { fromBalance: newFrom?.balance ?? "0", toBalance: newTo?.balance ?? "0" };
}

// ─── Receipts ─────────────────────────────────────────────────────────────────

function generateNotificationNumber(): string {
  const prefix = "SD";
  const timestamp = Date.now().toString().slice(-7);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}${timestamp}${random}`;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSecretPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function createReceipt(data: {
  payerName: string;
  payerPhone?: string;
  payerCountry?: string;
  beneficiaryName?: string;
  beneficiaryPhone?: string;
  beneficiaryId?: string;
  amount: string;
  currencyCode: string;
  officeId: number;
  validityDays?: number;
  notes?: string;
  createdByUserId: string;
  status?: "draft" | "pending_deposit";
}) {
  const d = await D();
  const notificationNumber = generateNotificationNumber();
  const verificationCode = generateVerificationCode();
  const secretPin = generateSecretPin();
  const validityDays = data.validityDays ?? 7;
  const expiresAt = Date.now() + validityDays * 24 * 60 * 60 * 1000;

  const result = await d.insert(receipts).values({
    notificationNumber,
    verificationCode,
    secretPin,
    payerName: data.payerName,
    payerPhone: data.payerPhone,
    payerCountry: data.payerCountry,
    beneficiaryName: data.beneficiaryName,
    beneficiaryPhone: data.beneficiaryPhone,
    beneficiaryId: data.beneficiaryId,
    amount: data.amount,
    currencyCode: data.currencyCode,
    officeId: data.officeId,
    validityDays,
    expiresAt,
    notes: data.notes,
    createdByUserId: data.createdByUserId,
    status: data.status ?? "pending_deposit",
  });

  return d.select().from(receipts).where(eq(receipts.id, result[0].insertId)).then((r) => r[0]);
}

export async function getReceiptById(id: number) {
  const d = await D();
  return d.select().from(receipts).where(eq(receipts.id, id)).then((r) => r[0] ?? null);
}

export async function getReceiptByNotificationNumber(notificationNumber: string) {
  const d = await D();
  return d
    .select()
    .from(receipts)
    .where(eq(receipts.notificationNumber, notificationNumber))
    .then((r) => r[0] ?? null);
}

export async function getReceiptByVerificationCode(verificationCode: string) {
  const d = await D();
  return d
    .select()
    .from(receipts)
    .where(eq(receipts.verificationCode, verificationCode))
    .then((r) => r[0] ?? null);
}

export async function searchReceipts(params: {
  query?: string;
  officeId?: number;
  status?: string;
  currencyCode?: string;
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
}) {
  const d = await D();
  const conditions: ReturnType<typeof eq>[] = [];

  if (params.query) {
    const q = `%${params.query}%`;
    conditions.push(
      or(
        like(receipts.notificationNumber, q),
        like(receipts.verificationCode, q),
        like(receipts.payerName, q),
        like(receipts.payerPhone, q)
      ) as any
    );
  }

  if (params.officeId) conditions.push(eq(receipts.officeId, params.officeId) as any);
  if (params.status) conditions.push(eq(receipts.status, params.status as any) as any);
  if (params.currencyCode) conditions.push(eq(receipts.currencyCode, params.currencyCode) as any);
  if (params.fromDate) conditions.push(gte(receipts.createdAt, params.fromDate) as any);
  if (params.toDate) conditions.push(lte(receipts.createdAt, params.toDate) as any);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    d.select().from(receipts).where(where).orderBy(desc(receipts.createdAt))
      .limit(params.limit ?? 50).offset(params.offset ?? 0),
    d.select({ count: sql<number>`count(*)` }).from(receipts).where(where),
  ]);

  return { rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function getReceiptsForOffice(officeId: number, limit = 50) {
  const d = await D();
  return d.select().from(receipts).where(eq(receipts.officeId, officeId))
    .orderBy(desc(receipts.createdAt)).limit(limit);
}

export async function confirmReceiptDeposit(params: {
  receiptId: number;
  receivedByUserId: string;
  receivedNotes?: string;
}) {
  const receipt = await getReceiptById(params.receiptId);
  if (!receipt) throw new Error("الإيصال غير موجود");
  if (receipt.status === "received") throw new Error("تم تأكيد استلام هذا الإيصال مسبقاً");
  if (receipt.status === "cancelled") throw new Error("هذا الإيصال ملغى");
  if (receipt.status === "expired") throw new Error("انتهت صلاحية هذا الإيصال");

  const d = await D();
  const now = Date.now();

  const balanceBefore = await getOfficeBalance(receipt.officeId, receipt.currencyCode);
  const balanceBeforeAmount = balanceBefore?.balance ?? "0";

  await d.update(receipts).set({
    status: "received",
    receivedByUserId: params.receivedByUserId,
    receivedAt: now,
    receivedNotes: params.receivedNotes,
    updatedAt: now,
  }).where(eq(receipts.id, params.receiptId));

  const newBalance = await incrementOfficeBalance(receipt.officeId, receipt.currencyCode, receipt.amount);

  await d.insert(accountingEntries).values({
    receiptId: receipt.id,
    officeId: receipt.officeId,
    entryType: "deposit_received",
    amount: receipt.amount,
    currencyCode: receipt.currencyCode,
    balanceBefore: balanceBeforeAmount,
    balanceAfter: newBalance?.balance ?? receipt.amount,
    createdByUserId: params.receivedByUserId,
    createdAt: now,
  });

  return getReceiptById(params.receiptId);
}

export async function cancelReceipt(params: {
  receiptId: number;
  cancelledByUserId: string;
  cancelReason?: string;
}) {
  const receipt = await getReceiptById(params.receiptId);
  if (!receipt) throw new Error("الإيصال غير موجود");
  if (receipt.status === "received") throw new Error("لا يمكن إلغاء إيصال تم استلامه");
  if (receipt.status === "cancelled") throw new Error("الإيصال ملغى مسبقاً");

  const d = await D();
  await d.update(receipts).set({
    status: "cancelled",
    cancelledByUserId: params.cancelledByUserId,
    cancelledAt: Date.now(),
    cancelReason: params.cancelReason,
    updatedAt: Date.now(),
  }).where(eq(receipts.id, params.receiptId));

  return getReceiptById(params.receiptId);
}

export async function expireOldReceipts() {
  const d = await D();
  const now = Date.now();
  await d.update(receipts).set({ status: "expired", updatedAt: now }).where(
    and(eq(receipts.status, "pending_deposit"), lte(receipts.expiresAt, now))
  );
}

// ─── Receipt Attachments ──────────────────────────────────────────────────────

export async function addReceiptAttachment(data: {
  receiptId: number;
  uploadedByUserId: string;
  fileKey: string;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
}) {
  const d = await D();
  const result = await d.insert(receiptAttachments).values(data);
  return d.select().from(receiptAttachments).where(eq(receiptAttachments.id, result[0].insertId)).then((r) => r[0]);
}

export async function getReceiptAttachments(receiptId: number) {
  const d = await D();
  return d.select().from(receiptAttachments).where(eq(receiptAttachments.receiptId, receiptId))
    .orderBy(desc(receiptAttachments.createdAt));
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function writeAuditLog(data: {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: string;
  previousValue?: object;
  newValue?: object;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}) {
  const d = await D();
  await d.insert(auditLog).values({
    ...data,
    previousValue: data.previousValue ? JSON.stringify(data.previousValue) : undefined,
    newValue: data.newValue ? JSON.stringify(data.newValue) : undefined,
  });
}

export async function getAuditLogForReceipt(receiptId: number) {
  const d = await D();
  return d.select().from(auditLog)
    .where(and(eq(auditLog.entityType, "receipt"), eq(auditLog.entityId, String(receiptId))))
    .orderBy(desc(auditLog.createdAt));
}

export async function getAuditLog(params: {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
}) {
  const d = await D();
  const conditions: any[] = [];
  if (params.entityType) conditions.push(eq(auditLog.entityType, params.entityType));
  if (params.entityId) conditions.push(eq(auditLog.entityId, params.entityId));
  if (params.actorUserId) conditions.push(eq(auditLog.actorUserId, params.actorUserId));
  if (params.fromDate) conditions.push(gte(auditLog.createdAt, params.fromDate));
  if (params.toDate) conditions.push(lte(auditLog.createdAt, params.toDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return d.select().from(auditLog).where(where).orderBy(desc(auditLog.createdAt))
    .limit(params.limit ?? 100).offset(params.offset ?? 0);
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getAdminDashboardStats() {
  const d = await D();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const [totalResult, todayResult, pendingResult, receivedResult, cancelledResult, officeCount] = await Promise.all([
    d.select({ count: sql<number>`count(*)` }).from(receipts),
    d.select({ count: sql<number>`count(*)` }).from(receipts).where(gte(receipts.createdAt, todayStartMs)),
    d.select({ count: sql<number>`count(*)` }).from(receipts).where(eq(receipts.status, "pending_deposit")),
    d.select({ count: sql<number>`count(*)` }).from(receipts).where(eq(receipts.status, "received")),
    d.select({ count: sql<number>`count(*)` }).from(receipts).where(eq(receipts.status, "cancelled")),
    d.select({ count: sql<number>`count(*)` }).from(offices).where(eq(offices.isActive, true)),
  ]);

  return {
    totalReceipts: Number(totalResult[0]?.count ?? 0),
    todayReceipts: Number(todayResult[0]?.count ?? 0),
    pendingReceipts: Number(pendingResult[0]?.count ?? 0),
    receivedReceipts: Number(receivedResult[0]?.count ?? 0),
    cancelledReceipts: Number(cancelledResult[0]?.count ?? 0),
    activeOffices: Number(officeCount[0]?.count ?? 0),
  };
}

export async function getOfficeDashboardStats(officeId: number) {
  const d = await D();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const [todayTotal, todayReceived, allPending, balances] = await Promise.all([
    d.select({ count: sql<number>`count(*)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), gte(receipts.createdAt, todayStartMs))),
    d.select({ count: sql<number>`count(*)`, total: sql<string>`COALESCE(sum(amount), 0)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), eq(receipts.status, "received"), gte(receipts.receivedAt, todayStartMs))),
    d.select({ count: sql<number>`count(*)` }).from(receipts)
      .where(and(eq(receipts.officeId, officeId), eq(receipts.status, "pending_deposit"))),
    getOfficeBalances(officeId),
  ]);

  return {
    todayTotal: Number(todayTotal[0]?.count ?? 0),
    todayReceived: Number(todayReceived[0]?.count ?? 0),
    todayReceivedAmount: todayReceived[0]?.total ?? "0",
    allPending: Number(allPending[0]?.count ?? 0),
    balances,
  };
}

// ─── System Settings ──────────────────────────────────────────────────────────

export async function getAllSettingsMap(): Promise<Record<string, string>> {
  const db = await D();
  const rows = await db.select().from(systemSettings);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value ?? "";
  }
  return map;
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await D();
  const row = await d.select().from(systemSettings).where(eq(systemSettings.key, key)).then((r) => r[0]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const d = await D();
  await d.insert(systemSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

// ─── Currencies & Exchange Rates ──────────────────────────────────────────────
// لا يوجد جدول مخصص للعملات؛ نُخزّن القائمة كقيمة JSON واحدة داخل جدول
// system_settings الموجود مسبقًا (مفتاح: currencies_config) لتجنب أي تعديل
// على مخطط قاعدة البيانات.

const CURRENCIES_SETTING_KEY = "currencies_config";

type CurrencyConfig = {
  code: string;
  name: string;
  symbol?: string;
  exchangeRateToBase: string;
  isActive: boolean;
  sortOrder: number;
};

const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: "USD", name: "دولار أمريكي", symbol: "$", exchangeRateToBase: "1", isActive: true, sortOrder: 0 },
  { code: "EUR", name: "يورو", symbol: "€", exchangeRateToBase: "1", isActive: true, sortOrder: 1 },
  { code: "USDT", name: "تيثر", symbol: "₮", exchangeRateToBase: "1", isActive: true, sortOrder: 2 },
  { code: "AED", name: "درهم إماراتي", symbol: "د.إ", exchangeRateToBase: "1", isActive: true, sortOrder: 3 },
  { code: "SAR", name: "ريال سعودي", symbol: "ر.س", exchangeRateToBase: "1", isActive: true, sortOrder: 4 },
  { code: "SDG", name: "جنيه سوداني", symbol: "ج.س", exchangeRateToBase: "1", isActive: true, sortOrder: 5 },
  { code: "GBP", name: "جنيه إسترليني", symbol: "£", exchangeRateToBase: "1", isActive: true, sortOrder: 6 },
];

async function readCurrenciesConfig(): Promise<CurrencyConfig[]> {
  const raw = await getSetting(CURRENCIES_SETTING_KEY);
  if (!raw) {
    // أول استخدام: نزرع القائمة الافتراضية مرة واحدة في system_settings
    await setSetting(CURRENCIES_SETTING_KEY, JSON.stringify(DEFAULT_CURRENCIES));
    return DEFAULT_CURRENCIES;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // قيمة تالفة — نرجع للقائمة الافتراضية دون الكتابة فوق القيمة التالفة
  }
  return DEFAULT_CURRENCIES;
}

async function writeCurrenciesConfig(list: CurrencyConfig[]) {
  await setSetting(CURRENCIES_SETTING_KEY, JSON.stringify(list));
}

export async function getAllCurrencies(activeOnly = false) {
  const list = await readCurrenciesConfig();
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  return activeOnly ? sorted.filter((c) => c.isActive) : sorted;
}

export async function createCurrency(data: {
  code: string;
  name: string;
  symbol?: string;
  exchangeRateToBase?: string;
  sortOrder?: number;
}) {
  const list = await readCurrenciesConfig();
  const code = data.code.toUpperCase().trim();
  if (list.some((c) => c.code === code)) {
    throw new Error("هذه العملة موجودة مسبقًا");
  }
  const entry: CurrencyConfig = {
    code,
    name: data.name,
    symbol: data.symbol,
    exchangeRateToBase: data.exchangeRateToBase ?? "1",
    isActive: true,
    sortOrder: data.sortOrder ?? list.length,
  };
  const updated = [...list, entry];
  await writeCurrenciesConfig(updated);
  return entry;
}

export async function updateCurrency(
  code: string,
  data: Partial<{ name: string; symbol: string; exchangeRateToBase: string; isActive: boolean; sortOrder: number }>
) {
  const list = await readCurrenciesConfig();
  const idx = list.findIndex((c) => c.code === code.toUpperCase());
  if (idx === -1) throw new Error("العملة غير موجودة");
  list[idx] = { ...list[idx], ...data };
  await writeCurrenciesConfig(list);
  return list[idx];
}

export async function deleteCurrencyIfUnused(code: string) {
  const upperCode = code.toUpperCase();
  const d = await D();
  const usage = await d
    .select({ count: sql<number>`count(*)` })
    .from(receipts)
    .where(eq(receipts.currencyCode, upperCode));
  if (Number(usage[0]?.count ?? 0) > 0) {
    throw new Error("لا يمكن حذف عملة مستخدمة في إيصالات سابقة — يمكنك تعطيلها فقط");
  }
  const list = await readCurrenciesConfig();
  const updated = list.filter((c) => c.code !== upperCode);
  if (updated.length === list.length) throw new Error("العملة غير موجودة");
  await writeCurrenciesConfig(updated);
  return { success: true };
}

// ─── Accounting Entries (read access) ─────────────────────────────────────────

export async function getAccountingEntries(params: {
  officeId?: number;
  currencyCode?: string;
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
}) {
  const d = await D();
  const conditions: any[] = [];
  if (params.officeId) conditions.push(eq(accountingEntries.officeId, params.officeId));
  if (params.currencyCode) conditions.push(eq(accountingEntries.currencyCode, params.currencyCode));
  if (params.fromDate) conditions.push(gte(accountingEntries.createdAt, params.fromDate));
  if (params.toDate) conditions.push(lte(accountingEntries.createdAt, params.toDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    d.select().from(accountingEntries).where(where).orderBy(desc(accountingEntries.createdAt))
      .limit(params.limit ?? 100).offset(params.offset ?? 0),
    d.select({ count: sql<number>`count(*)` }).from(accountingEntries).where(where),
  ]);

  return { rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function getAccountingSummary(params: { fromDate?: number; toDate?: number }) {
  const d = await D();
  const conditions: any[] = [];
  if (params.fromDate) conditions.push(gte(accountingEntries.createdAt, params.fromDate));
  if (params.toDate) conditions.push(lte(accountingEntries.createdAt, params.toDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return d
    .select({
      currencyCode: accountingEntries.currencyCode,
      totalAmount: sql<string>`COALESCE(SUM(${accountingEntries.amount}), 0)`,
      entriesCount: sql<number>`COUNT(*)`,
    })
    .from(accountingEntries)
    .where(where)
    .groupBy(accountingEntries.currencyCode);
}

// ─── Reports & Statistics ──────────────────────────────────────────────────────

export async function getReportsSummary(params: {
  fromDate: number;
  toDate: number;
  officeId?: number;
}) {
  const d = await D();
  const baseConditions: any[] = [gte(receipts.createdAt, params.fromDate), lte(receipts.createdAt, params.toDate)];
  if (params.officeId) baseConditions.push(eq(receipts.officeId, params.officeId));
  const where = and(...baseConditions);

  const [byStatus, byCurrency, byOffice, daily] = await Promise.all([
    d.select({
      status: receipts.status,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<string>`COALESCE(SUM(${receipts.amount}), 0)`,
    }).from(receipts).where(where).groupBy(receipts.status),

    d.select({
      currencyCode: receipts.currencyCode,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<string>`COALESCE(SUM(CASE WHEN ${receipts.status} = 'received' THEN ${receipts.amount} ELSE 0 END), 0)`,
    }).from(receipts).where(where).groupBy(receipts.currencyCode),

    d.select({
      officeId: receipts.officeId,
      officeName: offices.name,
      count: sql<number>`COUNT(*)`,
      receivedCount: sql<number>`SUM(CASE WHEN ${receipts.status} = 'received' THEN 1 ELSE 0 END)`,
    }).from(receipts).leftJoin(offices, eq(offices.id, receipts.officeId)).where(where)
      .groupBy(receipts.officeId, offices.name)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10),

    d.select({
      day: sql<string>`DATE(FROM_UNIXTIME(${receipts.createdAt} / 1000))`,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<string>`COALESCE(SUM(CASE WHEN ${receipts.status} = 'received' THEN ${receipts.amount} ELSE 0 END), 0)`,
    }).from(receipts).where(where)
      .groupBy(sql`DATE(FROM_UNIXTIME(${receipts.createdAt} / 1000))`)
      .orderBy(sql`DATE(FROM_UNIXTIME(${receipts.createdAt} / 1000))`),
  ]);

  return {
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count), totalAmount: r.totalAmount })),
    byCurrency: byCurrency.map((r) => ({ currencyCode: r.currencyCode, count: Number(r.count), totalAmount: r.totalAmount })),
    byOffice: byOffice.map((r) => ({
      officeId: r.officeId,
      officeName: r.officeName ?? "",
      count: Number(r.count),
      receivedCount: Number(r.receivedCount),
    })),
    daily: daily.map((r) => ({ day: r.day, count: Number(r.count), totalAmount: r.totalAmount })),
  };
}
