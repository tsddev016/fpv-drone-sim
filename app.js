import * as THREE from 'three';

// Carrega o jogo do mesmo repositório (commit com o código completo)
// Sem isso o site fica no loading para sempre.
setTimeout(function () {
  try {
    var el = document.getElementById('loading');
    if (el && !el.classList.contains('hidden')) {
      el.classList.add('hidden');
      el.dataset.done = '1';
    }
  } catch (e) {}
}, 12000);

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
  // remove import three — já importamos acima
  code = code.replace(/^import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?\s*/m, '');
  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
  setTimeout(function () {
    var el = document.getElementById('loading');
    if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  }, 400);
} catch (e) {
  console.error(e);
  fail('Não foi possível baixar o jogo.<br>Verifique a internet e tente de novo.');
}
