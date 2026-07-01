const express = require('express');
const db = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/ping', authenticate, requireAdmin, (req, res) => {
  res.json({ ok: true, message: 'Admin route hoạt động tốt.' });
});

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [[{ totalHotels }]] = await db.query("SELECT COUNT(*) AS totalHotels FROM hotels");
    const [[{ totalUsers }]] = await db.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[{ totalBookings }]] = await db.query("SELECT COUNT(*) AS totalBookings FROM bookings");
    const [[{ pendingBookings }]] = await db.query("SELECT COUNT(*) AS pendingBookings FROM bookings WHERE status='pending'");
    const [[{ totalRevenue }]] = await db.query("SELECT COALESCE(SUM(total_price),0) AS totalRevenue FROM bookings WHERE status='completed'");

    res.json({ totalHotels, totalUsers, totalBookings, pendingBookings, totalRevenue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, keyword } = req.query;
    let sql = 'SELECT id, full_name, email, phone, role, avatar, created_at FROM users';
    const params = [];
    if (keyword) {
      sql += ' WHERE (full_name LIKE ? OR email LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM users');
    res.json({ users: rows, total });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ.' });
    }
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, Number(req.params.id)]);
    res.json({ message: 'Cập nhật role thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ message: 'Không thể xóa chính mình.' });
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Đã xóa người dùng.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/bookings', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    let sql = `SELECT b.*, u.full_name AS user_name, u.email AS user_email,
                      h.name AS hotel_name
               FROM bookings b
               JOIN users u ON u.id = b.user_id
               JOIN hotels h ON h.id = b.hotel_id`;
    const params = [];
    if (status) { sql += ' WHERE b.status = ?'; params.push(status); }
    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM bookings');
    res.json({ bookings: rows, total });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/bookings/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, Number(req.params.id)]);

    if (status === 'confirmed') {
      try {
        const [bk] = await db.query(
          `SELECT b.*, u.email AS user_email, u.full_name AS user_name, h.name AS hotel_name
           FROM bookings b JOIN users u ON u.id=b.user_id JOIN hotels h ON h.id=b.hotel_id
           WHERE b.id=?`,
          [Number(req.params.id)]
        );
        if (bk.length > 0) {
          const booking = bk[0];
          const nights = Math.max(1, Math.round(
            (new Date(booking.check_out) - new Date(booking.check_in)) / (1000*60*60*24)
          ));
          const nodemailer = require('nodemailer');
          if (process.env.MAIL_USER && process.env.MAIL_PASS && process.env.MAIL_USER !== 'vinhlong@gmail.com') {
            const transporter = nodemailer.createTransport({
              service:'gmail', auth:{user:process.env.MAIL_USER, pass:process.env.MAIL_PASS}
            });
            const fmt = p => Number(p).toLocaleString('vi-VN');
            transporter.sendMail({
              from:`"VinhLong Hotel" <${process.env.MAIL_USER}>`,
              to: booking.user_email,
              subject:`✅ Xác nhận đặt phòng #${booking.id} tại ${booking.hotel_name}`,
              html:`<p>Xin chào <b>${booking.user_name}</b>,</p>
                    <p>Đặt phòng <b>#${booking.id}</b> tại <b>${booking.hotel_name}</b> đã được xác nhận.</p>
                    <p>Check-in: <b>${new Date(booking.check_in).toLocaleDateString('vi-VN')}</b> &nbsp;→&nbsp; Check-out: <b>${new Date(booking.check_out).toLocaleDateString('vi-VN')}</b></p>
                    <p>Tổng tiền: <b>${fmt(booking.total_price)}đ</b> (${nights} đêm)</p>`
            }).catch(e => console.warn('[Admin Email]', e.message));
          }
          const { notify } = require('../middleware/notifyHelper');
          await notify(booking.user_id, '✅ Đặt phòng được xác nhận',
            `Đặt phòng #${booking.id} tại ${booking.hotel_name} đã được Admin xác nhận.`
          );
        }
      } catch(e) { console.error('[Admin booking confirm]', e.message); }
    }

    res.json({ message: 'Cập nhật trạng thái thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/hotels', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    let sql = `SELECT h.*, COUNT(DISTINCT b.id) AS booking_count
               FROM hotels h
               LEFT JOIN bookings b ON b.hotel_id = h.id`;
    const params = [];
    if (status) { sql += ' WHERE h.status = ?'; params.push(status); }
    sql += ' GROUP BY h.id ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM hotels');
    res.json({ hotels: rows, total });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/hotels/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }
    await db.query('UPDATE hotels SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
    res.json({ message: 'Cập nhật trạng thái khách sạn thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

const multer = require('multer');
const path = require('path');
const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/hotels')),
  filename:    (req, file, cb) => cb(null, `hotel_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});
const uploadImages = multer({ storage: imgStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/hotels/:id/images', authenticate, requireAdmin, uploadImages.array('images', 10), async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Không có ảnh nào được tải lên.' });
    }
    const insertData = req.files.map(f => [hotelId, `/uploads/hotels/${f.filename}`]);
    await db.query(
      'INSERT INTO hotel_images (hotel_id, image_url) VALUES ?',
      [insertData]
    );
    res.json({ message: `Đã thêm ${req.files.length} ảnh thành công.`, count: req.files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/hotels/:id/images/:imageId', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM hotel_images WHERE id = ? AND hotel_id = ?',
      [Number(req.params.imageId), Number(req.params.id)]
    );
    res.json({ message: 'Đã xóa ảnh.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/activity', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, user_id, action } = req.query;
    let sql = `
      SELECT a.*, u.full_name, u.email
      FROM user_activity_log a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;
    const params = [];
    if (user_id) { sql += ' AND a.user_id = ?'; params.push(Number(user_id)); }
    if (action)  { sql += ' AND a.action = ?';  params.push(action); }
    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM user_activity_log');
    res.json({ activities: rows, total });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/owners', authenticate, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_verified, u.business_name,
              u.created_at, COUNT(ho.hotel_id) AS hotel_count
       FROM users u
       LEFT JOIN hotel_owners ho ON ho.owner_id=u.id
       WHERE u.role='owner'
       GROUP BY u.id ORDER BY u.created_at DESC`
    );
    res.json({ owners: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/owners/:ownerId/assign/:hotelId', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query(
      'INSERT IGNORE INTO hotel_owners (owner_id, hotel_id) VALUES (?,?)',
      [Number(req.params.ownerId), Number(req.params.hotelId)]
    );
    res.json({ message: 'Đã gán khách sạn cho chủ.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/owners/:ownerId/unassign/:hotelId', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM hotel_owners WHERE owner_id=? AND hotel_id=?',
      [Number(req.params.ownerId), Number(req.params.hotelId)]
    );
    res.json({ message: 'Đã gỡ gán khách sạn.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
