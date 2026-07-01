
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const addColumnIfNotExists = async (table, column, def) => {
  const [[{cnt}]] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [table, column]
  );
  if (cnt > 0) { console.log(`  [skip] ${table}.${column} (da co)`); return false; }
  await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
  console.log(`  [ok] Them ${table}.${column}`);
  return true;
};

const createTableIfNotExists = async (name, sql) => {
  const [[{cnt}]] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?`, [name]
  );
  if (cnt > 0) { console.log(`  [skip] TABLE ${name} (da co)`); return false; }
  await db.query(sql);
  console.log(`  [ok] CREATE TABLE ${name}`);
  return true;
};

async function run() {
  console.log('Thiet lap he thong chu khach san...\n');

  // 1. Them role 'owner' vao ENUM users.role
  console.log('Nang cap bang users:');
  try {
    await db.query(`ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','owner') DEFAULT 'user'`);
    console.log('  [ok] users.role: them owner');
  } catch (e) {
    console.log('  [skip] users.role (da co hoac loi:', e.message.slice(0,60), ')');
  }
  await addColumnIfNotExists('users', 'is_verified', "TINYINT(1) DEFAULT 0 COMMENT 'Chu KS da xac thuc email'");
  await addColumnIfNotExists('users', 'business_name', "VARCHAR(200) DEFAULT NULL COMMENT 'Ten doanh nghiep'");
  await addColumnIfNotExists('users', 'business_address', "TEXT DEFAULT NULL");

  // 2. Bang hotel_owners
  console.log('\nBang hotel_owners:');
  await createTableIfNotExists('hotel_owners', `
    CREATE TABLE hotel_owners (
      id         INT PRIMARY KEY AUTO_INCREMENT,
      owner_id   INT NOT NULL,
      hotel_id   INT NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_owner_hotel (owner_id, hotel_id),
      FOREIGN KEY (owner_id)  REFERENCES users(id)  ON DELETE CASCADE,
      FOREIGN KEY (hotel_id)  REFERENCES hotels(id) ON DELETE CASCADE,
      INDEX idx_ho_owner (owner_id),
      INDEX idx_ho_hotel (hotel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 3. Bang owner_verifications
  console.log('\nBang owner_verifications:');
  await createTableIfNotExists('owner_verifications', `
    CREATE TABLE owner_verifications (
      id         INT PRIMARY KEY AUTO_INCREMENT,
      user_id    INT NOT NULL,
      email      VARCHAR(100) NOT NULL,
      otp        VARCHAR(10) NOT NULL,
      type       ENUM('register_owner','change_email') DEFAULT 'register_owner',
      expires_at DATETIME NOT NULL,
      used       TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_ov_user  (user_id),
      INDEX idx_ov_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 4. Tao tai khoan Admin
  console.log('\nTao tai khoan:');
  const adminPw  = await bcrypt.hash('Admin@123', 10);
  const [admins] = await db.query("SELECT id FROM users WHERE email='admin@vinhlong.com'");
  if (admins.length === 0) {
    await db.query(
      `INSERT INTO users (full_name, email, password, phone, role, is_verified, avatar)
       VALUES (?, ?, ?, ?, 'admin', 1, 'default.jpg')`,
      ['Admin VinhLong Hotel', 'admin@vinhlong.com', adminPw, '0900000001']
    );
    console.log('  [ok] Admin:  admin@vinhlong.com / Admin@123');
  } else {
    await db.query("UPDATE users SET password=?, role='admin', is_verified=1 WHERE email='admin@vinhlong.com'", [adminPw]);
    console.log('  [ok] Admin da ton tai, cap nhat password: admin@vinhlong.com / Admin@123');
  }

  // 5. Tao tai khoan Owner mau
  const ownerPw   = await bcrypt.hash('Owner@123', 10);
  const [owners]  = await db.query("SELECT id FROM users WHERE email='owner@vinhlong.com'");
  let ownerId;
  if (owners.length === 0) {
    const [res] = await db.query(
      `INSERT INTO users (full_name, email, password, phone, role, is_verified, business_name, avatar)
       VALUES (?, ?, ?, ?, 'owner', 1, ?, 'default.jpg')`,
      ['Nguyen Van Chu', 'owner@vinhlong.com', ownerPw, '0900000002', 'Cong ty TNHH VinhLong Tourism']
    );
    ownerId = res.insertId;
    console.log('  [ok] Owner:  owner@vinhlong.com / Owner@123');
  } else {
    ownerId = owners[0].id;
    await db.query("UPDATE users SET password=?, role='owner', is_verified=1 WHERE email='owner@vinhlong.com'", [ownerPw]);
    console.log('  [ok] Owner da ton tai, cap nhat: owner@vinhlong.com / Owner@123');
  }

  // 6. Gan 3 KS dau tien cho owner mau
  const [hotels] = await db.query('SELECT id, name FROM hotels LIMIT 3');
  for (const h of hotels) {
    await db.query(
      'INSERT IGNORE INTO hotel_owners (owner_id, hotel_id) VALUES (?, ?)',
      [ownerId, h.id]
    );
    console.log(`  [ok] Gan KS #${h.id} "${h.name}" cho owner`);
  }

  // 7. Tom tat
  console.log('\n-------------------------------------------');
  console.log('Thiet lap hoan tat!\n');
  console.log('Tai khoan:');
  console.log('   Admin : admin@vinhlong.com  / Admin@123');
  console.log('   Owner : owner@vinhlong.com  / Owner@123');
  console.log('-------------------------------------------');

  process.exit(0);
}

run().catch(err => { console.error('[error]', err.message); process.exit(1); });
