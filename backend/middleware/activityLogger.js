const db  = require('../config/db');
const jwt = require('jsonwebtoken');

function safeDecodeToken(header) {
  if (!header?.startsWith('Bearer ')) return null;
  try { return jwt.verify(header.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}
async function logActivity({
  user_id    = null,
  session_id = null,
  action,
  entity_type = null,
  entity_id   = null,
  meta        = null,
  ip_address  = null
}) {
  try {
    await db.query(
      `INSERT INTO user_activity_log
         (user_id, session_id, action, entity_type, entity_id, meta, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        session_id,
        action,
        entity_type,
        entity_id,
        meta ? JSON.stringify(meta) : null,
        ip_address
      ]
    );
  } catch (err) {
    console.error('[ActivityLogger] Error:', err.message);
  }
}

function activityMiddleware(req, res, next) {
  const decoded = safeDecodeToken(req.headers['authorization']);
  const user_id = decoded?.id || null;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

  req.logActivity = (action, entityType, entityId, meta) => {
    logActivity({ user_id, action, entity_type: entityType, entity_id: entityId, meta, ip_address: ip });
  };

  next();
}

module.exports = { logActivity, activityMiddleware, safeDecodeToken };
