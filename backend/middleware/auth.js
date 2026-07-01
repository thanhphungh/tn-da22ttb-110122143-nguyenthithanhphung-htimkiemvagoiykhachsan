const jwt = require('jsonwebtoken');
const db  = require('../config/db');

function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
  }
  next();
}

function requireOwner(req, res, next) {
  if (!req.user || !['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Chỉ chủ khách sạn mới có quyền truy cập.' });
  }
  next();
}

async function requireHotelOwnership(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Chưa đăng nhập.' });
  if (req.user.role === 'admin') return next();

  const hotelId = Number(req.params.hotelId || req.params.id || req.body.hotel_id);
  if (!hotelId) return res.status(400).json({ message: 'Thiếu hotel_id.' });

  try {
    const [rows] = await db.query(
      'SELECT 1 FROM hotel_owners WHERE owner_id=? AND hotel_id=?',
      [req.user.id, hotelId]
    );
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Bạn không sở hữu khách sạn này.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
}

module.exports = { authenticate, requireAdmin, requireOwner, requireHotelOwnership };
