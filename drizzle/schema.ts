import {
  mysqlTable,
  varchar,
  text,
  int,
  bigint,
  decimal,
  boolean,
  mysqlEnum,
  index,
  uniqueIndex,
  timestamp,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ─── Users (Local Auth - Email + Password) ───────────────────────────────────
// NOTE: The actual DB has id as INT AUTO_INCREMENT; we map it as varchar for string compatibility
export const users = mysqlTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  openId: varchar("openId", { length: 64 }),                        // OAuth openId (legacy)
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),          // bcrypt hash
  loginMethod: varchar("loginMethod", { length: 64 }),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["super_admin", "admin", "employee", "agent"]).notNull().default("employee"),
  isActive: boolean("isActive").notNull().default(true),
  officeId: int("office_id"),                                       // for agents
  lastSignedIn: timestamp("lastSignedIn"),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: varchar("created_by", { length: 128 }),                // who created this user
});

// ─── Offices / Agents ────────────────────────────────────────────────────────
export const offices = mysqlTable("offices", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 32 }).notNull().unique(),       // e.g. OFF-001
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 128 }),
  country: varchar("country", { length: 128 }),
  phone: varchar("phone", { length: 64 }),
  managerName: varchar("manager_name", { length: 255 }),
  userId: varchar("user_id", { length: 128 }),                    // linked system user
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
}, (t) => ({
  codeIdx: uniqueIndex("offices_code_idx").on(t.code),
  userIdx: index("offices_user_idx").on(t.userId),
}));

// ─── Office Balances ─────────────────────────────────────────────────────────
export const officeBalances = mysqlTable("office_balances", {
  id: int("id").primaryKey().autoincrement(),
  officeId: int("office_id").notNull(),
  currencyCode: varchar("currency_code", { length: 10 }).notNull().default("USD"),
  balance: decimal("balance", { precision: 18, scale: 4 }).notNull().default("0"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
}, (t) => ({
  officeIdx: index("ob_office_idx").on(t.officeId),
  uniqueOfficeCurrency: uniqueIndex("ob_office_currency_idx").on(t.officeId, t.currencyCode),
}));

// ─── Receipts ─────────────────────────────────────────────────────────────────
// Status flow: draft → pending_deposit → received | cancelled | expired
export const receipts = mysqlTable("receipts", {
  id: int("id").primaryKey().autoincrement(),

  // Unique identifiers
  notificationNumber: varchar("notification_number", { length: 32 }).notNull().unique(),
  verificationCode: varchar("verification_code", { length: 16 }).notNull(),  // short code for customer
  secretPin: varchar("secret_pin", { length: 8 }).notNull(),                  // internal PIN

  // Payer info (no customer account required)
  payerName: varchar("payer_name", { length: 255 }).notNull(),
  payerPhone: varchar("payer_phone", { length: 64 }),
  payerCountry: varchar("payer_country", { length: 128 }),

  // Financial
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  currencyCode: varchar("currency_code", { length: 10 }).notNull().default("USD"),

  // Assignment
  officeId: int("office_id").notNull(),

  // Status
  status: mysqlEnum("status", [
    "draft",
    "pending_deposit",
    "received",
    "cancelled",
    "expired",
  ]).notNull().default("pending_deposit"),

  // Validity
  validityDays: int("validity_days").notNull().default(7),
  expiresAt: bigint("expires_at", { mode: "number" }),

  // Notes
  notes: text("notes"),

  // Created by
  createdByUserId: varchar("created_by_user_id", { length: 128 }).notNull(),

  // Received by
  receivedByUserId: varchar("received_by_user_id", { length: 128 }),
  receivedAt: bigint("received_at", { mode: "number" }),
  receivedNotes: text("received_notes"),

  // Cancelled by
  cancelledByUserId: varchar("cancelled_by_user_id", { length: 128 }),
  cancelledAt: bigint("cancelled_at", { mode: "number" }),
  cancelReason: text("cancel_reason"),

  // Timestamps
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
}, (t) => ({
  notifIdx: uniqueIndex("receipts_notif_idx").on(t.notificationNumber),
  verifyIdx: index("receipts_verify_idx").on(t.verificationCode),
  officeIdx: index("receipts_office_idx").on(t.officeId),
  statusIdx: index("receipts_status_idx").on(t.status),
  payerNameIdx: index("receipts_payer_name_idx").on(t.payerName),
  payerPhoneIdx: index("receipts_payer_phone_idx").on(t.payerPhone),
  createdAtIdx: index("receipts_created_at_idx").on(t.createdAt),
  expiresIdx: index("receipts_expires_idx").on(t.expiresAt),
}));

// ─── Receipt Attachments ──────────────────────────────────────────────────────
export const receiptAttachments = mysqlTable("receipt_attachments", {
  id: int("id").primaryKey().autoincrement(),
  receiptId: int("receipt_id").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id", { length: 128 }).notNull(),
  fileKey: varchar("file_key", { length: 512 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 128 }),
  fileSize: int("file_size"),
  description: text("description"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
}, (t) => ({
  receiptIdx: index("ra_receipt_idx").on(t.receiptId),
}));

// ─── Audit Log ────────────────────────────────────────────────────────────────
export const auditLog = mysqlTable("audit_log", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("userId", { length: 128 }),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: varchar("entityId", { length: 128 }),
  details: text("details"),                                        // JSON details
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
}, (t) => ({
  entityIdx: index("al_entity_idx").on(t.entityType, t.entityId),
  userIdx: index("al_user_idx").on(t.userId),
  actionIdx: index("al_action_idx").on(t.action),
  createdAtIdx: index("al_created_at_idx").on(t.createdAt),
}));

// ─── Accounting Entries ───────────────────────────────────────────────────────
export const accountingEntries = mysqlTable("accounting_entries", {
  id: int("id").primaryKey().autoincrement(),
  receiptId: int("receipt_id").notNull(),
  officeId: int("office_id").notNull(),
  entryType: mysqlEnum("entry_type", ["deposit_received"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  currencyCode: varchar("currency_code", { length: 10 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 18, scale: 4 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 18, scale: 4 }).notNull(),
  createdByUserId: varchar("created_by_user_id", { length: 128 }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP()*1000)`),
}, (t) => ({
  receiptIdx: index("ae_receipt_idx").on(t.receiptId),
  officeIdx: index("ae_office_idx").on(t.officeId),
}));

// ─── System Settings ──────────────────────────────────────────────────────────
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Office = typeof offices.$inferSelect;
export type InsertOffice = typeof offices.$inferInsert;
export type OfficeBalance = typeof officeBalances.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;
export type ReceiptAttachment = typeof receiptAttachments.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type AccountingEntry = typeof accountingEntries.$inferSelect;
