const API_BASE = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function formatPrice(price) {
  return Number(price).toLocaleString('vi-VN');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function getStatusLabel(status) {
  const map = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', cancelled: 'Đã huỷ', completed: 'Hoàn thành' };
  return map[status] || status;
}

function getStatusClass(status) {
  const map = { pending: 'pending', confirmed: 'success', cancelled: 'cancelled', completed: 'success' };
  return map[status] || '';
}

function getAvatarSrc(avatarPath, googleAvatar) {
  if (avatarPath && avatarPath !== 'default.jpg' && avatarPath !== 'default') {
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${API_BASE.replace('/api', '')}${avatarPath}`;
  }
  if (googleAvatar && googleAvatar.startsWith('http')) return googleAvatar;
  return 'https://i.pravatar.cc/200';
}

function getHotelImgSrc(image) {
  if (!image || image === 'default_hotel.jpg') {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=100&auto=format&fit=crop';
  }
  return image.startsWith('http') ? image : `${API_BASE.replace('/api', '')}${image}`;
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error();
    const user = await res.json();

    const sidebarName  = document.getElementById('sidebarName') || document.querySelector('.profile-sidebar h2');
    const sidebarEmail = document.getElementById('sidebarEmail') || document.querySelector('.profile-sidebar p');
    const sidebarAvatar = document.getElementById('sidebarAvatar') || document.querySelector('.profile-sidebar .avatar');

    if (sidebarName)  sidebarName.textContent  = user.full_name;
    if (sidebarEmail) sidebarEmail.textContent = user.email;
    if (sidebarAvatar) {
      const src = getAvatarSrc(user.avatar, user.google_avatar);
      sidebarAvatar.src = src;
      sidebarAvatar.onerror = () => { sidebarAvatar.src = 'https://i.pravatar.cc/200'; };
    }

    const inputs = document.querySelectorAll('.profile-content .card:first-of-type input');
    if (inputs[0]) inputs[0].value = user.full_name || '';
    if (inputs[1]) inputs[1].value = user.email || '';
    if (inputs[2]) inputs[2].value = user.phone || '';

    return user;
  } catch {
    return null;
  }
}

function initAvatarUpload() {
  const avatarInput = document.getElementById('avatarUpload');
  const statusEl = document.getElementById('avatarUploadStatus');
  if (!avatarInput) return;

  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      if (statusEl) { statusEl.textContent = '❌ Ảnh tối đa 2MB'; statusEl.style.color = '#e44d26'; }
      return;
    }

    if (statusEl) { statusEl.textContent = '⏳ Đang tải ảnh...'; statusEl.style.color = '#2196F3'; }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const sidebarAvatar = document.getElementById('sidebarAvatar') || document.querySelector('.profile-sidebar .avatar');
      if (sidebarAvatar && data.user) {
        sidebarAvatar.src = getAvatarSrc(data.user.avatar, data.user.google_avatar);
      }

      const user = getUser();
      if (user && data.user) {
        user.avatar = data.user.avatar;
        localStorage.setItem('user', JSON.stringify(user));
      }

      if (statusEl) { statusEl.textContent = '✅ Cập nhật ảnh thành công!'; statusEl.style.color = 'green'; }
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
    } catch (err) {
      if (statusEl) { statusEl.textContent = '❌ ' + (err.message || 'Lỗi tải ảnh'); statusEl.style.color = '#e44d26'; }
    }

    avatarInput.value = '';
  });
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/profile/stats`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    const s0 = document.getElementById('statBookings') || document.querySelectorAll('.stat-card h3')[0];
    const s1 = document.getElementById('statFavorites') || document.querySelectorAll('.stat-card h3')[1];
    const s2 = document.getElementById('statReviews') || document.querySelectorAll('.stat-card h3')[2];
    if (s0) s0.textContent = data.bookings || 0;
    if (s1) s1.textContent = data.favorites || 0;
    if (s2) s2.textContent = data.reviews || 0;
  } catch {}
}

async function loadBookings() {
  const tbody = document.querySelector('.profile-content table tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/bookings/my`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const bookings = data.bookings || [];

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:20px;">Chưa có đặt phòng nào.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>
          <a href="hotel-detail.html?id=${b.hotel_id}" style="color:#2196F3;font-weight:500;">${b.hotel_name}</a>
        </td>
        <td>${formatDate(b.check_in)}</td>
        <td>${formatDate(b.check_out)}</td>
        <td><span class="${getStatusClass(b.status)}">${getStatusLabel(b.status)}</span></td>
        <td>${b.status === 'pending' || b.status === 'confirmed'
          ? `<button onclick="cancelBooking(${b.id})" style="background:#ff4444;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;">Huỷ</button>`
          : '—'}
        </td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;padding:10px;">Lỗi tải dữ liệu.</td></tr>';
  }
}

window.cancelBooking = async function(id) {
  if (!confirm('Bạn có chắc muốn huỷ đặt phòng này?')) return;
  try {
    const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    alert('Huỷ đặt phòng thành công.');
    loadBookings();
    loadStats();
  } catch (err) {
    alert(err.message || 'Lỗi huỷ đặt phòng.');
  }
};

async function loadFavorites() {
  const favSection = document.getElementById('favoritesSection');
  if (!favSection) return;

  try {
    const res = await fetch(`${API_BASE}/favorites`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const favorites = data.favorites || [];

    if (favorites.length === 0) {
      favSection.innerHTML = '<p style="color:#666;">Chưa có khách sạn yêu thích.</p>';
      return;
    }

    favSection.innerHTML = favorites.map(h => `
      <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #eee;padding:10px 0;">
        <img src="${getHotelImgSrc(h.image)}"
             alt="${h.name}" style="width:60px;height:50px;object-fit:cover;border-radius:6px;"
             onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=100&auto=format&fit=crop'">
        <div style="flex:1;">
          <strong>${h.name}</strong>
          <p style="margin:2px 0;font-size:13px;color:#666;">📍 ${h.district || 'Vĩnh Long'} • ⭐ ${parseFloat(h.rating||0).toFixed(1)}</p>
          <p style="margin:0;color:#e44d26;font-size:13px;">${formatPrice(h.price)}đ/đêm</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <a href="hotel-detail.html?id=${h.id}" style="font-size:12px;color:#2196F3;text-decoration:none;">Xem</a>
          <button onclick="removeFavorite(${h.id})" style="background:none;border:none;cursor:pointer;color:#ff4444;font-size:12px;">Xóa</button>
        </div>
      </div>
    `).join('');
  } catch {}
}

window.removeFavorite = async function(hotelId) {
  try {
    await fetch(`${API_BASE}/favorites/${hotelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    loadFavorites();
    loadStats();
  } catch {}
};

async function loadHotelViews() {
  const section = document.getElementById('hotelViewsSection');
  if (!section) return;

  try {
    const res = await fetch(`${API_BASE}/recommendations/hotel-views`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const views = data.views || [];

    if (views.length === 0) {
      section.innerHTML = '<p style="color:#666;">Chưa xem khách sạn nào.</p>';
      return;
    }

    section.innerHTML = views.map(v => `
      <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #eee;padding:10px 0;">
        <img src="${getHotelImgSrc(v.image)}"
             alt="${v.name}" style="width:60px;height:50px;object-fit:cover;border-radius:6px;"
             onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=100&auto=format&fit=crop'">
        <div style="flex:1;">
          <strong>${v.name}</strong>
          <p style="margin:2px 0;font-size:13px;color:#666;">📍 ${v.district || 'Vĩnh Long'} • ⭐ ${parseFloat(v.rating||0).toFixed(1)}</p>
          <p style="margin:0;color:#e44d26;font-size:13px;">${formatPrice(v.price)}đ/đêm</p>
        </div>
        <div style="text-align:right;font-size:12px;color:#888;">
          <p style="margin:0;">👁️ ${v.view_count} lần xem</p>
          <p style="margin:4px 0 0;">${formatDateTime(v.last_viewed)}</p>
          <a href="hotel-detail.html?id=${v.hotel_id}" style="color:#2196F3;text-decoration:none;">Xem lại</a>
        </div>
      </div>
    `).join('');
  } catch {
    section.innerHTML = '<p style="color:red;">Lỗi tải dữ liệu.</p>';
  }
}

async function loadSearchHistory() {
  const section = document.getElementById('searchHistorySection');
  if (!section) return;

  try {
    const res = await fetch(`${API_BASE}/recommendations/search-history`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const history = data.history || [];

    if (history.length === 0) {
      section.innerHTML = '<p style="color:#666;">Chưa có lịch sử tìm kiếm.</p>';
      return;
    }

    section.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <button id="clearSearchHistory" style="background:#ff4444;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;">
          🗑️ Xóa tất cả
        </button>
      </div>
      ${history.map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;padding:8px 4px;">
          <span style="display:flex;align-items:center;gap:8px;">
            <span style="color:#aaa;">🔍</span>
            <a href="search.html?keyword=${encodeURIComponent(item.keyword)}" style="color:#333;text-decoration:none;">${item.keyword}</a>
          </span>
          <span style="display:flex;align-items:center;gap:12px;">
            <small style="color:#aaa;">${formatDateTime(item.created_at)}</small>
            <button data-id="${item.id}" class="del-search-btn" style="background:none;border:none;cursor:pointer;color:#ccc;font-size:18px;" title="Xóa">×</button>
          </span>
        </div>
      `).join('')}
    `;

    section.querySelector('#clearSearchHistory')?.addEventListener('click', async () => {
      if (!confirm('Xóa toàn bộ lịch sử tìm kiếm?')) return;
      try {
        await fetch(`${API_BASE}/recommendations/search-history`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        section.innerHTML = '<p style="color:#666;">Chưa có lịch sử tìm kiếm.</p>';
      } catch {}
    });

    section.querySelectorAll('.del-search-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await fetch(`${API_BASE}/recommendations/search-history/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          btn.closest('div').remove();
        } catch {}
      });
    });
  } catch {
    section.innerHTML = '<p style="color:red;">Lỗi tải dữ liệu.</p>';
  }
}

function initProfileForm() {
  const form = document.querySelector('.profile-content .card:first-of-type form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = form.querySelectorAll('input');
    const full_name = inputs[0]?.value?.trim();
    const phone     = inputs[2]?.value?.trim();
    const saveBtn   = form.querySelector('button[type="submit"]');

    if (!full_name) { alert('Vui lòng nhập họ và tên.'); return; }

    const origText = saveBtn?.textContent;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Đang lưu...'; }

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ full_name, phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const user = getUser();
      if (user) { user.full_name = full_name; localStorage.setItem('user', JSON.stringify(user)); }

      alert('Cập nhật thông tin thành công.');
      loadProfile();
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật.');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = origText; }
    }
  });
}

function initMenuTabs() {
  const menuLinks = document.querySelectorAll('.profile-menu a[data-section]');
  const sectionMap = {
    'info':      () => document.getElementById('sectionInfo'),
    'bookings':  () => document.getElementById('sectionBookings'),
    'favorites': () => document.getElementById('sectionFavorites'),
    'history':   () => document.getElementById('sectionHistory'),
    'password':  () => document.getElementById('sectionPassword'),
  };

  const loadedSections = new Set(['info', 'bookings']);

  function showSection(section) {
    Object.values(sectionMap).forEach(fn => {
      const el = fn();
      if (el) el.style.display = 'none';
    });
    const statsEl = document.querySelector('.stats');
    if (statsEl) statsEl.style.display = (section === 'info' || section === 'bookings') ? '' : 'none';

    const target = sectionMap[section]?.();
    if (target) target.style.display = '';

    if (!loadedSections.has(section)) {
      loadedSections.add(section);
      if (section === 'favorites') loadFavorites();
      if (section === 'history') { loadHotelViews(); loadSearchHistory(); }
    }
  }

  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      if (section === 'logout') {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = 'index.html';
        }
        return;
      }

      menuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      showSection(section);
    });
  });

  showSection('info');
}

function initChangePassword() {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword    = document.getElementById('currentPassword')?.value;
    const newPassword        = document.getElementById('newPassword')?.value;
    const confirmNewPassword = document.getElementById('confirmNewPassword')?.value;
    const pwStatus           = document.getElementById('pwStatus');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      pwStatus.style.color = 'red'; pwStatus.textContent = 'Vui lòng điền đầy đủ thông tin.'; return;
    }
    if (newPassword !== confirmNewPassword) {
      pwStatus.style.color = 'red'; pwStatus.textContent = 'Mật khẩu xác nhận không khớp.'; return;
    }
    if (newPassword.length < 6) {
      pwStatus.style.color = 'red'; pwStatus.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.'; return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Đang xử lý...';

    try {
      const res = await fetch(`${API_BASE}/profile/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      pwStatus.style.color = 'green'; pwStatus.textContent = '✅ Đổi mật khẩu thành công!';
      form.reset();
    } catch (err) {
      pwStatus.style.color = 'red'; pwStatus.textContent = '❌ ' + (err.message || 'Lỗi đổi mật khẩu.');
    } finally {
      btn.disabled = false; btn.textContent = 'Đổi mật khẩu';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  await loadProfile();
  loadStats();
  loadBookings();
  initProfileForm();
  initAvatarUpload();
  initChangePassword();
  initMenuTabs();
});
