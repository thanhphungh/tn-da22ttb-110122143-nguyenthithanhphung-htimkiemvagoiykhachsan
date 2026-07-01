import api from './api.js';

function setToken(token) { localStorage.setItem('token', token); }
function setUser(user)   { localStorage.setItem('user', JSON.stringify(user)); }

function getInputValues(form) {
  const inputs       = Array.from(form.querySelectorAll('input'));
  const emailInput   = inputs.find(i => i.type === 'email')    || inputs[0];
  const passwordInput= inputs.find(i => i.type === 'password') || inputs[1];
  return { email: emailInput?.value?.trim(), password: passwordInput?.value };
}

document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage    = document.title.toLowerCase().includes('đăng nhập');
  const isRegisterPage = document.title.toLowerCase().includes('đăng ký');

  if (isRegisterPage) return;

  if (!isLoginPage) return;

  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { email, password } = getInputValues(form);

    if (!email || !password) {
      alert('Vui lòng nhập email và mật khẩu');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang đăng nhập...'; }

    try {
      const data = await api.login({ email, password });
      setToken(data.token);
      setUser(data.user);

      sessionStorage.setItem('_justLoggedIn', '1');
      sessionStorage.removeItem('_greeted');

      const redirectUrl = localStorage.getItem('redirectAfterLogin')
        || new URLSearchParams(window.location.search).get('redirect')
        || 'index.html';
      localStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectUrl;

    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
      alert(err.message || 'Đăng nhập thất bại');
    }
  });
});
