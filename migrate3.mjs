// migrate3.mjs — إضافة الحقول الجديدة لجدولي offices وreceipts
// تشغيل مرة واحدة بعد النشر: node migrate3.mjs
// آمن تمامًا للتشغيل أكثر من مرة (ALTER IGNORE / IF NOT EXISTS)

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// دالة مساعدة: تنفذ ALTER فقط إن لم يكن العمود موجودًا
async function addColumnIfMissing(table, column, definition) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows[0].cnt > 0) {
    console.log(`  SKIP  ${table}.${column} (already exists)`);
    return;
  }
  await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`  ADDED ${table}.${column}`);
}

console.log("▶ migrate3: Adding new columns to offices and receipts...\n");

// ─── offices: حقول جديدة ──────────────────────────────────────────────────────
await addColumnIfMissing(
  "offices", "allowed_currencies",
  "`allowed_currencies` text DEFAULT NULL COMMENT 'JSON array of currency codes e.g. [\"USD\",\"SDG\"]. NULL = all allowed'"
);
await addColumnIfMissing(
  "offices", "daily_limit",
  "`daily_limit` decimal(18,4) DEFAULT NULL COMMENT 'Max total amount per day per currency. NULL = no limit'"
);
await addColumnIfMissing(
  "offices", "monthly_limit",
  "`monthly_limit` decimal(18,4) DEFAULT NULL COMMENT 'Max total amount per month per currency. NULL = no limit'"
);
await addColumnIfMissing(
  "offices", "notify_phone",
  "`notify_phone` varchar(64) DEFAULT NULL COMMENT 'WhatsApp/SMS number to notify for new receipts'"
);

// ─── receipts: بيانات المستفيد (beneficiary) ──────────────────────────────────
await addColumnIfMissing(
  "receipts", "beneficiary_name",
  "`beneficiary_name` varchar(255) DEFAULT NULL"
);
await addColumnIfMissing(
  "receipts", "beneficiary_phone",
  "`beneficiary_phone` varchar(64) DEFAULT NULL"
);
await addColumnIfMissing(
  "receipts", "beneficiary_id",
  "`beneficiary_id` varchar(128) DEFAULT NULL COMMENT 'National ID or passport number'"
);

// ─── فهارس جديدة (اختياري لتسريع الاستعلامات) ────────────────────────────────
try {
  await conn.execute(`ALTER TABLE \`receipts\` ADD INDEX \`receipts_beneficiary_phone_idx\` (\`beneficiary_phone\`)`);
  console.log("  ADDED index receipts.beneficiary_phone_idx");
} catch {
  console.log("  SKIP  index receipts.beneficiary_phone_idx (already exists)");
}

await conn.end();
console.log("\n✅ migrate3 done. No tables created, only columns added.\n");
