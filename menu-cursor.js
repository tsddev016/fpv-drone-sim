/**
 * D-pad = cursor nos menus
 */
(function () {
  var cursor = null;
  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var speed = 9;
  var lastClick = 0;
  var prevBtns = {};

  function ensureCursor() {
    if (cursor) return cursor;
    cursor = document.createElement('div');
    cursor.id = 'pad-cursor';
    var style = document.createElement('style');
    style.textContent =
      '#pad-cursor{position:fixed;width:22px;height:22px;margin-left:-11px;margin-top:-11px;border-radius:50%;' +
      'border:2px solid #0f0;background:radial-gradient(circle at 30% 30%,rgba(180,255,180,0.9),rgba(0,200,80,0.35));' +
      'box-shadow:0 0 14px rgba(0,255,100,0.55);pointer-events:none;z-index:9999;display:none}' +
      '#pad-cursor.show{display:block}' +
      '#pad-cursor::after{content:"";position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;background:#0f0;border-radius:50%}';
    document.head.appendChild(style);
    document.body.appendChild(cursor);
    return cursor;
  }

  function menuOpen() {
    var overlays = document.querySelectorAll('.overlay');
    for (var i = 0; i < overlays.length; i++) {
      if (!overlays[i].classList.contains('hidden')) return true;
    }
    return false;
  }

  function clickAt() {
    var now = Date.now();
    if (now - lastClick < 250) return;
    lastClick = now;
    var el = document.elementFromPoint(x, y);
    if (!el) return;
    var target = el.closest && el.closest('button, .menu-btn, .back-btn, .shop-tab, .shop-option, .swatch, a, input, select, .map-card, .drone-card');
    if (!target) target = el;
    try {
      target.focus && target.focus();
      target.click && target.click();
      var c = ensureCursor();
      c.style.transform = 'scale(0.75)';
      setTimeout(function () { c.style.transform = ''; }, 100);
    } catch (e) {}
  }

  function tick() {
    var c = ensureCursor();
    var open = menuOpen();
    c.classList.toggle('show', open);
    if (!open) { requestAnimationFrame(tick); return; }

    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p) continue;
      var dx = 0, dy = 0;
      if (p.buttons[14] && p.buttons[14].pressed) dx -= 1;
      if (p.buttons[15] && p.buttons[15].pressed) dx += 1;
      if (p.buttons[12] && p.buttons[12].pressed) dy -= 1;
      if (p.buttons[13] && p.buttons[13].pressed) dy += 1;
      var ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > 0.25) dx += ax;
      if (Math.abs(ay) > 0.25) dy += ay;
      if (dx || dy) { x += dx * speed; y += dy * speed; }

      var a = p.buttons[0] && p.buttons[0].pressed;
      if (a && !prevBtns['a' + i]) clickAt();
      prevBtns['a' + i] = a;

      var b = p.buttons[1] && p.buttons[1].pressed;
      if (b && !prevBtns['b' + i]) {
        var back = document.querySelector('.overlay:not(.hidden) .back-btn');
        if (back) back.click();
      }
      prevBtns['b' + i] = b;
    }

    x = Math.max(8, Math.min(window.innerWidth - 8, x));
    y = Math.max(8, Math.min(window.innerHeight - 8, y));
    c.style.left = x + 'px';
    c.style.top = y + 'px';
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ensureCursor(); tick(); });
  else { ensureCursor(); tick(); }
})();
