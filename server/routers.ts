import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  upsertUser,
  getUserById,
  getAllUsers,
  updateUserRole,
  createOffice,
  getAllOffices,
  getOfficeById,
  getOfficeByUserId,
  updateOffice,
  getOfficeBalances,
  createReceipt,
  getReceiptById,
  getReceiptByNotificationNumber,
  getReceiptByVerificationCode,
  searchReceipts,
  getReceiptsForOffice,
  confirmReceiptDeposit,
  cancelReceipt,
  expireOldReceipts,
  addReceiptAttachment,
  getReceiptAttachments,
  writeAuditLog,
  getAuditLogForReceipt,
  getAuditLog,
  getAdminDashboardStats,
  getOfficeDashboardStats,
  getSetting,
  setSetting,
} from "./db";
import { storagePut } from "./storage";
import {
  getDb,
  getAllSettingsMap, } from "./db";
import { receipts, offices } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Auth Router ──────────────────────────────────────────────────────────────
const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ?? null;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
    return { success: true };
  }),
});

// ─── Admin: Users Router ──────────────────────────────────────────────────────
const userRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllUsers();
  }),

  updateRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(["admin", "staff", "agent"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
});

// ─── Offices Router ───────────────────────────────────────────────────────────
const officeRouter = router({
  getAll: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getAllOffices(input?.activeOnly ?? false);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const office = await getOfficeById(input.id);
      if (!office) throw new TRPCError({ code: "NOT_FOUND", message: "المكتب غير موجود" });
      return office;
    }),

  getMyOffice: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "agent") throw new TRPCError({ code: "FORBIDDEN" });
    const office = await getOfficeByUserId(ctx.user.id);
    if (!office) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم ربط حسابك بأي مكتب" });
    return office;
  }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().min(2).max(32),
      name: z.string().min(2).max(255),
      city: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      managerName: z.string().optional(),
      userId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const office = await createOffice(input);
      await writeAuditLog({
        entityType: "office",
        entityId: String(office.id),
        action: "create",
                actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        newValue: office,
      });
      return office;
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      managerName: z.string().optional(),
      userId: z.string().optional(),
      isActive: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      const office = await updateOffice(id, data);
      await writeAuditLog({
        entityType: "office",
        entityId: String(id),
        action: "update",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        newValue: office ?? {},
      });
      return office;
    }),

  getBalances: protectedProcedure
    .input(z.object({ officeId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        // Agents can only see their own office
        const office = await getOfficeByUserId(ctx.user.id);
        if (!office || office.id !== input.officeId) throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getOfficeBalances(input.officeId);
    }),

  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "agent") throw new TRPCError({ code: "FORBIDDEN" });
    const office = await getOfficeByUserId(ctx.user.id);
    if (!office) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم ربط حسابك بأي مكتب" });
    return getOfficeDashboardStats(office.id);
  }),
});

// ─── Receipts Router ──────────────────────────────────────────────────────────
const receiptRouter = router({
  // Admin/Staff: Create new receipt
  create: protectedProcedure
    .input(z.object({
      payerName: z.string().min(2).max(255),
      payerPhone: z.string().optional(),
      payerCountry: z.string().optional(),
      amount: z.string().regex(/^\d+(\.\d{1,4})?$/, "مبلغ غير صحيح"),
      currencyCode: z.string().min(2).max(10).default("USD"),
      officeId: z.number().int().positive(),
      validityDays: z.number().int().min(1).max(365).default(7),
      notes: z.string().optional(),
      status: z.enum(["draft", "pending_deposit"]).default("pending_deposit"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const office = await getOfficeById(input.officeId);
      if (!office) throw new TRPCError({ code: "NOT_FOUND", message: "المكتب غير موجود" });
      if (!office.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "المكتب غير نشط" });

      const receipt = await createReceipt({ ...input, createdByUserId: ctx.user.id });

      await writeAuditLog({
        entityType: "receipt",
        entityId: String(receipt.id),
        action: "create",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        newValue: { notificationNumber: receipt.notificationNumber, status: receipt.status },
        notes: `إنشاء إيصال جديد للدافع: ${receipt.payerName}`,
      });

      return receipt;
    }),

  // Get receipt by ID (admin/staff full details, agent limited)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const receipt = await getReceiptById(input.id);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.role === "agent") {
        const office = await getOfficeByUserId(ctx.user.id);
        if (!office || office.id !== receipt.officeId) throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [attachments, auditLogs] = await Promise.all([
        getReceiptAttachments(receipt.id),
        getAuditLogForReceipt(receipt.id),
      ]);

      const office = await getOfficeById(receipt.officeId);

      return { ...receipt, attachments, auditLogs, office };
    }),

  // Search by notification number (agent: for their office only)
  findByNotificationNumber: protectedProcedure
    .input(z.object({ notificationNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      // Expire old receipts first
      await expireOldReceipts();

      const receipt = await getReceiptByNotificationNumber(input.notificationNumber.toUpperCase().trim());
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على إيصال بهذا الرقم" });

      if (ctx.user.role === "agent") {
        const office = await getOfficeByUserId(ctx.user.id);
        if (!office || office.id !== receipt.officeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "هذا الإيصال مخصص لمكتب آخر" });
        }
      }

      const office = await getOfficeById(receipt.officeId);
      return { ...receipt, office };
    }),

  // Search (admin/staff: all, agent: their office)
  search: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      officeId: z.number().optional(),
      status: z.string().optional(),
      fromDate: z.number().optional(),
      toDate: z.number().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      let officeId = input.officeId;

      if (ctx.user.role === "agent") {
        const office = await getOfficeByUserId(ctx.user.id);
        if (!office) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم ربط حسابك بأي مكتب" });
        officeId = office.id;
      }

      const result = await searchReceipts({ ...input, officeId });

      // Enrich with office names
      const officeIds = Array.from(new Set(result.rows.map((r) => r.officeId)));
      const officeList = await Promise.all(officeIds.map((id) => getOfficeById(id)));
      const officeMap = Object.fromEntries(officeList.filter(Boolean).map((o) => [o!.id, o!.name]));

      return {
        rows: result.rows.map((r) => ({ ...r, officeName: officeMap[r.officeId] ?? "" })),
        total: result.total,
      };
    }),

  // Agent: Confirm deposit received
  confirmDeposit: protectedProcedure
    .input(z.object({
      receiptId: z.number(),
      receivedNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "agent" && ctx.user.role !== "staff" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const receipt = await getReceiptById(input.receiptId);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND" });

      // Agents can only confirm for their office
      if (ctx.user.role === "agent") {
        const office = await getOfficeByUserId(ctx.user.id);
        if (!office || office.id !== receipt.officeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "هذا الإيصال مخصص لمكتب آخر" });
        }
      }

      const previousStatus = receipt.status;
      const updated = await confirmReceiptDeposit({
        receiptId: input.receiptId,
        receivedByUserId: ctx.user.id,
        receivedNotes: input.receivedNotes,
      });

      await writeAuditLog({
        entityType: "receipt",
        entityId: String(receipt.id),
        action: "confirm_deposit",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        previousValue: { status: previousStatus },
        newValue: { status: "received", receivedAt: Date.now() },
        notes: `تأكيد استلام المبلغ: ${receipt.amount} ${receipt.currencyCode}`,
      });

      return updated;
    }),

  // Admin: Cancel receipt
  cancel: protectedProcedure
    .input(z.object({
      receiptId: z.number(),
      cancelReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const receipt = await getReceiptById(input.receiptId);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND" });

      const previousStatus = receipt.status;
      const updated = await cancelReceipt({
        receiptId: input.receiptId,
        cancelledByUserId: ctx.user.id,
        cancelReason: input.cancelReason,
      });

      await writeAuditLog({
        entityType: "receipt",
        entityId: String(receipt.id),
        action: "cancel",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        previousValue: { status: previousStatus },
        newValue: { status: "cancelled" },
        notes: input.cancelReason ?? "إلغاء الإيصال",
      });

      return updated;
    }),

  // Upload attachment
  addAttachment: protectedProcedure
    .input(z.object({
      receiptId: z.number(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const receipt = await getReceiptById(input.receiptId);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.role === "agent") {
        const office = await getOfficeByUserId(ctx.user.id);
        if (!office || office.id !== receipt.officeId) throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Decode base64 and upload
      const buffer = Buffer.from(input.fileBase64, "base64");
      const fileKey = `receipts/${receipt.id}/${Date.now()}-${input.fileName}`;
      const { key, url } = await storagePut(fileKey, buffer, input.mimeType);

      const attachment = await addReceiptAttachment({
        receiptId: input.receiptId,
        uploadedByUserId: ctx.user.id,
        fileKey: key,
        fileUrl: url,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: buffer.length,
        description: input.description,
      });

      await writeAuditLog({
        entityType: "receipt",
        entityId: String(receipt.id),
        action: "add_attachment",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        notes: `رفع مرفق: ${input.fileName}`,
      });

      return attachment;
    }),

  // Get receipts for a specific office (admin/staff)
  getByOffice: protectedProcedure
    .input(z.object({ officeId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await searchReceipts({ officeId: input.officeId, limit: 500, offset: 0 });
      return result.rows;
    }),
  // Get receipts for the current user's office (agent)
  getMyOfficeReceipts: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "agent") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Find office linked to this user
      const db = await getDb();
      if (!db) return [];
      const office = await db.select().from(offices).where(eq(offices.userId, ctx.user.id)).limit(1);
      if (!office[0]) return [];
      const result = await searchReceipts({ officeId: office[0].id, limit: 200, offset: 0 });
      return result.rows;
    }),
  // Agent: verify a receipt by notification number before confirming receipt
  agentVerify: protectedProcedure
    .input(z.object({ notificationNumber: z.string(), verificationCode: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "agent" && ctx.user.role !== "staff" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await expireOldReceipts();
      const receipt = await getReceiptByNotificationNumber(input.notificationNumber.toUpperCase().trim());
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "رقم الإشعار غير موجود" });
      if (receipt.status === "received") {
        throw new TRPCError({ code: "CONFLICT", message: "تم استلام هذا الإيصال مسبقاً" });
      }
      if (receipt.status === "cancelled" || receipt.status === "expired") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "هذا الإيصال ملغى أو منتهي الصلاحية" });
      }
      const office = await getOfficeById(receipt.officeId);
      return { receipt: { ...receipt, officeName: office?.name ?? "" } };
    }),
  // Agent/Office: confirm receipt of funds
  confirmReceived: protectedProcedure
    .input(z.object({
      receiptId: z.number(),
      secretCode: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "agent" && ctx.user.role !== "staff" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const receipt = await getReceiptById(input.receiptId);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "الإيصال غير موجود" });
      if (receipt.status === "received") {
        throw new TRPCError({ code: "CONFLICT", message: "تم استلام هذا الإيصال مسبقاً" });
      }
      if (receipt.secretPin !== input.secretCode) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "الرقم السري غير صحيح" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطأ في قاعدة البيانات" });
      const now = Date.now();
      await db.update(receipts).set({
        status: "received",
        receivedAt: now,
        receivedByUserId: ctx.user.id,
        updatedAt: now,
        notes: input.notes ? (receipt.notes ? receipt.notes + "\n" + input.notes : input.notes) : receipt.notes,
      }).where(eq(receipts.id, input.receiptId));
      const updated = await getReceiptById(input.receiptId);
      await writeAuditLog({
        entityType: "receipt",
        entityId: String(input.receiptId),
        action: "confirm_received",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        notes: `تأكيد الاستلام - الرقم السري صحيح`,
        newValue: updated,
      });
      return { receipt: updated };
    }),
  // Export CSV
  exportCsv: protectedProcedure
    .input(z.object({
      fromDate: z.number().optional(),
      toDate: z.number().optional(),
      officeId: z.number().optional(),
      status: z.string().optional(),
      currencyCode: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await searchReceipts({
        ...input,
        limit: 10000,
        offset: 0,
      });
      const officeIds = Array.from(new Set(result.rows.map((r) => r.officeId)));
      const officeList = await Promise.all(officeIds.map((id) => getOfficeById(id)));
      const officeMap = Object.fromEntries(officeList.filter(Boolean).map((o) => [o!.id, o!.name]));
      const statusLabels: Record<string, string> = {
        pending_deposit: "بانتظار الإيداع",
        received: "مستلم",
        cancelled: "ملغى",
        expired: "منتهي الصلاحية",
      };
      const rows = result.rows.map((r) => ({
        "رقم الإشعار": r.notificationNumber,
        "اسم الدافع": r.payerName,
        "رقم الهاتف": r.payerPhone,
        "الدولة": r.payerCountry ?? "",
        "المبلغ": r.amount,
        "العملة": r.currencyCode,
        "المكتب": officeMap[r.officeId] ?? "",
        "الحالة": statusLabels[r.status] ?? r.status,
        "تاريخ الإنشاء": r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-SA") : "",
        "تاريخ الاستلام": r.receivedAt ? new Date(r.receivedAt).toLocaleDateString("ar-SA") : "",
        "ملاحظات": r.notes ?? "",
      }));
      // Build CSV string
      if (rows.length === 0) return { csv: "", count: 0 };
      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((h) => `"${String((row as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ];
      return { csv: csvLines.join("\n"), count: rows.length };
    }),
  // Public verification (for customers - limited info only)
  publicVerify: publicProcedure
    .input(z.object({ notificationNumber: z.string() }))
    .query(async ({ input }) => {
      await expireOldReceipts();
      const receipt = await getReceiptByNotificationNumber(input.notificationNumber.toUpperCase().trim());
      if (!receipt) return null;

      const office = await getOfficeById(receipt.officeId);

      // Return only safe public info
      return {
        notificationNumber: receipt.notificationNumber,
        verificationCode: receipt.verificationCode,
        status: receipt.status,
        payerName: receipt.payerName,
        amount: receipt.amount,
        currencyCode: receipt.currencyCode,
        officeName: office?.name ?? "",
        officeCity: office?.city ?? "",
        officeCountry: office?.country ?? "",
        expiresAt: receipt.expiresAt,
        createdAt: receipt.createdAt,
        receivedAt: receipt.receivedAt,
      };
    }),
});

// ─── Admin Dashboard Router ───────────────────────────────────────────────────
const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getAdminDashboardStats();
  }),

  getRecentReceipts: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await searchReceipts({ limit: input?.limit ?? 10, offset: 0 });
      const officeIds = Array.from(new Set(result.rows.map((r) => r.officeId)));
      const officeList = await Promise.all(officeIds.map((id) => getOfficeById(id)));
      const officeMap = Object.fromEntries(officeList.filter(Boolean).map((o) => [o!.id, o!.name]));
      return result.rows.map((r) => ({ ...r, officeName: officeMap[r.officeId] ?? "" }));
    }),
});

// ─── Audit Log Router ─────────────────────────────────────────────────────────
const auditRouter = router({
  getForReceipt: protectedProcedure
    .input(z.object({ receiptId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getAuditLogForReceipt(input.receiptId);
    }),

  getAll: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      actorUserId: z.string().optional(),
      fromDate: z.number().optional(),
      toDate: z.number().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAuditLog(input);
    }),
});

// ─── Settings Router ──────────────────────────────────────────────────────────
const settingsRouter = router({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllSettingsMap();
    }),
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getSetting(input.key);
    }),

  set: protectedProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await setSetting(input.key, input.value);
      return { success: true };
    }),
});

// ─── Root Router ──────────────────────────────────────────────────────────────
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  office: officeRouter,
  receipt: receiptRouter,
  dashboard: dashboardRouter,
  audit: auditRouter,
  settings: settingsRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
