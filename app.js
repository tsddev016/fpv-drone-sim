/**
 * Carrega o núcleo do simulador.
 * Falhas aparecem de forma discreta (modo portfólio).
 */
function showFriendlyError() {
  const el = document.getElementById('loading');
  if (!el) return;
  el.innerHTML =
    '<div style="max-width:320px;margin:40px auto;padding:28px 22px;text-align:center;' +
    'font-family:system-ui,sans-serif;color:#cfe;background:rgba(6,18,12,0.95);' +
    'border:1px solid rgba(0,200,120,0.25);border-radius:16px;line-height:1.5">' +
    '<div style="font-size:22px;margin-bottom:10px">🚁</div>' +
    '<div style="font-weight:700;letter-spacing:1px;margin-bottom:8px">FPV Drone Sim</div>' +
    '<div style="font-size:13px;opacity:0.65;margin-bottom:16px">Não foi possível iniciar agora.<br>Atualize a página ou tente mais tarde.</div>' +
    '<button type="button" onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:10px;' +
    'background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">Tentar de novo</button>' +
    '</div>';
  el.classList.remove('hidden');
}

try {
  const RESCUE_URL =
    'https://raw.githubusercontent.com/tsddev016/fpv-drone-sim/38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js';
  const res = await fetch(RESCUE_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('load');
  let code = await res.text();

  // Altitude: botões ▲▼ + Space/Shift (patch discreto)
  if (!code.includes('__FPV_ALT_INPUT')) {
    code = code.replace(
      'let holdAlt = null;',
      'let holdAlt = null;\nlet altInput = 0;\nObject.defineProperty(window,"__FPV_ALT_INPUT",{get(){return altInput},set(v){altInput=Math.max(-1,Math.min(1,Number(v)||0))},configurable:true});'
    );
    code = code.replace(
      'input.throttle = hoverT;\n  } else if (touchActive)',
      'const a = altInput||0; if(a>0.05) input.throttle=Math.min(1,hoverT+0.5*a); else if(a<-0.05) input.throttle=Math.max(0,hoverT+0.55*a); else input.throttle=hoverT;\n  } else if (touchActive)'
    );
    code = code.replace(
      "const anyMove = stickMag > 0.05;\n    if (anyMove) {\n      if (holdAlt === null) holdAlt = drone.position.y;\n    } else {\n      holdAlt = null;\n    }\n    if (holdAlt !== null) {\n      const err = holdAlt - drone.position.y;\n      const climbCmd = THREE.MathUtils.clamp(err * 1.8 - velocity.y * 1.2, -0.35, 0.35);\n      const uy = Math.max(0.55, up.y);\n      thrustMul = ((CONFIG.mass * CONFIG.gravity) + climbCmd * CONFIG.mass * 9) / uy;\n      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.05);\n      throttle = THREE.MathUtils.clamp(thrustMul / CONFIG.maxThrust, 0, 1);\n    }",
      "const a = altInput||0;\n    if (holdAlt === null && (stickMag > 0.05 || Math.abs(a) > 0.05 || drone.position.y > 0.3)) holdAlt = Math.max(drone.position.y, 0.15);\n    if (Math.abs(a) > 0.05) { if (holdAlt === null) holdAlt = Math.max(drone.position.y, 0.5); holdAlt += a * 8 * dt; holdAlt = THREE.MathUtils.clamp(holdAlt, 0.15, 120); }\n    const kk = window._keys || {};\n    if (kk['Space']) { if (holdAlt === null) holdAlt = Math.max(drone.position.y, 0.5); holdAlt = Math.min(120, holdAlt + 8 * dt); }\n    if (kk['ShiftLeft'] || kk['ShiftRight']) { if (holdAlt !== null) holdAlt = Math.max(0.15, holdAlt - 8 * dt); }\n    if (holdAlt !== null) {\n      const err = holdAlt - drone.position.y;\n      const climbCmd = THREE.MathUtils.clamp(err * 2.2 - velocity.y * 1.4, -0.55, 0.65);\n      const uy = Math.max(0.5, up.y);\n      thrustMul = ((CONFIG.mass * CONFIG.gravity) + climbCmd * CONFIG.mass * 12) / uy;\n      if (drone.position.y < 0.25 && holdAlt > 0.8) thrustMul = Math.max(thrustMul, CONFIG.maxThrust * 0.85);\n      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.15);\n      throttle = THREE.MathUtils.clamp(thrustMul / CONFIG.maxThrust, 0, 1);\n    }"
    );
    if (!code.includes('alt-btn-up')) {
      code = code.replace(
        "sticks.right.base.addEventListener('touchstart', e => handleStart(e, 'right'), { passive: false });",
        "sticks.right.base.addEventListener('touchstart', e => handleStart(e, 'right'), { passive: false });\n  (function(){if(document.getElementById('alt-controls'))return;const w=document.createElement('div');w.id='alt-controls';w.innerHTML='<button type=\"button\" id=\"alt-btn-up\">▲</button><button type=\"button\" id=\"alt-btn-down\">▼</button>';document.body.appendChild(w);const s=document.createElement('style');s.textContent='#alt-controls{position:fixed;right:max(12px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);z-index:40;display:flex;flex-direction:column;gap:10px}#alt-controls button{width:52px;height:52px;border-radius:14px;border:1px solid rgba(0,255,100,0.4);background:rgba(0,20,10,0.75);color:#0f0;font-size:20px;font-weight:700;cursor:pointer;touch-action:none}#alt-controls button:active{background:rgba(0,255,100,0.25)}#alt-controls.hide{display:none!important}';document.head.appendChild(s);function bind(b,v){if(!b)return;const set=(x,e)=>{if(e)e.preventDefault();altInput=x;};['touchstart','mousedown'].forEach(ev=>b.addEventListener(ev,e=>set(v,e),{passive:false}));['touchend','touchcancel','mouseup','mouseleave'].forEach(ev=>b.addEventListener(ev,e=>set(0,e),{passive:false}));}bind(document.getElementById('alt-btn-up'),1);bind(document.getElementById('alt-btn-down'),-1);})();"
      );
    }
    // Mensagem de erro técnica → tela amigável
    code = code.replace(
      /innerHTML = '<div style="color:#0f0;padding:24px">Erro: ' \+ e\.message \+ '<\/div>';/,
      'if (typeof showFriendlyError === "function") showFriendlyError(); else { const el = document.getElementById("loading"); if (el) el.textContent = "Recarregue a página"; }'
    );
  }

  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
} catch (_) {
  showFriendlyError();
}
