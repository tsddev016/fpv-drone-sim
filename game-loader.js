try {
const URLS = [
  'https://cdn.jsdelivr.net/gh/tsddev016/fpv-drone-sim@38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js',
  'https://raw.githubusercontent.com/tsddev016/fpv-drone-sim/38af95524f1acbac5f243d4dc1ed4a2d13fa2d19/app.js'
];
let code = null, lastErr = null;
for (const u of URLS) {
  try {
    const res = await fetch(u, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    code = await res.text();
    if (code && code.length > 1000 && code.includes('function init')) break;
    code = null;
  } catch (e) { lastErr = e; code = null; }
}
if (!code) throw lastErr || new Error('nao carregou');

code = code.replace(
  /import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?/,
  "import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';"
);

// SEMPRE comeca em ACRO (mesmo no celular) — permite 360
code = code.replace(
  "let mode = isTouchDevice ? 'angle' : 'acro';",
  "let mode = 'acro';"
);

// rates altos pra flip/roll (deg/s)
code = code.replace(/maxRate:\s*saved\.rate\s*\?\?\s*800/, 'maxRate: saved.rate ?? 1400');
code = code.replace(/gravity:\s*9\.81/, 'gravity: 9.81');

// sticks invertidos naturais
code = code.replace(
  'input.pitch = -ry * sens;\n    input.roll = rx * sens;',
  'input.pitch = ry * sens;\n    input.roll = -rx * sens;'
);
code = code.replace(
  'input.pitch = applyExpo(applyDeadzone(-sticks.right.y, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(sticks.right.x, dz), expo) * sens;',
  'input.pitch = applyExpo(applyDeadzone(sticks.right.y, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(-sticks.right.x, dz), expo) * sens;'
);
code = code.replace(
  "if (k['ArrowUp']) input.pitch = -1;\n    if (k['ArrowDown']) input.pitch = 1;\n    if (k['ArrowLeft']) input.roll = -1;\n    if (k['ArrowRight']) input.roll = 1;",
  "if (k['ArrowUp']) input.pitch = 1;\n    if (k['ArrowDown']) input.pitch = -1;\n    if (k['ArrowLeft']) input.roll = 1;\n    if (k['ArrowRight']) input.roll = -1;"
);
code = code.replace(
  'input.pitch = applyExpo(applyDeadzone(pad.axes[3] || 0, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(pad.axes[2] || 0, dz), expo) * sens;',
  'input.pitch = applyExpo(applyDeadzone(-(pad.axes[3] || 0), dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(-(pad.axes[2] || 0), dz), expo) * sens;'
);

// climb stick no fim do readInput
code = code.replace(
  'throttle = input.throttle;\n}',
  'if (typeof window.__FPV_CLIMB === "number") {\n' +
  '    const c = window.__FPV_CLIMB;\n' +
  '    input.throttle = Math.max(0.05, Math.min(1, 0.5 + c * 0.5));\n' +
  '  } else if (typeof window.__FPV_THROTTLE === "number") {\n' +
  '    input.throttle = Math.max(0, Math.min(1, window.__FPV_THROTTLE));\n' +
  '  }\n' +
  '  throttle = input.throttle;\n' +
  '  window.__FPV_THROTTLE_PATCH = 1;\n' +
  '}'
);
code = code.replace(
  'input.yaw = lx * 0.12 * sens;\n    input.throttle = hoverT;',
  'input.yaw = lx * 0.12 * sens;\n    input.throttle = (typeof window.__FPV_CLIMB === "number") ? Math.max(0.05, Math.min(1, 0.5 + window.__FPV_CLIMB * 0.5)) : ((typeof window.__FPV_THROTTLE === "number") ? window.__FPV_THROTTLE : hoverT);'
);

// CRITICO: so limita angulo no modo ANGLE — acro e livre (360)
code = code.replace(
  "if (mode === 'angle' || controlScheme === 'arcade') {",
  "if (mode === 'angle') {"
);

// rates mais agressivos no acro
code = code.replace(
  'let targetWx = input.pitch * maxRateRad;\n  let targetWy = input.yaw * maxRateRad * 0.5;\n  let targetWz = input.roll * maxRateRad;',
  'let rateMul = (mode === "acro") ? 1.6 : 1;\n  let targetWx = input.pitch * maxRateRad * rateMul;\n  let targetWy = input.yaw * maxRateRad * 0.7 * rateMul;\n  let targetWz = input.roll * maxRateRad * rateMul;'
);
code = code.replace('const angAccel = 28;', 'const angAccel = (mode === "acro") ? 55 : 32;');
code = code.replace('const kp = 10;', 'const kp = 12;');

// menos damping angular quando tem stick (manobras fluidas)
code = code.replace(
  'if (stickMag < 0.06) angularVelocity.multiplyScalar(0.88);',
  'if (stickMag < 0.04) angularVelocity.multiplyScalar(mode === "acro" ? 0.92 : 0.88);\n  else if (mode === "acro") angularVelocity.multiplyScalar(0.995);'
);

// personagem visivel
code = code.replace('playerMesh.visible = false;', 'playerMesh.visible = true;');

// FISICA: climb bipolar + sem subir sozinho + tilt impulso
code = code.replace(
  'const force = up.clone().multiplyScalar(thrustMul);\n  force.y -= CONFIG.mass * CONFIG.gravity;\n  if (controlScheme === \'arcade\' && (Math.abs(input.moveX) > 0.02 || Math.abs(input.moveY) > 0.02)) {\n    const yawOnly = new THREE.Euler().setFromQuaternion(drone.quaternion, \'YXZ\');\n    const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawOnly.y, 0));\n    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(facing);\n    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);\n    const accel = 12;\n    force.add(forward.multiplyScalar(input.moveY * accel * CONFIG.mass));\n    force.add(right.multiplyScalar(input.moveX * accel * CONFIG.mass));\n  }\n  const drag = 0.12 * (1 + velocity.length() * 0.04);\n  force.x -= velocity.x * drag * CONFIG.mass;\n  force.y -= velocity.y * drag * CONFIG.mass * 0.85;\n  force.z -= velocity.z * drag * CONFIG.mass;\n  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));',
  'const climb = (typeof window.__FPV_CLIMB === "number") ? window.__FPV_CLIMB : 0;\n' +
  '  {\n' +
  '    const uy = Math.max(0.25, Math.abs(up.y) < 0.15 ? 0.15 : up.y);\n' +
  '    const hoverThrust = (CONFIG.mass * CONFIG.gravity) / Math.max(0.35, Math.abs(uy));\n' +
  '    if (Math.abs(climb) < 0.08) {\n' +
  '      thrustMul = hoverThrust * (uy > 0 ? 1 : 0.3);\n' +
  '      holdAlt = null;\n' +
  '    } else {\n' +
  '      thrustMul = hoverThrust + climb * CONFIG.maxThrust * 0.85;\n' +
  '      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.15);\n' +
  '      holdAlt = null;\n' +
  '    }\n' +
  '    throttle = THREE.MathUtils.clamp(thrustMul / CONFIG.maxThrust, 0, 1);\n' +
  '  }\n' +
  '  const force = up.clone().multiplyScalar(thrustMul);\n' +
  '  force.y -= CONFIG.mass * CONFIG.gravity;\n' +
  '  if (Math.abs(climb) < 0.08) {\n' +
  '    force.y += (-velocity.y * 6) * CONFIG.mass;\n' +
  '    if (Math.abs(velocity.y) < 0.12) velocity.y = 0;\n' +
  '  }\n' +
  '  if (controlScheme === \'arcade\' && mode !== \'acro\' && (Math.abs(input.moveX) > 0.02 || Math.abs(input.moveY) > 0.02)) {\n' +
  '    const yawOnly = new THREE.Euler().setFromQuaternion(drone.quaternion, \'YXZ\');\n' +
  '    const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawOnly.y, 0));\n' +
  '    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(facing);\n' +
  '    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);\n' +
  '    const accel = 14;\n' +
  '    force.add(forward.multiplyScalar(input.moveY * accel * CONFIG.mass));\n' +
  '    force.add(right.multiplyScalar(input.moveX * accel * CONFIG.mass));\n' +
  '  }\n' +
  '  {\n' +
  '    const tiltPower = (mode === "acro") ? 28 : 18;\n' +
  '    force.x += up.x * tiltPower * CONFIG.mass * Math.max(0.15, throttle);\n' +
  '    force.z += up.z * tiltPower * CONFIG.mass * Math.max(0.15, throttle);\n' +
  '  }\n' +
  '  const drag = 0.11 * (1 + velocity.length() * 0.045);\n' +
  '  force.x -= velocity.x * drag * CONFIG.mass;\n' +
  '  force.y -= velocity.y * drag * CONFIG.mass * 0.65;\n' +
  '  force.z -= velocity.z * drag * CONFIG.mass;\n' +
  '  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));'
);

// desliga holdAlt automatico no arcade quando acro
code = code.replace(
  "if (controlScheme === 'arcade') {\n    const anyMove = stickMag > 0.05;\n    if (anyMove) {\n      if (holdAlt === null) holdAlt = drone.position.y;\n    } else {\n      holdAlt = null;\n    }\n    if (holdAlt !== null) {\n      const err = holdAlt - drone.position.y;\n      const climbCmd = THREE.MathUtils.clamp(err * 1.8 - velocity.y * 1.2, -0.35, 0.35);\n      const uy = Math.max(0.55, up.y);\n      thrustMul = ((CONFIG.mass * CONFIG.gravity) + climbCmd * CONFIG.mass * 9) / uy;\n      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.05);\n      throttle = THREE.MathUtils.clamp(thrustMul / CONFIG.maxThrust, 0, 1);\n    }\n  }",
  "if (controlScheme === 'arcade' && mode !== 'acro') {\n    const anyMove = stickMag > 0.05;\n    if (anyMove) {\n      if (holdAlt === null) holdAlt = drone.position.y;\n    } else {\n      holdAlt = null;\n    }\n    if (holdAlt !== null) {\n      const err = holdAlt - drone.position.y;\n      const climbCmd = THREE.MathUtils.clamp(err * 1.8 - velocity.y * 1.2, -0.35, 0.35);\n      const uy = Math.max(0.55, up.y);\n      thrustMul = ((CONFIG.mass * CONFIG.gravity) + climbCmd * CONFIG.mass * 9) / uy;\n      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.05);\n      throttle = THREE.MathUtils.clamp(thrustMul / CONFIG.maxThrust, 0, 1);\n    }\n  }"
);

code = code.replace(
  'velocity.y = THREE.MathUtils.clamp(velocity.y, -20, 12);',
  'velocity.y = THREE.MathUtils.clamp(velocity.y, -25, 25);'
);

code = code.replace(
  "showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');",
  "showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-cam')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');"
);

code = code.replace(
  "for (let i = 0; i < 4; i++) {\n      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xff8800 }));\n      ring.position.set((i % 2 === 0 ? 6 : -6), 2.5 + (i % 3), -45 - i * 22);\n      ring.rotation.y = Math.PI / 2; addEnv(ring);\n    }",
  "for (let i = 0; i < 8; i++) {\n      const col = i % 2 === 0 ? 0xff6600 : 0x00aaff;\n      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.14, 10, 28), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.25 }));\n      ring.position.set((i % 2 === 0 ? 7 : -7), 2.8 + (i % 4), -30 - i * 18);\n      ring.rotation.y = Math.PI / 2; addEnv(ring);\n    }"
);

code = code.replace(
  "const prop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.003, 0.02), propMat);\n    prop.position.set(pos[0], pos[1] + 0.018, pos[2]);\n    prop.userData.spinDir = (i % 2 === 0) ? 1 : -1; drone.add(prop); props.push(prop);",
  "const propG = new THREE.Group();\n    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.002, 0.022), propMat);\n    const b2 = b1.clone(); b2.rotation.y = Math.PI/2; propG.add(b1); propG.add(b2);\n    propG.position.set(pos[0], pos[1] + 0.022, pos[2]);\n    propG.userData.spinDir = (i % 2 === 0) ? 1 : -1; drone.add(propG); props.push(propG);"
);

const styleFix = document.createElement('style');
styleFix.textContent = '#btn-cam{display:block!important}';
document.head.appendChild(styleFix);

window.__FPV_CLIMB = 0;

const blob = new Blob([code], { type: 'text/javascript' });
await import(URL.createObjectURL(blob));

setTimeout(function () {
  var el = document.getElementById('loading');
  if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  function applyHud() {
    const hud = document.getElementById('hud');
    const ch = document.getElementById('crosshair');
    const style = (document.getElementById('cfg-hud') || {}).value || localStorage.getItem('fpv_hud') || 'classic';
    const stats = (document.getElementById('cfg-hud-stats') || {}).value || localStorage.getItem('fpv_hud_stats') || 'on';
    const cross = (document.getElementById('cfg-crosshair') || {}).value || localStorage.getItem('fpv_crosshair') || 'on';
    if (hud) {
      hud.classList.remove('hud-classic','hud-minimal','hud-race','hud-military','hud-off');
      hud.classList.add('hud-' + style);
      const tl = hud.querySelector('.top-left'), tr = hud.querySelector('.top-right');
      if (tl) tl.style.display = stats === 'off' ? 'none' : '';
      if (tr) tr.style.display = stats === 'off' ? 'none' : '';
    }
    if (ch) ch.classList.toggle('off', cross === 'off');
    try {
      localStorage.setItem('fpv_hud', style);
      localStorage.setItem('fpv_hud_stats', stats);
      localStorage.setItem('fpv_crosshair', cross);
    } catch (e) {}
  }
  ['cfg-hud','cfg-hud-stats','cfg-crosshair'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.onchange = applyHud;
  });
  const fm = document.getElementById('cfg-flight-mode');
  if (fm) {
    fm.value = 'acro';
    fm.onchange = function () { localStorage.setItem('fpv_flight_mode', fm.value); };
  }
  applyHud();
  const ml = document.getElementById('mode-label');
  if (ml) ml.textContent = 'ACRO';
  const bm = document.getElementById('btn-mode');
  if (bm) bm.textContent = 'MODO: ACRO';
}, 900);
} catch (e) {
  console.error(e);
  if (typeof fail === 'function') fail('Nao foi possivel baixar o jogo.<br>Verifique a internet.');
}
