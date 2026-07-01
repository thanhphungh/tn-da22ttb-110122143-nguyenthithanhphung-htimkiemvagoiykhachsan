const express = require('express');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const router  = express.Router();

function tryDecodeToken(header) {
  if (!header?.startsWith('Bearer ')) return null;
  try { return jwt.verify(header.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function fetchAllHotels() {
  const [rows] = await db.query(
    `SELECT h.id, h.name, h.image, h.address, h.district, h.price, h.rating,
            h.total_reviews, h.star, h.latitude, h.longitude,
            GROUP_CONCAT(DISTINCT s.service_name ORDER BY s.service_name SEPARATOR ',') AS services
     FROM hotels h
     LEFT JOIN hotel_services hs ON hs.hotel_id = h.id
     LEFT JOIN services s ON s.id = hs.service_id
     WHERE h.status = 'active'
     GROUP BY h.id`
  );
  return rows;
}

async function fetchGlobalPopularity() {
  const [favCounts] = await db.query(
    `SELECT hotel_id, COUNT(*) AS fav_count FROM favorites GROUP BY hotel_id`
  );
  const favMap = {};
  favCounts.forEach(f => { favMap[f.hotel_id] = f.fav_count; });
  const maxFav = Math.max(...Object.values(favMap), 1);

  const [searchCounts] = await db.query(
    `SELECT sh.keyword, COUNT(*) AS cnt
     FROM search_history sh
     WHERE sh.keyword IS NOT NULL AND sh.keyword != ''
     GROUP BY sh.keyword
     ORDER BY cnt DESC
     LIMIT 20`
  );

  const [bookCounts] = await db.query(
    `SELECT hotel_id, COUNT(*) AS book_count
     FROM bookings
     WHERE status != 'cancelled'
     GROUP BY hotel_id`
  );
  const bookMap = {};
  bookCounts.forEach(b => { bookMap[b.hotel_id] = b.book_count; });
  const maxBook = Math.max(...Object.values(bookMap), 1);

  return { favMap, maxFav, searchCounts, bookMap, maxBook };
}

function scoreHotelDefault(hotel, globalPop, userLat, userLng) {
  const { favMap, maxFav } = globalPop;

  const starScore   = Math.min((hotel.star || 0) / 5, 1);
  const favCount    = favMap[hotel.id] || 0;
  const favScore    = Math.min(favCount / maxFav, 1);
  const ratingScore = (hotel.rating || 0) / 5;

  let score = 0.50 * starScore + 0.35 * favScore + 0.15 * ratingScore;

  if (userLat && userLng && hotel.latitude && hotel.longitude) {
    const dist = haversine(userLat, userLng, hotel.latitude, hotel.longitude);
    score += Math.max(0, 1 - dist / 50) * 0.1;
    hotel.distance = Math.round(dist * 10) / 10;
  }

  return score;
}
async function collectUserBehavior(user_id) {
  const [searches] = await db.query(
    `SELECT keyword, COUNT(*) AS cnt, MAX(created_at) AS last_used
     FROM search_history
     WHERE user_id = ? AND keyword IS NOT NULL AND keyword != ''
     GROUP BY keyword
     ORDER BY last_used DESC, cnt DESC
     LIMIT 20`,
    [user_id]
  );

  const [views] = await db.query(
    `SELECT hv.hotel_id, h.district, h.price, h.star, h.rating,
            h.name AS hotel_name,
            GROUP_CONCAT(DISTINCT s.service_name ORDER BY s.service_name SEPARATOR ',') AS services,
            COUNT(hv.id) AS view_count, MAX(hv.viewed_at) AS last_viewed
     FROM hotel_views hv
     JOIN hotels h ON h.id = hv.hotel_id
     LEFT JOIN hotel_services hs ON hs.hotel_id = h.id
     LEFT JOIN services s ON s.id = hs.service_id
     WHERE hv.user_id = ?
     GROUP BY hv.hotel_id
     ORDER BY view_count DESC, last_viewed DESC
     LIMIT 30`,
    [user_id]
  );

  const [bookings] = await db.query(
    `SELECT b.hotel_id, h.district, h.price, h.star, h.rating,
            h.name AS hotel_name,
            GROUP_CONCAT(DISTINCT s.service_name ORDER BY s.service_name SEPARATOR ',') AS services,
            COUNT(b.id) AS book_count, MAX(b.created_at) AS last_booked
     FROM bookings b
     JOIN hotels h ON h.id = b.hotel_id
     LEFT JOIN hotel_services hs ON hs.hotel_id = h.id
     LEFT JOIN services s ON s.id = hs.service_id
     WHERE b.user_id = ? AND b.status != 'cancelled'
     GROUP BY b.hotel_id
     ORDER BY book_count DESC, last_booked DESC
     LIMIT 15`,
    [user_id]
  );

  const [favorites] = await db.query(
    `SELECT f.hotel_id, h.district, h.price, h.star, h.rating,
            h.name AS hotel_name,
            GROUP_CONCAT(DISTINCT s.service_name ORDER BY s.service_name SEPARATOR ',') AS services
     FROM favorites f
     JOIN hotels h ON h.id = f.hotel_id
     LEFT JOIN hotel_services hs ON hs.hotel_id = f.hotel_id
     LEFT JOIN services s ON s.id = hs.service_id
     WHERE f.user_id = ?
     GROUP BY f.hotel_id`,
    [user_id]
  );

  return { searches, views, bookings, favorites };
}

function buildUserProfile(behavior) {
  const { searches, views, bookings, favorites } = behavior;

  const bookingMap = {};
  bookings.forEach(b => { bookingMap[b.hotel_id] = (bookingMap[b.hotel_id]||0) + (b.book_count||1); });
  const maxBooking = Math.max(...Object.values(bookingMap), 1);

  const viewMap = {};
  views.forEach(v => { viewMap[v.hotel_id] = (viewMap[v.hotel_id]||0) + (v.view_count||1); });
  const maxView = Math.max(...Object.values(viewMap), 1);

  const favoriteIds = new Set(favorites.map(f => f.hotel_id));

  const profile = {
    bookingMap, viewMap, favoriteIds, maxBooking, maxView,
    districts:         {},
    priceRange:        { sum: 0, count: 0 },
    starRange:         { sum: 0, count: 0 },
    keywords:          [],
    keywordWeights:    {},
    preferredServices: {},
    interactedIds:     new Set()
  };

  const addD = (d,w) => { if(d) profile.districts[d]=(profile.districts[d]||0)+w; };
  const addP = (p,w) => { if(p){profile.priceRange.sum+=Number(p)*w;profile.priceRange.count+=w;} };
  const addS = (s,w) => { if(s){profile.starRange.sum+=Number(s)*w;profile.starRange.count+=w;} };
  const addSvc = (str,w) => {
    if(!str) return;
    str.split(',').map(s=>s.trim()).filter(Boolean).forEach(svc=>{
      profile.preferredServices[svc]=(profile.preferredServices[svc]||0)+w;
    });
  };

  searches.forEach((s,i) => {
    const w = (s.cnt||1) * Math.max(0.2, 1-i*0.04);
    profile.keywords.push(s.keyword);
    profile.keywordWeights[s.keyword] = w;
  });

  views.forEach((v,i) => {
    const w = (v.view_count||1)*Math.max(0.2,1-i*0.03);
    addD(v.district,w); addP(v.price,w); addS(v.star,w); addSvc(v.services,w*0.8);
    profile.interactedIds.add(v.hotel_id);
  });
  bookings.forEach((b,i) => {
    const w = (b.book_count||1)*Math.max(0.4,1-i*0.06)*2;
    addD(b.district,w); addP(b.price,w); addS(b.star,w); addSvc(b.services,w);
    profile.interactedIds.add(b.hotel_id);
  });
  favorites.forEach(f => {
    addD(f.district,3); addP(f.price,3); addS(f.star,3); addSvc(f.services,4);
    profile.interactedIds.add(f.hotel_id);
  });

  profile.avgPrice = profile.priceRange.count>0 ? profile.priceRange.sum/profile.priceRange.count : null;
  profile.avgStar  = profile.starRange.count >0 ? profile.starRange.sum /profile.starRange.count  : null;
  return profile;
}

const WEIGHTS = {
  SEARCH:   0.15,   // W_s
  VIEW:     0.20,   // W_v
  FAVORITE: 0.25,   // W_f
  BOOKING:  0.30,   // W_b
  RATING:   0.10    // W_r
};

function scoreHotel(hotel, profile, userLat, userLng) {

  let bookingScore = 0;
  if (profile && profile.bookingMap) {
    const maxBooking = profile.maxBooking || 1;
    const cnt = profile.bookingMap[hotel.id] || 0;
    bookingScore = Math.min(cnt / maxBooking, 1);
  }

  let favoriteScore = 0;
  if (profile && profile.favoriteIds) {
    if (profile.favoriteIds.has(hotel.id)) {
      favoriteScore = 1.0;
    } else if (profile.districts && hotel.district) {
      const maxDistW = Math.max(...Object.values(profile.districts), 1);
      favoriteScore = (profile.districts[hotel.district] || 0) / maxDistW * 0.5;

      if (hotel.services && Object.keys(profile.preferredServices).length > 0) {
        const svcs = hotel.services.split(',').map(s => s.trim()).filter(Boolean);
        const totalPref = Object.values(profile.preferredServices).reduce((a,b) => a+b, 0);
        let matchW = 0;
        svcs.forEach(s => { if (profile.preferredServices[s]) matchW += profile.preferredServices[s]; });
        favoriteScore = Math.min(favoriteScore + (matchW / totalPref) * 0.5, 1);
      }
    }
  }

  let searchScore = 0;
  if (profile && profile.keywords.length > 0) {
    const nameLC = (hotel.name + ' ' + (hotel.district||'') + ' ' + (hotel.address||'')).toLowerCase();
    let matched = 0, totalW = 0;
    profile.keywords.forEach(kw => {
      const w = profile.keywordWeights?.[kw] || 1;
      totalW += w;
      if (nameLC.includes(kw.toLowerCase())) matched += w;
    });

    let criteria = profile.keywords.length;
    let matchedCriteria = matched / Math.max(totalW, 1);

    if (profile.avgPrice && hotel.price) {
      const diff = Math.abs(Number(hotel.price) - profile.avgPrice) / profile.avgPrice;
      if (diff < 0.4) { matchedCriteria += 0.5; criteria += 0.5; }
    }

    searchScore = Math.min(matchedCriteria / Math.max(criteria, 1), 1);
  }

  let viewScore = 0;
  if (profile && profile.viewMap) {
    const maxView = profile.maxView || 1;
    const cnt = profile.viewMap[hotel.id] || 0;
    viewScore = Math.min(cnt / maxView, 1);
  }

  const ratingScore = (hotel.rating || 0) / 5;

  let score = WEIGHTS.SEARCH   * searchScore
            + WEIGHTS.VIEW     * viewScore
            + WEIGHTS.FAVORITE * favoriteScore
            + WEIGHTS.BOOKING  * bookingScore
            + WEIGHTS.RATING   * ratingScore;

  if (userLat && userLng && hotel.latitude && hotel.longitude) {
    const dist = haversine(userLat, userLng, hotel.latitude, hotel.longitude);
    score += Math.max(0, 1 - dist / 50) * 0.03;
    hotel.distance = Math.round(dist * 10) / 10;
  }

  hotel._scoreDetail = {
    search:   +(searchScore  * WEIGHTS.SEARCH  ).toFixed(3),
    view:     +(viewScore    * WEIGHTS.VIEW    ).toFixed(3),
    favorite: +(favoriteScore* WEIGHTS.FAVORITE).toFixed(3),
    booking:  +(bookingScore * WEIGHTS.BOOKING ).toFixed(3),
    rating:   +(ratingScore  * WEIGHTS.RATING  ).toFixed(3),
    total:    +score.toFixed(3)
  };

  return score;
}

router.get('/', async (req, res) => {
  try {
    const { lat, lng, limit = 6 } = req.query;
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;

    const GPS_RADIUS_KM = parseFloat(req.query.radius) || 30; // km — ban kinh loc KS theo GPS

    const decoded = tryDecodeToken(req.headers['authorization']);
    const hotels  = await fetchAllHotels();

    if (decoded?.id) {
      const behavior = await collectUserBehavior(decoded.id);
      const profile  = buildUserProfile(behavior);
      const hasHistory = behavior.searches.length > 0
        || behavior.views.length > 0
        || behavior.bookings.length > 0
        || behavior.favorites.length > 0;

      let results;
      if (hasHistory) {
        results = hotels.map(h => ({
          ...h,
          _score: scoreHotel(h, profile, userLat, userLng)
        }));
      } else {
        const globalPop = await fetchGlobalPopularity();
        results = hotels.map(h => ({
          ...h,
          _score: scoreHotelDefault(h, globalPop, userLat, userLng)
        }));
      }

      if (userLat && userLng) {
        results = results.filter(h => {
          if (!h.latitude || !h.longitude) return false;
          const dist = haversine(userLat, userLng, h.latitude, h.longitude);
          return dist <= GPS_RADIUS_KM;
        });
      }

      results.sort((a, b) => b._score - a._score);

      const top = results.slice(0, Number(limit)).map(({ _score, ...h }) => h);
      return res.json({
        hotels: top,
        mode: hasHistory ? 'hybrid' : 'rating',
        basedOn: behavior.searches.slice(0,3).map(s => s.keyword),
        radius_km: userLat ? GPS_RADIUS_KM : null
      });

    } else {
      const globalPop = await fetchGlobalPopularity();
      const { favMap, maxFav } = globalPop;

      let results = hotels.map(h => {
        const starScore   = Math.min((h.star || 0) / 5, 1);
        const favCount    = favMap[h.id] || 0;
        const favScore    = Math.min(favCount / maxFav, 1);
        const ratingScore = (h.rating || 0) / 5;

        let score = 0.50 * starScore + 0.35 * favScore + 0.15 * ratingScore;

        if (userLat && userLng && h.latitude && h.longitude) {
          const dist = haversine(userLat, userLng, h.latitude, h.longitude);
          score += Math.max(0, 1 - dist / 50) * 0.1;
          h = { ...h, distance: Math.round(dist * 10) / 10 };
        }
        return { ...h, _score: score };
      });

      if (userLat && userLng) {
        results = results.filter(h => {
          if (!h.latitude || !h.longitude) return false;
          const dist = haversine(userLat, userLng, h.latitude, h.longitude);
          return dist <= GPS_RADIUS_KM;
        });
      }

      results.sort((a, b) => b._score - a._score);
      return res.json({
        hotels: results.slice(0, Number(limit)).map(({ _score, ...h }) => h),
        mode: 'popular',
        radius_km: userLat ? GPS_RADIUS_KM : null
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.', error: err.message });
  }
});

router.get('/for-you', async (req, res) => {
  try {
    const decoded = tryDecodeToken(req.headers['authorization']);
    if (!decoded?.id) return res.json({ hotels: [], mode: 'guest' });

    const FOR_YOU_LIMIT = parseInt(req.query.limit) || 12; // so KS goi y ca nhan

    const user_id  = decoded.id;
    const behavior = await collectUserBehavior(user_id);
    const profile  = buildUserProfile(behavior);

    const hasHistory = behavior.views.length > 0
      || behavior.bookings.length > 0
      || behavior.favorites.length > 0
      || behavior.searches.length > 0;

    if (!hasHistory) return res.json({ hotels: [], mode: 'no_history' });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ForYou] user=${user_id} searches=${behavior.searches.length} views=${behavior.views.length} favs=${behavior.favorites.length} bookings=${behavior.bookings.length}`);
      console.log(`[ForYou] Formula: Score = ${WEIGHTS.SEARCH}×Search + ${WEIGHTS.VIEW}×View + ${WEIGHTS.FAVORITE}×Favorite + ${WEIGHTS.BOOKING}×Booking + ${WEIGHTS.RATING}×Rating`);
    }

    const hotels = await fetchAllHotels();

    const scored = hotels.map(h => ({
      ...h,
      _score: scoreHotel(h, profile, null, null)
    }));
    scored.sort((a, b) => b._score - a._score);

    const result = scored.slice(0, FOR_YOU_LIMIT).map(({ _score, ...h }) => ({
      ...h,
      _reason: getReason(h, profile)
    }));

    const reasons = buildReasons(behavior, profile);

    res.json({
      hotels:  result,
      mode:    'hybrid',
      reasons,
      profile_summary: {
        top_districts: Object.entries(profile.districts)
          .sort((a,b) => b[1]-a[1]).slice(0,3).map(([d]) => d),
        avg_price:   Math.round(profile.avgPrice || 0),
        avg_star:    parseFloat((profile.avgStar || 0).toFixed(1)),
        top_services: Object.entries(profile.preferredServices)
          .sort((a,b) => b[1]-a[1]).slice(0,3).map(([s]) => s),
        total_interactions: behavior.views.length + behavior.bookings.length + behavior.favorites.length + behavior.searches.length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

function getReason(hotel, profile) {
  const reasons = [];
  if (profile.districts[hotel.district]) reasons.push('📍 Khu vực yêu thích');
  if (profile.avgPrice) {
    const diff = Math.abs(Number(hotel.price) - profile.avgPrice) / profile.avgPrice;
    if (diff < 0.3) reasons.push('💰 Phù hợp ngân sách');
  }
  if (profile.preferredServices && hotel.services) {
    const svcs = hotel.services.split(',').map(s=>s.trim());
    const matched = svcs.filter(s => profile.preferredServices[s]);
    if (matched.length > 0) reasons.push(`✨ Có ${matched[0]}`);
  }
  if (profile.keywords.length > 0) {
    const nameLC = (hotel.name+' '+(hotel.district||'')).toLowerCase();
    const kw = profile.keywords.find(k => nameLC.includes(k.toLowerCase()));
    if (kw) reasons.push(`🔍 Liên quan "${kw}"`);
  }
  return reasons.slice(0, 2).join(' · ') || 'Gợi ý cho bạn';
}

function buildReasons(behavior, profile) {
  const reasons = [];
  if (behavior.favorites.length > 0) {
    const names = behavior.favorites.slice(0,2).map(f => f.hotel_name).filter(Boolean);
    if (names.length) reasons.push(`❤️ Tương tự KS yêu thích`);
  }
  if (behavior.bookings.length > 0)  reasons.push(`📋 Dựa trên đặt phòng`);
  if (behavior.views.length > 0)     reasons.push(`👁️ Dựa trên ${behavior.views.length} KS đã xem`);
  if (behavior.searches.length > 0)  reasons.push(`🔍 Dựa trên ${behavior.searches.length} lịch sử tìm kiếm`);
  return reasons;
}

router.post('/search-history', async (req, res) => {
  try {
    const { keyword, latitude, longitude, filter_min_price, filter_max_price, filter_rating, result_count, source } = req.body;
    const decoded = tryDecodeToken(req.headers['authorization']);
    const user_id = decoded?.id || null;

    if (!keyword && !latitude) return res.status(400).json({ message: 'Thiếu thông tin.' });

    await db.query(
      `INSERT INTO search_history
         (user_id, keyword, latitude, longitude, filter_min_price, filter_max_price, filter_rating, result_count, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, keyword || null, latitude || null, longitude || null,
       filter_min_price || null, filter_max_price || null, filter_rating || null,
       result_count || null, source || 'filter']
    );

    if (user_id && keyword) {
      await db.query(
        `INSERT INTO ai_recommend_logs (user_id, hotel_id, action_type, context)
         SELECT ?, h.id, 'search', 'search_page' FROM hotels h
         WHERE (h.name LIKE ? OR h.district LIKE ?) AND h.status='active' LIMIT 3`,
        [user_id, `%${keyword}%`, `%${keyword}%`]
      );
    }

    if (user_id) {
      const { logActivity } = require('../middleware/activityLogger');
      await logActivity({
        user_id,
        action: 'search',
        entity_type: 'search',
        meta: { keyword, source, result_count, filter_min_price, filter_max_price, filter_rating }
      });
    }

    res.json({ message: 'Đã lưu.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

router.get('/search-history', async (req, res) => {
  try {
    const decoded = tryDecodeToken(req.headers['authorization']);
    if (!decoded?.id) return res.status(401).json({ message: 'Chưa đăng nhập.' });

    const [rows] = await db.query(
      `SELECT id, keyword, latitude, longitude, created_at
       FROM search_history
       WHERE user_id = ? AND keyword IS NOT NULL AND keyword != ''
       ORDER BY created_at DESC LIMIT 30`,
      [decoded.id]
    );
    const seen = new Set();
    const unique = rows.filter(r => { if (seen.has(r.keyword)) return false; seen.add(r.keyword); return true; });
    res.json({ history: unique.slice(0, 10) });
  } catch { res.status(401).json({ message: 'Token không hợp lệ.' }); }
});

router.delete('/search-history/:id', async (req, res) => {
  try {
    const decoded = tryDecodeToken(req.headers['authorization']);
    if (!decoded?.id) return res.status(401).json({ message: 'Chưa đăng nhập.' });
    await db.query('DELETE FROM search_history WHERE id=? AND user_id=?', [Number(req.params.id), decoded.id]);
    res.json({ message: 'Đã xóa.' });
  } catch { res.status(401).json({ message: 'Token không hợp lệ.' }); }
});

router.delete('/search-history', async (req, res) => {
  try {
    const decoded = tryDecodeToken(req.headers['authorization']);
    if (!decoded?.id) return res.status(401).json({ message: 'Chưa đăng nhập.' });
    await db.query('DELETE FROM search_history WHERE user_id=?', [decoded.id]);
    res.json({ message: 'Đã xóa tất cả.' });
  } catch { res.status(401).json({ message: 'Token không hợp lệ.' }); }
});

router.get('/hotel-views', async (req, res) => {
  try {
    const decoded = tryDecodeToken(req.headers['authorization']);
    if (!decoded?.id) return res.status(401).json({ message: 'Chưa đăng nhập.' });

    const [rows] = await db.query(
      `SELECT hv.hotel_id, h.name, h.image, h.address, h.district, h.price, h.rating,
              COUNT(hv.id) AS view_count, MAX(hv.viewed_at) AS last_viewed
       FROM hotel_views hv JOIN hotels h ON h.id=hv.hotel_id
       WHERE hv.user_id=?
       GROUP BY hv.hotel_id ORDER BY last_viewed DESC LIMIT 20`,
      [decoded.id]
    );
    res.json({ views: rows });
  } catch { res.status(401).json({ message: 'Token không hợp lệ.' }); }
});

router.get('/by-history', async (req, res) => {
  req.url = '/for-you' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  router.handle(req, res, () => {});
});

module.exports = router;
