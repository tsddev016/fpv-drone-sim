// Abre a loja 3D quando o menu do drone aparece — com fallback robusto
(function () {
  function ensureCustom() {
    if (!window.__FPV_CUSTOM) {
      window.__FPV_CUSTOM = {
        bodyStyle: 'standard', scale: 1, camType: 'fpv', sticker: 'none',
        accessory: 'none', propSpin: 1, body: 0x1a1a1a, arm: 0x111111, prop: 0xdddddd
      };
    }
  }

  function tryOpen() {
    const menu = document.getElementById('drone-menu');
    if (!menu) return;
    const open = !menu.classList.contains('hidden');
    if (open) {
      ensureCustom();
      if (window.__FPV_OPEN_SHOP) {
        try { window.__FPV_OPEN_SHOP(); } catch (e) { console.warn('shop open', e); }
      } else {
        import('./shop.js')
          .then(m => { if (m.openShop) m.openShop(); })
          .catch(err => {
            console.warn('shop module fail, retry CDN', err);
            import('https://cdn.jsdelivr.net/gh/tsddev016/fpv-drone-sim@main/shop.js')
              .then(m => { if (m.openShop) m.openShop(); })
              .catch(console.warn);
          });
      }
    } else if (window.__FPV_CLOSE_SHOP) {
      try { window.__FPV_CLOSE_SHOP(); } catch (_) {}
    }
  }

  const obs = new MutationObserver(tryOpen);
  const start = () => {
    const menu = document.getElementById('drone-menu');
    if (menu) obs.observe(menu, { attributes: true, attributeFilter: ['class'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'btn-drone' || e.target.closest('#btn-drone'))) {
      setTimeout(tryOpen, 100);
    }
  });
})();
