/**
 * Local Authentication System
 * Email + Password only - No OAuth
 */
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function registerLocalAuthRoutes(app: Express) {
  // POST /api/auth/login - تسجيل الدخول
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email.trim().toLowerCase());

      if (!user) {
        res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: "الحساب معطّل. تواصل مع الإدارة" });
        return;
      }

      if (!user.passwordHash) {
        res.status(401).json({ error: "لم يتم تعيين كلمة مرور لهذا الحساب. تواصل مع الإدارة" });
        return;
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        return;
      }

      // تحديث آخر تسجيل دخول
      await db.updateUserLastSignedIn(user.id);

      // إنشاء JWT session token
      const sessionToken = await sdk.createSessionToken(user.id.toString(), {
        name: user.name || user.email || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[LocalAuth] Login failed:", error);
      res.status(500).json({ error: "خطأ في الخادم. حاول مرة أخرى" });
    }
  });

  // POST /api/auth/logout - تسجيل الخروج
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });
}
