
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function addColumnIfNotExists(table, column, definition) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows[0].cnt > 0) { console.log(`  [skip] ${table}.${column} (da co)`); return; }
  await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  [ok] Them ${table}.${column}`);
}

async function createIndexIfNotExists(table, indexName, columns) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  if (rows[0].cnt > 0) { console.log(`  [skip] INDEX ${indexName} (da co)`); return; }
  await db.query(`CREATE INDEX \`${indexName}\` ON \`${table}\` (${columns})`);
  console.log(`  [ok] INDEX ${indexName} ON ${table}(${columns})`);
}

async function createTableIfNotExists(name, sql) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  if (rows[0].cnt > 0) { console.log(`  [skip] TABLE ${name} (da co)`); return; }
  await db.query(sql);
  console.log(`  [ok] CREATE TABLE ${name}`);
}

async function run() {
  console.log('Dang nang cap database activity tracking...\n');

  // 1. Nang cap search_history
  console.log('search_history:');
  await addColumnIfNotExists('search_history', 'filter_min_price', 'INT DEFAULT NULL');
  await addColumnIfNotExists('search_history', 'filter_max_price', 'INT DEFAULT NULL');
  await addColumnIfNotExists('search_history', 'filter_rating',    'FLOAT DEFAULT NULL');
  await addColumnIfNotExists('search_history', 'result_count',     'INT DEFAULT NULL');
  await addColumnIfNotExists('search_history', 'source',           "VARCHAR(20) DEFAULT 'filter'");
  await createIndexIfNotExists('search_history', 'idx_sh_user_time', 'user_id, created_at');
  await createIndexIfNotExists('search_history', 'idx_sh_keyword',   'keyword');

  // 2. Nang cap hotel_views
  console.log('\nhotel_views:');
  await addColumnIfNotExists('hotel_views', 'duration_sec', 'INT DEFAULT NULL');
  await addColumnIfNotExists('hotel_views', 'referrer',     "VARCHAR(50) DEFAULT NULL");
  await createIndexIfNotExists('hotel_views', 'idx_hv_user_hotel', 'user_id, hotel_id');
  await createIndexIfNotExists('hotel_views', 'idx_hv_time',       'viewed_at');

  // 3. Nang cap ai_recommend_logs
  console.log('\nai_recommend_logs:');
  await addColumnIfNotExists('ai_recommend_logs', 'context', "VARCHAR(50) DEFAULT NULL");
  await addColumnIfNotExists('ai_recommend_logs', 'clicked', "TINYINT(1) DEFAULT 0");

  // 4. Tao user_activity_log
  console.log('\nuser_activity_log:');
  await createTableIfNotExists('user_activity_log', `
    CREATE TABLE user_activity_log (
      id          BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id     INT,
      session_id  VARCHAR(36),
      action      VARCHAR(30) NOT NULL,
      entity_type VARCHAR(20) DEFAULT NULL,
      entity_id   INT DEFAULT NULL,
      meta        TEXT DEFAULT NULL,
      ip_address  VARCHAR(45) DEFAULT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_ual_user    (user_id),
      INDEX idx_ual_action  (action),
      INDEX idx_ual_time    (created_at),
      INDEX idx_ual_entity  (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 5. Tao user_sessions
  console.log('\nuser_sessions:');
  await createTableIfNotExists('user_sessions', `
    CREATE TABLE user_sessions (
      id          VARCHAR(36) PRIMARY KEY,
      user_id     INT,
      started_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      ended_at    TIMESTAMP DEFAULT NULL,
      page_count  INT DEFAULT 0,
      device      VARCHAR(100) DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_us_user (user_id),
      INDEX idx_us_time (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 6. Kiem tra ket qua
  console.log('\nCac bang tracking hien tai:');
  const trackingTables = ['search_history','hotel_views','user_activity_log','user_sessions','ai_recommend_logs','favorites','bookings','ratings'];
  for (const t of trackingTables) {
    const [[{cnt}]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?`, [t]
    );
    if (cnt) {
      const [[{cnt: rowCount}]] = await db.query(`SELECT COUNT(*) AS cnt FROM \`${t}\``);
      console.log(`  [ok] ${t.padEnd(24)} - ${rowCount} ban ghi`);
    } else {
      console.log(`  [missing] ${t} - KHONG TON TAI`);
    }
  }

  console.log('\nNang cap hoan tat!');
  process.exit(0);
}

run().catch(err => { console.error('[error]', err.message); process.exit(1); });
