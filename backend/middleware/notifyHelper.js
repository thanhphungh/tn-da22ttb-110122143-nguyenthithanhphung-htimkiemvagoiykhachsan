const db = require('../config/db');

async function notify(user_id, title, content) {
  if (!user_id) return;
  try {
    await db.query(
      'INSERT INTO notifications (user_id, title, content) VALUES (?,?,?)',
      [user_id, title, content]
    );
  } catch (err) {
    console.error('[Notify] Error:', err.message);
  }
}

async function notifyAdmins(title, content) {
  try {
    const [admins] = await db.query("SELECT id FROM users WHERE role='admin'");
    for (const a of admins) {
      await notify(a.id, title, content);
    }
  } catch (err) {
    console.error('[NotifyAdmins] Error:', err.message);
  }
}

async function notifyHotelOwners(hotel_id, title, content) {
  try {
    const [owners] = await db.query(
      'SELECT owner_id FROM hotel_owners WHERE hotel_id=?', [hotel_id]
    );
    for (const o of owners) {
      await notify(o.owner_id, title, content);
    }
  } catch (err) {
    console.error('[NotifyOwners] Error:', err.message);
  }
}

module.exports = { notify, notifyAdmins, notifyHotelOwners };
