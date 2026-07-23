const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity }  = require('../middleware/activityLogger');
const { notify, notifyAdmins, notifyHotelOwners } = require('../middleware/notifyHelper');
const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { hotel_id, room_id, check_in, check_out, total_price, total_rooms } = req.body;
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
    const rooms = Number(total_rooms) || 1;

    if (room_id) {
      const [[room]] = await db.query(
        "SELECT * FROM rooms WHERE id = ? AND hotel_id = ? AND status = 'available'",
        [room_id, hotel_id]
      );
      if (!room) {
        return res.status(400).json({ message: 'Loai phong khong ton tai hoac khong kha dung.' });
      }

      const [[{ bookedQty }]] = await db.query(
        `SELECT COALESCE(SUM(b.total_rooms), 0) AS bookedQty
         FROM bookings b
         WHERE b.hotel_id = ? AND b.room_id = ?
           AND b.status IN ('pending', 'confirmed')
           AND b.check_in  < ? AND b.check_out > ?`,
        [hotel_id, room_id, check_out, check_in]
      );

      const availableQty = room.quantity - Number(bookedQty);
      if (availableQty < rooms) {
        return res.status(400).json({
          message: availableQty <= 0
            ? `Loai phong "${room.room_name}" da het trong thoi gian nay. Vui long chon loai phong khac hoac ngay khac.`
            : `Loai phong "${room.room_name}" chi con ${availableQty} phong trong thoi gian nay.`,
          available_rooms: Math.max(0, availableQty)
        });
      }
    } else {
      const [[{ totalAvailable }]] = await db.query(
        `SELECT COALESCE(SUM(
           GREATEST(0, r.quantity - COALESCE((
             SELECT SUM(b2.total_rooms) FROM bookings b2
             WHERE b2.hotel_id = r.hotel_id AND b2.room_id = r.id
               AND b2.status IN ('pending','confirmed')
               AND b2.check_in < ? AND b2.check_out > ?
           ), 0))
         ), 0) AS totalAvailable
         FROM rooms r WHERE r.hotel_id = ? AND r.status = 'available'`,
        [check_out, check_in, hotel_id]
      );

      if (Number(totalAvailable) <= 0) {
        return res.status(400).json({
          message: 'Hien tai khach san khong con phong trong trong thoi gian ban chon. Vui long chon ngay khac.',
          available_rooms: 0
        });
      }
    }

    const checkIn  = new Date(check_in);
    const checkOut = new Date(check_out);
    const nights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
    const price = total_price || (hotel.price * rooms * nights);

    const [result] = await db.query(
      `INSERT INTO bookings (user_id, hotel_id, room_id, check_in, check_out, total_price, total_rooms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, hotel_id, room_id || null, check_in, check_out, price, rooms]
    );
    const bookingId = result.insertId;

    await notify(user_id, 'Dat phong thanh cong',
      `Ban da dat phong tai ${hotel.name}. Check-in: ${check_in} - Check-out: ${check_out}. Ma dat phong: #${bookingId}.`
    );
    await notifyHotelOwners(hotel_id, 'Co dat phong moi',
      `Khach hang vua dat phong tai ${hotel.name}. Check-in: ${check_in}. Ma #${bookingId}. Vui long xac nhan.`
    );
    await notifyAdmins('Dat phong moi',
      `Co dat phong moi #${bookingId} tai ${hotel.name}.`
    );

    await logActivity({
      user_id, action: 'book', entity_type: 'booking', entity_id: bookingId,
      meta: { hotel_id, hotel_name: hotel.name, check_in, check_out, total_price: price, nights }
    });
    db.query(
      "INSERT INTO ai_recommend_logs (user_id, hotel_id, action_type, context) VALUES (?,?,'booking','booking_page')",
      [user_id, hotel_id]
    ).catch(() => {});

    res.status(201).json({ message: 'Dat phong thanh cong.', booking_id: bookingId, total_price: price, nights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Loi may chu.', error: err.message });
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
