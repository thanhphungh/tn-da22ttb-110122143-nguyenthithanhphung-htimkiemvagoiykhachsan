const express = require('express');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/avatars')),
  filename:    (req, file, cb) => cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, avatar, google_avatar, role,
              CAST(is_verified AS UNSIGNED) AS is_verified,
              business_name, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    const user = rows[0];
    if ((!user.avatar || user.avatar === 'default.jpg') && user.google_avatar) {
      user.avatar = user.google_avatar;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const id = req.user.id;

    let sql = 'UPDATE users SET full_name = ?, phone = ?';
    const params = [full_name || req.user.full_name, phone || null];

    if (req.file) {
      sql += ', avatar = ?';
      params.push(`/uploads/avatars/${req.file.filename}`);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await db.query(sql, params);

    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, avatar, google_avatar, role FROM users WHERE id = ?',
      [id]
    );
    const user = rows[0];
    if ((!user.avatar || user.avatar === 'default.jpg') && user.google_avatar) {
      user.avatar = user.google_avatar;
    }
    res.json({ message: 'Cập nhật thành công.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const id = req.user.id;
    const [[{ bookings }]] = await db.query(
      "SELECT COUNT(*) AS bookings FROM bookings WHERE user_id = ?", [id]
    );
    const [[{ favorites }]] = await db.query(
      "SELECT COUNT(*) AS favorites FROM favorites WHERE user_id = ?", [id]
    );
    const [[{ reviews }]] = await db.query(
      "SELECT COUNT(*) AS reviews FROM ratings WHERE user_id = ?", [id]
    );
    const [[{ hotel_views }]] = await db.query(
      "SELECT COUNT(*) AS hotel_views FROM hotel_views WHERE user_id = ?", [id]
    );
    res.json({ bookings, favorites, reviews, hotel_views });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
