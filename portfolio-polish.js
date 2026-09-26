/**
 * Modo portfólio — remove APIs internas da janela global.
 * Não é segurança de servidor; só evita exposição óbvia no F12.
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
          const orig = window.FPVProfile.exportPublic;
          window.FPVProfile.exportPublic = function () {
            const p = orig() || {};
            return { name: p.name || 'Piloto', level: p.level || 1 };
          };
        }
      }
      if (window.__AEGIS) delete window.__AEGIS;
      if (window.FPVSupport) {
        delete window.FPVSupport.PIX_KEY;
        delete window.FPVSupport.PIX_NAME;
      }
    } catch (_) {}
  }
  scrub();
  setInterval(scrub, 2000);
})();
