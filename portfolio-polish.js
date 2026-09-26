/**
 * Modo portfólio — esconde restos de admin/tech na UI
 */
(function () {
  function scrub() {
    try {
      if (window.FPVProfile) {
        delete window.FPVProfile.tryActivateAdmin;
        delete window.FPVProfile.revealSensitive;
        delete window.FPVProfile.aegisStatus;
        delete window.FPVProfile.KEY;
        if (window.FPVProfile.exportPublic) {
          window.FPVProfile.exportPublic = function () {
            const p = (window.__FPV_PROFILE) || {};
            return { name: p.name || 'Piloto', level: p.level || 1 };
          };
        }
      }
      if (window.__AEGIS) delete window.__AEGIS;
      if (window.FPVSupport) {
        delete window.FPVSupport.PIX_KEY;
        delete window.FPVSupport.PIX_NAME;
      }
      document.querySelectorAll('#admin-code, #btn-admin-activate, #admin-msg, #btn-reveal-sensitive, #sensitive-msg').forEach(function (n) {
        var row = n.closest('.setting-row') || n;
        if (row && row.parentNode) row.parentNode.removeChild(row);
        else if (n.parentNode) n.parentNode.removeChild(n);
      });
      document.querySelectorAll('.menu-section').forEach(function (sec) {
        if (/Conta local/i.test(sec.textContent || '')) {
          var p = sec.nextElementSibling;
          while (p && !p.classList.contains('menu-section') && !p.classList.contains('back-btn') && p.id !== 'btn-about') {
            var n = p.nextElementSibling;
            if (p.classList && (p.classList.contains('setting-row') || p.tagName === 'BUTTON' || p.tagName === 'P' || p.tagName === 'DIV')) {
              p.remove();
            } else break;
            p = n;
          }
          sec.remove();
        }
      });
      var gate = document.getElementById('fpv-auth-gate');
      if (gate) {
        gate.querySelectorAll('p').forEach(function (p) {
          if (/PBKDF|AES-GCM|TSDEV/i.test(p.textContent || '')) {
            p.textContent = 'Entre com seu nome de piloto';
          }
        });
      }
      document.querySelectorAll('p, .subtitle, .setting-row, label').forEach(function (el) {
        var t = el.textContent || '';
        if (/PBKDF|AES-GCM|TSDEV-01|Código admin/i.test(t) && el.closest('#settings-menu, #fpv-auth-gate, .menu-panel')) {
          if (/Código admin/i.test(t) && el.tagName === 'LABEL') {
            var row = el.closest('.setting-row');
            if (row) row.remove();
          } else if (/PBKDF|AES-GCM|TSDEV/i.test(t)) {
            if (el.tagName === 'P' || el.classList.contains('subtitle')) {
              el.textContent = el.closest('#fpv-auth-gate') ? 'Entre com seu nome de piloto' : '';
            }
          }
        }
      });
    } catch (_) {}
  }
  scrub();
  setInterval(scrub, 1200);
})();
