(function() {
  var token = localStorage.getItem('token');
  var user  = null;
  try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) {}

  var loginNav   = document.getElementById('loginNav');
  var profileNav = document.getElementById('profileNav');
  var adminNav   = document.getElementById('adminNav');
  var ownerNav   = document.getElementById('ownerNav');

  if (token && user) {
    if (loginNav)   loginNav.style.display   = 'none';
    if (profileNav) profileNav.style.display = '';
    if (adminNav)   adminNav.style.display   = (user.role === 'admin') ? '' : 'none';
    if (ownerNav)   ownerNav.style.display   = (['owner','admin'].indexOf(user.role) >= 0) ? '' : 'none';
  } else {
    if (loginNav)   loginNav.style.display   = '';
    if (profileNav) profileNav.style.display = 'none';
    if (adminNav)   adminNav.style.display   = 'none';
    if (ownerNav)   ownerNav.style.display   = 'none';
  }
})();
