const _NAV_API = 'http://localhost:3000/api';

function _getToken() { return localStorage.getItem('token'); }
function _getUser()  {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}
function _setVisible(el, show) {
  if (!el) return;
  el.style.display = show ? '' : 'none';
}
function _clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function _getAvatarSrc(user) {
  if (!user) return null;
  if (user.avatar && user.avatar !== 'default.jpg' && user.avatar !== 'default') {
    return user.avatar.startsWith('http') ? user.avatar : `${_NAV_API.replace('/api','')}${user.avatar}`;
  }
  if (user.google_avatar) return user.google_avatar;
  const name = encodeURIComponent(user.full_name || 'U');
  return `https://ui-avatars.com/api/?name=${name}&background=8b5e3c&color=fff&size=40&bold=true`;
}

function _injectAvatarMenu(user) {
  const profileNav = document.getElementById('profileNav');
  if (!profileNav) return;

  const role     = (user.role || '').toLowerCase();
  const isAdmin  = role === 'admin';
  const isOwner  = ['owner', 'admin'].includes(role);
  const avatarSrc = _getAvatarSrc(user);

  if (!document.getElementById('_navDropdownStyle')) {
    const s = document.createElement('style');
    s.id = '_navDropdownStyle';
    s.textContent = `
      #navAvatarWrap { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
      #navAvatarBtn  { background:none; border:none; cursor:pointer; padding:0; display:flex; align-items:center; gap:8px; }
      #navAvatarImg  { width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid #8b5e3c; transition:.2s; }
      #navAvatarBtn:hover #navAvatarImg { border-color:#6f472d; transform:scale(1.05); }
      #navAvatarName { font-size:14px; font-weight:600; color:#3d2a1c; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #navDropdown   { display:none; position:absolute; top:calc(100% + 10px); right:0; min-width:200px; background:#fff; border:1px solid #e0e0e0; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.12); z-index:9998; overflow:hidden; }
      #navDropdown.open { display:block; animation:_dropFade .15s ease; }
      @keyframes _dropFade { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      .nav-drop-header { padding:14px 16px; border-bottom:1px solid #f0f0f0; background:#fdf6f0; }
      .nav-drop-header .ndh-name  { font-weight:700; font-size:14px; color:#3d2a1c; }
      .nav-drop-header .ndh-email { font-size:12px; color:#888; margin-top:2px; overflow:hidden; text-overflow:ellipsis; }
      .nav-drop-item  { display:flex; align-items:center; gap:10px; padding:11px 16px; font-size:14px; color:#3d2a1c; text-decoration:none; transition:.15s; border-bottom:1px solid #f8f8f8; }
      .nav-drop-item:hover { background:#f8f0e8; color:#8b5e3c; }
      .nav-drop-item.danger { color:#e44d26; }
      .nav-drop-item.danger:hover { background:#fff5f5; }
      .nav-drop-divider { height:1px; background:#f0f0f0; margin:4px 0; }
    `;
    document.head.appendChild(s);
  }

  const adminItem = isAdmin
    ? `<a class="nav-drop-item" href="admin.html">🔴 Trang Admin</a>` : '';
  const ownerItem = isOwner
    ? `<a class="nav-drop-item" href="owner.html">🏨 Quản lý KS</a>` : '';

  const wrap = document.createElement('div');
  wrap.id = 'navAvatarWrap';
  wrap.innerHTML = `
    <button id="navAvatarBtn" aria-label="Tài khoản">
      <img id="navAvatarImg" src="${avatarSrc}" alt="${user.full_name}"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name||'U')}&background=8b5e3c&color=fff&size=40'">
      <span id="navAvatarName">${user.full_name?.split(' ').pop() || 'Tài khoản'}</span>
    </button>
    <div id="navDropdown">
      <div class="nav-drop-header">
        <div class="ndh-name">${user.full_name}</div>
        <div class="ndh-email">${user.email}</div>
      </div>
      <a class="nav-drop-item" href="profile.html">👤 Hồ sơ cá nhân</a>
      <a class="nav-drop-item" href="profile.html#bookings">📋 Lịch sử đặt phòng</a>
      <a class="nav-drop-item" href="profile.html#favorites">❤️ Khách sạn yêu thích</a>
      ${ownerItem}
      ${adminItem}
      <div class="nav-drop-divider"></div>
      <a class="nav-drop-item danger" href="#" id="navLogoutBtn">🚪 Đăng xuất</a>
    </div>
  `;

  profileNav.style.display = 'none';
  profileNav.insertAdjacentElement('afterend', wrap);

  document.getElementById('navAvatarBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('navDropdown').classList.toggle('open');
  });

  document.addEventListener('click', () => {
    document.getElementById('navDropdown')?.classList.remove('open');
  });

  document.getElementById('navLogoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      _clearAuth();
      window.location.href = 'index.html';
    }
  });
}

function _showGreetingToast(name) {
  const key = '_greeted';
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px);
    background:linear-gradient(135deg,#8b5e3c,#5d3a1a); color:#fff;
    padding:14px 28px; border-radius:30px; font-size:15px; font-weight:600;
    z-index:99999; box-shadow:0 6px 20px rgba(0,0,0,0.25);
    display:flex; align-items:center; gap:10px; white-space:nowrap;
    opacity:0; transition: all 0.4s ease;
  `;
  toast.innerHTML = `<span style="font-size:20px;">👋</span> Xin chào, <strong>${name}</strong>!`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

async function bootstrapNav() {
  const adminNav   = document.getElementById('adminNav');
  const loginNav   = document.getElementById('loginNav');
  const profileNav = document.getElementById('profileNav');
  const ownerNav   = document.getElementById('ownerNav');

  const token = _getToken();

  if (!token) {
    _setVisible(loginNav,   true);
    _setVisible(profileNav, false);
    _setVisible(adminNav,   false);
    _setVisible(ownerNav,   false);
    return;
  }

  try {
    const res = await fetch(`${_NAV_API}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      _clearAuth();
      _setVisible(loginNav,   true);
      _setVisible(profileNav, false);
      _setVisible(adminNav,   false);
      _setVisible(ownerNav,   false);
      return;
    }

    const user = await res.json();
    localStorage.setItem('user', JSON.stringify(user));

    const role = (user.role || '').toLowerCase();
    _setVisible(loginNav,   false);
    _setVisible(adminNav,   false);
    _setVisible(ownerNav,   false);

    if (!document.getElementById('navAvatarWrap')) {
      _injectAvatarMenu(user);
    }

    const justLoggedIn = sessionStorage.getItem('_justLoggedIn');
    if (justLoggedIn) {
      sessionStorage.removeItem('_justLoggedIn');
      _showGreetingToast(user.full_name);
    }

  } catch {
    const user = _getUser();
    if (!user) {
      _setVisible(loginNav,   true);
      _setVisible(profileNav, false);
      _setVisible(adminNav,   false);
      _setVisible(ownerNav,   false);
      return;
    }
    _setVisible(loginNav,   false);
    _setVisible(adminNav,   false);
    _setVisible(ownerNav,   false);
    if (!document.getElementById('navAvatarWrap')) {
      _injectAvatarMenu(user);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapNav();
});
