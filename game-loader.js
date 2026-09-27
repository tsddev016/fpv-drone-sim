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

code = code.replace(/import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?/, "import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';");
code = code.replace("let mode = isTouchDevice ? 'angle' : 'acro';", "let mode = 'acro';");
code = code.replace(/maxRate:\s*saved\.rate\s*\?\?\s*800/, 'maxRate: saved.rate ?? 1400');
code = code.replace('input.pitch = -ry * sens;\n    input.roll = rx * sens;', 'input.pitch = ry * sens;\n    input.roll = -rx * sens;');
code = code.replace('input.pitch = applyExpo(applyDeadzone(-sticks.right.y, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(sticks.right.x, dz), expo) * sens;', 'input.pitch = applyExpo(applyDeadzone(sticks.right.y, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(-sticks.right.x, dz), expo) * sens;');
code = code.replace("if (k['ArrowUp']) input.pitch = -1;\n    if (k['ArrowDown']) input.pitch = 1;\n    if (k['ArrowLeft']) input.roll = -1;\n    if (k['ArrowRight']) input.roll = 1;", "if (k['ArrowUp']) input.pitch = 1;\n    if (k['ArrowDown']) input.pitch = -1;\n    if (k['ArrowLeft']) input.roll = 1;\n    if (k['ArrowRight']) input.roll = -1;");
code = code.replace('input.pitch = applyExpo(applyDeadzone(pad.axes[3] || 0, dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(pad.axes[2] || 0, dz), expo) * sens;', 'input.pitch = applyExpo(applyDeadzone(-(pad.axes[3] || 0), dz), expo) * sens;\n    input.roll = applyExpo(applyDeadzone(-(pad.axes[2] || 0), dz), expo) * sens;');
code = code.replace('throttle = input.throttle;\n}', 'if (typeof window.__FPV_CLIMB === "number") {\n    let c = window.__FPV_CLIMB;\n    c = c > 0.5 ? 1 : c < -0.5 ? -1 : 0;\n    input.throttle = c === 0 ? 0.5 : (c > 0 ? 0.95 : 0.08);\n  } else if (typeof window.__FPV_THROTTLE === "number") {\n    input.throttle = Math.max(0, Math.min(1, window.__FPV_THROTTLE));\n  }\n  throttle = input.throttle;\n}');
code = code.replace('input.yaw = lx * 0.12 * sens;\n    input.throttle = hoverT;', 'input.yaw = lx * 0.12 * sens;\n    input.throttle = (typeof window.__FPV_CLIMB === "number") ? (window.__FPV_CLIMB > 0.5 ? 0.95 : window.__FPV_CLIMB < -0.5 ? 0.08 : 0.5) : ((typeof window.__FPV_THROTTLE === "number") ? window.__FPV_THROTTLE : hoverT);');
code = code.replace("if (mode === 'angle' || controlScheme === 'arcade') {", "if (mode === 'angle') {");
code = code.replace('let targetWx = input.pitch * maxRateRad;\n  let targetWy = input.yaw * maxRateRad * 0.5;\n  let targetWz = input.roll * maxRateRad;', 'let rateMul = (mode === "acro") ? 1.6 : 1;\n  let targetWx = input.pitch * maxRateRad * rateMul;\n  let targetWy = input.yaw * maxRateRad * 0.7 * rateMul;\n  let targetWz = input.roll * maxRateRad * rateMul;');
code = code.replace('const angAccel = 28;', 'const angAccel = (mode === "acro") ? 55 : 32;');
code = code.replace('if (stickMag < 0.06) angularVelocity.multiplyScalar(0.88);', 'if (stickMag < 0.04) angularVelocity.multiplyScalar(mode === "acro" ? 0.92 : 0.88);\n  else if (mode === "acro") angularVelocity.multiplyScalar(0.995);');
code = code.replace('playerMesh.visible = false;', 'playerMesh.visible = true;');
code = code.replace(
  'const force = up.clone().multiplyScalar(thrustMul);\n  force.y -= CONFIG.mass * CONFIG.gravity;\n  if (controlScheme === \'arcade\' && (Math.abs(input.moveX) > 0.02 || Math.abs(input.moveY) > 0.02)) {\n    const yawOnly = new THREE.Euler().setFromQuaternion(drone.quaternion, \'YXZ\');\n    const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawOnly.y, 0));\n    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(facing);\n    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);\n    const accel = 12;\n    force.add(forward.multiplyScalar(input.moveY * accel * CONFIG.mass));\n    force.add(right.multiplyScalar(input.moveX * accel * CONFIG.mass));\n  }\n  const drag = 0.12 * (1 + velocity.length() * 0.04);\n  force.x -= velocity.x * drag * CONFIG.mass;\n  force.y -= velocity.y * drag * CONFIG.mass * 0.85;\n  force.z -= velocity.z * drag * CONFIG.mass;\n  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));',
  'let climb = (typeof window.__FPV_CLIMB === "number") ? window.__FPV_CLIMB : 0;\n' +
  '  climb = climb > 0.5 ? 1 : climb < -0.5 ? -1 : 0;\n' +
  '  {\n' +
  '    const uy = Math.max(0.25, Math.abs(up.y) < 0.15 ? 0.15 : up.y);\n' +
  '    const hoverThrust = (CONFIG.mass * CONFIG.gravity) / Math.max(0.35, Math.abs(uy));\n' +
  '    if (climb === 0) {\n' +
  '      thrustMul = (uy > 0.2) ? hoverThrust : hoverThrust * 0.25;\n' +
  '      holdAlt = null;\n' +
  '      if (velocity.y > 0.08) velocity.y *= 0.4;\n' +
  '    } else {\n' +
  '      thrustMul = hoverThrust + climb * CONFIG.maxThrust * 0.9;\n' +
  '      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.2);\n' +
  '      holdAlt = null;\n' +
  '    }\n' +
  '    throttle = THREE.MathUtils.clamp(thrustMul / Math.max(0.01, CONFIG.maxThrust), 0, 1);\n' +
  '  }\n' +
  '  const force = up.clone().multiplyScalar(thrustMul);\n' +
  '  force.y -= CONFIG.mass * CONFIG.gravity;\n' +
  '  if (climb === 0) {\n' +
  '    force.y += (-velocity.y * 8) * CONFIG.mass;\n' +
  '    if (Math.abs(velocity.y) < 0.1) velocity.y = 0;\n' +
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
  '  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));\n' +
  '  {\n' +
  '    const w = window.__FPV_WIND || { x: 0, z: 0 };\n' +
  '    velocity.x += (w.x || 0) * dt * 1.8;\n' +
  '    velocity.z += (w.z || 0) * dt * 1.8;\n' +
  '    if (window.__FPV_AIRBRAKE) {\n' +
  '      velocity.x *= Math.pow(0.88, dt * 60);\n' +
  '      velocity.z *= Math.pow(0.88, dt * 60);\n' +
  '      velocity.y *= Math.pow(0.94, dt * 60);\n' +
  '      angularVelocity.multiplyScalar(Math.pow(0.92, dt * 60));\n' +
  '    }\n' +
  '    if (window.__FPV_TURBO) {\n' +
  '      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(drone.quaternion);\n' +
  '      velocity.addScaledVector(forward, 14 * dt);\n' +
  '      velocity.y += up.y * 4 * dt;\n' +
  '    }\n' +
  '  }'
);
code = code.replace("if (controlScheme === 'arcade') {\n    const anyMove = stickMag > 0.05;\n    if (anyMove) {\n      if (holdAlt === null) holdAlt = drone.position.y;\n    } else {\n      holdAlt = null;\n    }\n    if (holdAlt !== null) {\n      const err = holdAlt - drone.position.y;\n      const climbCmd = THREE.MathUtils.clamp(err * 1.8 - velocity.y * 1.2, -0.35, 0.35);\n      const uy = Math.max(0.55, up.y);\n      thrustMul = ((CONFIG.mass * CONFIG.gravity) + climbCmd * CONFIG.mass * 9) / uy;\n      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.05);\n      throttle = THREE.MathUtils.clamp(thrustMul / CONFIG.maxThrust, 0, 1);\n    }\n  }", "if (controlScheme === 'arcade' && mode !== 'acro') {\n    const anyMove = stickMag > 0.05;\n    if (anyMove) {\n      if (holdAlt === null) holdAlt = drone.position.y;\n    } else {\n      holdAlt = null;\n    }\n    if (holdAlt !== null) {\n      const err = holdAlt - drone.position.y;\n      const climbCmd = THREE.MathUtils.clamp(err * 1.8 - velocity.y * 1.2, -0.35, 0.35);\n      const uy = Math.max(0.55, up.y);\n      thrustMul = ((CONFIG.mass * CONFIG.gravity) + climbCmd * CONFIG.mass * 9) / uy;\n      thrustMul = THREE.MathUtils.clamp(thrustMul, 0, CONFIG.maxThrust * 1.05);\n      throttle = THREE.MathUtils.clamp(thrustMul / CONFIG.maxThrust, 0, 1);\n    }\n  }");
code = code.replace(
  'velocity.y = THREE.MathUtils.clamp(velocity.y, -20, 12);',
  'velocity.y = THREE.MathUtils.clamp(velocity.y, -28, 22);\n' +
  '  {\n' +
  '    const spd = velocity.length();\n' +
  '    const tumble = angularVelocity.length();\n' +
  '    if (tumble > 1.5) {\n' +
  '      const loss = Math.min(0.35, (tumble - 1.5) * 0.08);\n' +
  '      velocity.multiplyScalar(Math.max(0.82, 1 - loss * dt * 8));\n' +
  '    }\n' +
  '    if (velocity.y > 1.2) {\n' +
  '      const climbDrag = Math.min(0.25, velocity.y * 0.03);\n' +
  '      velocity.x *= Math.max(0.9, 1 - climbDrag * dt * 6);\n' +
  '      velocity.z *= Math.max(0.9, 1 - climbDrag * dt * 6);\n' +
  '    }\n' +
  '    if (velocity.y < -2.5) {\n' +
  '      const dive = Math.min(1.8, -velocity.y * 0.12);\n' +
  '      const dir = new THREE.Vector3(velocity.x, 0, velocity.z);\n' +
  '      if (dir.lengthSq() > 0.01) {\n' +
  '        dir.normalize().multiplyScalar(dive * dt * 6);\n' +
  '        velocity.x += dir.x; velocity.z += dir.z;\n' +
  '      }\n' +
  '    }\n' +
  '    if (spd > 8) velocity.multiplyScalar(1 - Math.min(0.08, (spd - 8) * 0.004) * dt * 10);\n' +
  '  }'
);
code = code.replace(
  'if (nextPos.y < 0.08) {\n    nextPos.y = 0.08;\n    if (velocity.y < 0) velocity.y = 0;\n    velocity.x *= 0.6; velocity.z *= 0.6;\n    angularVelocity.multiplyScalar(0.4);\n    holdAlt = null;\n  }',
  'if (nextPos.y < 0.08) {\n    const impactSpd = velocity.length();\n    nextPos.y = 0.08;\n    if (velocity.y < 0) velocity.y = 0;\n    velocity.x *= 0.55; velocity.z *= 0.55;\n    angularVelocity.multiplyScalar(0.35);\n    holdAlt = null;\n    if (impactSpd > 2.5 && typeof window.__FPV_CAM_HIT === \'function\') window.__FPV_CAM_HIT(impactSpd);\n  }'
);
code = code.replace("showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');", "showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-cam')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');");
code = code.replace(/const MAPS = \{[\s\S]*?\};/, `const MAPS = {
  abandoned: { name: 'Cidade Abandonada', icon: 'A', fog: 0x6a7a88, ground: 0x4a4a42, sky: 0x6a7a88 },
  city: { name: 'Cidade Ativa', icon: 'C', fog: 0x87b0d0, ground: 0x3a3a40, sky: 0x87b0d0 },
  freestyle: { name: 'Freestyle', icon: 'F', fog: 0x6a8faf, ground: 0x4a5a3a, sky: 0x6a8faf },
  forest_night: { name: 'Floresta Noturna', icon: 'N', fog: 0x050510, ground: 0x1a1a14, sky: 0x050510 },
  racing: { name: 'Racing', icon: 'R', fog: 0x87CEEB, ground: 0x3a7d3a, sky: 0x87CEEB },
};`);
code = code.replace("if (mn) mn.textContent = m.name.toUpperCase();", "window.__FPV_CURRENT_MAP = mapId;\n  window.__FPV_SCENE = scene;\n  window.__FPV_DRONE = drone;\n  window.__FPV_CAMERA = camera;\n  window.THREE = THREE;\n  if (typeof window.__FPV_AFTER_MAP === 'function') { try { window.__FPV_AFTER_MAP(mapId, scene, addEnv, THREE, drone, camera); } catch(e) { console.warn(e); } }\n  if (mn) mn.textContent = m.name.toUpperCase();");

// Tutorial facil — 8 passos
code = code.replace(
  /const TUTORIAL_STEPS = \[[\s\S]*?\];/,
  `const TUTORIAL_STEPS = [
  { t: 'Bem-vindo!', d: 'Mova qualquer stick na tela ou aperte W no teclado.', o: 'Mover o controle', check: () => sticks.left.active || sticks.right.active || !!(window._keys && (window._keys.KeyW || window._keys.ArrowUp)) },
  { t: 'Subir', d: 'Aperte SOBE (direita), R1 ou PageUp. Suba ate uns 3 metros.', o: 'Altitude >= 3 m', check: () => drone.position.y >= 3 },
  { t: 'Pairar', d: 'Aperte PARA (botao do meio), L3 ou Home. Fique entre 3 e 10 m.', o: 'Ficar pairando', check: () => drone.position.y >= 3 && drone.position.y <= 10 },
  { t: 'Ir em frente', d: 'Empurre o stick esquerdo para cima (ou W) e avance.', o: 'Avancar no mapa', check: () => drone.position.z < -12 },
  { t: 'Virar', d: 'Gire o drone (yaw) com o stick esquerdo para os lados ou A/D.', o: 'Girar o drone', check: () => { const e = new THREE.Euler().setFromQuaternion(drone.quaternion, 'YXZ'); return Math.abs(e.y) > 0.5; } },
  { t: 'Inclinar', d: 'Use o stick direito para inclinar (pitch/roll). No teclado: setas.', o: 'Inclinar o drone', check: () => { const up = new THREE.Vector3(0,1,0).applyQuaternion(drone.quaternion); return Math.sqrt(up.x*up.x+up.z*up.z) > 0.25; } },
  { t: 'Camera e modo', d: 'Toque no botao CAM e no botao MODO (ou C e M no teclado).', o: 'Trocar CAM ou MODO', check: () => camMode === 'chase' || window.__tutCamToggled || window.__tutModeToggled || mode === 'angle' },
  { t: 'Pronto!', d: 'Voce ja sabe o basico. Explore os mapas e a loja. Bom voo!', o: 'Manter no ar', check: () => drone.position.y > 1.5 },
];`
);
code = code.replace('if (tutorialStep === 3 || tutorialStep === 14) {', 'if (tutorialStep === 2) {');

window.__FPV_CLIMB = 0;
const blob = new Blob([code], { type: 'text/javascript' });
await import(URL.createObjectURL(blob));
setTimeout(function () {
  var el = document.getElementById('loading');
  if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  const ml = document.getElementById('mode-label');
  if (ml) ml.textContent = 'ACRO';
  const bm = document.getElementById('btn-mode');
  if (bm) bm.textContent = 'MODO: ACRO';
}, 900);
} catch (e) {
  console.error(e);
  if (typeof fail === 'function') fail('Nao foi possivel baixar o jogo.');
}
