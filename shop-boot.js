(function () {
  function tryOpen() {
    const menu = document.getElementById('drone-menu');
    if (!menu) return;
    const open = !menu.classList.contains('hidden');
    if (open) {
      if (!window.__FPV_CUSTOM) {
        window.__FPV_CUSTOM = {
          bodyStyle: 'standard', scale: 1, camType: 'fpv', sticker: 'none',
          accessory: 'none', propSpin: 1, body: 0x1a1a1a, arm: 0x111111, prop: 0xdddddd
        };
      }
      if (window.__FPV_OPEN_SHOP) window.__FPV_OPEN_SHOP();
      else import('./shop.js').then(m => m.openShop()).catch(console.warn);
    } else if (window.__FPV_CLOSE_SHOP) {
      window.__FPV_CLOSE_SHOP();
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
      setTimeout(tryOpen, 80);
    }
  });
})();
