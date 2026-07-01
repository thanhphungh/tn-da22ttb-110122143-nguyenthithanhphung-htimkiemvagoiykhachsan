const API_BASE = 'http://localhost:3000/api';

function getToken() { return localStorage.getItem('token'); }
function getHotelId() { return new URLSearchParams(window.location.search).get('id'); }
function formatPrice(p) { return Number(p).toLocaleString('vi-VN'); }

async function loadHotelInfo(id) {
  const nameEl = document.getElementById('hotelName');
  const urlParams = new URLSearchParams(window.location.search);
  const preQty    = parseInt(urlParams.get('qty'))    || 1;
  const preNights = parseInt(urlParams.get('nights')) || 1;

  try {
    const res  = await fetch(`${API_BASE}/hotels/${id}`);
    const data = await res.json();
    const hotel = data.hotel;
    const rooms = data.rooms || [];

    if (nameEl) nameEl.textContent = hotel.name;

    const checkIn  = document.getElementById('checkIn');
    const checkOut = document.getElementById('checkOut');
    const roomsSel = document.getElementById('totalRooms');
    const total    = document.getElementById('totalPrice');

    if (roomsSel) roomsSel.value = preQty;

    const today = new Date();
    if (preNights > 1 && checkIn && checkOut && !checkIn.value) {
      const inDate  = new Date(today);
      const outDate = new Date(today);
      outDate.setDate(outDate.getDate() + preNights);
      checkIn.value  = inDate.toISOString().split('T')[0];
      checkOut.value = outDate.toISOString().split('T')[0];
    }

    function calcPrice() {
      if (!checkIn?.value || !checkOut?.value) return;
      const n = Math.max(1, Math.round(
        (new Date(checkOut.value) - new Date(checkIn.value)) / (1000*60*60*24)
      ));
      if (n <= 0) { alert('Ngày trả phải sau ngày nhận.'); return; }
      const r = parseInt(roomsSel?.value) || 1;
      if (total) total.value = hotel.price * r * n;
    }

    checkIn?.addEventListener('change',  calcPrice);
    checkOut?.addEventListener('change', calcPrice);
    roomsSel?.addEventListener('change', calcPrice);
    calcPrice();

    return hotel;
  } catch {
    if (nameEl) nameEl.textContent = 'Không tìm thấy khách sạn';
    return null;
  }
}

async function submitBooking(hotelId) {
  const token = getToken();
  if (!token) {
    alert('Vui lòng đăng nhập để đặt phòng.');
    window.location.href = 'login.html';
    return;
  }

  const checkIn    = document.getElementById('checkIn')?.value;
  const checkOut   = document.getElementById('checkOut')?.value;
  const totalRooms = parseInt(document.getElementById('totalRooms')?.value) || 1;
  const totalPrice = parseFloat(document.getElementById('totalPrice')?.value) || 0;
  const statusEl   = document.getElementById('status');
  const bookBtn    = document.getElementById('bookBtn');

  if (!checkIn || !checkOut) {
    statusEl.textContent = '❌ Vui lòng chọn ngày nhận và ngày trả phòng.';
    statusEl.style.color = 'red'; return;
  }
  if (new Date(checkOut) <= new Date(checkIn)) {
    statusEl.textContent = '❌ Ngày trả phòng phải sau ngày nhận phòng.';
    statusEl.style.color = 'red'; return;
  }

  bookBtn.disabled = true; bookBtn.textContent = '⏳ Đang xử lý...';

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
      body: JSON.stringify({
        hotel_id:    Number(hotelId),
        check_in:    checkIn,
        check_out:   checkOut,
        total_price: totalPrice,
        total_rooms: totalRooms
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    statusEl.style.color = 'green';
    statusEl.textContent = `✅ Đặt phòng thành công! Mã #${data.booking_id}. Tổng: ${formatPrice(data.total_price)}đ`;
    bookBtn.textContent = '✅ Đã đặt phòng';
    setTimeout(() => { window.location.href = 'profile.html'; }, 2500);
  } catch (err) {
    bookBtn.disabled = false; bookBtn.textContent = 'Xác nhận đặt phòng';
    statusEl.style.color = 'red';
    statusEl.textContent = '❌ ' + (err.message || 'Đặt phòng thất bại.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const id = getHotelId();
  const bookBtn = document.getElementById('bookBtn');
  if (!id) { document.getElementById('hotelName').textContent = 'Không tìm thấy khách sạn'; if (bookBtn) bookBtn.disabled=true; return; }

  const today = new Date().toISOString().split('T')[0];
  const ci = document.getElementById('checkIn');
  const co = document.getElementById('checkOut');
  if (ci) ci.min = today;
  if (co) co.min = today;

  await loadHotelInfo(id);
  bookBtn?.addEventListener('click', () => submitBooking(id));
});
