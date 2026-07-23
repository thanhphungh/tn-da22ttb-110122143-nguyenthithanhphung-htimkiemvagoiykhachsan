const express = require('express');
const db      = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/hotels')),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/search', async (req, res) => {
  try {
    const { keyword, minPrice, maxPrice, minRating, district, ward, lat, lng, radius, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT h.*, GROUP_CONCAT(DISTINCT s.service_name ORDER BY s.service_name SEPARATOR ',') AS services
      FROM hotels h
      LEFT JOIN hotel_services hs ON hs.hotel_id = h.id
      LEFT JOIN services s ON s.id = hs.service_id
      WHERE h.status = 'active'
    `;
    const params = [];

    if (keyword) {
      sql += ' AND (h.name LIKE ? OR h.address LIKE ? OR h.district LIKE ? OR h.ward LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    if (minPrice)  { sql += ' AND h.price >= ?'; params.push(Number(minPrice)); }
    if (maxPrice)  { sql += ' AND h.price <= ?'; params.push(Number(maxPrice)); }
    if (minRating) { sql += ' AND h.rating >= ?'; params.push(Number(minRating)); }
    if (district)  { sql += ' AND (h.district = ? OR h.district LIKE ?)'; params.push(district, `%${district}%`); }
    if (ward)      { sql += ' AND (h.ward = ? OR h.ward LIKE ? OR h.address LIKE ?)'; params.push(ward, `%${ward}%`, `%${ward}%`); }

    sql += ' GROUP BY h.id ORDER BY h.rating DESC, h.total_reviews DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    let rows = (await db.query(sql, params))[0];

    // Lọc theo GPS radius nếu có tọa độ
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxDist = parseFloat(radius) || 10;

      function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }

      rows = rows
        .filter(h => h.latitude && h.longitude)
        .map(h => ({ ...h, distance: Math.round(haversine(userLat, userLng, h.latitude, h.longitude) * 10) / 10 }))
        .filter(h => h.distance <= maxDist)
        .sort((a, b) => a.distance - b.distance);
    }

    if (rows.length === 0) {
      const areaName = ward || district || keyword;
      return res.json({
        hotels: [],
        total: 0,
        message: ward
          ? `Không tìm thấy khách sạn tại ${ward}. Thử tìm khu vực lân cận?`
          : district
            ? `Không tìm thấy khách sạn tại ${district}.`
            : areaName
              ? `Không tìm thấy khách sạn phù hợp với "${areaName}".`
              : lat && lng
                ? `Không tìm thấy khách sạn trong bán kính ${radius || 10}km với bộ lọc hiện tại.`
                : null
      });
    }

    res.json({ hotels: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.', error: err.message });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const { q = '', limit = 8 } = req.query;
    if (!q.trim()) return res.json({ suggestions: [] });

    const [rows] = await db.query(
      `SELECT id, name, district, price, rating, image
       FROM hotels
       WHERE status = 'active'
         AND (name LIKE ? OR district LIKE ? OR address LIKE ?)
       ORDER BY rating DESC
       LIMIT ?`,
      [`%${q}%`, `%${q}%`, `%${q}%`, Number(limit)]
    );
    res.json({ suggestions: rows });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const [rows] = await db.query(
      `SELECT h.*, GROUP_CONCAT(DISTINCT s.service_name) AS services
       FROM hotels h
       LEFT JOIN hotel_services hs ON hs.hotel_id = h.id
       LEFT JOIN services s ON s.id = hs.service_id
       WHERE h.status = 'active'
       GROUP BY h.id
       ORDER BY h.rating DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );
    const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM hotels WHERE status='active'");
    res.json({ hotels: rows, total });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await db.query(
      `SELECT h.*, GROUP_CONCAT(DISTINCT s.service_name ORDER BY s.service_name SEPARATOR ',') AS services
       FROM hotels h
       LEFT JOIN hotel_services hs ON hs.hotel_id = h.id
       LEFT JOIN services s ON s.id = hs.service_id
       WHERE h.id = ?
       GROUP BY h.id`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Khách sạn không tồn tại.' });

    const [images] = await db.query('SELECT image_url FROM hotel_images WHERE hotel_id = ?', [id]);

    const today = new Date().toISOString().split('T')[0];
    const [rooms] = await db.query(
      `SELECT r.*,
        GREATEST(0,
          r.quantity - COALESCE((
            SELECT SUM(b.total_rooms)
            FROM bookings b
            WHERE b.hotel_id = r.hotel_id
              AND b.room_id = r.id
              AND b.status IN ('pending','confirmed')
              AND b.check_in  < DATE_ADD(?, INTERVAL 30 DAY)
              AND b.check_out > ?
          ), 0)
        ) AS available_qty
       FROM rooms r
       WHERE r.hotel_id = ? AND r.status = 'available'`,
      [today, today, id]
    );
    const [rawReviews] = await db.query(
      `SELECT r.*, u.full_name, u.avatar, u.google_avatar FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.hotel_id = ?
       ORDER BY r.created_at DESC LIMIT 10`,
      [id]
    );
    const reviews = rawReviews.map(r => ({
      ...r,
      avatar: (r.avatar && r.avatar !== 'default.jpg') ? r.avatar : (r.google_avatar || r.avatar)
    }));

    const [[{ totalViews }]] = await db.query(
      'SELECT COUNT(*) AS totalViews FROM hotel_views WHERE hotel_id = ?', [id]
    );
    const [[{ totalFavorites }]] = await db.query(
      'SELECT COUNT(*) AS totalFavorites FROM favorites WHERE hotel_id = ?', [id]
    );
    const [[{ availableRooms }]] = await db.query(
      "SELECT COALESCE(SUM(quantity), 0) AS availableRooms FROM rooms WHERE hotel_id = ? AND status = 'available'", [id]
    );

    const header = req.headers['authorization'] || '';
    if (header.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        await db.query('INSERT INTO hotel_views (user_id, hotel_id, referrer) VALUES (?, ?, ?)',
          [decoded.id, id, 'hotel_detail']);
        await db.query(
          `INSERT INTO ai_recommend_logs (user_id, hotel_id, action_type, context) VALUES (?, ?, 'view', 'detail')`,
          [decoded.id, id]
        );
        if (req.logActivity) {
          req.logActivity('view_hotel', 'hotel', id, {
            hotel_name: rows[0].name,
            price: rows[0].price,
            district: rows[0].district
          });
        }
      } catch {}
    }

    res.json({
      hotel: rows[0], images, rooms, reviews,
      stats: { totalViews, totalFavorites, availableRooms }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.post('/', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, address, ward, district, province, latitude, longitude,
            price, star, phone, email } = req.body;
    const image = req.file ? `/uploads/hotels/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO hotels (name, description, address, ward, district, province,
        latitude, longitude, price, star, phone, email, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, address, ward, district, province || 'Vĩnh Long',
       latitude, longitude, price, star || 1, phone, email, image]
    );
    res.status(201).json({ message: 'Tạo khách sạn thành công.', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.put('/:id', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, address, ward, district, province,
            latitude, longitude, price, star, phone, email, status } = req.body;

    let sql = `UPDATE hotels SET name=?, description=?, address=?, ward=?, district=?,
               province=?, latitude=?, longitude=?, price=?, star=?, phone=?, email=?, status=?`;
    const params = [name, description, address, ward, district,
                    province || 'Vĩnh Long', latitude, longitude, price, star, phone, email, status || 'active'];

    if (req.file) {
      sql += ', image=?';
      params.push(`/uploads/hotels/${req.file.filename}`);
    }
    sql += ' WHERE id=?';
    params.push(id);

    await db.query(sql, params);
    res.json({ message: 'Cập nhật thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM hotels WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'Đã xóa khách sạn.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
