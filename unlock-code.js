(function () {
  var CODE = 'FPV-KING-360';

  function unlockAll() {
    try {
      var raw = localStorage.getItem('fpv_profile_v2');
      if (raw) {
        var st = JSON.parse(raw);
        if (st.accounts) {
          Object.keys(st.accounts).forEach(function (k) {
            var g = st.accounts[k].game;
            if (g) {
              g.isAdmin = true;
              g.level = 99;
              g.unlocked = {
                body: ['standard', 'slim', 'wide', 'whoop'],
                cams: ['none', 'fpv', 'action'],
                stickers: ['none', 'stripe', 'x', 'number'],
                extras: ['none', 'antenna', 'ledbar', 'keychain']
              };
            }
          });
          localStorage.setItem('fpv_profile_v2', JSON.stringify(st));
        }
      }
      localStorage.setItem('fpv_unlock_all', '1');
      window.__FPV_UNLOCKED = true;
      window.FPVProfile = window.FPVProfile || {};
      window.FPVProfile.isUnlocked = function () { return true; };
      window.FPVProfile.requiredLevel = function () { return 1; };
      return true;
    } catch (e) {
      localStorage.setItem('fpv_unlock_all', '1');
      window.__FPV_UNLOCKED = true;
      return true;
    }
  }

  if (localStorage.getItem('fpv_unlock_all') === '1') {
    setTimeout(function () {
      window.FPVProfile = window.FPVProfile || {};
      window.FPVProfile.isUnlocked = function () { return true; };
      window.FPVProfile.requiredLevel = function () { return 1; };
    }, 800);
  }

  function inject() {
    var menu = document.getElementById('main-menu');
    if (!menu || document.getElementById('unlock-zone')) return;
    var panel = menu.querySelector('.menu-panel');
    if (!panel) return;

    var zone = document.createElement('div');
    zone.id = 'unlock-zone';
    zone.style.cssText = 'margin-top:14px;padding-top:10px;border-top:1px solid rgba(0,255,100,0.15)';
    zone.innerHTML =
      '<div style="font-size:11px;opacity:0.55;margin-bottom:6px;font-family:monospace">CODIGO</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<input id="unlock-input" type="text" maxlength="24" placeholder="Digite o codigo" ' +
      'style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid rgba(0,255,120,0.3);' +
      'background:rgba(0,0,0,0.45);color:#0f8;font-family:monospace;font-size:13px;outline:none;text-transform:uppercase" />' +
      '<button id="unlock-btn" type="button" class="menu-btn secondary" style="width:auto;margin:0;padding:10px 14px;font-size:12px">OK</button>' +
      '</div>' +
      '<div id="unlock-msg" style="font-size:11px;min-height:16px;margin-top:6px;font-family:monospace"></div>';
    panel.appendChild(zone);

    var input = document.getElementById('unlock-input');
    var btn = document.getElementById('unlock-btn');
    var msg = document.getElementById('unlock-msg');

    function tryCode() {
      var v = (input.value || '').trim().toUpperCase().replace(/\s+/g, '');
      var expected = CODE.toUpperCase().replace(/\s+/g, '');
      if (v === expected) {
        unlockAll();
        msg.style.color = '#0f8';
        msg.textContent = 'OK — tudo desbloqueado!';
        input.value = '';
      } else if (v.length > 0) {
        msg.style.color = '#f66';
        msg.textContent = 'Codigo invalido';
      }
    }
    btn.addEventListener('click', tryCode);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryCode(); });
    input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  }

  function boot() { inject(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 600);
  setTimeout(boot, 2000);
})();
