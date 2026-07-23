const API_BASE = 'http://localhost:3000/api';

function getToken()  { return localStorage.getItem('token'); }
function getUser()   { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } }

function formatPrice(p)  { return Number(p).toLocaleString('vi-VN'); }

function getImageSrc(image) {
  if (!image || image === 'default_hotel.jpg' || image === 'default.jpg')
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop';
  if (image.startsWith('http')) return image;
  return `${API_BASE.replace('/api','')}${image}`;
}

function getBadge(hotel, index) {
  if (hotel.distance !== undefined) return '📍 Gần bạn';
  if (hotel.rating >= 4.7)          return '⭐ Nổi bật';
  if (hotel.star  >= 4)             return '✨ Cao cấp';
  if (hotel.price < 300000)         return '💰 Tiết kiệm';
  const badges = ['Gợi ý cho bạn', 'Được yêu thích', 'Phổ biến'];
  return badges[index % badges.length];
}

function createHotelCard(hotel, index) {
  const distInfo  = hotel.distance !== undefined
    ? `📍 ${hotel.distance} km`
    : `📍 ${hotel.district || hotel.address || 'Vĩnh Long'}`;
  const services = hotel.services
    ? hotel.services.split(',').filter(Boolean).slice(0,3).join(' · ')
    : '';

  return `
    <div class="hotel-card">
      <img src="${getImageSrc(hotel.image)}" alt="${hotel.name}"
           onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop'">
      <div class="hotel-info">
        <span class="badge">${getBadge(hotel, index)}</span>
        <h3>${hotel.name}</h3>
        <p>${distInfo}</p>
        ${services ? `<p style="font-size:12px;color:#888;">🛎️ ${services}</p>` : ''}
        <div class="rating">⭐ ${parseFloat(hotel.rating || 0).toFixed(1)}</div>
        <div class="hotel-footer">
          <span>${formatPrice(hotel.price)}đ/đêm</span>
          <a href="hotel-detail.html?id=${hotel.id}"><button>Xem chi tiết</button></a>
        </div>
      </div>
    </div>`;
}

function createHotelCardWithReason(hotel, index) {
  return createHotelCard(hotel, index);
}

const HOME_GPS_RADIUS_KM = 10; // km — ban kinh KS gan toi trang chu
const PLACE_RADIUS_KM   = 10; // km — ban kinh KS gan dia danh du lich (tuy chinh tai day)

async function tryGetGps() {
  if (!navigator.geolocation) return null;
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 3000 }
    );
  });
}

async function loadMainSection() {
  const token      = getToken();
  const titleEl    = document.getElementById('recommendTitle');
  const subtitleEl = document.getElementById('recommendSubtitle');
  const listEl     = document.getElementById('recommendedHotels');
  if (!listEl) return;

  const gps = await tryGetGps();

  if (token) {
    try {
      const res  = await fetch(`${API_BASE}/recommendations/for-you?limit=12`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.mode === 'hybrid' && data.hotels?.length > 0) {
        if (titleEl)    titleEl.textContent    = '✨ Gợi ý dành riêng cho bạn';
        if (subtitleEl) subtitleEl.textContent = 'Dựa trên lịch sử tìm kiếm, xem và đặt phòng của bạn';
        listEl.innerHTML = data.hotels.map((h, i) => createHotelCardWithReason(h, i)).join('');
        loadTopRatedSection(gps);
        return;
      }

      if (data.mode === 'no_history' || data.mode === 'guest') {
        await loadDefaultRecommendInto(listEl, titleEl, subtitleEl, gps, token);
        return;
      }
    } catch {}
  }

  await loadDefaultRecommendInto(listEl, titleEl, subtitleEl, gps, token);
}

async function loadDefaultRecommendInto(listEl, titleEl, subtitleEl, gps, token) {
  try {
    let url = `${API_BASE}/recommendations?limit=12`;
    if (gps) url += `&lat=${gps.lat}&lng=${gps.lng}&radius=${HOME_GPS_RADIUS_KM}`;

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res  = await fetch(url, { headers });
    const data = await res.json();
    const hotels = data.hotels || [];

    if (gps && hotels.length > 0) {
      if (titleEl)    titleEl.textContent    = `📍 Khách sạn gần bạn (${HOME_GPS_RADIUS_KM}km)`;
      if (subtitleEl) subtitleEl.textContent = `Trong bán kính ${HOME_GPS_RADIUS_KM}km · Xếp theo số sao & lượt yêu thích`;
    } else {
      if (titleEl)    titleEl.textContent    = '⭐ Khách sạn nổi bật';
      if (subtitleEl) subtitleEl.textContent = 'Xếp hạng theo số sao & lượt yêu thích cao nhất';
    }

    listEl.innerHTML = hotels.length > 0
      ? hotels.map((h, i) => createHotelCard(h, i)).join('')
      : '<p style="color:#999;padding:16px;">Chưa có dữ liệu khách sạn.</p>';
  } catch (err) {
    console.warn(err.message);
  }
}

async function loadTopRatedSection(gps) {
  const forYouSection = document.getElementById('forYouSection');
  if (!forYouSection) return;

  try {
    let url = `${API_BASE}/recommendations?limit=12`;
    if (gps) url += `&lat=${gps.lat}&lng=${gps.lng}&radius=${HOME_GPS_RADIUS_KM}`;

    const res  = await fetch(url);
    const data = await res.json();
    const hotels = data.hotels || [];
    if (!hotels.length) return;

    forYouSection.style.display = '';
    const titleEl    = document.getElementById('forYouTitle');
    const subtitleEl = document.getElementById('forYouSubtitle');
    const listEl     = document.getElementById('forYouHotels');

    if (titleEl)    titleEl.textContent    = gps ? `📍 Khách sạn gần bạn (${HOME_GPS_RADIUS_KM}km)` : '⭐ Khách sạn nổi bật';
    if (subtitleEl) subtitleEl.textContent = 'Xếp hạng theo số sao & lượt yêu thích cao nhất';
    if (listEl)     listEl.innerHTML       = hotels.map((h, i) => createHotelCard(h, i)).join('');
  } catch {}
}

function initHeroSearch() {
  const searchBtn   = document.querySelector('.search-btn');
  const searchInput = document.querySelector('.search-box input');
  const searchBox   = document.querySelector('.search-box');
  if (!searchBtn || !searchInput) return;

  function doSearch() {
    const kw = searchInput.value.trim();
    closeDropdown();
    window.location.href = kw ? `search.html?keyword=${encodeURIComponent(kw)}` : 'search.html';
  }

  let dropdown = null;
  let debounceTimer = null;

  function closeDropdown() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
  }

  function renderDropdown(items) {
    closeDropdown();
    if (!items.length) return;

    dropdown = document.createElement('div');
    dropdown.style.cssText = `
      position:absolute; top:100%; left:0; right:0; z-index:9999;
      background:#fff; border-radius:0 0 12px 12px;
      box-shadow:0 8px 24px rgba(0,0,0,0.15);
      max-height:320px; overflow-y:auto;
    `;

    items.forEach(h => {
      const item = document.createElement('div');
      item.style.cssText = `
        display:flex; align-items:center; gap:12px;
        padding:10px 16px; cursor:pointer; border-bottom:1px solid #f5f5f5;
        transition:background .15s;
      `;
      item.innerHTML = `
        <img src="${h.image && !h.image.includes('default') ? (h.image.startsWith('http') ? h.image : 'http://localhost:3000' + h.image) : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=60'}"
          style="width:44px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;"
          onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=60'">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.name}</div>
          <div style="font-size:12px;color:#888;">${h.district || 'Vĩnh Long'} &nbsp;·&nbsp; ${Number(h.price).toLocaleString('vi-VN')}đ/đêm &nbsp;·&nbsp; ⭐ ${parseFloat(h.rating||0).toFixed(1)}</div>
        </div>
      `;
      item.addEventListener('mouseenter', () => item.style.background = '#fdf6f0');
      item.addEventListener('mouseleave', () => item.style.background = '');
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        searchInput.value = h.name;
        closeDropdown();
        window.location.href = `hotel-detail.html?id=${h.id}`;
      });
      dropdown.appendChild(item);
    });

    const seeAll = document.createElement('div');
    seeAll.style.cssText = 'padding:10px 16px;text-align:center;font-size:13px;color:#8b5e3c;cursor:pointer;font-weight:600;';
    seeAll.textContent = 'Xem tất cả kết quả';
    seeAll.addEventListener('mousedown', e => { e.preventDefault(); doSearch(); });
    dropdown.appendChild(seeAll);

    searchBox.style.position = 'relative';
    searchBox.style.borderRadius = dropdown ? '12px 12px 0 0' : '12px';
    searchBox.appendChild(dropdown);
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const kw = searchInput.value.trim();
    if (!kw) { closeDropdown(); return; }

    debounceTimer = setTimeout(async () => {
      try {
        const res  = await fetch(`${API_BASE}/hotels/autocomplete?q=${encodeURIComponent(kw)}&limit=6`);
        const data = await res.json();
        renderDropdown(data.suggestions || []);
      } catch { closeDropdown(); }
    }, 250);
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') closeDropdown();
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(closeDropdown, 150);
  });

  searchBtn.addEventListener('click', doSearch);
}

async function updateNav() {
  const token      = getToken();
  const loginNav   = document.getElementById('loginNav');
  const profileNav = document.getElementById('profileNav');
  const adminNav   = document.getElementById('adminNav');
  const ownerNav   = document.getElementById('ownerNav');

  if (!token) {
    if (loginNav)   loginNav.style.display   = '';
    if (profileNav) profileNav.style.display = 'none';
    if (adminNav)   adminNav.style.display   = 'none';
    if (ownerNav)   ownerNav.style.display   = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (loginNav)   loginNav.style.display   = '';
      if (profileNav) profileNav.style.display = 'none';
      if (adminNav)   adminNav.style.display   = 'none';
      if (ownerNav)   ownerNav.style.display   = 'none';
      return;
    }

    const user = await res.json();
    localStorage.setItem('user', JSON.stringify(user));

    if (loginNav)   loginNav.style.display   = 'none';
    if (profileNav) profileNav.style.display = '';
    if (adminNav)   adminNav.style.display   = (user.role === 'admin') ? '' : 'none';
    if (ownerNav)   ownerNav.style.display   = (['owner','admin'].includes(user.role)) ? '' : 'none';

  } catch {
    const user = getUser();
    if (loginNav)   loginNav.style.display   = 'none';
    if (profileNav) profileNav.style.display = '';
    if (adminNav)   adminNav.style.display   = (user?.role === 'admin') ? '' : 'none';
    if (ownerNav)   ownerNav.style.display   = (['owner','admin'].includes(user?.role)) ? '' : 'none';
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

window.showNearbyHotels = async function(placeName, placeLat, placeLng) {
  const modal    = document.getElementById('nearbyModal');
  const title    = document.getElementById('nearbyModalTitle');
  const subtitle = document.getElementById('nearbyModalSubtitle');
  const body     = document.getElementById('nearbyModalBody');
  const link     = document.getElementById('nearbySearchLink');
  if (!modal) return;

  title.textContent    = `🏨 Khách sạn gần ${placeName}`;
  subtitle.textContent = '';
  body.innerHTML       = '<p style="color:#999;padding:12px 0;text-align:center;">⏳ Đang tìm khách sạn gần đây...</p>';
  modal.style.display  = 'flex';
  if (link) link.href  = `search.html`;

  try {
    const res  = await fetch(`${API_BASE}/recommendations?lat=${placeLat}&lng=${placeLng}&limit=8&radius=${PLACE_RADIUS_KM}`);
    const data = await res.json();
    const hotels = (data.hotels || []).map(h => ({
      ...h,
      distance: Math.round(haversine(placeLat, placeLng, h.latitude, h.longitude) * 10) / 10
    }))
    .filter(h => h.distance <= PLACE_RADIUS_KM)
    .sort((a, b) => a.distance - b.distance);

    if (hotels.length === 0) {
      body.innerHTML = `<p style="color:#666;text-align:center;padding:20px;">Khong tim thay khach san trong pham vi ${PLACE_RADIUS_KM}km.</p>`;
      return;
    }

    subtitle.textContent = `${hotels.length} khach san trong pham vi ${PLACE_RADIUS_KM}km`;

    body.innerHTML = hotels.map(h => `
      <div style="display:flex;gap:12px;border-bottom:1px solid #f0f0f0;padding:12px 0;align-items:center;">
        <img src="${getImageSrc(h.image)}" alt="${h.name}"
          style="width:80px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;"
          onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=200'">
        <div style="flex:1;min-width:0;">
          <strong style="font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.name}</strong>
          <div style="font-size:12px;color:#666;margin:3px 0;">
            ⭐ ${parseFloat(h.rating||0).toFixed(1)}
            &nbsp;·&nbsp; 📍 ${h.distance} km
            &nbsp;·&nbsp; ${'★'.repeat(Math.min(h.star||1,5))}
          </div>
          <div style="color:#e44d26;font-weight:bold;font-size:13px;">${formatPrice(h.price)}đ/đêm</div>
        </div>
        <a href="hotel-detail.html?id=${h.id}"
          style="padding:7px 14px;background:#2196F3;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;white-space:nowrap;flex-shrink:0;">
          Xem
        </a>
      </div>`).join('');
  } catch {
    body.innerHTML = '<p style="color:red;text-align:center;">Lỗi kết nối server.</p>';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  loadMainSection();
  initHeroSearch();
});
