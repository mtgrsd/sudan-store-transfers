/**
 * Script to create a super_admin test account
 * Run: node scripts/create-admin.mjs
 */
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const password = "Admin@2024";
const email = "admin@sudanstore.com";
const name = "مدير النظام";
const role = "super_admin";

async function main() {
  const hash = await bcrypt.hash(password, 12);
  console.log("Generated hash:", hash.substring(0, 20) + "...");

  const conn = await mysql.createConnection(DATABASE_URL);

  try {
    // Check if user exists
    const [existing] = await conn.query(
      "SELECT id, email, role FROM users WHERE email = ?",
      [email]
    );
    
    if (existing.length > 0) {
      console.log("User exists, updating password and role...");
      await conn.query(
        "UPDATE users SET password_hash = ?, role = ?, is_active = 1, name = ? WHERE email = ?",
        [hash, role, name, email]
      );
      console.log("✅ Updated user:", email);
    } else {
      console.log("Creating new user...");
      const id = "admin-001";
      // Use column names as they appear in the DB (camelCase as per Drizzle mapping)
      await conn.query(
        "INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)",
        [id, name, email, hash, role]
      );
      console.log("✅ Created user:", email, "with id:", id);
    }

    // Verify
    const [users] = await conn.query(
      "SELECT id, name, email, role, is_active FROM users WHERE email = ?",
      [email]
    );
    console.log("User in DB:", users[0]);
    console.log("\n📋 Login credentials:");
    console.log("   Email:", email);
    console.log("   Password:", password);
    console.log("   Role:", role);
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
