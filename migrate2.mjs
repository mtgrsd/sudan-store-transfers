import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const steps = [
  // Create new tables (using 0 as default for bigint timestamps - will be set by app)
  `CREATE TABLE IF NOT EXISTS offices (
    id int NOT NULL AUTO_INCREMENT,
    code varchar(32) NOT NULL,
    name varchar(255) NOT NULL,
    city varchar(128) DEFAULT NULL,
    country varchar(128) DEFAULT NULL,
    phone varchar(64) DEFAULT NULL,
    manager_name varchar(255) DEFAULT NULL,
    user_id varchar(128) DEFAULT NULL,
    is_active tinyint(1) NOT NULL DEFAULT 1,
    notes text DEFAULT NULL,
    created_at bigint NOT NULL DEFAULT 0,
    updated_at bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY offices_code_idx (code),
    KEY offices_user_idx (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS office_balances (
    id int NOT NULL AUTO_INCREMENT,
    office_id int NOT NULL,
    currency_code varchar(10) NOT NULL DEFAULT 'USD',
    balance decimal(18,4) NOT NULL DEFAULT '0.0000',
    updated_at bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY ob_office_idx (office_id),
    UNIQUE KEY ob_office_currency_idx (office_id, currency_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS receipts (
    id int NOT NULL AUTO_INCREMENT,
    notification_number varchar(32) NOT NULL,
    verification_code varchar(16) NOT NULL,
    secret_pin varchar(8) NOT NULL,
    payer_name varchar(255) NOT NULL,
    payer_phone varchar(64) DEFAULT NULL,
    payer_country varchar(128) DEFAULT NULL,
    amount decimal(18,4) NOT NULL,
    currency_code varchar(10) NOT NULL DEFAULT 'USD',
    office_id int NOT NULL,
    status ENUM('draft','pending_deposit','received','cancelled','expired') NOT NULL DEFAULT 'pending_deposit',
    validity_days int NOT NULL DEFAULT 7,
    expires_at bigint DEFAULT NULL,
    notes text DEFAULT NULL,
    created_by_user_id varchar(128) NOT NULL,
    received_by_user_id varchar(128) DEFAULT NULL,
    received_at bigint DEFAULT NULL,
    received_notes text DEFAULT NULL,
    cancelled_by_user_id varchar(128) DEFAULT NULL,
    cancelled_at bigint DEFAULT NULL,
    cancel_reason text DEFAULT NULL,
    created_at bigint NOT NULL DEFAULT 0,
    updated_at bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY receipts_notif_idx (notification_number),
    KEY receipts_verify_idx (verification_code),
    KEY receipts_office_idx (office_id),
    KEY receipts_status_idx (status),
    KEY receipts_payer_name_idx (payer_name),
    KEY receipts_payer_phone_idx (payer_phone),
    KEY receipts_created_at_idx (created_at),
    KEY receipts_expires_idx (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS receipt_attachments (
    id int NOT NULL AUTO_INCREMENT,
    receipt_id int NOT NULL,
    uploaded_by_user_id varchar(128) NOT NULL,
    file_key varchar(512) NOT NULL,
    file_url text NOT NULL,
    file_name varchar(255) DEFAULT NULL,
    mime_type varchar(128) DEFAULT NULL,
    file_size int DEFAULT NULL,
    description text DEFAULT NULL,
    created_at bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY ra_receipt_idx (receipt_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id int NOT NULL AUTO_INCREMENT,
    entity_type varchar(64) NOT NULL,
    entity_id varchar(128) NOT NULL,
    action varchar(64) NOT NULL,
    actor_user_id varchar(128) DEFAULT NULL,
    actor_name varchar(255) DEFAULT NULL,
    actor_role varchar(32) DEFAULT NULL,
    previous_value text DEFAULT NULL,
    new_value text DEFAULT NULL,
    ip_address varchar(64) DEFAULT NULL,
    user_agent text DEFAULT NULL,
    notes text DEFAULT NULL,
    created_at bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY al_entity_idx (entity_type, entity_id(64)),
    KEY al_actor_idx (actor_user_id),
    KEY al_action_idx (action),
    KEY al_created_at_idx (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS accounting_entries (
    id int NOT NULL AUTO_INCREMENT,
    receipt_id int NOT NULL,
    office_id int NOT NULL,
    entry_type ENUM('deposit_received') NOT NULL,
    amount decimal(18,4) NOT NULL,
    currency_code varchar(10) NOT NULL,
    balance_before decimal(18,4) NOT NULL,
    balance_after decimal(18,4) NOT NULL,
    created_by_user_id varchar(128) NOT NULL,
    created_at bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY ae_receipt_idx (receipt_id),
    KEY ae_office_idx (office_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS system_settings (
    \`key\` varchar(128) NOT NULL,
    value text NOT NULL,
    updated_at bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `INSERT IGNORE INTO system_settings (\`key\`, value, updated_at) VALUES ('receipt_validity_days', '7', 0)`,
  `INSERT IGNORE INTO system_settings (\`key\`, value, updated_at) VALUES ('company_name', 'متجر السودان', 0)`,
  `INSERT IGNORE INTO system_settings (\`key\`, value, updated_at) VALUES ('receipt_prefix', 'SUD', 0)`,
];

let success = 0;
let skipped = 0;
let failed = 0;

for (const sql of steps) {
  try {
    await conn.execute(sql);
    console.log(`✅ ${sql.slice(0, 70).trim()}...`);
    success++;
  } catch (err) {
    if (err.code === "ER_TABLE_EXISTS_ERROR" || err.code === "ER_DUP_KEYNAME" || 
        err.message?.includes("already exists") || err.message?.includes("Duplicate key") ||
        err.code === "ER_DUP_ENTRY") {
      console.log(`⏭️  SKIP (exists): ${sql.slice(0, 60).trim()}...`);
      skipped++;
    } else if (err.code === "ER_NO_SUCH_TABLE") {
      console.log(`⏭️  SKIP (no table): ${sql.slice(0, 60).trim()}...`);
      skipped++;
    } else {
      console.error(`❌ FAILED: ${sql.slice(0, 80).trim()}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }
}

await conn.end();
console.log(`\nMigration complete: ${success} success, ${skipped} skipped, ${failed} failed`);
if (failed > 0) process.exit(1);
