import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAgentByUserId,
  getAgentById,
  getAllAgents,
  getAllCustomers,
  getAgentWallet,
  getCompanyWallet,
  getAgentWallets,
  getTransferByNotificationNumber,
  getAgentTransfers,
  getPendingTransfers,
  getAuditLog,
  getAllCurrencies,
  initializeCurrencies,
  initializeCompanyWallets,
  getDb,
  logAuditAction,
} from "./db";
import {
  agents,
  customers,
  agentWallets,
  companyWallet,
  transfers,
  ledgerEntries,
  transferConfirmations,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// ============ INITIALIZATION PROCEDURES ============

export const initRouter = router({
  initializeCurrencies: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admin can initialize currencies");
    }
    await initializeCurrencies();
    await initializeCompanyWallets();
    return { success: true };
  }),
});

// ============ AGENTS PROCEDURES ============

export const agentRouter = router({
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const agent = await getAgentByUserId(ctx.user!.id);
    if (!agent) {
      return null;
    }
    const wallets = await getAgentWallets(agent.id);
    return { ...agent, wallets };
  }),

  getById: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admin can view agent details");
      }
      const agent = await getAgentById(input.agentId);
      if (!agent) return null;
      const wallets = await getAgentWallets(agent.id);
      return { ...agent, wallets };
    }),

  getAgentTransfers: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admin can view agent transfers");
      }
      return await getAgentTransfers(input.agentId);
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admin can view all agents");
    }
    const allAgents = await getAllAgents();
    const agentsWithWallets = await Promise.all(
      allAgents.map(async (agent) => ({
        ...agent,
        wallets: await getAgentWallets(agent.id),
      }))
    );
    return agentsWithWallets;
  }),

  create: protectedProcedure
    .input(
      z.object({
        agentName: z.string().min(1),
        agentCode: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admin can create agents");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const newAgent = await db.insert(agents).values({
        userId: ctx.user!.id,
        agentName: input.agentName,
        agentCode: input.agentCode,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        country: input.country,
        notes: input.notes,
      });

      const agentId = (newAgent as any).insertId;

      // Initialize wallets for all currencies
      const allCurrencies = await getAllCurrencies();
      for (const curr of allCurrencies) {
        await db.insert(agentWallets).values({
          agentId,
          currencyCode: curr.code,
          balance: "0",
          frozenBalance: "0",
          totalReceived: "0",
        });
      }

      await logAuditAction(
        ctx.user!.id,
        "CREATE_AGENT",
        "agents",
        agentId,
        { agentName: input.agentName, agentCode: input.agentCode }
      );

      return { success: true, agentId };
    }),

  updateBalance: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        currencyCode: z.string(),
        amount: z.string(),
        operation: z.enum(["add", "subtract"]),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admin can update agent balance");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const wallet = await getAgentWallet(input.agentId, input.currencyCode);
      if (!wallet) throw new Error("Wallet not found");

      const currentBalance = parseFloat(wallet.balance);
      const amount = parseFloat(input.amount);
      const newBalance =
        input.operation === "add"
          ? currentBalance + amount
          : currentBalance - amount;

      if (newBalance < 0) {
        throw new Error("Insufficient balance");
      }

      await db
        .update(agentWallets)
        .set({ balance: newBalance.toString() })
        .where(eq(agentWallets.id, wallet.id));

      await logAuditAction(
        ctx.user!.id,
        "UPDATE_AGENT_BALANCE",
        "agent_wallets",
        wallet.id,
        {
          agentId: input.agentId,
          currencyCode: input.currencyCode,
          operation: input.operation,
          amount: input.amount,
          reason: input.reason,
        }
      );

      return { success: true };
    }),
});

// ============ CUSTOMERS PROCEDURES ============

export const customerRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admin can view all customers");
    }
    return await getAllCustomers();
  }),

  create: protectedProcedure
    .input(
      z.object({
        customerId: z.string().min(1),
        customerName: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admin can create customers");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(customers).values({
        customerId: input.customerId,
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        country: input.country,
        notes: input.notes,
      });

      const customerId = (result as any).insertId;

      await logAuditAction(
        ctx.user!.id,
        "CREATE_CUSTOMER",
        "customers",
        customerId,
        { customerId: input.customerId, customerName: input.customerName }
      );

      return { success: true, customerId };
    }),
});

// ============ TRANSFERS PROCEDURES ============

export const transferRouter = router({
  getMyTransfers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "agent") {
      throw new Error("Only agents can view their transfers");
    }

    const agent = await getAgentByUserId(ctx.user!.id);
    if (!agent) throw new Error("Agent not found");

    return await getAgentTransfers(agent.id);
  }),

  getByNotificationNumber: protectedProcedure
    .input(z.object({ notificationNumber: z.string() }))
    .query(async ({ input, ctx }) => {
      const transfer = await getTransferByNotificationNumber(
        input.notificationNumber
      );

      if (!transfer) throw new Error("Transfer not found");

      if (ctx.user?.role === "agent") {
        const agent = await getAgentByUserId(ctx.user!.id);
        if (!agent || agent.id !== transfer.agentId) {
          throw new Error("Unauthorized");
        }
      }

      return transfer;
    }),

  create: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        customerId: z.number(),
        amount: z.string(),
        currencyCode: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admin can create transfers");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agent = await getAgentById(input.agentId);
      if (!agent) throw new Error("Agent not found");

      const db2 = await getDb();
      if (!db2) throw new Error("Database not available");
      
      const customerResult = await db2
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);
      
      const customer = customerResult?.[0];

      if (!customer) throw new Error("Customer not found");

      const notificationNumber = nanoid(12).toUpperCase();
      const secretCode = nanoid(8).toUpperCase();
      const transferId = `TRF-${Date.now()}-${nanoid(6)}`;

      const result = await db.insert(transfers).values({
        transferId,
        notificationNumber,
        secretCode,
        agentId: input.agentId,
        customerId: input.customerId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        status: "pending",
        notes: input.notes,
      });

      const newTransferId = (result as any).insertId;

      await logAuditAction(
        ctx.user!.id,
        "CREATE_TRANSFER",
        "transfers",
        newTransferId,
        {
          transferId,
          notificationNumber,
          agentId: input.agentId,
          customerId: input.customerId,
          amount: input.amount,
          currencyCode: input.currencyCode,
        }
      );

      return {
        success: true,
        transfer: {
          id: newTransferId,
          transferId,
          notificationNumber,
          secretCode,
        },
      };
    }),

  confirmTransfer: protectedProcedure
    .input(
      z.object({
        notificationNumber: z.string(),
        secretCode: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "agent") {
        throw new Error("Only agents can confirm transfers");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agent = await getAgentByUserId(ctx.user!.id);
      if (!agent) throw new Error("Agent not found");

      const transfer = await getTransferByNotificationNumber(
        input.notificationNumber
      );
      if (!transfer) throw new Error("Transfer not found");

      if (transfer.agentId !== agent.id) {
        throw new Error("Unauthorized");
      }

      if (transfer.status !== "pending") {
        throw new Error("Transfer is not pending");
      }

      if (transfer.secretCode !== input.secretCode) {
        throw new Error("Invalid secret code");
      }

      // Validate agent wallet exists
      const agentWallet = await getAgentWallet(
        agent.id,
        transfer.currencyCode
      );
      if (!agentWallet) {
        throw new Error(`Agent wallet not found for currency ${transfer.currencyCode}`);
      }

      // Validate company wallet exists and has sufficient balance
      const companyWlt = await getCompanyWallet(transfer.currencyCode);
      if (!companyWlt) {
        throw new Error(`Company wallet not found for currency ${transfer.currencyCode}`);
      }

      const companyBalance = parseFloat(companyWlt.balance);
      const transferAmount = parseFloat(transfer.amount);
      if (companyBalance < transferAmount) {
        throw new Error(`Insufficient company balance. Available: ${companyBalance}, Required: ${transferAmount}`);
      }

      const now = new Date();

      // Update transfer status
      await db
        .update(transfers)
        .set({ status: "confirmed", confirmedAt: now })
        .where(eq(transfers.id, transfer.id));

      // Record confirmation
      await db.insert(transferConfirmations).values({
        transferId: transfer.id,
        agentId: agent.id,
        confirmedByUserId: ctx.user!.id,
        confirmationTime: now,
      });

      // Update agent wallet (add amount)
      const newAgentBalance =
        parseFloat(agentWallet.balance) + transferAmount;
      const newAgentTotalReceived =
        parseFloat(agentWallet.totalReceived) + transferAmount;

      await db
        .update(agentWallets)
        .set({
          balance: newAgentBalance.toString(),
          totalReceived: newAgentTotalReceived.toString(),
        })
        .where(eq(agentWallets.id, agentWallet.id));

      // Update company wallet (subtract amount)
      const newCompanyBalance = companyBalance - transferAmount;
      const newCompanyTotalTransferred =
        parseFloat(companyWlt.totalTransferred) + transferAmount;

      await db
        .update(companyWallet)
        .set({
          balance: newCompanyBalance.toString(),
          totalTransferred: newCompanyTotalTransferred.toString(),
        })
        .where(eq(companyWallet.currencyCode, transfer.currencyCode));

      // Create ledger entries (double entry accounting)
      // Debit: Agent account
      await db.insert(ledgerEntries).values({
        transferId: transfer.id,
        entryType: "debit",
        accountType: "agent",
        accountId: agent.id,
        amount: transfer.amount,
        currencyCode: transfer.currencyCode,
        description: `Transfer confirmation for notification ${input.notificationNumber}`,
      });

      // Credit: Company account
      await db.insert(ledgerEntries).values({
        transferId: transfer.id,
        entryType: "credit",
        accountType: "company",
        accountId: 0,
        amount: transfer.amount,
        currencyCode: transfer.currencyCode,
        description: `Transfer debit from company for notification ${input.notificationNumber}`,
      });

      await logAuditAction(
        ctx.user!.id,
        "CONFIRM_TRANSFER",
        "transfers",
        transfer.id,
        {
          notificationNumber: input.notificationNumber,
          amount: transfer.amount,
          currencyCode: transfer.currencyCode,
          agentBalance: newAgentBalance.toString(),
          companyBalance: newCompanyBalance.toString(),
        }
      );

      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admin can view stats");
    }
    const db = await getDb();
    if (!db) return { pending: 0, disbursed: 0, total: 0 };
    const allTransfers = await db.select().from(transfers);
    const pending = allTransfers.filter((t) => t.status === "pending").length;
    const disbursed = allTransfers.filter((t) => t.status === "disbursed" || t.status === "confirmed").length;
    const total = allTransfers.length;
    return { pending, disbursed, total };
  }),

  getChartData: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admin can view chart data");
    }
    const db = await getDb();
    if (!db) return { byCurrency: [], byStatus: [], last7Days: [] };
    const allTransfers = await db.select().from(transfers);

    // By currency
    const currencyMap: Record<string, { amount: number; count: number }> = {};
    for (const t of allTransfers) {
      const c = t.currencyCode || "USD";
      if (!currencyMap[c]) currencyMap[c] = { amount: 0, count: 0 };
      currencyMap[c].amount += parseFloat(t.amount || "0");
      currencyMap[c].count += 1;
    }
    const byCurrency = Object.entries(currencyMap).map(([currency, data]) => ({
      currency,
      amount: data.amount,
      count: data.count,
    }));

    // By status
    const byStatus = [
      { status: "قيد الانتظار", count: allTransfers.filter(t => t.status === "pending").length },
      { status: "تم الصرف", count: allTransfers.filter(t => t.status === "disbursed" || t.status === "confirmed").length },
    ];

    // Last 7 days
    const now = new Date();
    const last7Days: { date: string; count: number; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTransfers = allTransfers.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split("T")[0];
        return tDate === dateStr;
      });
      last7Days.push({
        date: dateStr,
        count: dayTransfers.length,
        amount: dayTransfers.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0),
      });
    }

    return { byCurrency, byStatus, last7Days };
  }),

  getPending: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admin can view pending transfers");
    }
    return await getPendingTransfers();
  }),

  // Public verification for QR Code scanning (no auth required)
  publicVerify: publicProcedure
    .input(z.object({ notificationNumber: z.string() }))
    .query(async ({ input }) => {
      const transfer = await getTransferByNotificationNumber(input.notificationNumber);
      if (!transfer) return null;

      // Return safe public info only (no secretCode)
      return {
        notificationNumber: transfer.notificationNumber,
        amount: transfer.amount,
        currencyCode: transfer.currencyCode,
        status: transfer.status,
        createdAt: transfer.createdAt,
        confirmedAt: transfer.confirmedAt,
        agentId: transfer.agentId,
      };
    }),

  // Step 3-4 in workflow: Agent verifies transfer by notification number
  verify: protectedProcedure
    .input(z.object({ notificationNumber: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const transfer = await getTransferByNotificationNumber(input.notificationNumber);
      if (!transfer) throw new Error("لم يتم العثور على الحوالة");

      if (ctx.user?.role === "agent") {
        const agent = await getAgentByUserId(ctx.user!.id);
        if (!agent || agent.id !== transfer.agentId) {
          throw new Error("هذه الحوالة غير مخصصة لك");
        }
      }

      return { transfer };
    }),

  // Step 5-6 in workflow: Agent confirms disbursal with secret code
  disburse: protectedProcedure
    .input(z.object({ transferId: z.number(), secretCode: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "agent") {
        throw new Error("فقط الوكلاء يمكنهم تأكيد الصرف");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agent = await getAgentByUserId(ctx.user!.id);
      if (!agent) throw new Error("لم يتم العثور على الوكيل");

      // Get transfer by ID
      const transferResult = await db
        .select()
        .from(transfers)
        .where(eq(transfers.id, input.transferId))
        .limit(1);
      const transfer = transferResult?.[0];

      if (!transfer) throw new Error("لم يتم العثور على الحوالة");

      // Step 7: Prevent duplicate disbursement
      if (transfer.status === "disbursed" || transfer.status === "confirmed") {
        throw new Error("تم صرف هذه الحوالة مسبقاً ولا يمكن صرفها مرة أخرى");
      }

      if (transfer.status !== "pending") {
        throw new Error("الحوالة غير متاحة للصرف");
      }

      if (transfer.agentId !== agent.id) {
        throw new Error("هذه الحوالة غير مخصصة لك");
      }

      if (transfer.secretCode !== input.secretCode) {
        throw new Error("الرقم السري غير صحيح");
      }

      // Validate wallets
      const agentWallet = await getAgentWallet(agent.id, transfer.currencyCode);
      if (!agentWallet) {
        throw new Error(`لا توجد محفظة للوكيل بعملة ${transfer.currencyCode}`);
      }

      const companyWlt = await getCompanyWallet(transfer.currencyCode);
      if (!companyWlt) {
        throw new Error(`لا توجد محفظة للشركة بعملة ${transfer.currencyCode}`);
      }

      const companyBalance = parseFloat(companyWlt.balance);
      const transferAmount = parseFloat(transfer.amount);
      if (companyBalance < transferAmount) {
        throw new Error(`رصيد الشركة غير كافٍ. المتاح: ${companyBalance}، المطلوب: ${transferAmount}`);
      }

      const now = new Date();

      // Update transfer status to disbursed
      await db
        .update(transfers)
        .set({ status: "disbursed", confirmedAt: now })
        .where(eq(transfers.id, transfer.id));

      // Record confirmation
      await db.insert(transferConfirmations).values({
        transferId: transfer.id,
        agentId: agent.id,
        confirmedByUserId: ctx.user!.id,
        confirmationTime: now,
      });

      // Step 6: Add amount to agent wallet
      const newAgentBalance = parseFloat(agentWallet.balance) + transferAmount;
      const newAgentTotalReceived = parseFloat(agentWallet.totalReceived) + transferAmount;
      await db
        .update(agentWallets)
        .set({ balance: newAgentBalance.toString(), totalReceived: newAgentTotalReceived.toString() })
        .where(eq(agentWallets.id, agentWallet.id));

      // Deduct from company wallet
      const newCompanyBalance = companyBalance - transferAmount;
      await db
        .update(companyWallet)
        .set({ balance: newCompanyBalance.toString(), totalTransferred: (parseFloat(companyWlt.totalTransferred) + transferAmount).toString() })
        .where(eq(companyWallet.currencyCode, transfer.currencyCode));

      // Double-entry accounting ledger entries
      await db.insert(ledgerEntries).values({
        transferId: transfer.id,
        entryType: "debit",
        accountType: "agent",
        accountId: agent.id,
        amount: transfer.amount,
        currencyCode: transfer.currencyCode,
        description: `صرف حوالة ${transfer.notificationNumber} - إضافة لرصيد الوكيل`,
      });

      await db.insert(ledgerEntries).values({
        transferId: transfer.id,
        entryType: "credit",
        accountType: "company",
        accountId: 0,
        amount: transfer.amount,
        currencyCode: transfer.currencyCode,
        description: `صرف حوالة ${transfer.notificationNumber} - خصم من رصيد الشركة`,
      });

      await logAuditAction(
        ctx.user!.id,
        "DISBURSE_TRANSFER",
        "transfers",
        transfer.id,
        {
          notificationNumber: transfer.notificationNumber,
          amount: transfer.amount,
          currencyCode: transfer.currencyCode,
          agentNewBalance: newAgentBalance.toString(),
          companyNewBalance: newCompanyBalance.toString(),
        }
      );

      return {
        success: true,
        transfer: {
          ...transfer,
          status: "disbursed",
          newBalance: newAgentBalance.toString(),
        },
      };
    }),
});

// ============ AUDIT LOG PROCEDURES ============

export const auditRouter = router({
  getLog: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admin can view audit log");
      }
      return await getAuditLog(input.limit, input.offset);
    }),
});

// ============ WALLET PROCEDURES ============

export const walletRouter = router({
  getCompanyWallets: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admin can view wallets");
    }
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(companyWallet);
  }),
});

// ============ MAIN ROUTER ============

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  init: initRouter,
  agent: agentRouter,
  customer: customerRouter,
  transfer: transferRouter,
  audit: auditRouter,
  wallet: walletRouter,
});

export type AppRouter = typeof appRouter;
