import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'sudan_store',
});

try {
  // إنشاء حساب Admin تجريبي
  const adminUser = {
    openId: 'admin-test-001',
    name: 'Admin Test',
    email: 'admin@sudanstore.test',
    role: 'admin',
    loginMethod: 'test',
    lastSignedIn: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await connection.execute(
    `INSERT INTO users (openId, name, email, role, loginMethod, lastSignedIn, createdAt, updatedAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminUser.openId,
      adminUser.name,
      adminUser.email,
      adminUser.role,
      adminUser.loginMethod,
      adminUser.lastSignedIn,
      adminUser.createdAt,
      adminUser.updatedAt,
    ]
  );

  console.log("✅ تم إنشاء حساب Admin تجريبي:");
  console.log("OpenID:", adminUser.openId);
  console.log("Name:", adminUser.name);
  console.log("Email:", adminUser.email);
  console.log("Role:", adminUser.role);

  // عرض جميع المستخدمين
  const [users] = await connection.execute('SELECT openId, name, email, role FROM users LIMIT 10');
  console.log("\n📋 جميع المستخدمين الحاليين:");
  console.table(users);

} catch (error) {
  console.error("❌ خطأ:", error.message);
} finally {
  await connection.end();
}
