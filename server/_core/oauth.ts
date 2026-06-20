/**
 * OAuth routes - DISABLED
 * This application uses local email/password authentication only.
 * OAuth has been removed as per system requirements.
 */
import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  // OAuth is disabled - local auth is used instead
  // See server/_core/localAuth.ts for the active authentication system
}
