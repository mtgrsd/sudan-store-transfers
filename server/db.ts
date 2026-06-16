import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  agents,
  customers,
  currencies,
  agentWallets,
  companyWallet,
  transfers,
  ledgerEntries,
  auditLog,
  transferConfirmations,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ AGENTS ============

export async function getAgentByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAgentById(agentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(agents).where(eq(agents.isActive, true));
}

// ============ CUSTOMERS ============

export async function getCustomerById(customerId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(customers).where(eq(customers.isActive, true));
}

// ============ WALLETS ============

export async function getAgentWallet(agentId: number, currencyCode: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(agentWallets)
    .where(
      and(
        eq(agentWallets.agentId, agentId),
        eq(agentWallets.currencyCode, currencyCode)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCompanyWallet(currencyCode: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(companyWallet)
    .where(eq(companyWallet.currencyCode, currencyCode))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAgentWallets(agentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(agentWallets)
    .where(eq(agentWallets.agentId, agentId));
}

// ============ TRANSFERS ============

export async function getTransferByNotificationNumber(
  notificationNumber: string
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(transfers)
    .where(eq(transfers.notificationNumber, notificationNumber))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getTransferById(transferId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(transfers)
    .where(eq(transfers.id, transferId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAgentTransfers(agentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(transfers)
    .where(eq(transfers.agentId, agentId))
    .orderBy(desc(transfers.createdAt));
}

export async function getPendingTransfers() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(transfers)
    .where(eq(transfers.status, "pending"))
    .orderBy(desc(transfers.createdAt));
}

// ============ AUDIT LOG ============

export async function logAuditAction(
  userId: number,
  action: string,
  entityType: string,
  entityId: number | null,
  details: Record<string, unknown> | null,
  ipAddress?: string,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(auditLog).values({
      userId,
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("[Database] Failed to log audit action:", error);
  }
}

export async function getAuditLog(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============ CURRENCIES ============

export async function getAllCurrencies() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(currencies)
    .where(eq(currencies.isActive, true));
}

export async function initializeCurrencies() {
  const db = await getDb();
  if (!db) return;

  const currencyList = [
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "USDT", name: "Tether", symbol: "₮" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
    { code: "SDG", name: "Sudanese Pound", symbol: "£" },
  ];

  for (const curr of currencyList) {
    try {
      await db
        .insert(currencies)
        .values(curr)
        .onDuplicateKeyUpdate({
          set: { name: curr.name, symbol: curr.symbol },
        });
    } catch (error) {
      console.error(`[Database] Failed to insert currency ${curr.code}:`, error);
    }
  }
}

export async function initializeCompanyWallets() {
  const db = await getDb();
  if (!db) return;

  const currencyList = ["EUR", "USD", "USDT", "AED", "SAR", "SDG"];

  for (const code of currencyList) {
    try {
      await db
        .insert(companyWallet)
        .values({
          currencyCode: code,
          balance: "0",
          totalTransferred: "0",
        })
        .onDuplicateKeyUpdate({
          set: { balance: "0", totalTransferred: "0" },
        });
    } catch (error) {
      console.error(
        `[Database] Failed to initialize company wallet for ${code}:`,
        error
      );
    }
  }
}
