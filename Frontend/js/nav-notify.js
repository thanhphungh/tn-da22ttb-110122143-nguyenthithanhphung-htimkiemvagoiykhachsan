const NOTIFY_API = 'http://localhost:3000/api';
let _notifyOpen   = false;
let _notifyTimer  = null;

function _getToken() { return localStorage.getItem('token'); }

function injectNotifyBell() {
  const token = _getToken();
  if (!token) return;

  const navbar = document.querySelector('.navbar');
  if (!navbar || document.getElementById('notifyBell')) return;

  const wrap = document.createElement('div');
  wrap.id    = 'notifyWrap';
  wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

  wrap.innerHTML = `
    <button id="notifyBell" title="Thông báo"
      style="background:none;border:none;cursor:pointer;font-size:20px;position:relative;padding:4px 8px;color:#3d2a1c;">
      🔔
      <span id="notifyBadge" style="display:none;position:absolute;top:0;right:0;background:#e44d26;color:#fff;font-size:10px;font-weight:bold;border-radius:50%;min-width:16px;height:16px;line-height:16px;text-align:center;padding:0 3px;"></span>
    </button>
    <div id="notifyDropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;width:340px;max-height:420px;background:#fff;border:1px solid #e0e0e0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:9999;overflow:hidden;">
      <div style="padding:12px 16px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:15px;">🔔 Thông báo</strong>
        <button id="markAllRead" style="background:none;border:none;cursor:pointer;color:#2196F3;font-size:12px;">Đọc tất cả</button>
      </div>
      <div id="notifyList" style="max-height:340px;overflow-y:auto;"></div>
    </div>
  `;

  const loginNav = document.getElementById('loginNav');
  if (loginNav) navbar.insertBefore(wrap, loginNav);
  else navbar.appendChild(wrap);

  document.getElementById('notifyBell').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotify();
  });
  document.getElementById('markAllRead').addEventListener('click', (e) => {
    e.stopPropagation();
    markAllRead();
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeNotify();
  });

  loadNotifications();

  _notifyTimer = setInterval(loadNotifications, 30000);
}

function toggleNotify() {
  _notifyOpen = !_notifyOpen;
  document.getElementById('notifyDropdown').style.display = _notifyOpen ? '' : 'none';
  if (_notifyOpen) loadNotifications();
}

function closeNotify() {
  _notifyOpen = false;
  const d = document.getElementById('notifyDropdown');
  if (d) d.style.display = 'none';
}

async function loadNotifications() {
  const token = _getToken();
  if (!token) return;
  try {
    const res  = await fetch(`${NOTIFY_API}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    const badge = document.getElementById('notifyBadge');
    if (badge) {
      if (data.unread > 0) {
        badge.style.display = '';
        badge.textContent   = data.unread > 99 ? '99+' : data.unread;
      } else {
        badge.style.display = 'none';
      }
    }

    const list = document.getElementById('notifyList');
    if (!list) return;

    const items = data.notifications || [];
    if (items.length === 0) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:#999;font-size:14px;">Chưa có thông báo nào.</div>';
      return;
    }

    list.innerHTML = items.map(n => `
      <div class="notify-item" data-id="${n.id}"
        style="padding:12px 16px;border-bottom:1px solid #f5f5f5;cursor:pointer;background:${n.is_read ? '#fff' : '#f0f7ff'};transition:background .2s;"
        onmouseenter="this.style.background='#f8f9ff'"
        onmouseleave="this.style.background='${n.is_read ? '#fff' : '#f0f7ff'}'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:${n.is_read ? '400' : '700'};color:#333;margin-bottom:4px;">${n.title}</div>
            <div style="font-size:12px;color:#666;line-height:1.5;">${n.content}</div>
            <div style="font-size:11px;color:#aaa;margin-top:4px;">${new Date(n.created_at).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})}</div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            ${!n.is_read ? `<span style="width:8px;height:8px;border-radius:50%;background:#2196F3;display:inline-block;flex-shrink:0;"></span>` : ''}
            <button onclick="deleteNotify(${n.id},event)"
              style="background:none;border:none;cursor:pointer;color:#ccc;font-size:16px;padding:0;line-height:1;" title="Xóa">×</button>
          </div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.notify-item').forEach(item => {
      item.addEventListener('click', () => markRead(Number(item.dataset.id)));
    });

  } catch {}
}

async function markRead(id) {
  const token = _getToken();
  if (!token) return;
  try {
    await fetch(`${NOTIFY_API}/notifications/${id}/read`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
    });
    loadNotifications();
  } catch {}
}

async function markAllRead() {
  const token = _getToken();
  if (!token) return;
  try {
    await fetch(`${NOTIFY_API}/notifications/read-all`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
    });
    loadNotifications();
  } catch {}
}

window.deleteNotify = async function(id, e) {
  e.stopPropagation();
  const token = _getToken();
  if (!token) return;
  try {
    await fetch(`${NOTIFY_API}/notifications/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    });
    loadNotifications();
  } catch {}
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(injectNotifyBell, 100);
});
