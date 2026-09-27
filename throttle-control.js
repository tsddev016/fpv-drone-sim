/**
 * R1 = SOBE | R2 = DESCE | L3 = PARA
 * L1 = FREIO DE AR | L2 = TURBO
 * L1/L2 NUNCA controlam altura
 */
(function () {
  function pressed(btn) {
    if (!btn) return false;
    if (typeof btn.value === 'number' && btn.value > 0.35) return true;
    return !!btn.pressed;
  }

  function injectUI() {
    if (document.getElementById('alt-btns')) return;

    var style = document.createElement('style');
    style.id = 'alt-btns-style';
    style.textContent =
      '#alt-btns{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:calc(var(--stick-size,120px)+env(safe-area-inset-bottom,12px)+20px);z-index:46;display:none;flex-direction:column;gap:8px;align-items:center;pointer-events:auto}' +
      '#alt-btns.show{display:flex}' +
      '.alt-btn{width:clamp(52px,14vmin,68px);height:clamp(44px,11vmin,56px);border-radius:12px;border:2px solid rgba(0,255,120,0.45);background:rgba(0,0,0,0.55);color:#9f9;font-family:monospace;font-size:clamp(11px,2.8vw,13px);font-weight:700;cursor:pointer;touch-action:manipulation}' +
      '.alt-btn.active-up{background:rgba(0,180,80,0.55);border-color:#0f0;color:#cfc}' +
      '.alt-btn.active-hold{background:rgba(180,140,0,0.45);border-color:#fc0;color:#ffc}' +
      '.alt-btn.active-down{background:rgba(180,40,40,0.5);border-color:#f44;color:#fcc}' +
      '#alt-label{font-size:9px;color:rgba(200,255,220,0.7);font-family:monospace;letter-spacing:1px}' +
      '#alt-val{font-size:11px;font-family:monospace;font-weight:700;color:#fc8}' +
      '#pad-hints{position:fixed;left:12px;bottom:calc(var(--stick-size,120px)+28px);z-index:45;font-family:monospace;font-size:10px;color:rgba(180,255,200,0.55);pointer-events:none;display:none;line-height:1.5}' +
      '#pad-hints.show{display:block}' +
      '#pad-hints .on{color:#0f8;font-weight:700}';
    document.head.appendChild(style);

    var box = document.createElement('div');
    box.id = 'alt-btns';
    box.innerHTML =
      '<div id="alt-label">ALTURA</div>' +
      '<button type="button" class="alt-btn" data-climb="1">▲ SOBE</button>' +
      '<button type="button" class="alt-btn active-hold" data-climb="0">■ PARA</button>' +
      '<button type="button" class="alt-btn" data-climb="-1">▼ DESCE</button>' +
      '<div id="alt-val">PARA</div>';
    document.body.appendChild(box);

    var hints = document.createElement('div');
    hints.id = 'pad-hints';
    hints.innerHTML = 'R1 SOBE · R2 DESCE · L3 PARA<br>L1 FREIO · L2 TURBO';
    document.body.appendChild(hints);

    var valEl = document.getElementById('alt-val');

    function setClimb(c) {
      c = c > 0.5 ? 1 : c < -0.5 ? -1 : 0;
      window.__FPV_CLIMB = c;
      window.__FPV_THROTTLE = (c + 1) / 2;
      box.querySelectorAll('.alt-btn').forEach(function (btn) {
        btn.classList.remove('active-up', 'active-hold', 'active-down');
        var v = parseInt(btn.getAttribute('data-climb'), 10);
        if (v === c) {
          if (c > 0) btn.classList.add('active-up');
          else if (c < 0) btn.classList.add('active-down');
          else btn.classList.add('active-hold');
        }
      });
      if (valEl) {
        valEl.textContent = c > 0 ? 'SOBE' : c < 0 ? 'DESCE' : 'PARA';
        valEl.style.color = c > 0 ? '#0f8' : c < 0 ? '#f66' : '#fc8';
      }
    }

    box.querySelectorAll('.alt-btn').forEach(function (btn) {
      function press(e) {
        e.preventDefault();
        e.stopPropagation();
        setClimb(parseInt(btn.getAttribute('data-climb'), 10));
      }
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('click', press);
    });

    window.addEventListener('keydown', function (e) {
      if (e.code === 'PageUp') setClimb(1);
      if (e.code === 'PageDown') setClimb(-1);
      if (e.code === 'Home') setClimb(0);
      if (e.code === 'KeyQ') window.__FPV_AIRBRAKE = true;
      if (e.code === 'KeyE') window.__FPV_TURBO = true;
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === 'KeyQ') window.__FPV_AIRBRAKE = false;
      if (e.code === 'KeyE') window.__FPV_TURBO = false;
    });

    window.__FPV_AIRBRAKE = false;
    window.__FPV_TURBO = false;

    var prevR1 = false, prevR2 = false, prevL3 = false;

    function pollPad() {
      try {
        var pads = navigator.getGamepads ? navigator.getGamepads() : [];
        var sawPad = false;
        var air = false, turbo = false;

        for (var i = 0; i < pads.length; i++) {
          var p = pads[i];
          if (!p || !p.connected) continue;
          sawPad = true;

          var r1 = pressed(p.buttons[5]);
          var r2 = pressed(p.buttons[7]);
          var l1 = pressed(p.buttons[4]);
          var l2 = pressed(p.buttons[6]);
          var l3 = pressed(p.buttons[10]);

          if (p.axes && p.axes.length >= 6) {
            var aL2 = p.axes[2], aR2 = p.axes[5];
            if (typeof aL2 === 'number' && aL2 > 0.4) l2 = true;
            if (typeof aR2 === 'number' && aR2 > 0.4) r2 = true;
          }

          // APENAS R1/R2/L3 mudam altura
          if (r1) { if (!prevR1) setClimb(1); prevR1 = true; } else prevR1 = false;
          if (r2) { if (!prevR2) setClimb(-1); prevR2 = true; } else prevR2 = false;
          if (l3) { if (!prevL3) setClimb(0); prevL3 = true; } else prevL3 = false;

          if (l1) air = true;
          if (l2) turbo = true;
        }

        if (sawPad) {
          window.__FPV_AIRBRAKE = air;
          window.__FPV_TURBO = turbo;
        }
      } catch (e) {}

      var h = document.getElementById('pad-hints');
      if (h) {
        h.innerHTML =
          'R1 SOBE · R2 DESCE · L3 PARA<br>' +
          '<span class="' + (window.__FPV_AIRBRAKE ? 'on' : '') + '">L1 FREIO</span> · ' +
          '<span class="' + (window.__FPV_TURBO ? 'on' : '') + '">L2 TURBO</span>';
      }
      requestAnimationFrame(pollPad);
    }
    requestAnimationFrame(pollPad);

    setInterval(function () {
      var hud = document.getElementById('hud');
      var flying = hud && !hud.classList.contains('hidden');
      var deploy = document.getElementById('btn-deploy');
      var walk = deploy && deploy.classList.contains('show');
      box.classList.toggle('show', !!flying && !walk);
      hints.classList.toggle('show', !!flying && !walk);
    }, 300);

    setClimb(0);
    window.__FPV_SET_CLIMB = setClimb;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUI);
  else injectUI();
})();
