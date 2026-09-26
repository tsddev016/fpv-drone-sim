import * as THREE from 'three';

// Nunca ficar preso no loading
setTimeout(function () {
  try {
    var el = document.getElementById('loading');
    if (el && !el.classList.contains('hidden')) {
      el.classList.add('hidden');
      el.dataset.done = '1';
    }
  } catch (e) {}
}, 6000);

function showFriendlyError(msg) {
  var el = document.getElementById('loading');
  if (!el) return;
  el.innerHTML =
    '<div style="max-width:320px;margin:40px auto;padding:28px;text-align:center;font-family:system-ui;color:#cfe;background:rgba(6,18,12,0.95);border:1px solid rgba(0,200,120,0.25);border-radius:16px">' +
    '<div style="font-size:22px">🚁</div><div style="font-weight:700;margin:8px 0">FPV Drone Sim</div>' +
    '<div style="font-size:13px;opacity:0.65;margin-bottom:16px">' +
    (msg || 'Não foi possível iniciar.<br>Atualize a página.') +
    '</div>' +
    '<button type="button" onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">Tentar de novo</button></div>';
  el.classList.remove('hidden');
}

try {
  const RESCUE_URL =
    'https://cdn.jsdelivr.net/gh/tsddev016/fpv-drone-sim@38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js';
  const FALLBACK_URL =
    'https://raw.githubusercontent.com/tsddev016/fpv-drone-sim/38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js';

  let res;
  try {
    res = await fetch(RESCUE_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('cdn');
  } catch (_) {
    res = await fetch(FALLBACK_URL, { cache: 'no-store' });
  }
  if (!res.ok) throw new Error('load');
  let code = await res.text();
  if (!code || code.length < 1000) throw new Error('empty');

  // Mass helpers (safe, small patches)
  if (!code.includes('function thrustToWeight')) {
    code = code.replace(
      'quality: saved.quality ?? \'medium\', soundOn: saved.sound !== \'off\', volume: saved.vol ?? 0.4,\n};',
      'quality: saved.quality ?? \'medium\', soundOn: saved.sound !== \'off\', volume: saved.vol ?? 0.4,\n};\nfunction thrustToWeight(){return CONFIG.maxThrust/Math.max(0.05,CONFIG.mass*CONFIG.gravity);}\nfunction weightClass(m){m=m??CONFIG.mass;if(m<=0.35)return\'ULTRA LEVE\';if(m<=0.50)return\'LEVE\';if(m<=0.65)return\'MEDIO\';if(m<=0.85)return\'PESADO\';return\'TANQUE\';}\nfunction inertiaFactor(){return THREE.MathUtils.clamp(CONFIG.mass/0.55,0.55,2.2);}\nfunction accelFactor(){return THREE.MathUtils.clamp(thrustToWeight()/4.0,0.45,1.8);}\nfunction gravityLabel(g){g=g??CONFIG.gravity;if(g<0.2)return\'ZERO-G\';if(g<2.5)return\'LUA\';if(g<5)return\'MARTE\';if(g<12)return\'TERRA\';return\'ALTA-G\';}'
    );
    code = code.replace(
      'gravity: 9.81, mass: saved.mass ?? 0.55',
      'gravity: (typeof saved.gravity===\'number\'?saved.gravity:9.81), mass: saved.mass ?? 0.55'
    );
    code = code.replace(
      'map: currentMap, mass: CONFIG.mass, thrust: CONFIG.maxThrust, rate: CONFIG.maxRate,',
      'map: currentMap, mass: CONFIG.mass, thrust: CONFIG.maxThrust, rate: CONFIG.maxRate, gravity: CONFIG.gravity,'
    );
  }

  // Garantir que loading some no fim do init
  code = code.replace(
    'try { init(); } catch (e) { console.error(e); const el = document.getElementById(\'loading\'); if (el) el.innerHTML = \'<div style="color:#0f0;padding:24px">Erro: \' + e.message + \'</div>\'; }',
    'try { init(); setTimeout(function(){var el=document.getElementById("loading");if(el){el.classList.add("hidden");el.dataset.done="1";}},500); } catch (e) { console.error(e); var el=document.getElementById("loading"); if(el){ el.classList.add("hidden"); } }'
  );

  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
} catch (err) {
  console.error(err);
  showFriendlyError('Falha ao carregar o jogo.<br>Verifique a internet e tente de novo.');
}
