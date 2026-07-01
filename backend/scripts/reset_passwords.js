require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function run() {
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const ownerHash = await bcrypt.hash('Owner@123', 10);

  await db.query("UPDATE users SET password=?, role='admin', is_verified=1 WHERE email='admin@vinhlong.com'", [adminHash]);
  await db.query("UPDATE users SET password=?, role='owner', is_verified=1 WHERE email='owner@vinhlong.com'", [ownerHash]);

  console.log('[ok] Da reset mat khau:');
  console.log('   admin@vinhlong.com  / Admin@123');
  console.log('   owner@vinhlong.com  / Owner@123');

  try {
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_avatar VARCHAR(500) DEFAULT NULL");
  } catch(e) { /* ignore */ }

  const [rows] = await db.query("SELECT id, email, password, role FROM users WHERE email='admin@vinhlong.com'");
  const match = await bcrypt.compare('Admin@123', rows[0].password);
  console.log('[ok] Test login admin:', match ? 'OK' : 'FAIL');

  process.exit(0);
}
run().catch(e => { console.error('[error]', e.message); process.exit(1); });
