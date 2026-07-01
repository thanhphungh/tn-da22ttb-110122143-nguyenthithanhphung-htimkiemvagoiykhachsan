const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/:hotelId', async (req, res) => {
  try {
    const { offset = 0, limit = 50 } = req.query;
    const [rows] = await db.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.full_name, u.avatar, u.google_avatar
       FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.hotel_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(req.params.hotelId), Number(limit), Number(offset)]
    );
    const reviews = rows.map(r => ({
      ...r,
      avatar: (r.avatar && r.avatar !== 'default.jpg') ? r.avatar : (r.google_avatar || r.avatar)
    }));
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { hotel_id, rating, comment } = req.body;
    const user_id = req.user.id;

    if (!hotel_id || !rating) {
      return res.status(400).json({ message: 'Thiếu thông tin đánh giá.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5.' });
    }

    const [existing] = await db.query(
      'SELECT id FROM ratings WHERE user_id = ? AND hotel_id = ?',
      [user_id, hotel_id]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE ratings SET rating = ?, comment = ? WHERE user_id = ? AND hotel_id = ?',
        [rating, comment || null, user_id, hotel_id]
      );
    } else {
      await db.query(
        'INSERT INTO ratings (user_id, hotel_id, rating, comment) VALUES (?, ?, ?, ?)',
        [user_id, hotel_id, rating, comment || null]
      );
    }

    await db.query(
      `UPDATE hotels h SET
        rating = (SELECT AVG(r.rating) FROM ratings r WHERE r.hotel_id = h.id),
        total_reviews = (SELECT COUNT(*) FROM ratings r WHERE r.hotel_id = h.id)
       WHERE h.id = ?`,
      [hotel_id]
    );

    const { logActivity } = require('../middleware/activityLogger');
    await logActivity({
      user_id,
      action: 'rate',
      entity_type: 'rating',
      entity_id: hotel_id,
      meta: { rating, has_comment: !!comment }
    });

    res.json({ message: 'Đánh giá thành công.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT hotel_id FROM ratings WHERE id = ? AND user_id = ?',
      [Number(req.params.id), req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });

    const hotel_id = rows[0].hotel_id;
    await db.query('DELETE FROM ratings WHERE id = ?', [Number(req.params.id)]);

    await db.query(
      `UPDATE hotels h SET
        rating = COALESCE((SELECT AVG(r.rating) FROM ratings r WHERE r.hotel_id = h.id), 0),
        total_reviews = (SELECT COUNT(*) FROM ratings r WHERE r.hotel_id = h.id)
       WHERE h.id = ?`,
      [hotel_id]
    );

    res.json({ message: 'Đã xóa đánh giá.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
