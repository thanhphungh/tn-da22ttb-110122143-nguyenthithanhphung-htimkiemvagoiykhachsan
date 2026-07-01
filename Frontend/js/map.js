const API_BASE = 'http://localhost:3000/api';

const DEFAULT_LAT = 10.2552;
const DEFAULT_LNG = 105.9731;

let map        = null;
let userMarker = null;
let hotelMarkers = [];
let allHotels  = [];
let userLat    = null;
let userLng    = null;

function initMap(lat, lng) {
  map = L.map('map').setView([lat, lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);
}

function addUserMarker(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  const icon = L.divIcon({
    html: '<div style="background:#2196F3;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
    iconSize: [16,16], iconAnchor: [8,8], className: ''
  });
  userMarker = L.marker([lat, lng], { icon })
    .addTo(map)
    .bindPopup('<strong>📍 Vị trí của bạn</strong>')
    .openPopup();
}

function clearHotelMarkers() {
  hotelMarkers.forEach(m => map.removeLayer(m));
  hotelMarkers = [];
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getImageSrc(image) {
  if (!image || image === 'default_hotel.jpg') return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=200';
  return image.startsWith('http') ? image : `${API_BASE.replace('/api','')}${image}`;
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN');
}

function getFilters() {
  const price  = document.getElementById('filterPrice')?.value  || '';
  const star   = document.getElementById('filterStar')?.value   || '';
  const rating = document.getElementById('filterRating')?.value || '';
  return { price, star, rating };
}

function applyFilters(hotels) {
  const { price, star, rating } = getFilters();
  return hotels.filter(h => {
    if (price) {
      const [min, max] = price.split('-').map(Number);
      if (h.price < min || h.price > max) return false;
    }
    if (star) {
      if ((h.star || 1) < Number(star)) return false;
    }
    if (rating) {
      if ((h.rating || 0) < Number(rating)) return false;
    }
    return true;
  });
}

function addHotelMarkers(hotels) {
  clearHotelMarkers();
  hotels.forEach(h => {
    if (!h.latitude || !h.longitude) return;

    const icon = L.divIcon({
      html: `<div style="background:#e44d26;color:white;padding:3px 7px;border-radius:10px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏨 ${formatPrice(h.price)}đ</div>`,
      iconSize: [null,null], iconAnchor: [0,0], className: ''
    });

    const marker = L.marker([h.latitude, h.longitude], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:190px;">
          <img src="${getImageSrc(h.image)}" alt="${h.name}"
            style="width:100%;height:85px;object-fit:cover;border-radius:6px;margin-bottom:8px;"
            onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=200'">
          <strong style="font-size:14px;">${h.name}</strong><br>
          <span style="color:#f5a623;">⭐ ${parseFloat(h.rating||0).toFixed(1)}</span>
          ${'⭐'.repeat(Math.min(h.star||1,5)).replace(/⭐/g,'<span style="font-size:10px;color:#f5a623;">★</span>')}
          &nbsp;<span style="color:#e44d26;font-weight:bold;">${formatPrice(h.price)}đ/đêm</span><br>
          <small style="color:#666;">📌 ${h.district || h.address || 'Vĩnh Long'}</small>
          ${h.distance !== undefined ? `<br><small style="color:#2196F3;">📍 ${h.distance} km</small>` : ''}<br>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <a href="hotel-detail.html?id=${h.id}"
              style="flex:1;padding:5px 0;background:#2196F3;color:white;border-radius:5px;text-decoration:none;font-size:12px;text-align:center;">
              Xem chi tiết
            </a>
            <button onclick="navigateToHotel(${h.latitude},${h.longitude},'${(h.name||'').replace(/'/g,'')}')"
              style="flex:1;padding:5px 0;background:#4CAF50;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px;">
              Chỉ đường
            </button>
          </div>
        </div>
      `);
    hotelMarkers.push(marker);
  });
}

function renderSidebar(hotels) {
  const list = document.getElementById('sidebarList');
  if (!list) return;

  if (hotels.length === 0) {
    list.innerHTML = '<p style="color:#666;padding:10px 0;">Không tìm thấy khách sạn.</p>';
    return;
  }

  list.innerHTML = hotels.slice(0, 12).map(h => `
    <div class="hotel-item" style="cursor:pointer;" onclick="focusHotel(${h.latitude},${h.longitude})">
      <img src="${getImageSrc(h.image)}" alt="${h.name}"
           onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=200'">
      <div>
        <h3>${h.name}</h3>
        <p>⭐ ${parseFloat(h.rating||0).toFixed(1)}
          <span style="color:#888;font-size:12px;">${'★'.repeat(Math.min(h.star||1,5))}</span>
        </p>
        ${h.distance !== undefined
          ? `<p style="color:#2196F3;">📍 ${h.distance} km</p>`
          : `<p style="color:#888;font-size:12px;">📌 ${h.district||'Vĩnh Long'}</p>`
        }
        <p style="color:#e44d26;font-weight:bold;">${formatPrice(h.price)}đ/đêm</p>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <a href="hotel-detail.html?id=${h.id}"
            style="flex:1;padding:5px 0;background:#2196F3;color:white;border-radius:6px;text-decoration:none;font-size:12px;text-align:center;">
            Chi tiết
          </a>
          <button onclick="event.stopPropagation();navigateToHotel(${h.latitude},${h.longitude},'${(h.name||'').replace(/'/g,'')}')"
            style="flex:1;padding:5px 0;background:#4CAF50;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
            Chỉ đường
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

let routeLayer = null;

window.navigateToHotel = async function(destLat, destLng, hotelName) {
  if (!map) return;

  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

  let fromLat = userLat || DEFAULT_LAT;
  let fromLng = userLng || DEFAULT_LNG;

  if (!userLat) {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      fromLat = userLat = pos.coords.latitude;
      fromLng = userLng = pos.coords.longitude;
      addUserMarker(fromLat, fromLng);
    } catch {}
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      alert('Không tìm được đường đi.');
      return;
    }

    const route    = data.routes[0];
    const coords   = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distance = (route.distance / 1000).toFixed(1);
    const minutes  = Math.round(route.duration / 60);

    routeLayer = L.polyline(coords, {
      color: '#2196F3',
      weight: 5,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });

    const midIdx = Math.floor(coords.length / 2);
    L.popup()
      .setLatLng(coords[midIdx])
      .setContent(`
        <div style="text-align:center;min-width:160px;">
          <strong>🗺️ ${hotelName || 'Khách sạn'}</strong><br>
          <span style="color:#2196F3;">📍 ${distance} km</span> &nbsp;·&nbsp;
          <span style="color:#4CAF50;">⏱ ~${minutes} phút</span><br>
          <small style="color:#888;">Lái xe theo tuyến màu xanh</small>
        </div>
      `)
      .openOn(map);

    const clearBtn = document.getElementById('clearRouteBtn');
    if (clearBtn) clearBtn.style.display = 'inline-block';

  } catch (err) {
    console.error(err);
    alert('Không thể tải tuyến đường. Vui lòng kiểm tra kết nối mạng.');
  }
};

window.clearRoute = function() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  const clearBtn = document.getElementById('clearRouteBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  map.closePopup();
};

window.focusHotel = function(lat, lng) {
  if (!lat || !lng || !map) return;
  map.setView([lat, lng], 16);
  const marker = hotelMarkers.find(m => {
    const p = m.getLatLng();
    return Math.abs(p.lat - lat) < 0.0002 && Math.abs(p.lng - lng) < 0.0002;
  });
  if (marker) marker.openPopup();
};

async function loadAndRender(lat, lng, keyword) {
  try {
    let url;
    if (keyword) {
      url = `${API_BASE}/hotels/search?keyword=${encodeURIComponent(keyword)}&limit=50`;
    } else if (lat && lng) {
      url = `${API_BASE}/map/hotels-near?lat=${lat}&lng=${lng}&radius=50&limit=80`;
    } else {
      url = `${API_BASE}/map/all`;
    }

    const res  = await fetch(url);
    const data = await res.json();
    let hotels = data.hotels || [];

    if (lat && lng) {
      hotels = hotels.map(h => ({
        ...h,
        distance: Math.round(haversine(lat, lng, h.latitude, h.longitude) * 10) / 10
      })).sort((a, b) => a.distance - b.distance);
    }

    allHotels = hotels;
    renderFiltered();

    if (keyword && hotels.length > 0 && hotels[0].latitude) {
      map.setView([hotels[0].latitude, hotels[0].longitude], 13);
    }
  } catch (err) {
    console.error('Lỗi load khách sạn:', err);
    document.getElementById('sidebarList').innerHTML = '<p style="color:red;">Lỗi kết nối server.</p>';
  }
}

function renderFiltered() {
  const filtered = applyFilters(allHotels);
  addHotelMarkers(filtered);
  renderSidebar(filtered);
}

async function showNearbyHotels(placeName, placeLat, placeLng) {
  const modal = document.getElementById('nearbyModal');
  const title = document.getElementById('nearbyModalTitle');
  const body  = document.getElementById('nearbyModalBody');
  if (!modal) return;

  title.textContent = `🏨 Khách sạn gần ${placeName}`;
  body.innerHTML = '<p style="color:#999;padding:12px 0;">Đang tải...</p>';
  modal.style.display = 'flex';

  map.setView([placeLat, placeLng], 14);
  if (userMarker) map.removeLayer(userMarker);
  const placeIcon = L.divIcon({
    html: `<div style="background:#FF5722;color:white;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">📍 ${placeName}</div>`,
    iconSize: [null,null], iconAnchor: [0,0], className: ''
  });
  userMarker = L.marker([placeLat, placeLng], { icon: placeIcon })
    .addTo(map)
    .bindPopup(`<strong>📍 ${placeName}</strong>`)
    .openPopup();

  try {
    const res  = await fetch(`${API_BASE}/recommendations?lat=${placeLat}&lng=${placeLng}&limit=8`);
    const data = await res.json();
    const hotels = (data.hotels || []).map(h => ({
      ...h,
      distance: Math.round(haversine(placeLat, placeLng, h.latitude, h.longitude) * 10) / 10
    })).sort((a, b) => a.distance - b.distance);

    if (hotels.length === 0) {
      body.innerHTML = '<p style="color:#666;">Không tìm thấy khách sạn gần đây.</p>';
      return;
    }

    body.innerHTML = hotels.map(h => `
      <div style="display:flex;gap:12px;border-bottom:1px solid #f0f0f0;padding:12px 0;align-items:center;">
        <img src="${getImageSrc(h.image)}" alt="${h.name}"
          style="width:76px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;"
          onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=200'">
        <div style="flex:1;min-width:0;">
          <strong style="font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.name}</strong>
          <div style="font-size:12px;color:#666;margin:3px 0;">
            ⭐ ${parseFloat(h.rating||0).toFixed(1)} &nbsp;·&nbsp; 📍 ${h.distance} km
          </div>
          <div style="color:#e44d26;font-weight:bold;font-size:13px;">${formatPrice(h.price)}đ/đêm</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
          <a href="hotel-detail.html?id=${h.id}"
            style="padding:5px 12px;background:#2196F3;color:#fff;border-radius:6px;text-decoration:none;font-size:12px;text-align:center;">
            Xem
          </a>
          <button onclick="navigateToHotel(${h.latitude},${h.longitude},'${(h.name||'').replace(/'/g,'')}')"
            style="padding:5px 12px;background:#4CAF50;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
            Đường
          </button>
        </div>
      </div>
    `).join('');
  } catch {
    body.innerHTML = '<p style="color:red;">Lỗi kết nối server.</p>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initMap(DEFAULT_LAT, DEFAULT_LNG);
  await loadAndRender(null, null, null);

  const locationBtn = document.getElementById('locationBtn');
  locationBtn?.addEventListener('click', async () => {
    if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ định vị.'); return; }
    locationBtn.textContent = '⏳ Đang lấy...';
    locationBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        map.setView([userLat, userLng], 14);
        addUserMarker(userLat, userLng);
        await loadAndRender(userLat, userLng, null);
        locationBtn.textContent = '📍 Vị trí của tôi';
        locationBtn.disabled = false;
      },
      () => {
        alert('Không thể lấy vị trí. Vui lòng cho phép GPS.');
        locationBtn.textContent = '📍 Vị trí của tôi';
        locationBtn.disabled = false;
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });

  const searchInput = document.getElementById('mapSearchInput');
  const searchBtn   = document.getElementById('mapSearchBtn');
  const doMapSearch = async () => {
    const kw = searchInput?.value?.trim();
    if (!kw) { await loadAndRender(userLat, userLng, null); return; }
    await loadAndRender(null, null, kw);
  };
  searchBtn?.addEventListener('click', doMapSearch);
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doMapSearch(); });

  ['filterPrice', 'filterStar', 'filterRating'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderFiltered);
  });

  document.querySelectorAll('.tour-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tour-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lat  = parseFloat(btn.dataset.lat);
      const lng  = parseFloat(btn.dataset.lng);
      const name = btn.dataset.name;
      showNearbyHotels(name, lat, lng);
    });
  });
});
