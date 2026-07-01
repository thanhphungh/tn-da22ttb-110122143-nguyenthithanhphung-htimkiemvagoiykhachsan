const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity }  = require('../middleware/activityLogger');
const { notify, notifyAdmins, notifyHotelOwners } = require('../middleware/notifyHelper');
const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { hotel_id, check_in, check_out, total_price, total_rooms } = req.body;
    const user_id = req.user.id;

    if (!hotel_id || !check_in || !check_out) {
      return res.status(400).json({ message: 'Thiếu thông tin đặt phòng.' });
    }

    const [hotels] = await db.query(
      'SELECT id, name, price FROM hotels WHERE id = ? AND status = ?',
      [hotel_id, 'active']
    );
    if (hotels.length === 0) {
      return res.status(404).json({ message: 'Khách sạn không tồn tại hoặc đã ngừng hoạt động.' });
    }
    const hotel = hotels[0];

    const [[{ totalAvailable }]] = await db.query(
      "SELECT COALESCE(SUM(quantity), 0) AS totalAvailable FROM rooms WHERE hotel_id = ? AND status = 'available' AND quantity > 0",
      [hotel_id]
    );
    const [[{ totalRoomTypes }]] = await db.query(
      "SELECT COUNT(*) AS totalRoomTypes FROM rooms WHERE hotel_id = ?",
      [hotel_id]
    );

    if (totalRoomTypes > 0 && totalAvailable <= 0) {
      return res.status(400).json({
        message: '😔 Hiện tại khách sạn không còn phòng trống. Vui lòng chọn khách sạn khác hoặc quay lại sau.',
        available_rooms: 0
      });
    }

    const rooms = total_rooms || 1;
    const checkIn  = new Date(check_in);
    const checkOut = new Date(check_out);
    const nights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const price = total_price || (hotel.price * rooms * nights);

    const [result] = await db.query(
      `INSERT INTO bookings (user_id, hotel_id, check_in, check_out, total_price, total_rooms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, hotel_id, check_in, check_out, price, rooms]
    );
    const bookingId = result.insertId;

    await notify(user_id, '📋 Đặt phòng thành công',
      `Bạn đã đặt phòng tại ${hotel.name}. Check-in: ${check_in} — Check-out: ${check_out}. Mã đặt phòng: #${bookingId}.`
    );
    await notifyHotelOwners(hotel_id, '🔔 Có đặt phòng mới',
      `Khách hàng vừa đặt phòng tại ${hotel.name}. Check-in: ${check_in}. Mã #${bookingId}. Vui lòng xác nhận.`
    );
    await notifyAdmins('📋 Đặt phòng mới',
      `Có đặt phòng mới #${bookingId} tại ${hotel.name}.`
    );

    await logActivity({
      user_id, action: 'book', entity_type: 'booking', entity_id: bookingId,
      meta: { hotel_id, hotel_name: hotel.name, check_in, check_out, total_price: price, nights }
    });
    db.query(
      "INSERT INTO ai_recommend_logs (user_id, hotel_id, action_type, context) VALUES (?,?,'booking','booking_page')",
      [user_id, hotel_id]
    ).catch(() => {});

    res.status(201).json({ message: 'Đặt phòng thành công.', booking_id: bookingId, total_price: price, nights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.', error: err.message });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, h.name AS hotel_name, h.image AS hotel_image, h.address AS hotel_address
       FROM bookings b JOIN hotels h ON h.id = b.hotel_id
       WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, h.name AS hotel_name, h.image AS hotel_image, h.address AS hotel_address, h.phone AS hotel_phone
       FROM bookings b JOIN hotels h ON h.id = b.hotel_id
       WHERE b.id = ? AND b.user_id = ?`,
      [Number(req.params.id), req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });
    res.json({ booking: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });
    if (rows[0].status === 'cancelled') return res.status(400).json({ message: 'Đặt phòng đã bị huỷ.' });
    if (rows[0].status === 'completed')  return res.status(400).json({ message: 'Không thể huỷ đặt phòng đã hoàn thành.' });

    const b = rows[0];
    await db.query("UPDATE bookings SET status='cancelled' WHERE id=?", [b.id]);

    await notifyHotelOwners(b.hotel_id, '❌ Khách huỷ đặt phòng',
      `Khách hàng đã huỷ đặt phòng #${b.id}. Check-in: ${b.check_in}.`
    );
    res.json({ message: 'Huỷ đặt phòng thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
