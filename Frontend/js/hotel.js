const API_BASE = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getHotelId() {
  return new URLSearchParams(window.location.search).get('id');
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN');
}

function getImageSrc(image) {
  if (!image || image.startsWith('default')) {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop';
  }
  return image.startsWith('http') ? image : `${API_BASE.replace('/api', '')}${image}`;
}

async function loadHotel(id) {
  try {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/hotels/${id}`, { headers });
    if (!res.ok) throw new Error('Không tìm thấy khách sạn.');
    const data = await res.json();
    const hotel  = data.hotel;
    const images = data.images || [];
    const rooms  = data.rooms  || [];
    const reviews = data.reviews || [];
    const stats  = data.stats  || {};

    document.title = `${hotel.name} - VinhLong Hotel`;
    document.getElementById('hotelName').textContent    = hotel.name;
    document.getElementById('hotelAddress').textContent = `📍 ${hotel.address || hotel.district}`;
    document.getElementById('hotelRating').textContent  = parseFloat(hotel.rating || 0).toFixed(1);
    document.getElementById('hotelPrice').textContent   = formatPrice(hotel.price);
    document.getElementById('hotelDescription').textContent = hotel.description
      || 'Khách sạn tọa lạc tại vị trí thuận tiện, gần các điểm tham quan và trung tâm thành phố Vĩnh Long.';

    const starsEl = document.getElementById('hotelStars');
    if (starsEl && hotel.star) starsEl.textContent = '⭐'.repeat(Math.min(hotel.star, 5));

    const reviewCountEl = document.getElementById('hotelReviewCount');
    if (reviewCountEl) reviewCountEl.textContent = `(${hotel.total_reviews || reviews.length} đánh giá)`;

    const statViews     = document.getElementById('statViews');
    const statFavorites = document.getElementById('statFavorites');
    const statRooms     = document.getElementById('statRooms');
    if (statViews)     statViews.textContent     = (stats.totalViews     || 0).toLocaleString('vi-VN');
    if (statFavorites) statFavorites.textContent = (stats.totalFavorites || 0).toLocaleString('vi-VN');
    if (statRooms) {
      const count = stats.availableRooms || 0;
      statRooms.textContent = count;
      if (count === 0) {
        statRooms.parentElement.style.color = '#e44d26';
        statRooms.parentElement.innerHTML = '�� <span>Hết phòng</span>';
      }
    }

    const mainImg = document.getElementById('hotelImage');
    if (mainImg) {
      mainImg.src = getImageSrc(hotel.image);
      mainImg.alt = hotel.name;
      mainImg.onerror = () => {
        mainImg.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop';
      };
    }

    const bookBtn = document.getElementById('bookBtn');
    if (bookBtn) {
      const avail = Number(stats.availableRooms ?? -1);
      const isFullyBooked = rooms.length > 0 && avail === 0;

      if (isFullyBooked) {
        bookBtn.disabled = true;
        bookBtn.textContent = '�� Hết phòng trống';
        bookBtn.style.cssText = 'width:100%;padding:12px;background:#9e9e9e;color:#fff;border:none;border-radius:8px;cursor:not-allowed;font-size:15px;font-weight:bold;';
        const msg = document.createElement('p');
        msg.style.cssText = 'color:#e44d26;font-size:13px;margin-top:8px;padding:10px 14px;background:#fff3cd;border-radius:8px;border-left:4px solid #e44d26;';
        msg.textContent = '⚠️ Khách sạn hiện không còn phòng trống. Vui lòng quay lại sau hoặc chọn khách sạn khác.';
        bookBtn.parentElement.insertAdjacentElement('afterend', msg);
      } else {
        injectRoomSelector(rooms, hotel.price, id, token);
      }
    }

    const directionsBtn = document.getElementById('directionsBtn');
    if (directionsBtn && hotel.latitude && hotel.longitude) {
      directionsBtn.addEventListener('click', () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}&travelmode=driving`;
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });
    } else if (directionsBtn) {
      directionsBtn.style.display = 'none';
    }

    if (token) {
      checkFavorite(id);
    } else {
      const favBtn = document.getElementById('favoriteBtn');
      if (favBtn) favBtn.onclick = () => { window.location.href = 'login.html'; };
    }

    renderGallery(images, hotel.image);
    renderRooms(rooms, hotel.price, id, token);
    renderReviews(reviews, hotel.total_reviews, hotel.rating, id);
    renderServices(hotel.services);

  } catch (err) {
    document.getElementById('hotelName').textContent        = 'Lỗi tải dữ liệu';
    document.getElementById('hotelDescription').textContent = err.message;
  }
}

function renderGallery(images, mainImage) {
  const gallery = document.getElementById('hotelGallery');
  if (!gallery) return;

  const allImages = [];
  if (mainImage && !mainImage.startsWith('default')) allImages.push(mainImage);
  images.forEach(img => { if (img.image_url) allImages.push(img.image_url); });

  if (allImages.length <= 1) { gallery.style.display = 'none'; return; }

  gallery.innerHTML = allImages.map(url =>
    `<img src="${getImageSrc(url)}" alt="Ảnh khách sạn" style="width:80px;height:60px;object-fit:cover;cursor:pointer;border-radius:4px;border:2px solid transparent;"
         onclick="document.getElementById('hotelImage').src=this.src"
         onerror="this.style.display='none'">`
  ).join('');
}

function renderServices(services) {
  const el = document.getElementById('hotelServices');
  if (!el || !services) return;

  let raw = services;
  try { raw = decodeURIComponent(services); } catch {}

  const list = raw.split(',').map(s => s.trim()).filter(s => s && !/^\?+$/.test(s));
  if (list.length === 0) { el.style.display = 'none'; return; }

  const icons = {
    'WiFi miễn phí': '📶', 'Hồ bơi': '🏊', 'Nhà hàng': '🍽️',
    'Bãi đỗ xe': '🅿️', 'Điều hòa': '❄️', 'Dịch vụ phòng': '🛎️',
    'Phòng gym': '💪', 'Spa': '💆', 'Giặt ủi': '👕',
    'Đưa đón sân bay': '✈️', 'Lễ tân 24/7': '🕐', 'Bar': '🍹',
    'Phòng họp': '🏢', 'Tủ lạnh': '🧊', 'Truyền hình cáp': '📺'
  };

  el.innerHTML = `
    <h3 style="margin-bottom:10px;">Tiện ích</h3>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${list.map(s => {
        const icon = icons[s] || '✓';
        return `<span style="background:#e8f4fd;padding:5px 12px;border-radius:20px;font-size:13px;color:#1565c0;">${icon} ${s}</span>`;
      }).join('')}
    </div>`;
}

function renderRooms(rooms, basePrice, hotelId, token) {
  const el = document.getElementById('hotelRooms');
  if (!el) return;
  if (rooms.length === 0) {
    el.innerHTML = `<h3 style="margin-bottom:8px;">Phòng</h3>
      <p style="color:#666;padding:12px;background:#f8f9fa;border-radius:8px;">
        Liên hệ khách sạn để biết thông tin phòng.
      </p>`;
    return;
  }

  const bookAction = (roomId, qty) => {
    if (qty <= 0) return `disabled style="margin-top:6px;padding:7px 16px;background:#9e9e9e;color:white;border:none;border-radius:6px;cursor:not-allowed;font-size:13px;" title="Hết phòng"`;
    if (!token) return `onclick="localStorage.setItem('redirectAfterLogin','booking.html?id=${hotelId}&room=${roomId}');window.location.href='login.html'" style="margin-top:6px;padding:7px 16px;background:#2196F3;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;"`;
    return `onclick="window.location.href='booking.html?id=${hotelId}&room=${roomId}'" style="margin-top:6px;padding:7px 16px;background:#2196F3;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;"`;
  };

  el.innerHTML = `<h3 style="margin-bottom:12px;">Phòng (${rooms.length} loại)</h3>
    <div style="display:grid;gap:12px;">
    ${rooms.map(r => {
      const qty = Number(r.quantity) || 0;
      const isFull = qty <= 0;
      return `
      <div style="border:1px solid ${isFull ? '#ffcdd2' : '#e0e0e0'};border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;background:${isFull ? '#fff8f8' : '#fff'}">
        <div style="flex:1;">
          <strong style="font-size:15px;">${r.room_name || 'Phòng tiêu chuẩn'}</strong>
          <div style="font-size:13px;color:#666;margin:4px 0;">
            ${r.room_type ? `🏷️ ${r.room_type}` : ''}
            ${r.max_people ? `&nbsp;·&nbsp; 👤 Tối đa ${r.max_people} người` : ''}
          </div>
          <div style="font-size:13px;margin:2px 0;">
            ${isFull
              ? `<span style="color:#e44d26;font-weight:600;">😔 Hết phòng</span>`
              : `<span style="color:#2e7d32;font-weight:600;">✅ Còn ${qty} phòng</span>`
            }
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <p style="font-weight:bold;color:#e44d26;font-size:15px;">${formatPrice(r.price || basePrice)}đ/đêm</p>
          <button ${bookAction(r.id, qty)}>
            ${isFull ? '😔 Hết phòng' : (token ? 'Đặt phòng' : '🔒 Đặt phòng')}
          </button>
        </div>
      </div>`;
    }).join('')}
    </div>`;
}

function renderReviews(reviews, total, avgRating, hotelId) {
  const el = document.getElementById('hotelReviews');
  if (!el) return;

  const ratingBar = (count, maxCount) => {
    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    return `<div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:#f5a623;border-radius:3px;"></div>
    </div>`;
  };

  const dist = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
  const maxDist = Math.max(...dist, 1);

  const reviewsHtml = reviews.length === 0
    ? '<p style="color:#666;padding:12px 0;">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!</p>'
    : reviews.map(r => {
        const avatarSrc = r.avatar && !r.avatar.startsWith('default')
          ? (r.avatar.startsWith('http') ? r.avatar : `${API_BASE.replace('/api', '')}${r.avatar}`)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name)}&background=2196F3&color=fff&size=40`;
        return `
          <div style="border-bottom:1px solid #eee;padding:14px 0;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <img src="${avatarSrc}" alt="${r.full_name}"
                style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;"
                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name)}&background=2196F3&color=fff&size=40'">
              <div>
                <strong style="display:block;">${r.full_name}</strong>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="color:#f5a623;">${'⭐'.repeat(r.rating)}</span>
                  <small style="color:#aaa;">${new Date(r.created_at).toLocaleDateString('vi-VN')}</small>
                </div>
              </div>
            </div>
            ${r.comment ? `<p style="margin:0;color:#555;line-height:1.6;">${r.comment}</p>` : ''}
          </div>
        `;
      }).join('');

  el.innerHTML = `
    <div style="border-top:2px solid #eee;padding-top:24px;">
      <h3 style="margin-bottom:16px;font-size:20px;">Đánh giá khách hàng</h3>
      <div style="display:flex;gap:24px;align-items:flex-start;padding:16px;background:#f8f9fa;border-radius:10px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="text-align:center;min-width:80px;">
          <div style="font-size:52px;font-weight:bold;color:#e44d26;line-height:1;">${parseFloat(avgRating || 0).toFixed(1)}</div>
          <div style="color:#f5a623;font-size:18px;">${'⭐'.repeat(Math.round(avgRating || 0))}</div>
          <div style="color:#888;font-size:12px;margin-top:4px;">${total || reviews.length} đánh giá</div>
        </div>
        <div style="flex:1;min-width:180px;">
          ${[5,4,3,2,1].map(star => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:12px;color:#888;width:32px;">${star} ⭐</span>
              ${ratingBar(dist[star-1], maxDist)}
              <span style="font-size:12px;color:#888;width:20px;">${dist[star-1]}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div id="allReviewsContainer">
        ${reviewsHtml}
      </div>
      ${reviews.length >= 10 ? `
        <button id="loadMoreReviews" data-offset="10" data-hotel="${hotelId}"
          style="display:block;width:100%;margin-top:16px;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;cursor:pointer;color:#555;font-size:14px;">
          Xem thêm đánh giá
        </button>
      ` : ''}
      ${getToken() ? renderRatingForm() : `
        <div style="margin-top:20px;padding:16px;background:#fff3cd;border-radius:8px;border-left:4px solid #f5a623;">
          <a href="login.html" style="color:#2196F3;font-weight:bold;">Đăng nhập</a> để đánh giá khách sạn này.
        </div>
      `}
    </div>
  `;

  const ratingForm = document.getElementById('ratingForm');
  if (ratingForm) {
    ratingForm.addEventListener('submit', (e) => submitRating(e, hotelId || getHotelId()));
  }

  document.getElementById('loadMoreReviews')?.addEventListener('click', async function() {
    const btn = this;
    const offset = parseInt(btn.dataset.offset);
    const hid = btn.dataset.hotel;
    btn.textContent = '⏳ Đang tải...';
    btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/ratings/${hid}?offset=${offset}&limit=10`);
      const data = await res.json();
      const moreReviews = data.reviews || [];
      if (moreReviews.length === 0) { btn.remove(); return; }
      const container = document.getElementById('allReviewsContainer');
      if (container) {
        container.insertAdjacentHTML('beforeend', moreReviews.map(r => {
          const avatarSrc = r.avatar && !r.avatar.startsWith('default')
            ? (r.avatar.startsWith('http') ? r.avatar : `${API_BASE.replace('/api', '')}${r.avatar}`)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name)}&background=2196F3&color=fff&size=40`;
          return `
            <div style="border-bottom:1px solid #eee;padding:14px 0;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <img src="${avatarSrc}" alt="${r.full_name}"
                  style="width:40px;height:40px;border-radius:50%;object-fit:cover;"
                  onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name)}&background=2196F3&color=fff&size=40'">
                <div>
                  <strong>${r.full_name}</strong>
                  <div><span style="color:#f5a623;">${'⭐'.repeat(r.rating)}</span>
                  <small style="color:#aaa;margin-left:6px;">${new Date(r.created_at).toLocaleDateString('vi-VN')}</small></div>
                </div>
              </div>
              ${r.comment ? `<p style="margin:0;color:#555;">${r.comment}</p>` : ''}
            </div>`;
        }).join(''));
      }
      btn.dataset.offset = offset + moreReviews.length;
      if (moreReviews.length < 10) { btn.remove(); } else {
        btn.textContent = 'Xem thêm đánh giá'; btn.disabled = false;
      }
    } catch { btn.textContent = 'Xem thêm đánh giá'; btn.disabled = false; }
  });
}

function renderRatingForm() {
  return `
    <div style="margin-top:16px;padding:16px;background:#f8f9fa;border-radius:8px;">
      <h4 style="margin:0 0 12px;">Viết đánh giá của bạn</h4>
      <form id="ratingForm">
        <div style="margin-bottom:10px;">
          <label style="display:block;margin-bottom:4px;font-size:14px;">Điểm đánh giá:</label>
          <select id="ratingScore" required style="padding:8px;border:1px solid #ddd;border-radius:4px;width:100%;">
            <option value="">-- Chọn điểm --</option>
            <option value="5">⭐⭐⭐⭐⭐ Xuất sắc</option>
            <option value="4">⭐⭐⭐⭐ Tốt</option>
            <option value="3">⭐⭐⭐ Trung bình</option>
            <option value="2">⭐⭐ Kém</option>
            <option value="1">⭐ Rất kém</option>
          </select>
        </div>
        <div style="margin-bottom:10px;">
          <label style="display:block;margin-bottom:4px;font-size:14px;">Nhận xét:</label>
          <textarea id="ratingComment" rows="3" placeholder="Chia sẻ trải nghiệm của bạn..."
            style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;resize:vertical;box-sizing:border-box;"></textarea>
        </div>
        <button type="submit" style="background:#2196F3;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:14px;">
          Gửi đánh giá
        </button>
        <span id="ratingStatus" style="margin-left:12px;font-size:13px;"></span>
      </form>
    </div>
  `;
}

async function submitRating(e, hotelId) {
  e.preventDefault();
  const rating = document.getElementById('ratingScore')?.value;
  const comment = document.getElementById('ratingComment')?.value;
  const statusEl = document.getElementById('ratingStatus');

  if (!rating) { alert('Vui lòng chọn điểm đánh giá.'); return; }

  try {
    const res = await fetch(`${API_BASE}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ hotel_id: Number(hotelId), rating: Number(rating), comment })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (statusEl) statusEl.textContent = '✅ Đánh giá thành công!';
    setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    if (statusEl) statusEl.textContent = '❌ ' + (err.message || 'Lỗi gửi đánh giá.');
  }
}

function injectRoomSelector(rooms, basePrice, hotelId, token) {
  const actionsDiv = document.querySelector('.actions');
  if (!actionsDiv) return;

  const bookBtn = document.getElementById('bookBtn');
  if (bookBtn) bookBtn.parentElement.style.display = 'none';

  const panel = document.createElement('div');
  panel.id = 'roomSelectorPanel';
  panel.style.cssText = 'background:#f8f9fa;border:1px solid #e0e0e0;border-radius:12px;padding:18px;margin-bottom:12px;';

  const roomOptions = rooms.length > 0
    ? rooms.map((r, i) => {
        const qty = Number(r.quantity) || 0;
        return qty > 0
          ? `<option value="${r.id}" data-price="${r.price || basePrice}" data-max="${qty}">
              ${r.room_name || 'Phòng tiêu chuẩn'} — ${formatPrice(r.price || basePrice)}đ/đêm (còn ${qty})
             </option>`
          : `<option value="${r.id}" data-price="${r.price || basePrice}" data-max="0" disabled>
              ${r.room_name || 'Phòng tiêu chuẩn'} — Hết phòng
             </option>`;
      }).join('')
    : `<option value="default" data-price="${basePrice}" data-max="99">Phòng tiêu chuẩn — ${formatPrice(basePrice)}đ/đêm</option>`;

  panel.innerHTML = `
    <h4 style="margin:0 0 14px;font-size:15px;color:#3d2a1c;">🛏️ Chọn phòng</h4>
    <div style="margin-bottom:12px;">
      <label style="display:block;font-size:13px;font-weight:600;color:#555;margin-bottom:5px;">Loại phòng</label>
      <select id="roomTypeSelect" style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;outline:none;">
        ${roomOptions}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#555;margin-bottom:5px;">Số phòng</label>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" id="qtyMinus" style="width:34px;height:34px;border:1.5px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">−</button>
          <span id="qtyDisplay" style="font-size:16px;font-weight:bold;min-width:28px;text-align:center;">1</span>
          <button type="button" id="qtyPlus"  style="width:34px;height:34px;border:1.5px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">+</button>
        </div>
      </div>
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#555;margin-bottom:5px;">Số đêm</label>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" id="nightsMinus" style="width:34px;height:34px;border:1.5px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:18px;">−</button>
          <span id="nightsDisplay" style="font-size:16px;font-weight:bold;min-width:28px;text-align:center;">1</span>
          <button type="button" id="nightsPlus"  style="width:34px;height:34px;border:1.5px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:18px;">+</button>
        </div>
      </div>
    </div>
    <div style="background:#fff;border:2px solid #e44d26;border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;color:#666;">Tổng tiền ước tính:</span>
      <span id="totalPriceDisplay" style="font-size:20px;font-weight:bold;color:#e44d26;">—</span>
    </div>
    <button id="confirmBookBtn"
      style="width:100%;padding:12px;background:#2196F3;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;">
      ��️ Đặt phòng ngay
    </button>
  `;

  actionsDiv.insertAdjacentElement('beforebegin', panel);

  let qty = 1, nights = 1;

  function getSelectedRoom() {
    const sel = document.getElementById('roomTypeSelect');
    const opt = sel?.options[sel.selectedIndex];
    return {
      id:    sel?.value,
      price: parseFloat(opt?.dataset.price) || basePrice,
      max:   parseInt(opt?.dataset.max) || 99
    };
  }

  function updateTotal() {
    const room = getSelectedRoom();
    const total = room.price * qty * nights;
    const el = document.getElementById('totalPriceDisplay');
    if (el) el.textContent = formatPrice(total) + 'đ';
    const confirmBtn = document.getElementById('confirmBookBtn');
    if (confirmBtn) {
      if (qty > room.max) {
        confirmBtn.disabled = true;
        confirmBtn.style.background = '#9e9e9e';
        confirmBtn.textContent = `Chỉ còn ${room.max} phòng`;
      } else {
        confirmBtn.disabled = false;
        confirmBtn.style.background = '#2196F3';
        confirmBtn.textContent = '🛏️ Đặt phòng ngay';
      }
    }
  }

  document.getElementById('roomTypeSelect')?.addEventListener('change', () => {
    qty = 1;
    document.getElementById('qtyDisplay').textContent = 1;
    updateTotal();
  });

  document.getElementById('qtyMinus')?.addEventListener('click', () => {
    if (qty > 1) { qty--; document.getElementById('qtyDisplay').textContent = qty; updateTotal(); }
  });
  document.getElementById('qtyPlus')?.addEventListener('click', () => {
    const max = getSelectedRoom().max;
    if (qty < max) { qty++; document.getElementById('qtyDisplay').textContent = qty; updateTotal(); }
  });
  document.getElementById('nightsMinus')?.addEventListener('click', () => {
    if (nights > 1) { nights--; document.getElementById('nightsDisplay').textContent = nights; updateTotal(); }
  });
  document.getElementById('nightsPlus')?.addEventListener('click', () => {
    nights++; document.getElementById('nightsDisplay').textContent = nights; updateTotal();
  });

  document.getElementById('confirmBookBtn')?.addEventListener('click', () => {
    if (!token) {
      const room = getSelectedRoom();
      localStorage.setItem('redirectAfterLogin', `booking.html?id=${hotelId}&room=${room.id}&qty=${qty}&nights=${nights}`);
      window.location.href = `login.html?redirect=${encodeURIComponent(`booking.html?id=${hotelId}`)}`;
      return;
    }
    const room = getSelectedRoom();
    window.location.href = `booking.html?id=${hotelId}&room=${room.id}&qty=${qty}&nights=${nights}`;
  });

  updateTotal();
}

async function checkFavorite(hotelId) {
  const favBtn = document.getElementById('favoriteBtn');
  if (!favBtn) return;

  try {
    const res = await fetch(`${API_BASE}/favorites/check/${hotelId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    favBtn.textContent = data.isFavorite ? '❤️ Đã yêu thích' : '🤍 Yêu thích';
    favBtn.dataset.fav = data.isFavorite ? '1' : '0';
  } catch {}

  favBtn.addEventListener('click', () => toggleFavorite(hotelId, favBtn));
}

async function toggleFavorite(hotelId, btn) {
  const isFav = btn.dataset.fav === '1';
  try {
    const res = await fetch(`${API_BASE}/favorites${isFav ? '/' + hotelId : ''}`, {
      method: isFav ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: isFav ? undefined : JSON.stringify({ hotel_id: Number(hotelId) })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    btn.dataset.fav = isFav ? '0' : '1';
    btn.textContent = isFav ? '🤍 Yêu thích' : '❤️ Đã yêu thích';
  } catch (err) {
    alert(err.message || 'Lỗi thao tác.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const id = getHotelId();
  if (!id) {
    document.getElementById('hotelName').textContent = 'Không tìm thấy khách sạn';
    document.getElementById('hotelDescription').textContent = 'Vui lòng quay lại trang tìm kiếm.';
    return;
  }
  loadHotel(id);
});
