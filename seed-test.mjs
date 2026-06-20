import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();
const expires = now + 7 * 24 * 3600 * 1000;

try {
  await conn.execute(`
    INSERT INTO receipts (
      notification_number, verification_code, secret_pin,
      payer_name, payer_phone, payer_country,
      amount, currency_code, office_id, status,
      validity_days, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'SS-TEST-001', 'VRF123', '4567',
    'أحمد محمد علي', '+249123456789', 'السودان',
    '500.00', 'USD', 1, 'pending_deposit',
    7, expires, now, now
  ]);
  console.log("✅ Test receipt inserted: SS-TEST-001");
} catch (e) {
  console.log("Receipt insert error:", e.message);
}

const [rows] = await conn.execute("SELECT id, notification_number, payer_name, status FROM receipts LIMIT 5");
console.log("Receipts:", JSON.stringify(rows, null, 2));

const [offices] = await conn.execute("SELECT id, name, city FROM offices");
console.log("Offices:", JSON.stringify(offices, null, 2));

await conn.end();
