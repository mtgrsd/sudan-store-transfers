import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  index,
} from "drizzle-orm/mysql-core";

/**
 * نظام التحويلات المالية - متجر السودان
 * Multi-Currency Wallet System with Double Entry Accounting
 */

// ============ USERS & AUTHENTICATION ============

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 20 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["admin", "agent"]).default("agent").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    roleIdx: index("role_idx").on(table.role),
    activeIdx: index("active_idx").on(table.isActive),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ AGENTS (الوكلاء) ============

export const agents = mysqlTable(
  "agents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    agentName: varchar("agentName", { length: 255 }).notNull(),
    agentCode: varchar("agentCode", { length: 50 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 320 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("agent_userId_idx").on(table.userId),
    codeIdx: index("agent_code_idx").on(table.agentCode),
    activeIdx: index("agent_active_idx").on(table.isActive),
  })
);

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// ============ CUSTOMERS (العملاء) ============

export const customers = mysqlTable(
  "customers",
  {
    id: int("id").autoincrement().primaryKey(),
    customerId: varchar("customerId", { length: 50 }).notNull().unique(),
    customerName: varchar("customerName", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 320 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    customerIdIdx: index("customer_id_idx").on(table.customerId),
    activeIdx: index("customer_active_idx").on(table.isActive),
  })
);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============ CURRENCIES ============

export const currencies = mysqlTable("currencies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = typeof currencies.$inferInsert;

// ============ WALLETS (المحافظ) ============

export const agentWallets = mysqlTable(
  "agent_wallets",
  {
    id: int("id").autoincrement().primaryKey(),
    agentId: int("agentId").notNull(),
    currencyCode: varchar("currencyCode", { length: 10 }).notNull(),
    balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
    frozenBalance: decimal("frozenBalance", { precision: 18, scale: 8 }).default("0").notNull(),
    totalReceived: decimal("totalReceived", { precision: 18, scale: 8 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    agentCurrencyIdx: index("agent_wallet_idx").on(table.agentId, table.currencyCode),
  })
);

export type AgentWallet = typeof agentWallets.$inferSelect;
export type InsertAgentWallet = typeof agentWallets.$inferInsert;

export const companyWallet = mysqlTable(
  "company_wallet",
  {
    id: int("id").autoincrement().primaryKey(),
    currencyCode: varchar("currencyCode", { length: 10 }).notNull().unique(),
    balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
    totalTransferred: decimal("totalTransferred", { precision: 18, scale: 8 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type CompanyWallet = typeof companyWallet.$inferSelect;
export type InsertCompanyWallet = typeof companyWallet.$inferInsert;

// ============ TRANSFERS (الحوالات) ============

export const transfers = mysqlTable(
  "transfers",
  {
    id: int("id").autoincrement().primaryKey(),
    transferId: varchar("transferId", { length: 50 }).notNull().unique(),
    notificationNumber: varchar("notificationNumber", { length: 50 }).notNull().unique(),
    secretCode: varchar("secretCode", { length: 50 }).notNull(),
    agentId: int("agentId").notNull(),
    customerId: int("customerId").notNull(),
    amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
    currencyCode: varchar("currencyCode", { length: 10 }).notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "disbursed", "cancelled"]).default("pending").notNull(),
    qrCode: text("qrCode"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    confirmedAt: timestamp("confirmedAt"),
    cancelledAt: timestamp("cancelledAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    agentIdIdx: index("transfer_agent_idx").on(table.agentId),
    customerIdIdx: index("transfer_customer_idx").on(table.customerId),
    statusIdx: index("transfer_status_idx").on(table.status),
    notificationIdx: index("transfer_notification_idx").on(table.notificationNumber),
    transferIdIdx: index("transfer_id_idx").on(table.transferId),
  })
);

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;

// ============ LEDGER ENTRIES (دفتر الأستاذ) ============

export const ledgerEntries = mysqlTable(
  "ledger_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    transferId: int("transferId").notNull(),
    entryType: mysqlEnum("entryType", ["debit", "credit"]).notNull(),
    accountType: mysqlEnum("accountType", ["agent", "company"]).notNull(),
    accountId: int("accountId").notNull(),
    amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
    currencyCode: varchar("currencyCode", { length: 10 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    transferIdIdx: index("ledger_transfer_idx").on(table.transferId),
    accountIdx: index("ledger_account_idx").on(table.accountType, table.accountId),
  })
);

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;

// ============ AUDIT LOG (سجل التدقيق) ============

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 50 }).notNull(),
    entityId: int("entityId"),
    details: json("details"),
    ipAddress: varchar("ipAddress", { length: 50 }),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("audit_user_idx").on(table.userId),
    actionIdx: index("audit_action_idx").on(table.action),
    entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("audit_created_idx").on(table.createdAt),
  })
);

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ============ TRANSFER CONFIRMATIONS (تأكيدات الصرف) ============

export const transferConfirmations = mysqlTable(
  "transfer_confirmations",
  {
    id: int("id").autoincrement().primaryKey(),
    transferId: int("transferId").notNull().unique(),
    agentId: int("agentId").notNull(),
    confirmedByUserId: int("confirmedByUserId").notNull(),
    confirmationTime: timestamp("confirmationTime").defaultNow().notNull(),
    ipAddress: varchar("ipAddress", { length: 50 }),
    userAgent: text("userAgent"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    transferIdIdx: index("confirmation_transfer_idx").on(table.transferId),
    agentIdIdx: index("confirmation_agent_idx").on(table.agentId),
  })
);

export type TransferConfirmation = typeof transferConfirmations.$inferSelect;
export type InsertTransferConfirmation = typeof transferConfirmations.$inferInsert;

// ============ SYSTEM SETTINGS ============

export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
