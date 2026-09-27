// Loader + patches: throttle dedicado, sem gravidade, sticks corrigidos, cam no player
(function loadThrottleUI() {
  if (document.getElementById('throttle-control-js')) return;
  var s = document.createElement('script');
  s.id = 'throttle-control-js';
  s.src = 'throttle-control.js';
  document.head.appendChild(s);
})();

setTimeout(function () {
  try {
    var el = document.getElementById('loading');
    if (el && !el.classList.contains('hidden')) {
      el.classList.add('hidden');
      el.dataset.done = '1';
    }
  } catch (e) {}
}, 15000);

function fail(msg) {
  var el = document.getElementById('loading');
  if (!el) return;
  el.innerHTML =
    '<div style="max-width:320px;margin:40px auto;padding:28px;text-align:center;font-family:system-ui;color:#cfe;background:rgba(6,18,12,0.95);border:1px solid rgba(0,200,120,0.25);border-radius:16px">' +
    '<div style="font-size:22px">🚁</div><div style="font-weight:700;margin:8px 0">FPV Drone Sim</div>' +
    '<div style="font-size:13px;opacity:0.65;margin-bottom:16px">' + (msg || 'Erro') + '</div>' +
    '<button type="button" onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">Tentar de novo</button></div>';
  el.classList.remove('hidden');
}

try {
  const URLS = [
    'https://cdn.jsdelivr.net/gh/tsddev016/fpv-drone-sim@38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js',
    'https://raw.githubusercontent.com/tsddev016/fpv-drone-sim/38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js'
  ];
  let code = null;
  let lastErr = null;
  for (const u of URLS) {
    try {
      const res = await fetch(u, { cache: 'force-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      code = await res.text();
      if (code && code.length > 1000 && code.includes('function init')) break;
      code = null;
    } catch (e) {
      lastErr = e;
      code = null;
    }
  }
  if (!code) throw lastErr || new Error('não carregou');

  code = code.replace(
    /import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?/,
    "import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';"
  );

  // === PATCH: sem gravidade ===
  code = code.replace(/gravity:\s*9\.81/, 'gravity: 0');
  code = code.replace(/force\.y\s*-=\s*CONFIG\.mass\s*\*\s*CONFIG\.gravity;/, '/* gravity removed */');
  code = code.replace(
    /\(CONFIG\.mass\s*\*\s*CONFIG\.gravity\)/g,
    '(0)'
  );

  // === PATCH: inverter roll (esquerda/direita) e pitch (frente/trás) nos sticks ===
  // arcade touch
  code = code.replace(
    'input.pitch = -ry * sens;\n    input.roll = rx * sens;',
    'input.pitch = ry * sens;\n    input.roll = -rx * sens;'
  );
  // mode2 touch
  code = code.replace(
    'input.pitch = applyExpo(applyDeadzone(-sticks.right.y, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(sticks.right.x, dz), expo) * sens;',
    'input.pitch = applyExpo(applyDeadzone(sticks.right.y, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(-sticks.right.x, dz), expo) * sens;'
  );
  // teclado mode2
  code = code.replace(
    "if (k['ArrowUp']) input.pitch = -1;\n    if (k['ArrowDown']) input.pitch = 1;\n    if (k['ArrowLeft']) input.roll = -1;\n    if (k['ArrowRight']) input.roll = 1;",
    "if (k['ArrowUp']) input.pitch = 1;\n    if (k['ArrowDown']) input.pitch = -1;\n    if (k['ArrowLeft']) input.roll = 1;\n    if (k['ArrowRight']) input.roll = -1;"
  );
  // gamepad
  code = code.replace(
    'input.pitch = applyExpo(applyDeadzone(pad.axes[3] || 0, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(pad.axes[2] || 0, dz), expo) * sens;',
    'input.pitch = applyExpo(applyDeadzone(-(pad.axes[3] || 0), dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(-(pad.axes[2] || 0), dz), expo) * sens;'
  );

  // === PATCH: throttle dedicado (__FPV_THROTTLE) ===
  if (!code.includes('__FPV_THROTTLE_PATCH')) {
    code = code.replace(
      'throttle = input.throttle;\n}',
      'if (typeof window.__FPV_THROTTLE === "number") {\n' +
        '    input.throttle = Math.max(0, Math.min(1, window.__FPV_THROTTLE));\n' +
        '  }\n' +
        '  throttle = input.throttle;\n' +
        '  window.__FPV_THROTTLE_PATCH = 1;\n' +
        '}'
    );
    code = code.replace(
      'input.yaw = lx * 0.12 * sens;\n    input.throttle = hoverT;',
      'input.yaw = lx * 0.12 * sens;\n    input.throttle = (typeof window.__FPV_THROTTLE === "number") ? window.__FPV_THROTTLE : hoverT;'
    );
  }

  // === PATCH: botão câmera no modo player (walk) ===
  code = code.replace(
    "showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');",
    "showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-cam')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');"
  );

  // garantir btn-cam visível no CSS mobile landscape
  const styleFix = document.createElement('style');
  styleFix.textContent = '@media (max-height:420px) and (orientation:landscape){#btn-cam{display:block!important}} #btn-cam{display:block}';
  document.head.appendChild(styleFix);

  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));

  setTimeout(function () {
    var el = document.getElementById('loading');
    if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  }, 500);
} catch (e) {
  console.error(e);
  fail('Não foi possível baixar o jogo.<br>Verifique a internet e tente de novo.');
}
