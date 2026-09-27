/**
 * Analógico vertical de ALTURA (throttle dedicado)
 * Define window.__FPV_THROTTLE de 0 (chão) a 1 (subida máxima)
 */
(function () {
  const HOVER_DEFAULT = 0.28; // posição inicial ~ pairar

  function injectUI() {
    if (document.getElementById('throttle-container')) return;

    const style = document.createElement('style');
    style.id = 'throttle-style';
    style.textContent =
      '#throttle-container{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(var(--stick-size,120px) + env(safe-area-inset-bottom,12px) + 24px);width:clamp(52px,14vmin,70px);height:clamp(160px,40vmin,220px);background:rgba(0,0,0,0.45);border:2px solid rgba(0,255,120,0.35);border-radius:999px;touch-action:none;z-index:45;display:none;pointer-events:auto}' +
      '#throttle-container.show{display:block}' +
      '#throttle-track{position:absolute;left:50%;top:14px;bottom:14px;width:4px;transform:translateX(-50%);background:rgba(0,255,100,0.2);border-radius:2px}' +
      '#throttle-hover-mark{position:absolute;left:8px;right:8px;height:2px;background:rgba(255,200,80,0.55);pointer-events:none}' +
      '#throttle-thumb{position:absolute;left:50%;width:clamp(44px,12vmin,62px);height:clamp(44px,12vmin,62px);transform:translateX(-50%);background:radial-gradient(circle at 35% 35%,#6f8,#0c0);border:2px solid #0f0;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.4);touch-action:none}' +
      '#throttle-label{position:absolute;top:6px;left:0;right:0;text-align:center;color:rgba(200,255,220,0.75);font-family:monospace;font-size:9px;letter-spacing:1px;pointer-events:none}' +
      '#throttle-val{position:absolute;bottom:6px;left:0;right:0;text-align:center;color:#0f8;font-family:monospace;font-size:10px;pointer-events:none}';
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'throttle-container';
    box.innerHTML =
      '<div id="throttle-label">ALTURA</div>' +
      '<div id="throttle-track"></div>' +
      '<div id="throttle-hover-mark"></div>' +
      '<div id="throttle-thumb"></div>' +
      '<div id="throttle-val">28%</div>';
    document.body.appendChild(box);

    const thumb = document.getElementById('throttle-thumb');
    const mark = document.getElementById('throttle-hover-mark');
    const valEl = document.getElementById('throttle-val');
    let dragging = false;

    function maxTravel() {
      return Math.max(1, box.clientHeight - thumb.clientHeight - 8);
    }

    function setThrottle(t) {
      t = Math.max(0, Math.min(1, t));
      window.__FPV_THROTTLE = t;
      const travel = maxTravel();
      // t=0 bottom, t=1 top
      const bottom = t * travel + 4;
      thumb.style.bottom = bottom + 'px';
      thumb.style.top = 'auto';
      if (valEl) valEl.textContent = Math.round(t * 100) + '%';
    }

    function fromClientY(clientY) {
      const rect = box.getBoundingClientRect();
      const travel = maxTravel();
      let yFromTop = clientY - rect.top - thumb.clientHeight / 2;
      if (yFromTop < 0) yFromTop = 0;
      if (yFromTop > travel) yFromTop = travel;
      // invert: top = 1
      return 1 - yFromTop / travel;
    }

    // marca de hover (~28%)
    function placeMark() {
      const travel = maxTravel();
      mark.style.bottom = HOVER_DEFAULT * travel + thumb.clientHeight / 2 + 'px';
    }

    box.addEventListener('pointerdown', (e) => {
      dragging = true;
      box.setPointerCapture(e.pointerId);
      setThrottle(fromClientY(e.clientY));
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setThrottle(fromClientY(e.clientY));
      e.preventDefault();
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { box.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);

    // teclado: R = sobe slider, F = desce
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && !e.repeat) {
        /* keep R for reset if game uses it - use PageUp/PageDown instead */
      }
      if (e.code === 'PageUp') setThrottle((window.__FPV_THROTTLE || HOVER_DEFAULT) + 0.05);
      if (e.code === 'PageDown') setThrottle((window.__FPV_THROTTLE || HOVER_DEFAULT) - 0.05);
    });

    // mostrar quando HUD do voo estiver ativo
    setInterval(() => {
      const hud = document.getElementById('hud');
      const flying = hud && !hud.classList.contains('hidden');
      box.classList.toggle('show', !!flying);
      if (flying) placeMark();
    }, 400);

    setThrottle(HOVER_DEFAULT);
    placeMark();
    window.__FPV_SET_THROTTLE = setThrottle;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUI);
  else injectUI();
})();
