(function () {
  var css = document.createElement('style');
  css.id = 'ui-fix-scroll';
  css.textContent = [
    'canvas,#touch-controls,.stick-base,#throttle-container,#btn-reset,#btn-mode,#btn-menu,#btn-cam,#btn-deploy{touch-action:none}',
    '.overlay,.menu-panel,#drone-shop-panel,.shop-tabs{touch-action:pan-y;-webkit-overflow-scrolling:touch}',
    '.overlay{justify-content:flex-start!important;overflow-y:auto!important;overflow-x:hidden;padding-bottom:40px;overscroll-behavior:contain}',
    '.menu-panel{max-height:min(92vh,900px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',
    '#drone-shop-panel{max-height:min(70vh,520px)!important;overflow-y:auto!important;touch-action:pan-y}',
    '.shop-tabs{flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;padding-bottom:6px}',
    '#hud.hud-classic{color:#0f0}',
    '#hud.hud-minimal{color:#cfc;opacity:0.7}',
    '#hud.hud-minimal .bottom{display:none}',
    '#hud.hud-race{color:#ffcc00;text-shadow:0 0 6px #f80}',
    '#hud.hud-military{color:#9f9;letter-spacing:1px}',
    '#hud.hud-off{display:none!important}',
    '#crosshair.off{display:none!important}'
  ].join('\n');
  document.head.appendChild(css);

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
      '<select id="cfg-flight-mode"><option value="acro">Acro</option><option value="angle">Angle</option></select></div>' +
      '<div class="setting-row"><label>Rates</label>' +
      '<input type="range" id="cfg-rate" min="400" max="1200" step="50" value="900" /><span class="value" id="val-rate">900</span></div>';
    if (back) panel.insertBefore(block, back);
    else panel.appendChild(block);
    if (back) {
      back.id = 'btn-settings-back';
      back.style.position = 'relative';
      back.style.zIndex = '5';
      back.style.marginTop = '16px';
    }
  }

  function boot() {
    fixPlayerIds();
    injectHudSettings();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 500);
  setTimeout(boot, 2000);

  document.addEventListener('wheel', function (e) {
    var o = e.target.closest && e.target.closest('.overlay, .menu-panel, #drone-shop-panel');
    if (o) e.stopPropagation();
  }, { passive: true, capture: true });
})();
