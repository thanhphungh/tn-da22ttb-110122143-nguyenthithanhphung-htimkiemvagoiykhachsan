
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

const addColumnIfNotExists = async (table, column, def) => {
  const [[{cnt}]] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [table, column]
  );
  if (cnt > 0) { console.log(`  [skip] ${table}.${column} (da co)`); return; }
  await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
  console.log(`  [ok] Them ${table}.${column}`);
};

async function run() {
  console.log('Thiet lap he thong thong bao tu dong...\n');

  // 1. Nang cap bang notifications
  console.log('Nang cap bang notifications:');
  await addColumnIfNotExists('notifications', 'type',
    "VARCHAR(30) DEFAULT 'system' COMMENT 'booking_confirmed, booking_cancelled, account_approved, new_booking, hotel_approved'"
  );
  await addColumnIfNotExists('notifications', 'link',
    "VARCHAR(255) DEFAULT NULL COMMENT 'Link dieu huong khi click'"
  );
  await addColumnIfNotExists('notifications', 'actor_id',
    "INT DEFAULT NULL COMMENT 'Ai thuc hien hanh dong'"
  );

  try {
    await db.query('CREATE INDEX idx_notif_user_read ON notifications(user_id, is_read, created_at)');
    console.log('  [ok] INDEX idx_notif_user_read');
  } catch { console.log('  [skip] INDEX idx_notif_user_read (da co)'); }

  // 2. Xoa trigger cu neu co
  console.log('\nTao MySQL TRIGGER:');
  const triggers = [
    'trg_booking_status_change',
    'trg_new_booking',
    'trg_owner_verified',
    'trg_hotel_approved'
  ];
  for (const t of triggers) {
    await db.query(`DROP TRIGGER IF EXISTS \`${t}\``);
  }

  // 3. TRIGGER: booking status thay doi -> thong bao khach + chu KS
  await db.query(`
    CREATE TRIGGER trg_booking_status_change
    AFTER UPDATE ON bookings
    FOR EACH ROW
    BEGIN
      IF NEW.status != OLD.status THEN

        IF NEW.status = 'confirmed' THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT NEW.user_id,
                 'Dat phong duoc xac nhan',
                 CONCAT('Dat phong #', NEW.id, ' tai ', h.name, ' da duoc xac nhan. Check-in: ', DATE_FORMAT(NEW.check_in,'%d/%m/%Y'), '.'),
                 'booking_confirmed',
                 CONCAT('/profile.html')
          FROM hotels h WHERE h.id = NEW.hotel_id;
        END IF;

        IF NEW.status = 'cancelled' THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT NEW.user_id,
                 'Dat phong da bi huy',
                 CONCAT('Dat phong #', NEW.id, ' tai ', h.name, ' da bi huy.'),
                 'booking_cancelled',
                 CONCAT('/profile.html')
          FROM hotels h WHERE h.id = NEW.hotel_id;
        END IF;

        IF NEW.status = 'completed' THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT NEW.user_id,
                 'Luu tru hoan thanh',
                 CONCAT('Cam on ban da luu tru tai ', h.name, '. Hay de lai danh gia nhe!'),
                 'booking_completed',
                 CONCAT('/hotel-detail.html?id=', NEW.hotel_id)
          FROM hotels h WHERE h.id = NEW.hotel_id;
        END IF;

        IF NEW.status IN ('confirmed','cancelled','completed') THEN
          INSERT INTO notifications (user_id, title, content, type, link)
          SELECT ho.owner_id,
                 CASE NEW.status
                   WHEN 'confirmed' THEN 'Xac nhan dat phong thanh cong'
                   WHEN 'cancelled' THEN 'Dat phong bi huy'
                   ELSE 'Luu tru hoan thanh'
                 END,
                 CONCAT('Dat phong #', NEW.id, ' tai ', h.name,
                        ' - Trang thai: ',
                        CASE NEW.status WHEN 'confirmed' THEN 'Da xac nhan'
                                        WHEN 'cancelled' THEN 'Da huy'
                                        ELSE 'Hoan thanh' END),
                 CONCAT('booking_', NEW.status),
                 '/owner.html'
          FROM hotel_owners ho
          JOIN hotels h ON h.id = ho.hotel_id
          WHERE ho.hotel_id = NEW.hotel_id;
        END IF;

      END IF;
    END
  `);
  console.log('  [ok] TRIGGER trg_booking_status_change');

  // 4. TRIGGER: Dat phong moi -> thong bao chu KS + admin
  await db.query(`
    CREATE TRIGGER trg_new_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    BEGIN
      INSERT INTO notifications (user_id, title, content, type, link)
      SELECT ho.owner_id,
             'Co dat phong moi!',
             CONCAT('Khach hang moi dat phong tai ', h.name,
                    '. Check-in: ', DATE_FORMAT(NEW.check_in,'%d/%m/%Y'),
                    '. Tong: ', FORMAT(NEW.total_price, 0), 'd. Vui long xac nhan.'),
             'new_booking',
             '/owner.html'
      FROM hotel_owners ho
      JOIN hotels h ON h.id = ho.hotel_id
      WHERE ho.hotel_id = NEW.hotel_id;

      INSERT INTO notifications (user_id, title, content, type, link)
      SELECT u.id,
             'Dat phong moi',
             CONCAT('Dat phong #', NEW.id, ' tai ', h.name, ' vua duoc tao.'),
             'new_booking',
             '/admin.html'
      FROM users u, hotels h
      WHERE u.role = 'admin' AND h.id = NEW.hotel_id;
    END
  `);
  console.log('  [ok] TRIGGER trg_new_booking');

  // 5. TRIGGER: Hotel duoc kich hoat -> thong bao owner
  await db.query(`
    CREATE TRIGGER trg_hotel_approved
    AFTER UPDATE ON hotels
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'active' AND OLD.status = 'inactive' THEN
        INSERT INTO notifications (user_id, title, content, type, link)
        SELECT ho.owner_id,
               'Khach san duoc duyet!',
               CONCAT('Khach san "', NEW.name, '" da duoc Admin phe duyet va kich hoat. Ban co the quan ly ngay!'),
               'hotel_approved',
               '/owner.html'
        FROM hotel_owners ho
        WHERE ho.hotel_id = NEW.id;
      END IF;

      IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
        INSERT INTO notifications (user_id, title, content, type, link)
        SELECT ho.owner_id,
               'Khach san bi tam ngung',
               CONCAT('Khach san "', NEW.name, '" da bi Admin tam ngung hoat dong.'),
               'hotel_deactivated',
               '/owner.html'
        FROM hotel_owners ho
        WHERE ho.hotel_id = NEW.id;
      END IF;
    END
  `);
  console.log('  [ok] TRIGGER trg_hotel_approved');

  // 6. TRIGGER: User duoc nang cap len owner -> thong bao admin
  await db.query(`
    CREATE TRIGGER trg_owner_verified
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      IF NEW.role = 'owner' AND OLD.role != 'owner' THEN
        INSERT INTO notifications (user_id, title, content, type, link)
        SELECT u.id,
               'Chu KS moi dang ky',
               CONCAT(NEW.full_name, ' (', NEW.email, ') vua duoc xac thuc la Chu Khach San. Vui long kiem tra va duyet.'),
               'owner_registered',
               '/admin.html'
        FROM users u WHERE u.role = 'admin';
      END IF;
    END
  `);
  console.log('  [ok] TRIGGER trg_owner_verified');

  // 7. Tao thong bao mau cho user hien tai
  console.log('\nTao thong bao mau:');
  const [users] = await db.query("SELECT id, full_name, role FROM users WHERE role IN ('admin','owner','user') LIMIT 5");
  for (const u of users) {
    await db.query(
      "INSERT INTO notifications (user_id, title, content, type) VALUES (?,?,?,?)",
      [u.id, 'Chao mung!', `Chao ${u.full_name}! He thong thong bao da duoc kich hoat. Ban se nhan thong bao ve dat phong, xac nhan va cac cap nhat quan trong.`, 'system']
    );
    console.log(`  [ok] Thong bao mau -> ${u.full_name} (${u.role})`);
  }

  // 8. Tong ket
  const [triggers_] = await db.query(
    "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()"
  );
  const [[{total}]] = await db.query('SELECT COUNT(*) AS total FROM notifications');

  console.log('\n-------------------------------------------');
  console.log('Hoan tat!');
  console.log(`Triggers: ${triggers_.map(t=>t.TRIGGER_NAME).join(', ')}`);
  console.log(`Tong thong bao trong DB: ${total}`);
  console.log('-------------------------------------------');

  process.exit(0);
}

run().catch(err => { console.error('[error]', err.message); process.exit(1); });
