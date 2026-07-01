
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db   = require('../config/db');
const fs   = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '../../database/vinhlong_hotel_complete.sql');

async function run() {
  console.log('Dang xuat database...\n');
  const lines = [];

  lines.push('-- ============================================================');
  lines.push('-- VinhLong Hotel - Database Complete');
  lines.push(`-- Exported: ${new Date().toLocaleString('vi-VN')}`);
  lines.push('-- Usage: mysql -u root -p < database/vinhlong_hotel_complete.sql');
  lines.push('-- ============================================================');
  lines.push('');
  lines.push('DROP DATABASE IF EXISTS hotel_recommendation_system;');
  lines.push('CREATE DATABASE hotel_recommendation_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  lines.push('USE hotel_recommendation_system;');
  lines.push('');
  lines.push('SET NAMES utf8mb4;');
  lines.push('SET FOREIGN_KEY_CHECKS = 0;');
  lines.push('');

  const tableOrder = [
    'users', 'hotels', 'hotel_images', 'services', 'hotel_services',
    'tourist_places', 'ratings', 'favorites', 'bookings', 'rooms',
    'booking_details', 'search_history', 'hotel_views', 'ai_recommend_logs',
    'chatbot_messages', 'voice_assistant_logs', 'notifications', 'admin_logs',
    'hotel_owners', 'owner_verifications', 'hotel_posts',
    'user_activity_log', 'user_sessions'
  ];

  for (const table of tableOrder) {
    try {
      const [[row]] = await db.query(`SHOW CREATE TABLE \`${table}\``);
      const createSQL = row['Create Table'];
      lines.push(`-- Table: ${table}`);
      lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      lines.push(createSQL + ';');
      lines.push('');

      const [rows] = await db.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
        const chunks = [];
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const values = chunk.map(row => {
            const vals = Object.values(row).map(v => {
              if (v === null) return 'NULL';
              if (typeof v === 'number') return v;
              if (v instanceof Date) return `'${v.toISOString().slice(0,19).replace('T',' ')}'`;
              const escaped = String(v)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
              return `'${escaped}'`;
            });
            return `(${vals.join(', ')})`;
          });
          chunks.push(`INSERT INTO \`${table}\` (${cols}) VALUES\n${values.join(',\n')};`);
        }
        lines.push(...chunks);
        lines.push('');
        console.log(`  [ok] ${table}: ${rows.length} rows`);
      } else {
        console.log(`  [skip] ${table}: 0 rows`);
      }
    } catch(e) {
      console.log(`  [warn] ${table}: ${e.message.slice(0,60)}`);
    }
  }

  try {
    const [triggers] = await db.query(`SHOW TRIGGERS FROM hotel_recommendation_system`);
    if (triggers.length > 0) {
      lines.push('-- TRIGGERS');
      lines.push('DELIMITER ;;');
      for (const t of triggers) {
        lines.push(`DROP TRIGGER IF EXISTS \`${t.Trigger}\`;;`);
        lines.push(`CREATE TRIGGER \`${t.Trigger}\``);
        lines.push(`  ${t.Timing} ${t.Event} ON \`${t.Table}\``);
        lines.push(`  FOR EACH ROW`);
        lines.push(`  ${t.Statement};;`);
        lines.push('');
      }
      lines.push('DELIMITER ;');
      lines.push('');
      console.log(`  [ok] ${triggers.length} triggers`);
    }
  } catch(e) { console.log('  [warn] Triggers:', e.message.slice(0,60)); }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  lines.push('');
  lines.push('-- Import xong! Tai khoan mac dinh:');
  lines.push('-- Admin : admin@vinhlong.com / Admin@123');
  lines.push('-- Owner : owner@vinhlong.com / Owner@123');

  fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(1);
  console.log(`\n[ok] Da xuat: database/vinhlong_hotel_complete.sql (${size} KB)`);
  console.log(`   Su dung: mysql -u root -p < database/vinhlong_hotel_complete.sql`);
  process.exit(0);
}

run().catch(e => { console.error('[error]', e.message); process.exit(1); });
