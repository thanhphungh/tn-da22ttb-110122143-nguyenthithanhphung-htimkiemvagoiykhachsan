const express = require('express');
const db = require('../config/db');
const router = express.Router();

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/hotels-near', async (req, res) => {
  try {
    const DEFAULT_RADIUS = 30;  // km — ban kinh mac dinh
    const MAX_RADIUS     = 100; // km — gioi han toi da
    const DEFAULT_LIMIT  = 30;

    const { lat, lng, limit = DEFAULT_LIMIT } = req.query;
    const radius = Math.min(
      Math.max(1, parseFloat(req.query.radius) || DEFAULT_RADIUS),
      MAX_RADIUS
    );

    const [hotels] = await db.query(
      `SELECT id, name, image, address, district, price, rating, star, latitude, longitude, phone
       FROM hotels
       WHERE status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL`
    );

    let results = hotels;

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      results = hotels
        .map(h => ({
          ...h,
          distance: Math.round(haversine(userLat, userLng, h.latitude, h.longitude) * 10) / 10
        }))
        .filter(h => h.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      hotels:       results.slice(0, Number(limit)),
      total:        results.length,
      radius_km:    radius,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const [hotels] = await db.query(
      `SELECT id, name, image, address, district, price, rating, star, latitude, longitude
       FROM hotels
       WHERE status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL`
    );
    res.json({ hotels });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

module.exports = router;
