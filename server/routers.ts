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
  updateUserPassword,
  createUser,
  toggleUserActive,
  createOffice,
  getAllOffices,
  getAllOfficesWithBalances,
  transferBalanceBetweenOffices,
  getExpiringReceipts,
  getEnhancedOfficeDashboardStats,
  getNewReceiptsSince,
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
  getAllCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrencyIfUnused,
  getAccountingEntries,
  getAccountingSummary,
  getReportsSummary,
  checkOfficeLimits,
} from "./db";
import { storagePut } from "./storage";
import { sendWhatsAppBestEffort, sendWhatsAppText, WhatsAppNotConfiguredError } from "./whatsapp";
import { dispatchWebhookEvent, getWebhooks, addWebhook, updateWebhook, deleteWebhook } from "./webhooks";
import type { WebhookEvent } from "./webhooks";
import {
  getDb,
  getAllSettingsMap, } from "./db";
import { receipts, offices } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Auth Router ──────────────────────────────────────────────────────────────
const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    // Never expose passwordHash to the frontend
    const { passwordHash: _pw, loginMethod: _lm, ...safeUser } = ctx.user as any;
    return safeUser;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
    return { success: true };
  }),

  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { hashPassword, verifyPassword } = await import("./_core/localAuth");
      const user = await getUserById(ctx.user.id);
      if (!user || !user.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تغيير كلمة المرور" });
      const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
      const newHash = await hashPassword(input.newPassword);
      await updateUserPassword(ctx.user.id, newHash);
      return { success: true };
    }),
});

// ─── Admin: Users Router ──────────────────────────────────────────────────────
const userRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
    const users = await getAllUsers();
    const offices = await getAllOffices(false);
    const officeMap = Object.fromEntries(offices.map((o) => [o.userId, o]));
    return users.map((u) => ({ ...u, linkedOffice: u.id ? (officeMap[u.id] ?? null) : null }));
  }),

  updateRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(["admin", "employee", "agent"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك تغيير دورك بنفسك" });
      await updateUserRole(input.userId, input.role);
      await writeAuditLog({
        entityType: "user", entityId: input.userId, action: "update_role",
        actorUserId: ctx.user.id, actorName: ctx.user.name ?? undefined, actorRole: ctx.user.role,
        newValue: { role: input.role },
      });
      return { success: true };
    }),

  // ربط مستخدم بمكتب (للوكلاء)
  linkToOffice: protectedProcedure
    .input(z.object({ userId: z.string(), officeId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      if (input.officeId !== null) {
        await updateOffice(input.officeId, { userId: input.userId });
      } else {
        // فك الربط: نجد المكتب المرتبط ونحذف userId منه
        const offices = await getAllOffices(false);
        const linked = offices.find((o) => o.userId === input.userId);
        if (linked) await updateOffice(linked.id, { userId: undefined });
      }
      await writeAuditLog({
        entityType: "user", entityId: input.userId, action: "link_office",
        actorUserId: ctx.user.id, actorName: ctx.user.name ?? undefined, actorRole: ctx.user.role,
        newValue: { officeId: input.officeId },
      });
      return { success: true };
    }),

  // إنشاء مستخدم جديد (admin فقط)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["admin", "employee", "agent"]),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { hashPassword } = await import("./_core/localAuth");
      const hash = await hashPassword(input.password);
      const newUser = await createUser({
        name: input.name,
        email: input.email,
        passwordHash: hash,
        role: input.role,
        phone: input.phone,
      });
      await writeAuditLog({
        entityType: "user", entityId: newUser?.id ?? "",
        action: "create_user",
        actorUserId: ctx.user.id, actorName: ctx.user.name ?? undefined, actorRole: ctx.user.role,
        newValue: { name: input.name, email: input.email, role: input.role },
        notes: `إنشاء مستخدم جديد: ${input.name}`,
      });
      return newUser;
    }),

  // تفعيل / تعطيل مستخدم
  toggleActive: protectedProcedure
    .input(z.object({ userId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك تعطيل حسابك بنفسك" });
      }
      await toggleUserActive(input.userId, input.isActive);
      await writeAuditLog({
        entityType: "user", entityId: input.userId,
        action: input.isActive ? "activate_user" : "deactivate_user",
        actorUserId: ctx.user.id, actorName: ctx.user.name ?? undefined, actorRole: ctx.user.role,
        notes: input.isActive ? "تفعيل الحساب" : "تعطيل الحساب",
      });
      return { success: true };
    }),

  // تغيير كلمة مرور المستخدم الحالي (self)
  changeMyPassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const { hashPassword, verifyPassword } = await import("./_core/localAuth");
      const user = await getUserById(ctx.user.id);
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تغيير كلمة مرور حساب OAuth" });
      }
      const valid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
      const hash = await hashPassword(input.newPassword);
      await updateUserPassword(ctx.user.id, hash);
      return { success: true };
    }),

  // إعادة تعيين كلمة مرور من قِبل المدير
  resetUserPassword: protectedProcedure
    .input(z.object({ userId: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { hashPassword } = await import("./_core/localAuth");
      const hash = await hashPassword(input.newPassword);
      await updateUserPassword(input.userId, hash);
      await writeAuditLog({
        entityType: "user", entityId: input.userId, action: "reset_password",
        actorUserId: ctx.user.id, actorName: ctx.user.name ?? undefined, actorRole: ctx.user.role,
        notes: "إعادة تعيين كلمة المرور من قِبل المدير",
      });
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

  getAllWithBalances: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getAllOfficesWithBalances(input?.activeOnly ?? false);
    }),

  // تحديث حدود المكتب (عملات مسموحة، حد يومي/شهري، رقم الإشعار)
  updateLimits: protectedProcedure
    .input(z.object({
      officeId: z.number(),
      allowedCurrencies: z.array(z.string()).optional(), // [] = all allowed
      dailyLimit: z.string().nullable().optional(),
      monthlyLimit: z.string().nullable().optional(),
      notifyPhone: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { officeId, allowedCurrencies, ...rest } = input;
      const updateData: Record<string, any> = { ...rest };
      if (allowedCurrencies !== undefined) {
        updateData.allowedCurrencies = allowedCurrencies.length > 0 ? JSON.stringify(allowedCurrencies) : null;
      }
      const office = await updateOffice(officeId, updateData);
      await writeAuditLog({
        entityType: "office",
        entityId: String(officeId),
        action: "update_limits",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        newValue: updateData,
        notes: "تحديث حدود وإعدادات المكتب",
      });
      return office;
    }),

  // نقل رصيد بين مكتبين (super_admin فقط)
  transferBalance: protectedProcedure
    .input(z.object({
      fromOfficeId: z.number(),
      toOfficeId: z.number(),
      currencyCode: z.string(),
      amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (input.fromOfficeId === input.toOfficeId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن النقل للمكتب نفسه" });
      }
      try {
        const result = await transferBalanceBetweenOffices({
          ...input,
          actorUserId: ctx.user.id,
        });
        const [fromOffice, toOffice] = await Promise.all([
          getOfficeById(input.fromOfficeId),
          getOfficeById(input.toOfficeId),
        ]);
        await writeAuditLog({
          entityType: "office",
          entityId: String(input.fromOfficeId),
          action: "balance_transfer",
          actorUserId: ctx.user.id,
          actorName: ctx.user.name ?? undefined,
          actorRole: ctx.user.role,
          newValue: {
            from: fromOffice?.name, to: toOffice?.name,
            amount: input.amount, currency: input.currencyCode,
          },
          notes: input.notes || `نقل رصيد: ${input.amount} ${input.currencyCode} من ${fromOffice?.name} إلى ${toOffice?.name}`,
        });
        return result;
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
      }
    }),


  getExpiringReceipts: protectedProcedure
    .input(z.object({ hoursAhead: z.number().default(24) }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getExpiringReceipts(input?.hoursAhead ?? 24);
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
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

  // إحصائيات الوكيل المحسّنة (أسبوع/شهر/تحذيرات انتهاء)
  getEnhancedStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "agent" && ctx.user.role !== "employee") throw new TRPCError({ code: "FORBIDDEN" });
    const office = await getOfficeByUserId(ctx.user.id);
    if (!office) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم ربط حسابك بأي مكتب" });
    return getEnhancedOfficeDashboardStats(office.id);
  }),

  // polling للإشعارات: إيصالات جديدة منذ timestamp معين
  getNewSince: protectedProcedure
    .input(z.object({ sinceTs: z.number() }))
    .query(async ({ ctx, input }) => {
      let officeId: number | null = null;
      if (ctx.user.role === "agent") {
        const office = await getOfficeByUserId(ctx.user.id);
        officeId = office?.id ?? null;
      }
      return getNewReceiptsSince(officeId, input.sinceTs);
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
      // بيانات المستفيد (جديد)
      beneficiaryName: z.string().optional(),
      beneficiaryPhone: z.string().optional(),
      beneficiaryId: z.string().optional(),
      amount: z.string().regex(/^\d+(\.\d{1,4})?$/, "مبلغ غير صحيح"),
      currencyCode: z.string().min(2).max(10).default("USD"),
      officeId: z.number().int().positive(),
      validityDays: z.number().int().min(1).max(365).default(7),
      notes: z.string().optional(),
      status: z.enum(["draft", "pending_deposit"]).default("pending_deposit"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const office = await getOfficeById(input.officeId);
      if (!office) throw new TRPCError({ code: "NOT_FOUND", message: "المكتب غير موجود" });
      if (!office.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "المكتب غير نشط" });

      // فحص حدود المكتب والعملات المسموح بها (جديد)
      const limitCheck = await checkOfficeLimits(input.officeId, input.currencyCode, input.amount);
      if (!limitCheck.allowed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: limitCheck.reason });
      }

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

      // إشعار واتساب اختياري (best-effort، لا يؤثر على نجاح إنشاء الإيصال)
      const whatsappEnabled = (await getSetting("whatsapp_enabled")) === "true";
      const notifyOnCreate = (await getSetting("whatsapp_notify_on_create")) === "true";
      if (whatsappEnabled && notifyOnCreate && receipt.payerPhone) {
        const verifyUrl = `${process.env.PUBLIC_APP_URL || ""}/verify/${receipt.notificationNumber}`;
        sendWhatsAppBestEffort(
          receipt.payerPhone,
          `مرحباً ${receipt.payerName}،\nتم تسجيل إيصالك بنجاح.\nرقم الإشعار: ${receipt.notificationNumber}\nالمبلغ: ${receipt.amount} ${receipt.currencyCode}\nرابط التحقق: ${verifyUrl}`
        ).catch(() => {});
      }

      // إرسال Webhook (best-effort)
      dispatchWebhookEvent("receipt.created", {
        event: "receipt.created",
        timestamp: Date.now(),
        receipt: {
          id: receipt.id,
          notificationNumber: receipt.notificationNumber,
          status: receipt.status,
          amount: receipt.amount,
          currencyCode: receipt.currencyCode,
          payerName: receipt.payerName,
          payerPhone: receipt.payerPhone,
          createdAt: receipt.createdAt,
        },
      }).catch(() => {});

      return receipt;
    }),
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
      if (
        ctx.user.role !== "agent" &&
        ctx.user.role !== "employee" &&
        ctx.user.role !== "admin" &&
        ctx.user.role !== "super_admin"
      ) {
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

      const whatsappEnabled = (await getSetting("whatsapp_enabled")) === "true";
      const notifyOnReceived = (await getSetting("whatsapp_notify_on_received")) === "true";
      if (whatsappEnabled && notifyOnReceived && receipt.payerPhone) {
        sendWhatsAppBestEffort(
          receipt.payerPhone,
          `مرحباً ${receipt.payerName}،\nتم استلام إيصالك بنجاح من المكتب المحدد.\nرقم الإشعار: ${receipt.notificationNumber}\nالمبلغ: ${receipt.amount} ${receipt.currencyCode}`
        ).catch(() => {});
      }

      dispatchWebhookEvent("receipt.confirmed", {
        event: "receipt.confirmed",
        timestamp: Date.now(),
        receipt: {
          id: receipt.id,
          notificationNumber: receipt.notificationNumber,
          status: "received",
          amount: receipt.amount,
          currencyCode: receipt.currencyCode,
          payerName: receipt.payerName,
          payerPhone: receipt.payerPhone,
          createdAt: receipt.createdAt,
        },
      }).catch(() => {});

      return updated;
    }),

  // تأكيد الاستلام بالرقم السري (secretPin) — طبقة أمان إضافية اختيارية
  confirmWithPin: protectedProcedure
    .input(z.object({
      receiptId: z.number(),
      secretPin: z.string().min(4).max(8),
      receivedNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const receipt = await getReceiptById(input.receiptId);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.user.role === "agent") {
        const office = await getOfficeByUserId(ctx.user.id);
        if (!office || office.id !== receipt.officeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "هذا الإيصال مخصص لمكتب آخر" });
        }
      }

      if (receipt.secretPin !== input.secretPin.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الرقم السري غير صحيح. تحقق من الإيصال الورقي." });
      }

      if (receipt.status !== "pending_deposit") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `لا يمكن تأكيد إيصال بحالة: ${receipt.status}` });
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
        newValue: { status: "received", method: "secretPin" },
        notes: `تأكيد بالرقم السري: ${receipt.amount} ${receipt.currencyCode}`,
      });

      const whatsappEnabled = (await getSetting("whatsapp_enabled")) === "true";
      const notifyOnReceived = (await getSetting("whatsapp_notify_on_received")) === "true";
      if (whatsappEnabled && notifyOnReceived && receipt.payerPhone) {
        sendWhatsAppBestEffort(
          receipt.payerPhone,
          `مرحباً ${receipt.payerName}،\nتم استلام إيصالك بنجاح (تأكيد بالرقم السري).\nرقم الإشعار: ${receipt.notificationNumber}\nالمبلغ: ${receipt.amount} ${receipt.currencyCode}`
        ).catch(() => {});
      }

      return updated;
    }),

  // Admin: Cancel receipt
  cancel: protectedProcedure
    .input(z.object({
      receiptId: z.number(),
      cancelReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
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
      if (ctx.user.role !== "agent" && ctx.user.role !== "employee" && ctx.user.role !== "admin") {
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
      if (ctx.user.role !== "agent" && ctx.user.role !== "employee" && ctx.user.role !== "admin") {
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getAdminDashboardStats();
  }),

  getRecentReceipts: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAuditLog(input);
    }),
});

// ─── Settings Router ──────────────────────────────────────────────────────────
const settingsRouter = router({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllSettingsMap();
    }),
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getSetting(input.key);
    }),

  set: protectedProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      await setSetting(input.key, input.value);
      return { success: true };
    }),
});

// ─── Currencies Router (العملات وأسعار الصرف) ─────────────────────────────────
const currencyRouter = router({
  getAll: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getAllCurrencies(input?.activeOnly ?? false);
    }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().min(2).max(10),
      name: z.string().min(2),
      symbol: z.string().optional(),
      exchangeRateToBase: z.string().regex(/^\d+(\.\d+)?$/).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const currency = await createCurrency(input);
      await writeAuditLog({
        entityType: "currency",
        entityId: input.code.toUpperCase(),
        action: "create",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        newValue: currency,
      });
      return currency;
    }),

  update: protectedProcedure
    .input(z.object({
      code: z.string(),
      name: z.string().optional(),
      symbol: z.string().optional(),
      exchangeRateToBase: z.string().regex(/^\d+(\.\d+)?$/).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { code, ...data } = input;
      const currency = await updateCurrency(code, data);
      await writeAuditLog({
        entityType: "currency",
        entityId: code.toUpperCase(),
        action: "update",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        newValue: currency ?? {},
      });
      return currency;
    }),

  delete: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const result = await deleteCurrencyIfUnused(input.code);
      await writeAuditLog({
        entityType: "currency",
        entityId: input.code.toUpperCase(),
        action: "delete",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
      });
      return result;
    }),
});

// ─── Accounting Router (القيود المحاسبية) ─────────────────────────────────────
const accountingRouter = router({
  list: protectedProcedure
    .input(z.object({
      officeId: z.number().optional(),
      currencyCode: z.string().optional(),
      fromDate: z.number().optional(),
      toDate: z.number().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await getAccountingEntries(input);
      const officeIds = Array.from(new Set(result.rows.map((r) => r.officeId)));
      const officeList = await Promise.all(officeIds.map((id) => getOfficeById(id)));
      const officeMap = Object.fromEntries(officeList.filter(Boolean).map((o) => [o!.id, o!.name]));
      return {
        rows: result.rows.map((r) => ({ ...r, officeName: officeMap[r.officeId] ?? "" })),
        total: result.total,
      };
    }),

  summary: protectedProcedure
    .input(z.object({ fromDate: z.number().optional(), toDate: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getAccountingSummary(input);
    }),
});

// ─── Reports Router (التقارير والإحصائيات) ────────────────────────────────────
const reportsRouter = router({
  getSummary: protectedProcedure
    .input(z.object({
      fromDate: z.number(),
      toDate: z.number(),
      officeId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin" && ctx.user.role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getReportsSummary(input);
    }),
});

// ─── WhatsApp Router (إعدادات وإشعارات واتساب) ────────────────────────────────
const WHATSAPP_KEYS = [
  "whatsapp_enabled",
  "whatsapp_phone_number_id",
  "whatsapp_access_token",
  "whatsapp_business_account_id",
  "whatsapp_notify_on_create",
  "whatsapp_notify_on_received",
  "whatsapp_test_phone",
];

const whatsappRouter = router({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
    const entries = await Promise.all(WHATSAPP_KEYS.map(async (k) => [k, await getSetting(k)] as const));
    const map: Record<string, string> = {};
    for (const [k, v] of entries) {
      // لا نُرجع التوكن كاملاً للواجهة لأسباب أمنية — فقط نشير إلى أنه مضبوط
      if (k === "whatsapp_access_token") {
        map[k] = v ? "••••••••" : "";
      } else {
        map[k] = v ?? "";
      }
    }
    return map;
  }),

  saveConfig: protectedProcedure
    .input(z.object({
      whatsapp_enabled: z.string().optional(),
      whatsapp_phone_number_id: z.string().optional(),
      whatsapp_access_token: z.string().optional(),
      whatsapp_business_account_id: z.string().optional(),
      whatsapp_notify_on_create: z.string().optional(),
      whatsapp_notify_on_received: z.string().optional(),
      whatsapp_test_phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined) continue;
        // تجاهل حفظ التوكن إن كانت القيمة المخفية القادمة من الواجهة لم تُعدَّل
        if (key === "whatsapp_access_token" && value === "••••••••") continue;
        await setSetting(key, value);
      }
      await writeAuditLog({
        entityType: "settings",
        entityId: "whatsapp",
        action: "update",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name ?? undefined,
        actorRole: ctx.user.role,
        notes: "تحديث إعدادات واتساب",
      });
      return { success: true };
    }),

  sendTest: protectedProcedure
    .input(z.object({ phone: z.string().min(5), message: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      try {
        await sendWhatsAppText(
          input.phone,
          input.message || "رسالة تجريبية من نظام متجر السودان للتحويلات المالية ✅"
        );
        return { success: true };
      } catch (err) {
        if (err instanceof WhatsAppNotConfiguredError) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: err.message });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (err as Error).message });
      }
    }),
});

// ─── Webhooks Router ──────────────────────────────────────────────────────────
const webhookRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getWebhooks();
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      url: z.string().url(),
      secret: z.string().optional(),
      events: z.array(z.enum(["receipt.created", "receipt.confirmed", "receipt.cancelled", "receipt.expired"])),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const hook = await addWebhook(input);
      await writeAuditLog({
        entityType: "webhook", entityId: hook.id,
        action: "create",
        actorUserId: ctx.user.id, actorName: ctx.user.name ?? undefined, actorRole: ctx.user.role,
        newValue: { name: input.name, url: input.url, events: input.events },
      });
      return hook;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      url: z.string().url().optional(),
      secret: z.string().optional(),
      events: z.array(z.enum(["receipt.created", "receipt.confirmed", "receipt.cancelled", "receipt.expired"])).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      return updateWebhook(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      return deleteWebhook(input.id);
    }),

  // اختبار webhook بإرسال payload تجريبي
  test: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") throw new TRPCError({ code: "FORBIDDEN" });
      const hooks = await getWebhooks();
      const hook = hooks.find((h) => h.id === input.id);
      if (!hook) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook غير موجود" });
      const testPayload = {
        event: "receipt.created" as WebhookEvent,
        timestamp: Date.now(),
        receipt: {
          id: 0,
          notificationNumber: "SD_TEST_001",
          status: "pending_deposit",
          amount: "100.00",
          currencyCode: "USD",
          payerName: "اختبار النظام",
          payerPhone: null,
          createdAt: Date.now(),
        },
      };
      const body = JSON.stringify(testPayload);
      try {
        const resp = await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Sudan-Event": "test" },
          body,
          signal: AbortSignal.timeout(10000),
        });
        return { success: resp.ok, status: resp.status, statusText: resp.statusText };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
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
  currency: currencyRouter,
  accounting: accountingRouter,
  reports: reportsRouter,
  whatsapp: whatsappRouter,
  webhook: webhookRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
