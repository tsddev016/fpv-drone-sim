(function () {
  var css = document.createElement('style');
  css.id = 'ui-fix-scroll';
  css.textContent = [
    '.overlay, .overlay * { touch-action: pan-y !important; }',
    '.overlay input, .overlay select, .overlay button, .overlay .swatch, .overlay .shop-tab, .overlay .shop-option, .overlay .menu-btn, .overlay .back-btn { touch-action: manipulation !important; }',
    '.overlay {',
    '  justify-content: flex-start !important;',
    '  align-items: center !important;',
    '  overflow-y: scroll !important;',
    '  overflow-x: hidden !important;',
    '  -webkit-overflow-scrolling: touch !important;',
    '  overscroll-behavior: contain;',
    '  padding-top: 24px !important;',
    '  padding-bottom: 48px !important;',
    '  pointer-events: auto !important;',
    '}',
    '.menu-panel {',
    '  max-height: none !important;',
    '  overflow: visible !important;',
    '  margin: 12px auto 40px auto !important;',
    '  pointer-events: auto !important;',
    '}',
    '#drone-menu .menu-panel { max-height: none !important; }',
    '#drone-shop-panel {',
    '  max-height: min(60vh, 480px) !important;',
    '  overflow-y: scroll !important;',
    '  -webkit-overflow-scrolling: touch !important;',
    '  touch-action: pan-y !important;',
    '  overscroll-behavior: contain;',
    '  pointer-events: auto !important;',
    '}',
    '.shop-tabs {',
    '  flex-wrap: nowrap !important;',
    '  overflow-x: auto !important;',
    '  overflow-y: hidden !important;',
    '  touch-action: pan-x !important;',
    '  -webkit-overflow-scrolling: touch;',
    '  padding-bottom: 8px;',
    '}',
    'canvas, #touch-controls, .stick-base, #throttle-container,',
    '#btn-reset, #btn-mode, #btn-menu, #btn-cam, #btn-deploy { touch-action: none !important; }',
    '#hud.hud-classic { color: #0f0; }',
    '#hud.hud-minimal { color: #cfc; opacity: 0.75; }',
    '#hud.hud-minimal .bottom { display: none; }',
    '#hud.hud-race { color: #ffcc00; text-shadow: 0 0 6px #f80; }',
    '#hud.hud-military { color: #9f9; letter-spacing: 1px; }',
    '#hud.hud-off { display: none !important; }',
    '#crosshair.off { display: none !important; }',
    '.back-btn { position: relative; z-index: 6; margin-top: 16px !important; }'
  ].join('\n');
  document.head.appendChild(css);

  document.addEventListener('wheel', function (e) {
    var overlay = e.target.closest && e.target.closest('.overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    var panel = e.target.closest && e.target.closest('#drone-shop-panel');
    if (panel) {
      panel.scrollTop += e.deltaY;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    overlay.scrollTop += e.deltaY;
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false, capture: true });

  var touchY = 0, scrollEl = null;
  document.addEventListener('touchstart', function (e) {
    var o = e.target.closest && e.target.closest('.overlay:not(.hidden), #drone-shop-panel');
    if (!o) { scrollEl = null; return; }
    if (e.target.closest && e.target.closest('.stick-base, #throttle-container, canvas')) {
      scrollEl = null; return;
    }
    scrollEl = o;
    touchY = e.touches[0].clientY;
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', function (e) {
    if (!scrollEl || !e.touches[0]) return;
    var dy = touchY - e.touches[0].clientY;
    touchY = e.touches[0].clientY;
    scrollEl.scrollTop += dy;
  }, { passive: true, capture: true });

  function fixPlayerIds() {
    var map = {
      'player-skin': 'player-skin-colors',
      'player-hair': 'player-hair-colors',
      'player-shirt': 'player-shirt-colors',
      'player-pants': 'player-pants-colors'
    };
    Object.keys(map).forEach(function (oldId) {
      var el = document.getElementById(oldId);
      if (el && !document.getElementById(map[oldId])) el.id = map[oldId];
    });
    var panel = document.getElementById('shop-player');
    if (panel && !document.getElementById('player-shoes-colors')) {
      var row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = '<label>Tenis</label><div class="color-swatches" id="player-shoes-colors"></div>';
      panel.appendChild(row);
    }
    if (panel && !document.getElementById('player-hair-style')) {
      var grid = document.createElement('div');
      grid.className = 'shop-option-grid';
      grid.id = 'player-hair-style';
      panel.appendChild(grid);
    }
  }

  function injectHudSettings() {
    var menu = document.getElementById('settings-menu');
    if (!menu || document.getElementById('cfg-hud')) return;
    var panel = menu.querySelector('.menu-panel');
    if (!panel) return;
    var back = panel.querySelector('.back-btn');
    var block = document.createElement('div');
    block.innerHTML =
      '<div class="menu-section">HUD</div>' +
      '<div class="setting-row"><label>Estilo HUD</label>' +
      '<select id="cfg-hud"><option value="classic">Classico</option><option value="minimal">Minimal</option>' +
      '<option value="race">Racing</option><option value="military">Militar</option><option value="off">Off</option></select></div>' +
      '<div class="setting-row"><label>ALT/SPD</label>' +
      '<select id="cfg-hud-stats"><option value="on">Sim</option><option value="off">Nao</option></select></div>' +
      '<div class="setting-row"><label>Crosshair</label>' +
      '<select id="cfg-crosshair"><option value="on">Sim</option><option value="off">Nao</option></select></div>' +
      '<div class="menu-section">Voo</div>' +
      '<div class="setting-row"><label>Modo padrao</label>' +
      '<select id="cfg-flight-mode"><option value="acro" selected>Acro (360)</option><option value="angle">Angle</option></select></div>' +
      '<div class="setting-row"><label>Rates</label>' +
      '<input type="range" id="cfg-rate" min="600" max="1800" step="50" value="1400" /><span class="value" id="val-rate">1400</span></div>';
    if (back) panel.insertBefore(block, back);
    else panel.appendChild(block);
    if (back) {
      back.id = 'btn-settings-back';
      back.style.marginTop = '20px';
    }
  }

  function boot() {
    fixPlayerIds();
    injectHudSettings();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1500);
})();
