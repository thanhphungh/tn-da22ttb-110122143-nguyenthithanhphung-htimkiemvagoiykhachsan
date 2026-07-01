const express    = require('express');
const db         = require('../config/db');
const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const multer     = require('multer');
const path       = require('path');
const { authenticate, requireOwner, requireHotelOwnership } = require('../middleware/auth');
const { notify, notifyAdmins } = require('../middleware/notifyHelper');
const router     = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/hotels')),
  filename:    (req, file, cb) => cb(null, `hotel_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function createMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

async function sendBookingConfirmationEmail({ toEmail, guestName, hotelName, checkIn, checkOut, totalPrice, bookingId, nights }) {
  const isConfigured = process.env.MAIL_USER
    && process.env.MAIL_PASS
    && process.env.MAIL_USER !== 'vinhlong@gmail.com'
    && process.env.MAIL_PASS !== 'your_app_password';

  const fmt      = p  => Number(p).toLocaleString('vi-VN');
  const fmtDate  = d  => new Date(d).toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#8b5e3c,#5d3a1a);padding:28px 32px;color:#fff;">
        <h1 style="margin:0;font-size:24px;">VinhLong Hotel</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">Hệ thống gợi ý & đặt phòng khách sạn</p>
      </div>
      <div style="padding:28px 32px;background:#fff;">
        <div style="background:#e8f5e9;border-left:4px solid #4CAF50;border-radius:6px;padding:14px 18px;margin-bottom:24px;">
          <strong style="color:#2e7d32;font-size:16px;">✅ Đặt phòng của bạn đã được xác nhận!</strong>
        </div>
        <p style="color:#555;font-size:15px;margin:0 0 20px;">Xin chào <strong>${guestName}</strong>,</p>
        <p style="color:#555;font-size:14px;margin:0 0 20px;">Chủ khách sạn đã xác nhận đặt phòng của bạn. Dưới đây là thông tin chi tiết:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f8f9fa;">
            <td style="padding:12px 16px;font-size:13px;color:#888;width:40%;">Mã đặt phòng</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:bold;color:#8b5e3c;">#${bookingId}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">Khách sạn</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0;">${hotelName}</td>
          </tr>
          <tr style="background:#f8f9fa;">
            <td style="padding:12px 16px;font-size:13px;color:#888;">Ngày check-in</td>
            <td style="padding:12px 16px;font-size:14px;color:#2e7d32;font-weight:600;">${fmtDate(checkIn)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">Ngày check-out</td>
            <td style="padding:12px 16px;font-size:14px;color:#c62828;font-weight:600;border-top:1px solid #f0f0f0;">${fmtDate(checkOut)}</td>
          </tr>
          <tr style="background:#f8f9fa;">
            <td style="padding:12px 16px;font-size:13px;color:#888;">Số đêm</td>
            <td style="padding:12px 16px;font-size:14px;">${nights} đêm</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#888;border-top:1px solid #f0f0f0;">Tổng tiền</td>
            <td style="padding:12px 16px;font-size:16px;font-weight:bold;color:#e44d26;border-top:1px solid #f0f0f0;">${fmt(totalPrice)}đ</td>
          </tr>
        </table>
        <p style="color:#666;font-size:13px;line-height:1.6;">
          Vui lòng đến đúng giờ và mang theo thông tin đặt phòng này khi check-in.<br>
          Nếu cần hỗ trợ, liên hệ <a href="mailto:${process.env.MAIL_USER || 'vinhlong@gmail.com'}" style="color:#8b5e3c;">${process.env.MAIL_USER || 'vinhlong@gmail.com'}</a>.
        </p>
      </div>
      <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
        <p style="margin:0;color:#aaa;font-size:12px;">VinhLong Hotel · Vĩnh Long, Việt Nam</p>
      </div>
    </div>
  `;

  if (!isConfigured) {
    console.log(`\n📧 [DEV EMAIL] Đặt phòng #${bookingId} xác nhận`);
    console.log(`   To:       ${toEmail}`);
    console.log(`   Guest:    ${guestName}`);
    console.log(`   Hotel:    ${hotelName}`);
    console.log(`   Check-in: ${checkIn} | Check-out: ${checkOut} | ${nights} đêm`);
    console.log(`   Tổng:     ${fmt(totalPrice)}đ`);
    console.log(`   ⚠️  Cấu hình MAIL_USER + MAIL_PASS trong .env để gửi email thật\n`);
    return { sent: false, devMode: true };
  }

  try {
    const transporter = createMailTransporter();
    await transporter.sendMail({
      from:    `"VinhLong Hotel" <${process.env.MAIL_USER}>`,
      to:      toEmail,
      subject: `✅ Xác nhận đặt phòng #${bookingId} tại ${hotelName}`,
      html:    htmlBody
    });
    console.log(`[Email] ✅ Gửi xác nhận đặt phòng #${bookingId} → ${toEmail}`);
    return { sent: true };
  } catch (err) {
    console.error(`[Email] ❌ Lỗi gửi email: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

async function sendVerificationOtp(email, userId) {
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.query('DELETE FROM owner_verifications WHERE user_id=? AND type=?', [userId, 'register_owner']);

  await db.query(
    'INSERT INTO owner_verifications (user_id, email, otp, type, expires_at) VALUES (?,?,?,?,?)',
    [userId, email, otp, 'register_owner', expiresAt]
  );

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
    });
    await transporter.sendMail({
      from: `"VinhLong Hotel" <${process.env.MAIL_USER}>`,
      to: email,
      subject: '✅ Xác thực tài khoản Chủ Khách Sạn - VinhLong Hotel',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
          <h2 style="color:#8b5e3c;">VinhLong Hotel</h2>
          <p>Xin chào! Bạn đang đăng ký tài khoản <strong>Chủ Khách Sạn</strong>.</p>
          <p>Mã OTP xác thực của bạn:</p>
          <div style="font-size:36px;font-weight:bold;text-align:center;letter-spacing:8px;color:#2196F3;padding:16px;background:#f0f7ff;border-radius:8px;margin:16px 0;">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px;">OTP có hiệu lực trong <strong>15 phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
        </div>
      `
    });
    return { sent: true, otp: null };
  } catch (mailErr) {
    console.warn('Email OTP không gửi được:', mailErr.message);
    if (process.env.NODE_ENV !== 'production') return { sent: false, otp };
    return { sent: false, otp: null };
  }
}

router.post('/request-verification', authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Vui lòng cung cấp email.' });

    const [existing] = await db.query(
      'SELECT id FROM users WHERE email=? AND id!=?', [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email này đã được sử dụng bởi tài khoản khác.' });
    }

    const result = await sendVerificationOtp(email, req.user.id);

    res.json({
      message: result.sent
        ? 'Mã OTP đã được gửi đến email của bạn.'
        : 'Đã tạo OTP (dev mode).',
      ...(result.otp ? { otp: result.otp } : {})
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/verify-and-register', authenticate, async (req, res) => {
  try {
    const { otp, email, business_name, business_address, phone } = req.body;
    if (!otp || !email) return res.status(400).json({ message: 'Thiếu thông tin.' });

    const [records] = await db.query(
      `SELECT * FROM owner_verifications
       WHERE user_id=? AND email=? AND otp=? AND used=0
         AND expires_at > NOW() AND type='register_owner'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, email, otp]
    );

    if (records.length === 0) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn.' });
    }

    await db.query('UPDATE owner_verifications SET used=1 WHERE id=?', [records[0].id]);

    await db.query(
      `UPDATE users SET role='owner', is_verified=1, email=?,
        business_name=COALESCE(?,business_name),
        business_address=COALESCE(?,business_address),
        phone=COALESCE(?,phone)
       WHERE id=?`,
      [email, business_name || null, business_address || null, phone || null, req.user.id]
    );

    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, avatar, role, is_verified, business_name FROM users WHERE id=?',
      [req.user.id]
    );

    const jwt = require('jsonwebtoken');
    const newToken = jwt.sign(
      { id: rows[0].id, email: rows[0].email, role: rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await notifyAdmins('🏨 Chủ KS mới đăng ký',
      `${rows[0].full_name} (${email}) vừa đăng ký tài khoản Chủ Khách Sạn. Vui lòng xem xét và duyệt.`
    );

    res.json({
      message: 'Xác thực thành công! Tài khoản đã được nâng cấp thành Chủ Khách Sạn.',
      token: newToken,
      user: rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/my-hotels', authenticate, requireOwner, async (req, res) => {
  try {
    let hotels;
    if (req.user.role === 'admin') {
      const [rows] = await db.query(
        `SELECT h.*, COUNT(DISTINCT b.id) AS booking_count,
                COALESCE(AVG(r.rating),0) AS avg_rating,
                COUNT(DISTINCT r.id) AS review_count
         FROM hotels h
         LEFT JOIN bookings b ON b.hotel_id=h.id AND b.status!='cancelled'
         LEFT JOIN ratings r ON r.hotel_id=h.id
         GROUP BY h.id ORDER BY h.created_at DESC`
      );
      hotels = rows;
    } else {
      const [rows] = await db.query(
        `SELECT h.*, COUNT(DISTINCT b.id) AS booking_count,
                h.rating AS avg_rating,
                h.total_reviews AS review_count,
                h.star AS star,
                (SELECT COALESCE(SUM(r2.quantity),0) FROM rooms r2 WHERE r2.hotel_id=h.id AND r2.status='available' AND r2.quantity>0) AS available_rooms
         FROM hotel_owners ho
         JOIN hotels h ON h.id=ho.hotel_id
         LEFT JOIN bookings b ON b.hotel_id=h.id AND b.status NOT IN ('cancelled','completed')
         WHERE ho.owner_id=?
         GROUP BY h.id ORDER BY h.created_at DESC`,
        [req.user.id]
      );
      hotels = rows;
    }
    res.json({ hotels });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/stats', authenticate, requireOwner, async (req, res) => {
  try {
    let whereHotel = '';
    const params = [];

    if (req.user.role !== 'admin') {
      whereHotel = `AND h.id IN (SELECT hotel_id FROM hotel_owners WHERE owner_id=?)`;
      params.push(req.user.id);
    }

    const [[{ totalHotels }]] = await db.query(
      `SELECT COUNT(*) AS totalHotels FROM hotels h WHERE h.status='active' ${whereHotel}`, params
    );
    const [[{ totalBookings }]] = await db.query(
      `SELECT COUNT(*) AS totalBookings FROM bookings b
       JOIN hotels h ON h.id=b.hotel_id WHERE 1=1 ${whereHotel}`, params
    );
    const [[{ pendingBookings }]] = await db.query(
      `SELECT COUNT(*) AS pendingBookings FROM bookings b
       JOIN hotels h ON h.id=b.hotel_id WHERE b.status='pending' ${whereHotel}`, params
    );
    const [[{ totalRevenue }]] = await db.query(
      `SELECT COALESCE(SUM(b.total_price),0) AS totalRevenue FROM bookings b
       JOIN hotels h ON h.id=b.hotel_id WHERE b.status='completed' ${whereHotel}`, params
    );
    const [[{ totalReviews }]] = await db.query(
      `SELECT COUNT(*) AS totalReviews FROM ratings r
       JOIN hotels h ON h.id=r.hotel_id WHERE 1=1 ${whereHotel}`, params
    );

    res.json({ totalHotels, totalBookings, pendingBookings, totalRevenue, totalReviews });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/bookings', authenticate, requireOwner, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT b.*, u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone,
             h.name AS hotel_name
      FROM bookings b
      JOIN users u ON u.id=b.user_id
      JOIN hotels h ON h.id=b.hotel_id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      sql += ` AND h.id IN (SELECT hotel_id FROM hotel_owners WHERE owner_id=?)`;
      params.push(req.user.id);
    }
    if (status) { sql += ' AND b.status=?'; params.push(status); }
    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(sql, params);
    res.json({ bookings: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/bookings/:id/status', authenticate, requireOwner, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending','confirmed','cancelled','completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }

    const [rows] = await db.query(
      `SELECT b.id FROM bookings b
       JOIN hotels h ON h.id=b.hotel_id
       WHERE b.id=? ${req.user.role !== 'admin' ? 'AND h.id IN (SELECT hotel_id FROM hotel_owners WHERE owner_id=?)' : ''}`,
      req.user.role !== 'admin' ? [Number(req.params.id), req.user.id] : [Number(req.params.id)]
    );
    if (rows.length === 0) return res.status(403).json({ message: 'Không có quyền.' });

    await db.query('UPDATE bookings SET status=? WHERE id=?', [status, Number(req.params.id)]);

    const statusMsg = {
      confirmed: '✅ Đặt phòng được xác nhận',
      completed: '🏁 Đặt phòng hoàn thành',
      cancelled: '❌ Đặt phòng bị huỷ'
    };
    const statusContent = {
      confirmed: `Đặt phòng #${req.params.id} đã được chủ khách sạn xác nhận. Hẹn gặp bạn!`,
      completed: `Đặt phòng #${req.params.id} đã hoàn thành. Cảm ơn bạn đã lưu trú!`,
      cancelled: `Đặt phòng #${req.params.id} đã bị huỷ bởi chủ khách sạn.`
    };

    if (statusMsg[status] && rows[0]) {
      const [bk] = await db.query(
        `SELECT b.*, u.email AS user_email, u.full_name AS user_name, h.name AS hotel_name
         FROM bookings b
         JOIN users u ON u.id=b.user_id
         JOIN hotels h ON h.id=b.hotel_id
         WHERE b.id=?`,
        [Number(req.params.id)]
      );

      if (bk.length > 0) {
        const booking = bk[0];

        await notify(booking.user_id, statusMsg[status], statusContent[status]);

        if (status === 'confirmed') {
          const nights = Math.max(1, Math.round(
            (new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)
          ));
          sendBookingConfirmationEmail({
            toEmail:    booking.user_email,
            guestName:  booking.user_name,
            hotelName:  booking.hotel_name,
            checkIn:    booking.check_in,
            checkOut:   booking.check_out,
            totalPrice: booking.total_price,
            bookingId:  booking.id,
            nights
          });
        }
      }
    }

    res.json({ message: 'Cập nhật trạng thái thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/reviews', authenticate, requireOwner, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT r.*, u.full_name, u.avatar, u.google_avatar, h.name AS hotel_name
      FROM ratings r
      JOIN users u ON u.id=r.user_id
      JOIN hotels h ON h.id=r.hotel_id
      WHERE 1=1
    `;
    const params = [];
    if (req.user.role !== 'admin') {
      sql += ` AND h.id IN (SELECT hotel_id FROM hotel_owners WHERE owner_id=?)`;
      params.push(req.user.id);
    }
    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);
    res.json({ reviews: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/hotels/:id', authenticate, requireOwner, requireHotelOwnership, upload.single('image'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, address, ward, district, province, latitude, longitude, price, star, phone, email, status } = req.body;

    let sql = `UPDATE hotels SET name=?, description=?, address=?, ward=?, district=?,
               province=?, latitude=?, longitude=?, price=?, star=?, phone=?, email=?, status=?`;
    const params = [name, description, address, ward, district,
                    province || 'Vĩnh Long', latitude, longitude, price, star, phone, email, status || 'active'];

    if (req.file) { sql += ', image=?'; params.push(`/uploads/hotels/${req.file.filename}`); }
    sql += ' WHERE id=?';
    params.push(id);

    await db.query(sql, params);
    res.json({ message: 'Cập nhật khách sạn thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/hotels/:id/images', authenticate, requireOwner, requireHotelOwnership, upload.array('images', 10), async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    if (!req.files?.length) return res.status(400).json({ message: 'Không có ảnh.' });
    for (const f of req.files) {
      await db.query('INSERT INTO hotel_images (hotel_id, image_url) VALUES (?,?)', [hotelId, `/uploads/hotels/${f.filename}`]);
    }
    res.json({ message: `Đã thêm ${req.files.length} ảnh.` });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/activity', authenticate, requireOwner, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    let sql = `
      SELECT a.action, a.entity_type, a.entity_id, a.meta, a.created_at,
             u.full_name, h.name AS hotel_name
      FROM user_activity_log a
      LEFT JOIN users u ON u.id=a.user_id
      LEFT JOIN hotels h ON h.id=a.entity_id AND a.entity_type='hotel'
      WHERE a.entity_type='hotel'
    `;
    const params = [];
    if (req.user.role !== 'admin') {
      sql += ` AND a.entity_id IN (SELECT hotel_id FROM hotel_owners WHERE owner_id=?)`;
      params.push(req.user.id);
    }
    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(Number(limit));
    const [rows] = await db.query(sql, params);
    res.json({ activities: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/hotels/:id/rooms', authenticate, requireOwner, requireHotelOwnership, async (req, res) => {
  try {
    const [rooms] = await db.query('SELECT * FROM rooms WHERE hotel_id=? ORDER BY id', [Number(req.params.id)]);
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/hotels/:id/posts', authenticate, requireOwner, requireHotelOwnership, async (req, res) => {
  try {
    const [posts] = await db.query(
      'SELECT * FROM hotel_posts WHERE hotel_id=? ORDER BY created_at DESC',
      [Number(req.params.id)]
    );
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/hotels/:id/posts', authenticate, requireOwner, requireHotelOwnership, async (req, res) => {
  try {
    const { title, content, type, image_url } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung.' });
    const [result] = await db.query(
      'INSERT INTO hotel_posts (hotel_id, owner_id, title, content, type, image_url) VALUES (?,?,?,?,?,?)',
      [Number(req.params.id), req.user.id, title, content, type||'news', image_url||null]
    );
    res.status(201).json({ message: 'Đăng bài thành công.', post_id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/hotels/:id/posts/:postId', authenticate, requireOwner, requireHotelOwnership, async (req, res) => {
  try {
    await db.query('DELETE FROM hotel_posts WHERE id=? AND hotel_id=?', [Number(req.params.postId), Number(req.params.id)]);
    res.json({ message: 'Đã xóa bài đăng.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/register-hotel', authenticate, async (req, res) => {
  try {
    const { hotel_name, address, ward, district, province, latitude, longitude,
            price, star, phone, email, description, business_name, business_address } = req.body;

    if (!hotel_name || !address || !price) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    const isExistingOwner = ['owner','admin'].includes(req.user.role);

    const [result] = await db.query(
      `INSERT INTO hotels (name, description, address, ward, district, province,
        latitude, longitude, price, star, phone, email, status, image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [hotel_name, description||null, address, ward||null, district||null,
       province||'Vĩnh Long', latitude||10.2552, longitude||105.9731,
       price, star||1, phone||null, email||null,
       isExistingOwner ? 'active' : 'inactive',
       'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200']
    );

    const hotelId = result.insertId;

    if (business_name) {
      await db.query(
        'UPDATE users SET business_name=COALESCE(?,business_name), business_address=COALESCE(?,business_address) WHERE id=?',
        [business_name, business_address||null, req.user.id]
      );
    }

    if (isExistingOwner) {
      await db.query('INSERT IGNORE INTO hotel_owners (owner_id, hotel_id) VALUES (?,?)', [req.user.id, hotelId]);
    } else {
      await db.query(
        `INSERT INTO owner_verifications (user_id, email, otp, type, expires_at)
         VALUES (?, ?, ?, 'register_owner', DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [req.user.id, req.user.email, `HOTEL_${hotelId}`]
      ).catch(() => {});
    }

    res.status(201).json({
      message: isExistingOwner
        ? 'Đã thêm khách sạn thành công!'
        : 'Đăng ký khách sạn thành công! Vui lòng chờ Admin xác thực (1-3 ngày làm việc).',
      hotel_id: hotelId,
      status: isExistingOwner ? 'active' : 'pending'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/hotels/:id/rooms', authenticate, requireOwner, requireHotelOwnership, async (req, res) => {
  try {
    const hotelId = Number(req.params.id);
    const { rooms } = req.body;
    if (!Array.isArray(rooms)) return res.status(400).json({ message: 'Dữ liệu phòng không hợp lệ.' });

    await db.query('DELETE FROM rooms WHERE hotel_id=?', [hotelId]);
    for (const r of rooms) {
      if (!r.room_name || !r.price) continue;
      await db.query(
        'INSERT INTO rooms (hotel_id, room_name, room_type, price, quantity, max_people, status) VALUES (?,?,?,?,?,?,?)',
        [hotelId, r.room_name, r.room_type||'Standard', r.price, r.quantity||1, r.max_people||2, 'available']
      );
    }
    res.json({ message: `Đã cập nhật ${rooms.length} loại phòng.` });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/pending-hotels', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin.' });
    const [rows] = await db.query(
      `SELECT h.*, u.full_name AS requester_name, u.email AS requester_email,
              u.phone AS requester_phone, u.business_name
       FROM hotels h
       LEFT JOIN owner_verifications ov ON ov.otp = CONCAT('HOTEL_', h.id) AND ov.type='register_owner'
       LEFT JOIN users u ON u.id = ov.user_id
       WHERE h.status = 'inactive'
       ORDER BY h.created_at DESC`
    );
    res.json({ hotels: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/approve-hotel/:hotelId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin.' });
    const hotelId = Number(req.params.hotelId);
    const { owner_id } = req.body;

    await db.query("UPDATE hotels SET status='active' WHERE id=?", [hotelId]);

    if (owner_id) {
      await db.query("UPDATE users SET role='owner', is_verified=1 WHERE id=? AND role='user'", [owner_id]);
      await db.query('INSERT IGNORE INTO hotel_owners (owner_id, hotel_id) VALUES (?,?)', [owner_id, hotelId]);
      await db.query("UPDATE owner_verifications SET used=1 WHERE otp=? AND type='register_owner'", [`HOTEL_${hotelId}`]);

      const [[ks]] = await db.query('SELECT name FROM hotels WHERE id=?', [hotelId]);
      await notify(owner_id, '🎉 Tài khoản Chủ KS được duyệt',
        `Admin đã duyệt tài khoản Chủ Khách Sạn và kích hoạt khách sạn "${ks?.name || '#'+hotelId}" của bạn. Bạn có thể bắt đầu quản lý ngay!`
      );
    }

    res.json({ message: 'Đã duyệt khách sạn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/bookings/:id/send-email', authenticate, requireOwner, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);

    const [bk] = await db.query(
      `SELECT b.*, u.email AS user_email, u.full_name AS user_name, h.name AS hotel_name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN hotels h ON h.id = b.hotel_id
       WHERE b.id = ?`,
      [bookingId]
    );
    if (!bk.length) return res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });
    const booking = bk[0];

    if (req.user.role !== 'admin') {
      const [ownership] = await db.query(
        'SELECT 1 FROM hotel_owners WHERE owner_id=? AND hotel_id=?',
        [req.user.id, booking.hotel_id]
      );
      if (!ownership.length) return res.status(403).json({ message: 'Không có quyền.' });
    }

    if (!booking.user_email) {
      return res.status(400).json({ message: 'Khách hàng không có địa chỉ email.' });
    }

    const nights = Math.max(1, Math.round(
      (new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)
    ));

    const result = await sendBookingConfirmationEmail({
      toEmail:    booking.user_email,
      guestName:  booking.user_name,
      hotelName:  booking.hotel_name,
      checkIn:    booking.check_in,
      checkOut:   booking.check_out,
      totalPrice: booking.total_price,
      bookingId:  booking.id,
      nights
    });

    if (result.sent) {
      res.json({ message: `✅ Đã gửi email xác nhận đến ${booking.user_email}`, sent: true });
    } else if (result.devMode) {
      res.json({ message: '⚠️ Dev mode: Email đã log ra console (chưa cấu hình SMTP thật)', sent: false });
    } else {
      res.status(500).json({ message: `❌ Lỗi gửi email: ${result.error}`, sent: false });
    }
  } catch (err) {
    console.error('[send-email]', err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/reject-hotel/:hotelId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin.' });
    const hotelId = Number(req.params.hotelId);
    await db.query('DELETE FROM hotels WHERE id=? AND status=?', [hotelId, 'inactive']);
    await db.query("DELETE FROM owner_verifications WHERE otp=? AND type='register_owner'", [`HOTEL_${hotelId}`]);
    res.json({ message: 'Đã từ chối và xóa khách sạn.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
