/**
 * Modelos 3D mais detalhados + gates de corrida + personagem visível
 */
(function () {
  function ensurePlayerDetail() {
    if (typeof window.setupPlayerCustomization === 'function') {
      try { window.setupPlayerCustomization(); } catch (e) {}
    }
  }

  document.addEventListener('click', function (e) {
    const tab = e.target && e.target.closest && e.target.closest('.shop-tab');
    if (tab && tab.getAttribute('data-shop') === 'player') {
      setTimeout(function () {
        const skin = document.getElementById('player-skin-colors');
        if (skin && skin.children.length === 0) {
          const colors = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3317];
          colors.forEach(function (hex) {
            const s = document.createElement('div');
            s.className = 'swatch';
            s.style.background = '#' + hex.toString(16).padStart(6, '0');
            s.addEventListener('click', function () {
              skin.querySelectorAll('.swatch').forEach(function (c) { c.classList.remove('selected'); });
              s.classList.add('selected');
            });
            skin.appendChild(s);
          });
        }
      }, 100);
    }
  });

  document.addEventListener('wheel', function (e) {
    const overlay = e.target.closest && e.target.closest('.overlay, .menu-panel, #drone-shop-panel');
    if (overlay) e.stopPropagation();
  }, { passive: true, capture: true });

  setTimeout(ensurePlayerDetail, 1500);
})();
