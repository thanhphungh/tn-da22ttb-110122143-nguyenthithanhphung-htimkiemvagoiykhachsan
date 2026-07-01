const API_BASE = 'http://localhost:3000/api';

function getToken() { return localStorage.getItem('token'); }

function formatPrice(p) { return Number(p).toLocaleString('vi-VN'); }

function getImageSrc(image) {
  if (!image || image === 'default_hotel.jpg' || image === 'default.jpg')
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600';
  return image.startsWith('http') ? image : `${API_BASE.replace('/api','')}${image}`;
}

function getBadge(hotel) {
  if (hotel.distance !== undefined) return 'Gần bạn';
  if (hotel.rating >= 4.5) return 'Đề xuất';
  if (hotel.price < 300000) return 'Tiết kiệm';
  if (hotel.star >= 4) return 'Cao cấp';
  return 'Phổ biến';
}

function highlightText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

function renderHotelCard(hotel) {
  const dist = hotel.distance !== undefined ? `📍 ${hotel.distance} km` : `📍 ${hotel.district || 'Vĩnh Long'}`;
  const svcs = hotel.services ? hotel.services.split(',').filter(Boolean).slice(0,3).join(' · ') : '';
  return `
    <div class="hotel-card">
      <img src="${getImageSrc(hotel.image)}" alt="${hotel.name}"
           onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600'">
      <div class="hotel-info">
        <div class="top-info">
          <span class="badge">${getBadge(hotel)}</span>
          <span class="rating">⭐ ${parseFloat(hotel.rating||0).toFixed(1)}</span>
        </div>
        <h3>${hotel.name}</h3>
        <p>${dist}</p>
        ${svcs ? `<p style="font-size:12px;color:#888;">🛎️ ${svcs}</p>` : ''}
        <div class="hotel-footer">
          <span>${formatPrice(hotel.price)}đ/đêm</span>
          <a href="hotel-detail.html?id=${hotel.id}"><button>Chi tiết</button></a>
        </div>
      </div>
    </div>`;
}

let currentGps   = null;
let currentPlace = null;
let acIndex      = -1;
let acTimeout    = null;

function closeDropdown() {
  document.getElementById('acDropdown')?.remove();
  acIndex = -1;
}

async function fetchSuggestions(q) {
  const res  = await fetch(`${API_BASE}/hotels/autocomplete?q=${encodeURIComponent(q)}&limit=8`);
  const data = await res.json();
  return data.suggestions || [];
}

async function fetchHistory() {
  if (!getToken()) return [];
  const res  = await fetch(`${API_BASE}/recommendations/search-history`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await res.json();
  return data.history || [];
}

function buildDropdown(items, type, query, inputEl) {
  closeDropdown();
  if (items.length === 0) return;

  const wrap = inputEl.closest('.search-input-wrap');
  const drop = document.createElement('div');
  drop.id = 'acDropdown';
  drop.className = 'autocomplete-dropdown';

  const hdr = document.createElement('div');
  hdr.className = 'autocomplete-header';
  if (type === 'history') {
    hdr.innerHTML = `<span>🕐 Tìm kiếm gần đây</span>
      <button id="acClearAll">Xóa tất cả</button>`;
  } else {
    hdr.innerHTML = `<span>🔍 Gợi ý</span>`;
  }
  drop.appendChild(hdr);

  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'autocomplete-item';
    row.dataset.idx = idx;

    if (type === 'history') {
      row.innerHTML = `
        <span class="ac-icon">🔍</span>
        <div class="ac-info">
          <div class="ac-name">${item.keyword}</div>
        </div>
        <button class="del-history-btn" data-id="${item.id}"
          style="background:none;border:none;color:#ccc;cursor:pointer;font-size:18px;flex-shrink:0;">×</button>`;

      row.addEventListener('click', e => {
        if (e.target.classList.contains('del-history-btn')) return;
        inputEl.value = item.keyword;
        closeDropdown();
        triggerSearch();
      });

      row.querySelector('.del-history-btn')?.addEventListener('click', async e => {
        e.stopPropagation();
        await fetch(`${API_BASE}/recommendations/search-history/${item.id}`, {
          method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        row.remove();
        if (!drop.querySelectorAll('.autocomplete-item').length) closeDropdown();
      });

    } else {
      const imgSrc = getImageSrc(item.image);
      row.innerHTML = `
        <img src="${imgSrc}" alt="${item.name}"
             onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=60'">
        <div class="ac-info">
          <div class="ac-name">${highlightText(item.name, query)}</div>
          <div class="ac-sub">📍 ${item.district || 'Vĩnh Long'} &nbsp;⭐ ${parseFloat(item.rating||0).toFixed(1)}</div>
        </div>
        <div class="ac-price">${formatPrice(item.price)}đ</div>`;

      row.addEventListener('click', () => {
        inputEl.value = item.name;
        closeDropdown();
        saveSearchHistory(item.name);
        triggerSearch(item.name);
      });
    }

    row.addEventListener('mouseenter', () => {
      drop.querySelectorAll('.autocomplete-item').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
      acIndex = idx;
    });

    drop.appendChild(row);
  });

  wrap.appendChild(drop);

  drop.querySelector('#acClearAll')?.addEventListener('click', async e => {
    e.stopPropagation();
    await fetch(`${API_BASE}/recommendations/search-history`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    closeDropdown();
  });

  setTimeout(() => {
    document.addEventListener('click', function handler(ev) {
      if (!drop.contains(ev.target) && ev.target !== inputEl) {
        closeDropdown();
        document.removeEventListener('click', handler);
      }
    });
  }, 50);
}

function navigateDropdown(dir) {
  const items = document.querySelectorAll('#acDropdown .autocomplete-item');
  if (!items.length) return false;
  items.forEach(r => r.classList.remove('active'));
  acIndex = Math.max(0, Math.min(items.length - 1, acIndex + dir));
  items[acIndex]?.classList.add('active');
  items[acIndex]?.scrollIntoView({ block: 'nearest' });
  return true;
}

async function saveSearchHistory(keyword) {
  if (!keyword?.trim()) return;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
    await fetch(`${API_BASE}/recommendations/search-history`, {
      method: 'POST', headers,
      body: JSON.stringify({ keyword })
    });
  } catch {}
}

async function searchHotels(params = {}) {
  const grid    = document.querySelector('.hotel-grid');
  const countEl = document.querySelector('.result-title span');
  if (!grid) return;

  grid.innerHTML = '<p style="padding:30px;color:#999;grid-column:1/-1;text-align:center;">⏳ Đang tìm kiếm...</p>';

  try {
    const q = new URLSearchParams();
    if (params.keyword)   q.set('keyword',   params.keyword);
    if (params.minPrice)  q.set('minPrice',  params.minPrice);
    if (params.maxPrice)  q.set('maxPrice',  params.maxPrice);
    if (params.minRating) q.set('minRating', params.minRating);
    if (params.lat)       q.set('lat',       params.lat);
    if (params.lng)       q.set('lng',       params.lng);
    if (params.radius)    q.set('radius',    params.radius);
    if (params.ward)      q.set('ward',      params.ward);
    if (params.district)  q.set('district',  params.district);
    q.set('limit', '60');

    const useRecommend = params.lat && params.lng && !params.keyword && !params.ward && !params.district;
    const url = useRecommend
      ? `${API_BASE}/recommendations?${q}`
      : `${API_BASE}/hotels/search?${q}`;

    const res  = await fetch(url);
    const data = await res.json();
    const hotels = data.hotels || [];

    if (countEl) {
      let label = `${hotels.length} khách sạn`;
      if (params.placeName) {
        label += ` <span class="place-filter-badge">📍 ${params.placeName} <button onclick="clearPlaceFilter()">✕</button></span>`;
      }
      if (params.ward) {
        label += ` <span class="place-filter-badge">🏘️ ${params.ward} <button onclick="clearAreaFilter()">✕</button></span>`;
      }
      countEl.innerHTML = label;
    }

    if (hotels.length === 0) {
      const areaName = params.ward || params.district || params.placeName || params.keyword;
      const serverMsg = data.message;
      const displayMsg = serverMsg || (areaName
        ? `Không tìm thấy khách sạn tại <strong>"${areaName}"</strong>.<br>Thử tìm khu vực lân cận hoặc thay đổi bộ lọc.`
        : 'Không tìm thấy khách sạn phù hợp.');

      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#666;">
        <div style="font-size:48px;margin-bottom:12px;">🔍</div>
        <p>${displayMsg}</p>
        <button onclick="clearAllFilters()" style="margin-top:12px;padding:8px 20px;background:#8b5e3c;color:#fff;border:none;border-radius:8px;cursor:pointer;">Xóa bộ lọc</button>
      </div>`;
      return;
    }

    grid.innerHTML = hotels.map(renderHotelCard).join('');
  } catch (err) {
    grid.innerHTML = '<p style="padding:20px;color:red;grid-column:1/-1;">Lỗi kết nối server.</p>';
  }
}

function getPriceRange(val) {
  if (!val) return { minPrice: '', maxPrice: '' };
  const [min, max] = val.split('-');
  return { minPrice: min || '', maxPrice: max || '' };
}

function triggerSearch(keyword) {
  const input   = document.getElementById('searchInput');
  const priceV  = document.getElementById('priceSelect')?.value  || '';
  const ratingV = document.getElementById('ratingSelect')?.value || '';
  const kw = keyword !== undefined ? keyword : (input?.value?.trim() || '');
  const { minPrice, maxPrice } = getPriceRange(priceV);

  const params = { keyword: kw, minPrice, maxPrice, minRating: ratingV };

  if (currentPlace) {
    params.lat       = currentPlace.lat;
    params.lng       = currentPlace.lng;
    params.placeName = currentPlace.name;
    params.radius    = currentPlace.radius || PLACE_SEARCH_RADIUS;
  } else if (currentGps) {
    params.lat    = currentGps.lat;
    params.lng    = currentGps.lng;
    params.radius = currentGps.radius;
  }

  if (kw && !currentPlace && !currentGps) {
    const wardPattern = /^(phường|xã|thị trấn|tt\.?|p\.?)\s*\d+/i;
    const districtPattern = /^(quận|huyện|tp\.|thành phố|q\.?)\s*/i;
    if (wardPattern.test(kw)) {
      params.ward    = kw;
      params.keyword = '';
    } else if (districtPattern.test(kw)) {
      params.district = kw;
      params.keyword  = '';
    }
  }

  if (kw) saveSearchHistory(kw);
  searchHotels(params);
}

window.clearPlaceFilter = function() {
  currentPlace = null;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip[data-place=""]')?.classList.add('active');
  triggerSearch();
};

window.clearAreaFilter = function() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  triggerSearch('');
};

window.clearAllFilters = function() {
  document.getElementById('searchInput').value = '';
  document.getElementById('priceSelect').value = '';
  document.getElementById('ratingSelect').value = '';
  currentPlace = null;
  currentGps   = null;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip[data-place=""]')?.classList.add('active');
  triggerSearch();
};

document.addEventListener('DOMContentLoaded', () => {
  const input      = document.getElementById('searchInput');
  const searchBtn  = document.getElementById('searchBtn');
  const gpsBtn     = document.getElementById('gpsBtn');
  const priceSelect  = document.getElementById('priceSelect');
  const ratingSelect = document.getElementById('ratingSelect');

  const urlKw = new URLSearchParams(window.location.search).get('keyword') || '';
  if (urlKw) input.value = urlKw;

  triggerSearch(urlKw);

  input.addEventListener('input', () => {
    clearTimeout(acTimeout);
    const q = input.value.trim();

    if (!q) {
      acTimeout = setTimeout(async () => {
        const history = await fetchHistory();
        buildDropdown(history, 'history', '', input);
      }, 100);
      return;
    }

    acTimeout = setTimeout(async () => {
      try {
        const suggs = await fetchSuggestions(q);
        buildDropdown(suggs, 'hotel', q, input);
      } catch {}
    }, 200);
  });

  input.addEventListener('focus', async () => {
    if (!input.value.trim()) {
      const history = await fetchHistory();
      buildDropdown(history, 'history', '', input);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); navigateDropdown(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const activeItem = document.querySelector('#acDropdown .autocomplete-item.active');
      if (activeItem) {
        activeItem.click();
      } else {
        closeDropdown();
        triggerSearch();
      }
    }
    else if (e.key === 'Escape') closeDropdown();
  });

  searchBtn?.addEventListener('click', () => { closeDropdown(); triggerSearch(); });

  priceSelect?.addEventListener('change',  () => triggerSearch());
  ratingSelect?.addEventListener('change', () => triggerSearch());

  const GPS_SEARCH_RADIUS   = 10; // km — ban kinh GPS "Gan toi"
  const PLACE_SEARCH_RADIUS =  5; // km — ban kinh dia diem du lich

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const lat  = chip.dataset.lat;
      const lng  = chip.dataset.lng;
      const name = chip.dataset.place;

      if (!lat) {
        currentPlace = null;
        triggerSearch();
      } else {
        currentPlace = { name, lat: parseFloat(lat), lng: parseFloat(lng), radius: PLACE_SEARCH_RADIUS };
        input.value = '';
        closeDropdown();
        triggerSearch('');
      }
    });
  });
  gpsBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ định vị.'); return; }
    gpsBtn.textContent = '⏳ Đang lấy...';
    gpsBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        currentGps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radius: GPS_SEARCH_RADIUS
        };
        currentPlace = null;
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.chip[data-place=""]')?.classList.add('active');
        gpsBtn.textContent = `📍 Gần tôi (${GPS_SEARCH_RADIUS}km) ✓`;
        gpsBtn.disabled = false;
        triggerSearch();
      },
      () => {
        alert('Không thể lấy vị trí. Vui lòng cho phép GPS.');
        gpsBtn.textContent = '📍 Gần tôi';
        gpsBtn.disabled = false;
      }
    );
  });
});
