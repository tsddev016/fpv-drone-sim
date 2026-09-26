import * as THREE from 'three';

// Safety: some loading em no max 5s
setTimeout(function () {
  try {
    var el = document.getElementById('loading');
    if (el && !el.classList.contains('hidden')) {
      el.classList.add('hidden');
      el.dataset.done = '1';
    }
  } catch (e) {}
}, 5000);

function fail(msg) {
  var el = document.getElementById('loading');
  if (!el) return;
  el.innerHTML =
    '<div style="max-width:320px;margin:40px auto;padding:28px;text-align:center;font-family:system-ui;color:#cfe;background:rgba(6,18,12,0.95);border:1px solid rgba(0,200,120,0.25);border-radius:16px">' +
    '<div style="font-size:22px">🚁</div><div style="font-weight:700;margin:8px 0">FPV Drone Sim</div>' +
    '<div style="font-size:13px;opacity:0.65;margin-bottom:16px">' + (msg || 'Erro ao carregar') + '</div>' +
    '<button type="button" onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">Tentar de novo</button></div>';
  el.classList.remove('hidden');
}

try {
  // raw.githubusercontent costuma ser bem mais rápido que jsDelivr no BR
  const URL =
    'https://raw.githubusercontent.com/tsddev016/fpv-drone-sim/38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js';
  const res = await fetch(URL, { cache: 'force-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const code = await res.text();
  if (!code || code.length < 1000) throw new Error('arquivo vazio');
  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
  // reforço: esconder loading logo após import
  setTimeout(function () {
    var el = document.getElementById('loading');
    if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  }, 400);
} catch (e) {
  console.error(e);
  fail('Falha na rede. Verifique a internet e tente de novo.');
}
