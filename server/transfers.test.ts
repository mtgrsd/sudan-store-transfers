import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ==============================
// Test Helpers
// ==============================

function createAdminContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const ctx: TrpcContext = {
    user: {
      id: 1,
      openId: "admin-openid",
      email: "admin@sudanstore.com",
      name: "مدير النظام",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createAgentContext(agentId = 2): TrpcContext {
  return {
    user: {
      id: agentId,
      openId: `agent-openid-${agentId}`,
      email: `agent${agentId}@sudanstore.com`,
      name: `وكيل ${agentId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ==============================
// Auth Tests
// ==============================

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      httpOnly: true,
      path: "/",
    });
  });

  it("returns current user from auth.me", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
  });
});

// ==============================
// Role-Based Access Control Tests
// ==============================

describe("Role-Based Access Control", () => {
  it("admin can access agent list", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agent.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can access customer list", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.customer.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can access pending transfers", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transfer.getPending();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can access audit log", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audit.getLog({ limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot access agent list", async () => {
    const ctx = createAgentContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.agent.getAll()).rejects.toThrow();
  });
});

// ==============================
// Transfer Workflow Tests
// ==============================

describe("Transfer Workflow", () => {
  it("public verify returns null for non-existent notification number", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transfer.publicVerify({
      notificationNumber: "NON-EXISTENT-12345",
    });
    expect(result).toBeNull();
  });

  it("verify throws error for non-existent notification number (protected)", async () => {
    const ctx = createAgentContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.transfer.verify({
        notificationNumber: "INVALID-XXXX",
      })
    ).rejects.toThrow();
  });

  it("disburse throws error for non-existent transfer", async () => {
    const ctx = createAgentContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.transfer.disburse({
        transferId: 999999,
        secretCode: "WRONG-CODE",
      })
    ).rejects.toThrow();
  });
});

// ==============================
// Double-Entry Accounting Tests
// ==============================

describe("Double-Entry Accounting Integrity", () => {
  it("admin dashboard stats returns valid structure", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.transfer.getStats();
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("disbursed");
    expect(stats).toHaveProperty("total");
    expect(typeof stats.pending).toBe("number");
    expect(typeof stats.disbursed).toBe("number");
    expect(typeof stats.total).toBe("number");
    // Integrity check: total >= pending + disbursed
    expect(stats.total).toBeGreaterThanOrEqual(stats.pending + stats.disbursed);
  });

  it("non-admin cannot access stats", async () => {
    const ctx = createAgentContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.transfer.getStats()).rejects.toThrow();
  });
});

// ==============================
// Wallet & Multi-Currency Tests
// ==============================

describe("Multi-Currency Wallet System", () => {
  it("admin can access company wallets", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const wallets = await caller.wallet.getCompanyWallets();
    expect(Array.isArray(wallets)).toBe(true);
  });

  it("non-admin cannot access company wallets", async () => {
    const ctx = createAgentContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.wallet.getCompanyWallets()).rejects.toThrow();
  });
});
