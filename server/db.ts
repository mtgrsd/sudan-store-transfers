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
  userId?: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: object;
  previousValue?: object;
  newValue?: object;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const d = await D();
  const details = {
    actorName: data.actorName,
    actorRole: data.actorRole,
    previousValue: data.previousValue,
    newValue: data.newValue,
    notes: data.notes,
    ...data.details,
  };
  await d.insert(auditLog).values({
    userId: data.userId || data.actorUserId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    details: Object.keys(details).length > 0 ? JSON.stringify(details) : undefined,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
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
  if (params.actorUserId) conditions.push(eq(auditLog.userId, params.actorUserId));
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
