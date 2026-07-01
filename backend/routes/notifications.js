const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, content, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    const [[{ unread }]] = await db.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id=? AND is_read=0",
      [req.user.id]
    );
    res.json({ notifications: rows, unread: Number(unread) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read=1 WHERE user_id=?", [req.user.id]);
    res.json({ message: 'Đã đọc tất cả.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", [Number(req.params.id), req.user.id]);
    res.json({ message: 'Đã đọc.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query("DELETE FROM notifications WHERE id=? AND user_id=?", [Number(req.params.id), req.user.id]);
    res.json({ message: 'Đã xóa.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
