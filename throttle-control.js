/**
 * Analógico vertical bipolar de ALTURA
 * Topo  = +100 (sobe forte)
 * Centro = 0   (neutro: para de subir/descer)
 * Base  = -100 (desce)
 * window.__FPV_CLIMB em [-1, 1]
 */
(function () {
  const DEFAULT = 0; // neutro

  function injectUI() {
    if (document.getElementById('throttle-container')) return;

    const style = document.createElement('style');
    style.id = 'throttle-style';
    style.textContent =
      '#throttle-container{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(var(--stick-size,120px) + env(safe-area-inset-bottom,12px) + 28px);width:clamp(48px,12vmin,64px);height:clamp(150px,38vmin,210px);background:rgba(0,0,0,0.55);border:2px solid rgba(0,255,120,0.4);border-radius:999px;touch-action:none;z-index:45;display:none;pointer-events:auto}' +
      '#throttle-container.show{display:block}' +
      '#throttle-track{position:absolute;left:50%;top:14px;bottom:14px;width:4px;transform:translateX(-50%);background:linear-gradient(180deg,rgba(0,255,120,0.35),rgba(255,255,255,0.12) 50%,rgba(255,80,80,0.35));border-radius:2px}' +
      '#throttle-hover-mark{position:absolute;left:6px;right:6px;height:2px;background:rgba(255,220,80,0.7);pointer-events:none}' +
      '#throttle-thumb{position:absolute;left:50%;width:clamp(40px,11vmin,56px);height:clamp(40px,11vmin,56px);transform:translateX(-50%);background:radial-gradient(circle at 35% 35%,#8fa,#0a8);border:2px solid #0f0;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.45);touch-action:none}' +
      '#throttle-label{position:absolute;top:4px;left:0;right:0;text-align:center;color:rgba(200,255,220,0.85);font-family:monospace;font-size:9px;letter-spacing:1px;pointer-events:none}' +
      '#throttle-val{position:absolute;bottom:4px;left:0;right:0;text-align:center;color:#0f8;font-family:monospace;font-size:10px;pointer-events:none;font-weight:700}' +
      '@media (max-height:420px) and (orientation:landscape){#throttle-container{height:clamp(110px,50vh,160px);bottom:calc(var(--stick-size,90px) + 12px)}}';
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'throttle-container';
    box.innerHTML =
      '<div id="throttle-label">ALTURA</div>' +
      '<div id="throttle-track"></div>' +
      '<div id="throttle-hover-mark"></div>' +
      '<div id="throttle-thumb"></div>' +
      '<div id="throttle-val">0</div>';
    document.body.appendChild(box);

    const thumb = document.getElementById('throttle-thumb');
    const mark = document.getElementById('throttle-hover-mark');
    const valEl = document.getElementById('throttle-val');
    let dragging = false;

    function maxTravel() {
      return Math.max(1, box.clientHeight - thumb.clientHeight - 8);
    }

    /** climb in [-1, 1] */
    function setClimb(c) {
      c = Math.max(-1, Math.min(1, c));
      if (Math.abs(c) < 0.06) c = 0;
      window.__FPV_CLIMB = c;
      window.__FPV_THROTTLE = (c + 1) / 2;

      const travel = maxTravel();
      const bottom = ((c + 1) / 2) * travel + 4;
      thumb.style.bottom = bottom + 'px';
      thumb.style.top = 'auto';

      if (valEl) {
        const pct = Math.round(c * 100);
        valEl.textContent = (pct > 0 ? '+' : '') + pct;
        valEl.style.color = c > 0.05 ? '#0f8' : c < -0.05 ? '#f66' : '#fc8';
      }
      if (thumb) {
        if (c > 0.05) thumb.style.borderColor = '#0f0';
        else if (c < -0.05) thumb.style.borderColor = '#f44';
        else thumb.style.borderColor = '#fc0';
      }
    }

    function fromClientY(clientY) {
      const rect = box.getBoundingClientRect();
      const travel = maxTravel();
      let yFromTop = clientY - rect.top - thumb.clientHeight / 2;
      if (yFromTop < 0) yFromTop = 0;
      if (yFromTop > travel) yFromTop = travel;
      return 1 - (2 * yFromTop / travel);
    }

    function placeMark() {
      const travel = maxTravel();
      mark.style.bottom = 0.5 * travel + thumb.clientHeight / 2 + 'px';
    }

    box.addEventListener('pointerdown', (e) => {
      dragging = true;
      box.setPointerCapture(e.pointerId);
      setClimb(fromClientY(e.clientY));
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setClimb(fromClientY(e.clientY));
      e.preventDefault();
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { box.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'PageUp') setClimb((window.__FPV_CLIMB || 0) + 0.1);
      if (e.code === 'PageDown') setClimb((window.__FPV_CLIMB || 0) - 0.1);
      if (e.code === 'Home') setClimb(0);
    });

    setInterval(() => {
      const hud = document.getElementById('hud');
      const flying = hud && !hud.classList.contains('hidden');
      const deploy = document.getElementById('btn-deploy');
      const walk = deploy && deploy.classList.contains('show');
      box.classList.toggle('show', !!flying && !walk);
      if (flying) placeMark();
    }, 300);

    setClimb(DEFAULT);
    placeMark();
    window.__FPV_SET_CLIMB = setClimb;
    window.__FPV_SET_THROTTLE = function (t) {
      setClimb(t * 2 - 1);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUI);
  else injectUI();
})();
