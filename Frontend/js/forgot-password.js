const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  if (!form) return;

  const inputs = form.querySelectorAll('input');
  const emailInput    = inputs[0];
  const otpInput      = inputs[1];
  const passwordInput = inputs[2];
  const confirmInput  = inputs[3];
  const submitBtn     = form.querySelector('button[type="submit"]');

  const emailBox = emailInput?.closest('.input-box');
  if (emailBox) {
    const sendOtpBtn = document.createElement('button');
    sendOtpBtn.type = 'button';
    sendOtpBtn.textContent = 'Gửi OTP';
    sendOtpBtn.style.cssText = 'margin-top:8px;padding:8px 16px;background:#2196F3;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;';
    emailBox.appendChild(sendOtpBtn);

    const otpMsg = document.createElement('p');
    otpMsg.style.cssText = 'font-size:13px;margin:4px 0;';
    emailBox.appendChild(otpMsg);

    let countdown = 0;

    sendOtpBtn.addEventListener('click', async () => {
      const email = emailInput?.value?.trim();
      if (!email) { otpMsg.style.color = 'red'; otpMsg.textContent = 'Vui lòng nhập email.'; return; }

      sendOtpBtn.disabled = true;
      otpMsg.style.color = '#666';
      otpMsg.textContent = '⏳ Đang gửi...';

      try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        otpMsg.style.color = 'green';
        otpMsg.textContent = data.message || 'OTP đã được gửi.';

        if (data.otp) {
          otpMsg.textContent += ` (Dev OTP: ${data.otp})`;
        }

        countdown = 60;
        const timer = setInterval(() => {
          countdown--;
          sendOtpBtn.textContent = `Gửi lại (${countdown}s)`;
          if (countdown <= 0) {
            clearInterval(timer);
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Gửi OTP';
          }
        }, 1000);
      } catch (err) {
        sendOtpBtn.disabled = false;
        otpMsg.style.color = 'red';
        otpMsg.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email       = emailInput?.value?.trim();
    const otp         = otpInput?.value?.trim();
    const newPassword = passwordInput?.value;
    const confirm     = confirmInput?.value;

    if (!email || !otp || !newPassword || !confirm) {
      alert('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirm) {
      alert('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang xử lý...';

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
      window.location.href = 'login.html';
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đặt lại mật khẩu';
      alert(err.message || 'Lỗi đặt lại mật khẩu.');
    }
  });
});
