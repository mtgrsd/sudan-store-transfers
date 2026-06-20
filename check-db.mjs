import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.log('No DATABASE_URL'); process.exit(1); }

// Parse connection URL properly
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/);
if (!match) { console.log('Invalid DATABASE_URL format'); process.exit(1); }

const [, user, password, hostPort, database] = match;
const [host, port] = hostPort.split(':');

const conn = await mysql.createConnection({
  host,
  port: parseInt(port || '3306'),
  user,
  password,
  database: database.split('?')[0],
  ssl: { rejectUnauthorized: false }
});

try {
  // عرض بنية جدول users
  const [rows] = await conn.execute('DESCRIBE users');
  console.log('=== بنية جدول users ===');
  console.table(rows.map(r => ({Field: r.Field, Type: r.Type, Null: r.Null, Default: r.Default})));
  
  // تطبيق migration
  console.log('\n=== تطبيق Migration ===');
  
  // إضافة password_hash إذا لم يكن موجوداً
  const hasPasswordHash = rows.some(r => r.Field === 'password_hash');
  if (!hasPasswordHash) {
    await conn.execute('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL');
    console.log('✅ تم إضافة password_hash');
  } else {
    console.log('ℹ️ password_hash موجود بالفعل');
  }
  
  // إضافة office_id إذا لم يكن موجوداً
  const hasOfficeId = rows.some(r => r.Field === 'office_id');
  if (!hasOfficeId) {
    await conn.execute('ALTER TABLE users ADD COLUMN office_id INT NULL');
    console.log('✅ تم إضافة office_id');
  } else {
    console.log('ℹ️ office_id موجود بالفعل');
  }
  
  // إضافة created_by إذا لم يكن موجوداً
  const hasCreatedBy = rows.some(r => r.Field === 'created_by');
  if (!hasCreatedBy) {
    await conn.execute('ALTER TABLE users ADD COLUMN created_by VARCHAR(128) NULL');
    console.log('✅ تم إضافة created_by');
  } else {
    console.log('ℹ️ created_by موجود بالفعل');
  }
  
  // تحديث role enum
  try {
    await conn.execute("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'employee', 'agent') NOT NULL DEFAULT 'employee'");
    console.log('✅ تم تحديث role enum');
  } catch (e) {
    console.log('⚠️ role enum:', e.message);
  }
  
  // تحديث المستخدمين القدامى
  const [updated] = await conn.execute("UPDATE users SET role = 'employee' WHERE role = 'staff'");
  console.log(`✅ تم تحديث ${updated.affectedRows} مستخدم من staff إلى employee`);
  
  // عرض المستخدمين الحاليين
  const [users] = await conn.execute('SELECT id, name, email, role, is_active FROM users LIMIT 10');
  console.log('\n=== المستخدمون الحاليون ===');
  console.table(users);
  
} finally {
  await conn.end();
}
