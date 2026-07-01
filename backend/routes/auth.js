const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const db       = require('../config/db');
const router   = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const otpStore = new Map();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email đã được sử dụng.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, phone) VALUES (?, ?, ?, ?)',
      [full_name, email, hashed, phone || null]
    );

    const [rows] = await db.query('SELECT id, full_name, email, phone, avatar, role FROM users WHERE id = ?', [result.insertId]);
    const user = rows[0];
    const token = signToken(user);

    res.status(201).json({ message: 'Đăng ký thành công.', token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user;

    try {
      const { notify } = require('../middleware/notifyHelper');
      const greeting = `👋 Xin chào, ${user.full_name}! Chào mừng bạn quay trở lại VinhLong Hotel.`;
      await notify(user.id, `Xin chào, ${user.full_name}!`, greeting);
    } catch {}

    res.json({
      message: `Đăng nhập thành công. Xin chào, ${user.full_name}!`,
      token,
      user: safeUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.', error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });

    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 });

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
      });
      await transporter.sendMail({
        from: `"VinhLong Hotel" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Mã OTP đặt lại mật khẩu',
        text: `Mã OTP của bạn là: ${otp}. Có hiệu lực trong 10 phút.`
      });
    } catch (mailErr) {
      console.warn('Email không gửi được:', mailErr.message);
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ message: 'Đã tạo OTP (dev mode).', otp });
      }
    }

    res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin.' });
    }

    const record = otpStore.get(email);
    if (!record || record.otp !== otp || Date.now() > record.expires) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
    otpStore.delete(email);

    res.json({ message: 'Đặt lại mật khẩu thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, avatar, google_avatar, role,
              CAST(is_verified AS UNSIGNED) AS is_verified,
              business_name, business_address, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Người dùng không tồn tại.' });
    const user = rows[0];
    if (!user.avatar || user.avatar === 'default.jpg') {
      user.avatar = user.google_avatar || user.avatar;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Thiếu Google credential.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      return res.status(401).json({ message: 'Google token không hợp lệ.' });
    }

    const { sub: google_id, email, name: full_name, picture: google_avatar } = payload;

    let [rows] = await db.query(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [google_id, email]
    );

    let user;
    if (rows.length > 0) {
      user = rows[0];
      await db.query(
        'UPDATE users SET google_id = ?, google_avatar = ?, full_name = COALESCE(NULLIF(full_name,""), ?) WHERE id = ?',
        [google_id, google_avatar, full_name, user.id]
      );
      const [updated] = await db.query(
        'SELECT id, full_name, email, phone, avatar, google_avatar, role FROM users WHERE id = ?',
        [user.id]
      );
      user = updated[0];
    } else {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 10);
      const [result] = await db.query(
        'INSERT INTO users (full_name, email, password, google_id, google_avatar, avatar) VALUES (?, ?, ?, ?, ?, ?)',
        [full_name, email, hashed, google_id, google_avatar, 'default.jpg']
      );
      const [newRows] = await db.query(
        'SELECT id, full_name, email, phone, avatar, google_avatar, role FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newRows[0];
    }

    if (!user.avatar || user.avatar === 'default.jpg') {
      user.avatar = user.google_avatar || user.avatar;
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user;

    try {
      const { notify } = require('../middleware/notifyHelper');
      await notify(user.id, `Xin chào, ${user.full_name}!`,
        `👋 Xin chào, ${user.full_name}! Bạn đã đăng nhập bằng Google thành công.`
      );
    } catch {}

    res.json({ message: `Đăng nhập Google thành công. Xin chào, ${user.full_name}!`, token, user: safeUser });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ.', error: err.message });
  }
});

module.exports = router;
