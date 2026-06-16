import { relations } from "drizzle-orm";
import {
  users,
  offices,
  officeBalances,
  receipts,
  receiptAttachments,
  auditLog,
  accountingEntries,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  createdReceipts: many(receipts, { relationName: "createdBy" }),
  receivedReceipts: many(receipts, { relationName: "receivedBy" }),
  auditLogs: many(auditLog),
}));

export const officesRelations = relations(offices, ({ one, many }) => ({
  user: one(users, { fields: [offices.userId], references: [users.id] }),
  balances: many(officeBalances),
  receipts: many(receipts),
  accountingEntries: many(accountingEntries),
}));

export const officeBalancesRelations = relations(officeBalances, ({ one }) => ({
  office: one(offices, { fields: [officeBalances.officeId], references: [offices.id] }),
}));

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  office: one(offices, { fields: [receipts.officeId], references: [offices.id] }),
  createdBy: one(users, {
    fields: [receipts.createdByUserId],
    references: [users.id],
    relationName: "createdBy",
  }),
  receivedBy: one(users, {
    fields: [receipts.receivedByUserId],
    references: [users.id],
    relationName: "receivedBy",
  }),
  attachments: many(receiptAttachments),
  accountingEntries: many(accountingEntries),
}));

export const receiptAttachmentsRelations = relations(receiptAttachments, ({ one }) => ({
  receipt: one(receipts, { fields: [receiptAttachments.receiptId], references: [receipts.id] }),
  uploadedBy: one(users, { fields: [receiptAttachments.uploadedByUserId], references: [users.id] }),
}));

export const accountingEntriesRelations = relations(accountingEntries, ({ one }) => ({
  receipt: one(receipts, { fields: [accountingEntries.receiptId], references: [receipts.id] }),
  office: one(offices, { fields: [accountingEntries.officeId], references: [offices.id] }),
  createdBy: one(users, { fields: [accountingEntries.createdByUserId], references: [users.id] }),
}));
