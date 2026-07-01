const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT h.id, h.name, h.image, h.address, h.district, h.price, h.rating, h.star
       FROM favorites f
       JOIN hotels h ON h.id = f.hotel_id
       WHERE f.user_id = ?
       ORDER BY h.name`,
      [req.user.id]
    );
    res.json({ favorites: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { hotel_id } = req.body;
    if (!hotel_id) return res.status(400).json({ message: 'Thiếu hotel_id.' });

    const [hotels] = await db.query('SELECT id, name, district, price FROM hotels WHERE id = ?', [hotel_id]);
    if (hotels.length === 0) return res.status(404).json({ message: 'Khách sạn không tồn tại.' });

    await db.query('INSERT IGNORE INTO favorites (user_id, hotel_id) VALUES (?, ?)', [req.user.id, hotel_id]);

    await logActivity({
      user_id: req.user.id,
      action: 'add_favorite',
      entity_type: 'hotel',
      entity_id: hotel_id,
      meta: { hotel_name: hotels[0].name, district: hotels[0].district, price: hotels[0].price }
    });

    await db.query(
      `INSERT INTO ai_recommend_logs (user_id, hotel_id, action_type, context) VALUES (?, ?, 'favorite', 'hotel_detail')`,
      [req.user.id, hotel_id]
    ).catch(() => {});

    res.json({ message: 'Đã thêm vào yêu thích.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/:hotelId', authenticate, async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    await db.query('DELETE FROM favorites WHERE user_id = ? AND hotel_id = ?', [req.user.id, hotelId]);

    await logActivity({
      user_id: req.user.id,
      action: 'remove_favorite',
      entity_type: 'hotel',
      entity_id: hotelId
    });

    res.json({ message: 'Đã xóa khỏi yêu thích.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/check/:hotelId', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT 1 FROM favorites WHERE user_id = ? AND hotel_id = ?',
      [req.user.id, Number(req.params.hotelId)]
    );
    res.json({ isFavorite: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
