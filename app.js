// Loader + patches v2: climb bipolar, manobras, cam player
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
  if (!code) throw lastErr || new Error('nao carregou');

  code = code.replace(
    /import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?/,
    "import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';"
  );

  // gravidade leve — climb command manda na vertical
  code = code.replace(/gravity:\s*9\.81/, 'gravity: 2.5');

  // inverter sticks
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

  // climb bipolar no final do readInput
  code = code.replace(
    'throttle = input.throttle;\n}',
    'if (typeof window.__FPV_CLIMB === "number") {\n' +
      '    const c = window.__FPV_CLIMB;\n' +
      '    input.throttle = Math.max(0, Math.min(1, 0.45 + c * 0.55));\n' +
      '  } else if (typeof window.__FPV_THROTTLE === "number") {\n' +
      '    input.throttle = Math.max(0, Math.min(1, window.__FPV_THROTTLE));\n' +
      '  }\n' +
      '  throttle = input.throttle;\n' +
      '  window.__FPV_THROTTLE_PATCH = 1;\n' +
      '}'
  );

  code = code.replace(
    'input.yaw = lx * 0.12 * sens;\n    input.throttle = hoverT;',
    'input.yaw = lx * 0.12 * sens;\n    input.throttle = (typeof window.__FPV_CLIMB === "number") ? Math.max(0, Math.min(1, 0.45 + window.__FPV_CLIMB * 0.55)) : ((typeof window.__FPV_THROTTLE === "number") ? window.__FPV_THROTTLE : hoverT);'
  );

  // manobras mais fortes
  code = code.replace(
    "const maxTilt = THREE.MathUtils.degToRad(controlScheme === 'arcade' ? 35 : 50);",
    "const maxTilt = THREE.MathUtils.degToRad(controlScheme === 'arcade' ? 55 : 65);"
  );
  code = code.replace(
    'const kp = 10;',
    'const kp = controlScheme === "arcade" ? 14 : 12;'
  );
  code = code.replace(
    'const angAccel = 28;',
    'const angAccel = 36;'
  );
  code = code.replace(
    /maxRate:\s*saved\.rate\s*\?\?\s*800/,
    'maxRate: saved.rate ?? 900'
  );

  // fisica vertical com climb bipolar
  code = code.replace(
    'const force = up.clone().multiplyScalar(thrustMul);\n  force.y -= CONFIG.mass * CONFIG.gravity;\n  if (controlScheme === \'arcade\' && (Math.abs(input.moveX) > 0.02 || Math.abs(input.moveY) > 0.02)) {\n    const yawOnly = new THREE.Euler().setFromQuaternion(drone.quaternion, \'YXZ\');\n    const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawOnly.y, 0));\n    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(facing);\n    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);\n    const accel = 12;\n    force.add(forward.multiplyScalar(input.moveY * accel * CONFIG.mass));\n    force.add(right.multiplyScalar(input.moveX * accel * CONFIG.mass));\n  }\n  const drag = 0.12 * (1 + velocity.length() * 0.04);\n  force.x -= velocity.x * drag * CONFIG.mass;\n  force.y -= velocity.y * drag * CONFIG.mass * 0.85;\n  force.z -= velocity.z * drag * CONFIG.mass;\n  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));',
    'const force = up.clone().multiplyScalar(thrustMul);\n  force.y -= CONFIG.mass * CONFIG.gravity;\n  {\n    const climb = (typeof window.__FPV_CLIMB === "number") ? window.__FPV_CLIMB : 0;\n    const maxClimbAccel = 18;\n    if (Math.abs(climb) > 0.05) {\n      force.y += climb * maxClimbAccel * CONFIG.mass;\n      holdAlt = null;\n    } else {\n      force.y += (-velocity.y * 4.5) * CONFIG.mass;\n      if (Math.abs(velocity.y) < 0.15) velocity.y = 0;\n    }\n  }\n  if (controlScheme === \'arcade\' && (Math.abs(input.moveX) > 0.02 || Math.abs(input.moveY) > 0.02)) {\n    const yawOnly = new THREE.Euler().setFromQuaternion(drone.quaternion, \'YXZ\');\n    const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawOnly.y, 0));\n    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(facing);\n    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);\n    const accel = 14;\n    force.add(forward.multiplyScalar(input.moveY * accel * CONFIG.mass));\n    force.add(right.multiplyScalar(input.moveX * accel * CONFIG.mass));\n  }\n  {\n    const tiltPower = 22;\n    force.x += up.x * tiltPower * CONFIG.mass * Math.max(0.2, throttle);\n    force.z += up.z * tiltPower * CONFIG.mass * Math.max(0.2, throttle);\n  }\n  const drag = 0.14 * (1 + velocity.length() * 0.05);\n  force.x -= velocity.x * drag * CONFIG.mass;\n  force.y -= velocity.y * drag * CONFIG.mass * 0.7;\n  force.z -= velocity.z * drag * CONFIG.mass;\n  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));'
  );

  code = code.replace(
    'velocity.y = THREE.MathUtils.clamp(velocity.y, -20, 12);',
    'velocity.y = THREE.MathUtils.clamp(velocity.y, -16, 16);'
  );

  code = code.replace(
    "showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');",
    "showGameChrome(false);\n  document.getElementById('btn-menu')?.classList.remove('hidden');\n  document.getElementById('btn-cam')?.classList.remove('hidden');\n  document.getElementById('btn-deploy')?.classList.add('show');"
  );

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
  fail('Nao foi possivel baixar o jogo.<br>Verifique a internet e tente de novo.');
}
