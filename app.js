import * as THREE from 'three';
/* MASS SYSTEM BUILD - full file uploaded from local enhanced app.js */
const SAVE_KEY = 'fpv_drone_sim_pro_v4';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } }
function saveData(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {} }
const saved = loadSave();
const CONFIG = {
  gravity: 9.81, mass: saved.mass ?? 0.55, maxThrust: saved.thrust ?? 22, drag: 0.08,
  maxRate: saved.rate ?? 800, expo: saved.expo ?? 0.3, sensitivity: saved.sens ?? 1.0,
  deadzone: saved.dead ?? 0.05, cameraFOV: saved.fov ?? 105, respawnHeight: 2.5,
  quality: saved.quality ?? 'medium', soundOn: saved.sound !== 'off', volume: saved.vol ?? 0.4,
};
function thrustToWeight() { return CONFIG.maxThrust / Math.max(0.05, CONFIG.mass * CONFIG.gravity); }
function weightClass(m) {
  m = m ?? CONFIG.mass;
  if (m <= 0.35) return 'ULTRA LEVE';
  if (m <= 0.50) return 'LEVE';
  if (m <= 0.65) return 'MEDIO';
  if (m <= 0.85) return 'PESADO';
  return 'TANQUE';
}
function inertiaFactor() { return THREE.MathUtils.clamp(CONFIG.mass / 0.55, 0.55, 2.2); }
function accelFactor() { return THREE.MathUtils.clamp(thrustToWeight() / 4.0, 0.45, 1.8); }

// Loader: fetch núcleo + aplica sistema de massa em cima
function showFriendlyError() {
  const el = document.getElementById('loading');
  if (!el) return;
  el.innerHTML = '<div style="max-width:320px;margin:40px auto;padding:28px;text-align:center;font-family:system-ui;color:#cfe;background:rgba(6,18,12,0.95);border:1px solid rgba(0,200,120,0.25);border-radius:16px"><div style="font-size:22px">🚁</div><div style="font-weight:700;margin:8px 0">FPV Drone Sim</div><div style="font-size:13px;opacity:0.65;margin-bottom:16px">Não foi possível iniciar.<br>Atualize a página.</div><button type="button" onclick="location.reload()" style="padding:10px 18px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">Tentar de novo</button></div>';
  el.classList.remove('hidden');
}

try {
  const RESCUE_URL = 'https://raw.githubusercontent.com/tsddev016/fpv-drone-sim/38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js';
  const res = await fetch(RESCUE_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('load');
  let code = await res.text();

  // --- Sistema de massa / peso ---
  if (!code.includes('function thrustToWeight')) {
    code = code.replace(
      'const CONFIG = {\n  gravity: 9.81, mass: saved.mass ?? 0.55, maxThrust: saved.thrust ?? 22, drag: 0.08,\n  maxRate: saved.rate ?? 800, expo: saved.expo ?? 0.3, sensitivity: saved.sens ?? 1.0,\n  deadzone: saved.dead ?? 0.05, cameraFOV: saved.fov ?? 105, respawnHeight: 2.5,\n  quality: saved.quality ?? \'medium\', soundOn: saved.sound !== \'off\', volume: saved.vol ?? 0.4,\n};',
      'const CONFIG = {\n  gravity: 9.81, mass: saved.mass ?? 0.55, maxThrust: saved.thrust ?? 22, drag: 0.08,\n  maxRate: saved.rate ?? 800, expo: saved.expo ?? 0.3, sensitivity: saved.sens ?? 1.0,\n  deadzone: saved.dead ?? 0.05, cameraFOV: saved.fov ?? 105, respawnHeight: 2.5,\n  quality: saved.quality ?? \'medium\', soundOn: saved.sound !== \'off\', volume: saved.vol ?? 0.4,\n};\nfunction thrustToWeight(){return CONFIG.maxThrust/Math.max(0.05,CONFIG.mass*CONFIG.gravity);}\nfunction weightClass(m){m=m??CONFIG.mass;if(m<=0.35)return\'ULTRA LEVE\';if(m<=0.50)return\'LEVE\';if(m<=0.65)return\'MEDIO\';if(m<=0.85)return\'PESADO\';return\'TANQUE\';}\nfunction inertiaFactor(){return THREE.MathUtils.clamp(CONFIG.mass/0.55,0.55,2.2);}\nfunction accelFactor(){return THREE.MathUtils.clamp(thrustToWeight()/4.0,0.45,1.8);}'
    );
    code = code.replace(
      `const DRONE_PRESETS = {\n  balanced: { name: 'Balanced', thrust: 22, mass: 0.55 },\n  racer: { name: 'Racer', thrust: 28, mass: 0.42 },\n  freestyle: { name: 'Freestyle', thrust: 24, mass: 0.5 },\n  cinewhoop: { name: 'Cinewhoop', thrust: 16, mass: 0.7 },\n};`,
      `const DRONE_PRESETS = {\n  whoop: { name: 'Whoop 65mm', thrust: 14, mass: 0.28 },\n  racer: { name: 'Racer 5"', thrust: 30, mass: 0.40 },\n  balanced: { name: 'Balanced', thrust: 22, mass: 0.55 },\n  freestyle: { name: 'Freestyle', thrust: 26, mass: 0.52 },\n  cinewhoop: { name: 'Cinewhoop', thrust: 18, mass: 0.78 },\n  heavy: { name: 'Carga / Pesado', thrust: 24, mass: 1.05 },\n};`
    );
    code = code.replace(
      'angularVelocity.x += (targetWx - angularVelocity.x) * Math.min(1, angAccel * dt);\n  angularVelocity.y += (targetWy - angularVelocity.y) * Math.min(1, angAccel * dt);\n  angularVelocity.z += (targetWz - angularVelocity.z) * Math.min(1, angAccel * dt);',
      'const I=inertiaFactor();const angMul=angAccel/I;angularVelocity.x+=(targetWx-angularVelocity.x)*Math.min(1,angMul*dt);angularVelocity.y+=(targetWy-angularVelocity.y)*Math.min(1,angMul*0.9*dt);angularVelocity.z+=(targetWz-angularVelocity.z)*Math.min(1,angMul*dt);'
    );
    code = code.replace(
      'const maxH = 16;\n  if (hVel > maxH) { velocity.x *= maxH / hVel; velocity.z *= maxH / hVel; }\n  velocity.y = THREE.MathUtils.clamp(velocity.y, -20, 12);',
      'const af=accelFactor();const maxH=THREE.MathUtils.clamp(14*af/Math.sqrt(inertiaFactor()),8,22);if(hVel>maxH){velocity.x*=maxH/hVel;velocity.z*=maxH/hVel;}const maxClimb=THREE.MathUtils.clamp(6*af,4,14);const maxDive=THREE.MathUtils.clamp(14+CONFIG.mass*6,14,28);velocity.y=THREE.MathUtils.clamp(velocity.y,-maxDive,maxClimb);'
    );
    code = code.replace(
      'force.add(forward.multiplyScalar(input.moveY * accel * CONFIG.mass));\n    force.add(right.multiplyScalar(input.moveX * accel * CONFIG.mass));',
      'const ax=accel*accelFactor();force.add(forward.multiplyScalar(input.moveY*ax*CONFIG.mass));force.add(right.multiplyScalar(input.moveX*ax*CONFIG.mass));'
    );
    code = code.replace(
      "card.innerHTML = '<div class=\"name\">' + p.name + '</div>';\n      card.addEventListener('click', () => {\n        CONFIG.maxThrust = p.thrust; CONFIG.mass = p.mass; persist();\n      });",
      "const twr=(p.thrust/(p.mass*9.81)).toFixed(1);card.innerHTML='<div class=\"name\">'+p.name+'</div><div style=\"font-size:10px;opacity:0.65;margin-top:4px\">'+p.mass.toFixed(2)+' kg · TWR '+twr+'x</div>';card.addEventListener('click',()=>{CONFIG.maxThrust=p.thrust;CONFIG.mass=p.mass;persist();const mt=document.getElementById('cfg-mass');const vt=document.getElementById('val-mass');if(mt)mt.value=p.mass;if(vt)vt.textContent=p.mass.toFixed(2)+' kg · '+weightClass(p.mass);const th=document.getElementById('cfg-thrust');const vh=document.getElementById('val-thrust');if(th)th.value=p.thrust;if(vh)vh.textContent=p.thrust+'N · TWR '+thrustToWeight().toFixed(1)+'x';});"
    );
    code = code.replace(
      "bind('cfg-thrust', 'val-thrust', 'maxThrust', v => v + 'N');\n  bind('cfg-mass', 'val-mass', 'mass', v => parseFloat(v).toFixed(2) + 'kg');",
      "bind('cfg-thrust','val-thrust','maxThrust',v=>parseFloat(v).toFixed(0)+'N · TWR '+thrustToWeight().toFixed(1)+'x');bind('cfg-mass','val-mass','mass',v=>parseFloat(v).toFixed(2)+' kg · '+weightClass(parseFloat(v)));const massEl=document.getElementById('cfg-mass');if(massEl){massEl.min='0.20';massEl.max='1.20';massEl.step='0.01';massEl.value=String(CONFIG.mass);}const thrustEl=document.getElementById('cfg-thrust');if(thrustEl){thrustEl.min='10';thrustEl.max='36';}"
    );
    code = code.replace(
      "if (s) s.textContent = velocity.length().toFixed(1);",
      "if (s) s.textContent = velocity.length().toFixed(1);let massHud=document.getElementById('mass');if(!massHud){const tl=document.querySelector('#hud .top-left');if(tl){const d=document.createElement('div');d.innerHTML='MAS <span id=\"mass\">0.55</span> kg · <span id=\"twr\">4.0</span>x';tl.appendChild(d);massHud=document.getElementById('mass');}}if(massHud)massHud.textContent=CONFIG.mass.toFixed(2);const twrEl=document.getElementById('twr');if(twrEl)twrEl.textContent=thrustToWeight().toFixed(1);"
    );
  }

  // Altitude buttons (existente)
  if (!code.includes('__FPV_ALT_INPUT')) {
    code = code.replace('let holdAlt = null;', 'let holdAlt = null;\nlet altInput = 0;\nObject.defineProperty(window,"__FPV_ALT_INPUT",{get(){return altInput},set(v){altInput=Math.max(-1,Math.min(1,Number(v)||0))},configurable:true});');
    if (!code.includes('alt-btn-up')) {
      code = code.replace(
        "sticks.right.base.addEventListener('touchstart', e => handleStart(e, 'right'), { passive: false });",
        "sticks.right.base.addEventListener('touchstart', e => handleStart(e, 'right'), { passive: false });\n(function(){if(document.getElementById('alt-controls'))return;const w=document.createElement('div');w.id='alt-controls';w.innerHTML='<button type=\"button\" id=\"alt-btn-up\">▲</button><button type=\"button\" id=\"alt-btn-down\">▼</button>';document.body.appendChild(w);const s=document.createElement('style');s.textContent='#alt-controls{position:fixed;right:max(12px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);z-index:40;display:flex;flex-direction:column;gap:10px}#alt-controls button{width:clamp(44px,12vmin,56px);height:clamp(44px,12vmin,56px);border-radius:14px;border:1px solid rgba(0,255,100,0.4);background:rgba(0,20,10,0.75);color:#0f0;font-size:20px;font-weight:700;cursor:pointer;touch-action:none}';document.head.appendChild(s);function bind(b,v){if(!b)return;const set=(x,e)=>{if(e)e.preventDefault();altInput=x;};['touchstart','mousedown'].forEach(ev=>b.addEventListener(ev,e=>set(v,e),{passive:false}));['touchend','touchcancel','mouseup','mouseleave'].forEach(ev=>b.addEventListener(ev,e=>set(0,e),{passive:false}));}bind(document.getElementById('alt-btn-up'),1);bind(document.getElementById('alt-btn-down'),-1);})();"
      );
    }
  }

  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
} catch (_) {
  showFriendlyError();
}
