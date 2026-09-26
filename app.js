import * as THREE from 'three';
const SAVE_KEY = 'fpv_drone_sim_pro_v3';
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function saveData(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}
const saved = loadSave();
const CONFIG = {
  gravity: 9.81, mass: saved.mass ?? 0.55, maxThrust: saved.thrust ?? 22, drag: 0.08,
  maxRate: saved.rate ?? 800, expo: saved.expo ?? 0.3, sensitivity: saved.sens ?? 1.0,
  deadzone: saved.dead ?? 0.05, cameraFOV: saved.fov ?? 105, respawnHeight: 2.5,
  quality: saved.quality ?? 'medium', soundOn: saved.sound !== 'off', volume: saved.vol ?? 0.4,
};
const COLORS = {
  body: [0x1a1a1a, 0x222222, 0x0d1b2a, 0x3d0000, 0x1b4332, 0x240046],
  arm: [0x111111, 0x222222, 0x333333, 0x0a0a0a],
  prop: [0xdddddd, 0xff4444, 0x44ff44, 0x4488ff, 0xffaa00, 0xffffff],
};
let droneColors = { body: saved.bodyColor ?? 0x1a1a1a, arm: saved.armColor ?? 0x111111, prop: saved.propColor ?? 0xdddddd };
const MAPS = {
  racing: { name: 'Racing', icon: 'R', fog: 0x87CEEB, ground: 0x3a7d3a, sky: 0x87CEEB },
  freestyle: { name: 'Freestyle', icon: 'F', fog: 0x6a8faf, ground: 0x4a5a3a, sky: 0x6a8faf },
  open: { name: 'Campo', icon: 'O', fog: 0xa0c8e8, ground: 0x5a8a4a, sky: 0xa0c8e8 },
  night: { name: 'Noturno', icon: 'N', fog: 0x0a0a18, ground: 0x1a1a22, sky: 0x0a0a18 },
};
let currentMap = saved.map ?? 'freestyle';
const DRONE_PRESETS = {
  balanced: { name: 'Balanced', thrust: 22, mass: 0.55 },
  racer: { name: 'Racer', thrust: 28, mass: 0.42 },
  freestyle: { name: 'Freestyle', thrust: 24, mass: 0.5 },
  cinewhoop: { name: 'Cinewhoop', thrust: 16, mass: 0.7 },
};
let scene, camera, renderer, clock;
let drone, droneBody, props = [], arms = [], leds = [];
let velocity = new THREE.Vector3();
let angularVelocity = new THREE.Vector3();
let throttle = 0;
let input = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
let mode = 'acro';
let camMode = saved.camMode ?? 'fpv';
let gameStarted = false;
let frameCount = 0, lastFpsTime = 0, fps = 60;
let battery = 100;
let envObjects = [];
let audioCtx = null, motorNodes = [];
const chaseOffset = new THREE.Vector3(0, 1.8, 4.5);
const chaseLook = new THREE.Vector3();
const sticks = {
  left: { active: false, id: null, x: 0, y: 0, base: null, knob: null },
  right: { active: false, id: null, x: 0, y: 0, base: null, knob: null }
};
function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    motorNodes = [];
    for (let i = 0; i < 4; i++) {
      const bufLen = audioCtx.sampleRate * 2;
      const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufLen; j++) data[j] = Math.random() * 2 - 1;
      const src = audioCtx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const bp = audioCtx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 180 + i * 40; bp.Q.value = 1.2;
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = audioCtx.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(audioCtx.destination); src.start();
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle'; osc.frequency.value = 55 + i * 8;
      const og = audioCtx.createGain(); og.gain.value = 0;
      osc.connect(og); og.connect(audioCtx.destination); osc.start();
      motorNodes.push({ noiseGain: g, osc, oscGain: og, bp });
    }
  } catch (e) { console.warn(e); }
}
function updateEngineSound() {
  if (!audioCtx || !CONFIG.soundOn || !motorNodes.length) return;
  const t = throttle, vol = CONFIG.volume * 0.22;
  motorNodes.forEach((m, i) => {
    const wobble = 1 + 0.03 * Math.sin(performance.now() * 0.01 + i);
    m.noiseGain.gain.setTargetAtTime(t * vol * wobble, audioCtx.currentTime, 0.06);
    m.oscGain.gain.setTargetAtTime(t * vol * 0.15, audioCtx.currentTime, 0.08);
    m.osc.frequency.setTargetAtTime(45 + t * 90 + i * 12, audioCtx.currentTime, 0.1);
    m.bp.frequency.setTargetAtTime(150 + t * 400 + i * 30, audioCtx.currentTime, 0.1);
  });
}
function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(CONFIG.cameraFOV, window.innerWidth / window.innerHeight, 0.05, 400);
  const q = CONFIG.quality;
  const pr = q === 'low' ? 1 : Math.min(window.devicePixelRatio, q === 'high' ? 2 : 1.5);
  renderer = new THREE.WebGLRenderer({ antialias: q !== 'low', powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = q !== 'low';
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(60, 110, 40);
  sun.castShadow = q !== 'low';
  scene.add(sun);
  createDrone(); loadMap(currentMap); setupEvents(); setupMenus(); applyCameraMode(); animate();
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const tc = document.getElementById('touch-controls');
    if (tc) tc.style.display = 'block';
  }
  setTimeout(() => {
    const el = document.getElementById('loading');
    if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  }, 400);
}
function createDrone() {
  if (drone) {
    if (camMode === 'fpv' && camera.parent === drone) drone.remove(camera);
    scene.remove(drone); props = []; arms = []; leds = [];
  }
  drone = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: droneColors.body, roughness: 0.35, metalness: 0.6 });
  droneBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.14), bodyMat);
  droneBody.castShadow = true; drone.add(droneBody);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.1), bodyMat);
  top.position.y = 0.028; drone.add(top);
  const bat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.12), new THREE.MeshStandardMaterial({ color: 0x222266, roughness: 0.5, metalness: 0.3 }));
  bat.position.y = -0.03; drone.add(bat);
  const armMat = new THREE.MeshStandardMaterial({ color: droneColors.arm, roughness: 0.45, metalness: 0.55 });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.028), armMat);
    const angle = (i * Math.PI / 2) + Math.PI / 4;
    arm.position.set(Math.cos(angle) * 0.11, 0, Math.sin(angle) * 0.11);
    arm.rotation.y = angle; arm.castShadow = true; drone.add(arm); arms.push(arm);
  }
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.3 });
  const propMat = new THREE.MeshStandardMaterial({ color: droneColors.prop, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
  [[0.135, 0.02, 0.135], [-0.135, 0.02, 0.135], [-0.135, 0.02, -0.135], [0.135, 0.02, -0.135]].forEach((pos, i) => {
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), motorMat);
    motor.position.set(...pos); motor.castShadow = true; drone.add(motor);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.003, 0.02), propMat);
    prop.position.set(pos[0], pos[1] + 0.018, pos[2]);
    prop.userData.spinDir = (i % 2 === 0) ? 1 : -1; drone.add(prop); props.push(prop);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshStandardMaterial({ color: i < 2 ? 0xff2222 : 0xffffff, emissive: i < 2 ? 0xff0000 : 0xaaaaaa, emissiveIntensity: 0.8 }));
    led.position.set(pos[0] * 0.7, -0.01, pos[2] * 0.7); drone.add(led); leds.push(led);
  });
  const camH = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  camH.position.set(0, -0.005, 0.09); drone.add(camH);
  drone.position.set(0, CONFIG.respawnHeight, 0); scene.add(drone);
}
function applyDroneColors() {
  if (droneBody) droneBody.material.color.setHex(droneColors.body);
  arms.forEach(a => a.material.color.setHex(droneColors.arm));
  props.forEach(p => p.material.color.setHex(droneColors.prop));
}
function applyCameraMode() {
  if (camMode === 'fpv') {
    if (camera.parent !== drone) {
      if (camera.parent) camera.parent.remove(camera); else scene.remove(camera);
      drone.add(camera);
    }
    camera.position.set(0, 0.03, 0.08); camera.rotation.set(0, 0, 0); camera.fov = CONFIG.cameraFOV;
  } else {
    if (camera.parent === drone) drone.remove(camera);
    if (!camera.parent) scene.add(camera);
    camera.fov = 75;
  }
  camera.updateProjectionMatrix();
  const label = document.getElementById('cam-label');
  if (label) label.textContent = camMode === 'fpv' ? 'FPV' : '3D';
  const btn = document.getElementById('btn-cam');
  if (btn) btn.textContent = 'CAM: ' + (camMode === 'fpv' ? 'FPV' : '3D');
}
function toggleCamera() {
  camMode = camMode === 'fpv' ? 'chase' : 'fpv';
  applyCameraMode(); persist(); showMsg(camMode === 'fpv' ? 'CAM FPV' : 'CAM 3D');
}
function updateChaseCamera(dt) {
  if (camMode !== 'chase' || !drone) return;
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(drone.quaternion);
  const target = drone.position.clone().add(back.multiplyScalar(chaseOffset.z)).add(new THREE.Vector3(0, chaseOffset.y, 0));
  camera.position.lerp(target, 1 - Math.pow(0.001, dt));
  chaseLook.copy(drone.position); camera.lookAt(chaseLook);
}
function clearEnv() {
  envObjects.forEach(o => { scene.remove(o); if (o.geometry) o.geometry.dispose(); });
  envObjects = [];
}
function addEnv(obj) { scene.add(obj); envObjects.push(obj); }
function makeBuildingWithHole(x, z, w, h, d, holeY, holeH, holeW) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.85 });
  const mat2 = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.85 });
  const left = new THREE.Mesh(new THREE.BoxGeometry((w - holeW) / 2, h, d), mat);
  left.position.set(-(holeW / 2 + (w - holeW) / 4), h / 2, 0); left.castShadow = true; group.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry((w - holeW) / 2, h, d), mat);
  right.position.set(holeW / 2 + (w - holeW) / 4, h / 2, 0); right.castShadow = true; group.add(right);
  if (holeY > 0.3) {
    const bot = new THREE.Mesh(new THREE.BoxGeometry(holeW, holeY, d), mat2);
    bot.position.set(0, holeY / 2, 0); bot.castShadow = true; group.add(bot);
  }
  const topH = h - holeY - holeH;
  if (topH > 0.2) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(holeW, topH, d), mat2);
    top.position.set(0, holeY + holeH + topH / 2, 0); top.castShadow = true; group.add(top);
  }
  group.position.set(x, 0, z); return group;
}
function loadMap(mapId) {
  currentMap = mapId; clearEnv();
  const m = MAPS[mapId] || MAPS.racing;
  scene.background = new THREE.Color(m.sky);
  scene.fog = new THREE.Fog(m.fog, mapId === 'night' ? 40 : 100, mapId === 'night' ? 180 : 300);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 32, 32), new THREE.MeshStandardMaterial({ color: m.ground, roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; addEnv(ground);
  const grid = new THREE.GridHelper(200, 40, 0x2a5a2a, 0x2a5a2a); grid.position.y = 0.02; addEnv(grid);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.03; addEnv(pad);
  if (mapId === 'racing' || mapId === 'night') {
    [[0, -18], [9, -42], [-7, -68], [12, -95], [0, -125], [-14, -155], [6, -185]].forEach((pos, idx) => {
      const gate = new THREE.Group();
      const col = idx % 2 === 0 ? 0xff2222 : 0x2244ff;
      const pm = new THREE.MeshStandardMaterial({ color: col, emissive: mapId === 'night' ? col : 0, emissiveIntensity: mapId === 'night' ? 0.35 : 0 });
      [-2.7, 2.7].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.5, 8), pm); p.position.set(x, 2.25, 0); gate.add(p); });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 0.2), pm); bar.position.set(0, 4.5, 0); gate.add(bar);
      gate.position.set(pos[0], 0, pos[1]); addEnv(gate);
    });
  }
  if (mapId === 'freestyle' || mapId === 'racing') {
    [[12, -30, 8, 6, 4, 1.5, 2.5, 3], [-14, -55, 10, 8, 5, 2, 3, 3.5], [8, -80, 7, 5, 6, 1, 2.2, 2.8], [-10, -105, 9, 7, 4, 1.8, 2.8, 3.2], [0, -135, 12, 6, 5, 0.5, 3.5, 4], [15, -160, 6, 9, 4, 3, 3, 2.5]].forEach(([x, z, w, h, d, hy, hh, hw]) => addEnv(makeBuildingWithHole(x, z, w, h, d, hy, hh, hw)));
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xff8800 }));
      ring.position.set((i % 2 === 0 ? 6 : -6), 2.5 + (i % 3), -45 - i * 22);
      ring.rotation.y = Math.PI / 2; addEnv(ring);
    }
  }
  if (mapId === 'open') {
    for (let i = 0; i < 6; i++) addEnv(makeBuildingWithHole((Math.random() - 0.5) * 80, -40 - Math.random() * 100, 6 + Math.random() * 4, 4 + Math.random() * 5, 3 + Math.random() * 2, 1 + Math.random(), 2 + Math.random(), 2.5));
  }
  const treeMat = new THREE.MeshStandardMaterial({ color: mapId === 'night' ? 0x1a3a1a : 0x2d5a27 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * 180, z = (Math.random() - 0.5) * 180;
    if (Math.abs(x) < 16 && z > -200 && z < 20) continue;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6), trunkMat);
    trunk.position.y = 0.75; tree.add(trunk);
    const fol = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.8, 7), treeMat);
    fol.position.y = 2.7; tree.add(fol);
    tree.position.set(x, 0, z); addEnv(tree);
  }
  const mn = document.getElementById('map-name');
  if (mn) mn.textContent = m.name.toUpperCase();
}
function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
  });
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!gameStarted) return;
    if (e.code === 'KeyR') resetDrone();
    if (e.code === 'KeyM') toggleMode();
    if (e.code === 'KeyC') toggleCamera();
    if (e.code === 'Escape') openMenu();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window._keys = keys;
  document.getElementById('btn-reset')?.addEventListener('click', resetDrone);
  document.getElementById('btn-mode')?.addEventListener('click', toggleMode);
  document.getElementById('btn-menu')?.addEventListener('click', openMenu);
  document.getElementById('btn-cam')?.addEventListener('click', toggleCamera);
  setupTouchSticks();
}
function setupTouchSticks() {
  sticks.left.base = document.getElementById('stick-left');
  sticks.left.knob = document.getElementById('knob-left');
  sticks.right.base = document.getElementById('stick-right');
  sticks.right.knob = document.getElementById('knob-right');
  if (!sticks.left.base) return;
  function handleStart(e, side) {
    e.preventDefault();
    const t = e.changedTouches[0];
    sticks[side].active = true; sticks[side].id = t.identifier;
    updateStick(side, t.clientX, t.clientY);
  }
  function handleMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (sticks.left.active && t.identifier === sticks.left.id) updateStick('left', t.clientX, t.clientY);
      if (sticks.right.active && t.identifier === sticks.right.id) updateStick('right', t.clientX, t.clientY);
    }
  }
  function handleEnd(e) {
    for (const t of e.changedTouches) {
      ['left', 'right'].forEach(side => {
        if (t.identifier === sticks[side].id) {
          sticks[side].active = false; sticks[side].id = null;
          sticks[side].x = 0; sticks[side].y = 0;
          if (sticks[side].knob) sticks[side].knob.style.transform = 'translate(-50%, -50%)';
        }
      });
    }
  }
  sticks.left.base.addEventListener('touchstart', e => handleStart(e, 'left'), { passive: false });
  sticks.right.base.addEventListener('touchstart', e => handleStart(e, 'right'), { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);
}
function updateStick(side, cx, cy) {
  const base = sticks[side].base;
  const rect = base.getBoundingClientRect();
  let dx = cx - (rect.left + rect.width / 2), dy = cy - (rect.top + rect.height / 2);
  const max = rect.width / 2 - 12;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
  sticks[side].x = dx / max; sticks[side].y = dy / max;
  sticks[side].knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
}
function applyExpo(v, expo) {
  const s = Math.sign(v), a = Math.abs(v);
  return s * (a * a * a * expo + a * (1 - expo));
}
function applyDeadzone(v, dz) {
  if (Math.abs(v) < dz) return 0;
  return Math.sign(v) * (Math.abs(v) - dz) / (1 - dz);
}
function readInput() {
  input.throttle = 0; input.yaw = 0; input.pitch = 0; input.roll = 0;
  const dz = CONFIG.deadzone, expo = CONFIG.expo, sens = CONFIG.sensitivity;
  if (sticks.left.active || sticks.right.active) {
    input.throttle = Math.max(0, Math.min(1, (1 - sticks.left.y) / 2));
    input.yaw = applyExpo(applyDeadzone(-sticks.left.x, dz), expo) * sens;
    input.pitch = applyExpo(applyDeadzone(-sticks.right.y, dz), expo) * sens;
    input.roll = applyExpo(applyDeadzone(sticks.right.x, dz), expo) * sens;
  }
  const k = window._keys || {};
  if (k['KeyW']) input.throttle = Math.min(1, input.throttle + 1);
  if (k['KeyS']) input.throttle = Math.max(0, input.throttle - 0.5);
  if (k['KeyA']) input.yaw = -1;
  if (k['KeyD']) input.yaw = 1;
  if (k['ArrowUp']) input.pitch = -1;
  if (k['ArrowDown']) input.pitch = 1;
  if (k['ArrowLeft']) input.roll = -1;
  if (k['ArrowRight']) input.roll = 1;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let padFound = false;
  for (const pad of pads) {
    if (!pad) continue;
    padFound = true;
    if (Math.abs(pad.axes[1]) > 0.04 || Math.abs(pad.axes[0]) > 0.04 || Math.abs(pad.axes[3]) > 0.04 || Math.abs(pad.axes[2]) > 0.04) {
      input.throttle = Math.max(0, Math.min(1, (-pad.axes[1] + 1) / 2));
      input.yaw = applyExpo(applyDeadzone(pad.axes[0], dz), expo) * sens;
      input.pitch = applyExpo(applyDeadzone(pad.axes[3], dz), expo) * sens;
      input.roll = applyExpo(applyDeadzone(pad.axes[2], dz), expo) * sens;
    }
    break;
  }
  const ps = document.getElementById('pad-status');
  if (ps) ps.textContent = padFound ? 'PAD OK' : 'No Pad';
  throttle = input.throttle;
}
function updatePhysics(dt) {
  if (!gameStarted) return;
  const maxRateRad = THREE.MathUtils.degToRad(CONFIG.maxRate);
  let targetWx = input.pitch * maxRateRad;
  let targetWy = input.yaw * maxRateRad * 0.5;
  let targetWz = input.roll * maxRateRad;
  if (mode === 'angle') {
    const maxTilt = THREE.MathUtils.degToRad(50);
    const euler = new THREE.Euler().setFromQuaternion(drone.quaternion, 'YXZ');
    const kp = 9;
    targetWx = (input.pitch * maxTilt - euler.x) * kp;
    targetWz = (input.roll * maxTilt - euler.z) * kp;
    targetWy = input.yaw * maxRateRad * 0.4;
  }
  const angAccel = 35;
  angularVelocity.x += (targetWx - angularVelocity.x) * Math.min(1, angAccel * dt);
  angularVelocity.y += (targetWy - angularVelocity.y) * Math.min(1, angAccel * dt);
  angularVelocity.z += (targetWz - angularVelocity.z) * Math.min(1, angAccel * dt);
  if (Math.sqrt(input.pitch ** 2 + input.roll ** 2 + input.yaw ** 2) < 0.1) angularVelocity.multiplyScalar(0.9);
  const wx = angularVelocity.x * dt, wy = angularVelocity.y * dt, wz = angularVelocity.z * dt;
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), wy));
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), wx));
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), wz));
  drone.quaternion.normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(drone.quaternion);
  const force = up.multiplyScalar(throttle * CONFIG.maxThrust);
  force.y -= CONFIG.mass * CONFIG.gravity;
  const speed = velocity.length();
  const drag = CONFIG.drag * (1 + speed * 0.06);
  force.x -= velocity.x * drag; force.y -= velocity.y * drag * 0.85; force.z -= velocity.z * drag;
  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));
  const nextPos = drone.position.clone().add(velocity.clone().multiplyScalar(dt));
  if (nextPos.y < 0.08) {
    nextPos.y = 0.08;
    if (velocity.y < 0) velocity.y *= -0.12;
    velocity.x *= 0.8; velocity.z *= 0.8; angularVelocity.multiplyScalar(0.65);
  }
  drone.position.copy(nextPos);
  props.forEach(p => { p.rotation.y += p.userData.spinDir * (6 + throttle * 60) * dt; });
  if (Math.abs(drone.position.x) > 190 || Math.abs(drone.position.z) > 190) {
    showMsg('FORA DA AREA'); setTimeout(resetDrone, 700);
  }
  battery = Math.max(0, battery - (0.006 + throttle * 0.02) * dt);
  updateEngineSound(); updateChaseCamera(dt);
}
function resetDrone() {
  drone.position.set(0, CONFIG.respawnHeight, 0);
  drone.quaternion.identity();
  velocity.set(0, 0, 0); angularVelocity.set(0, 0, 0);
  throttle = 0; battery = Math.min(100, battery + 20);
  applyCameraMode(); showMsg('RESET');
}
function toggleMode() {
  mode = mode === 'acro' ? 'angle' : 'acro';
  const ml = document.getElementById('mode-label');
  if (ml) ml.textContent = mode.toUpperCase();
  const bm = document.getElementById('btn-mode');
  if (bm) bm.textContent = 'MODO: ' + mode.toUpperCase();
  showMsg(mode.toUpperCase());
}
function startGame() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  document.getElementById('hud')?.classList.remove('hidden');
  ['btn-reset', 'btn-mode', 'btn-menu', 'btn-cam'].forEach(id => document.getElementById(id)?.classList.remove('hidden'));
  gameStarted = true; resetDrone(); showMsg('VOA! ~50% = hover');
}
function openMenu() {
  gameStarted = false;
  document.getElementById('hud')?.classList.add('hidden');
  ['btn-reset', 'btn-mode', 'btn-menu', 'btn-cam'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  document.getElementById('main-menu')?.classList.remove('hidden');
  motorNodes.forEach(m => {
    if (m.noiseGain && audioCtx) m.noiseGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    if (m.oscGain && audioCtx) m.oscGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  });
}
function showMsg(text) {
  const el = document.getElementById('msg');
  if (!el) return;
  el.textContent = text; el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1200);
}
function persist() {
  saveData({
    map: currentMap, mass: CONFIG.mass, thrust: CONFIG.maxThrust, rate: CONFIG.maxRate,
    expo: CONFIG.expo, sens: CONFIG.sensitivity, dead: CONFIG.deadzone, fov: CONFIG.cameraFOV,
    quality: CONFIG.quality, sound: CONFIG.soundOn ? 'on' : 'off', vol: CONFIG.volume,
    bodyColor: droneColors.body, armColor: droneColors.arm, propColor: droneColors.prop, camMode,
  });
}
function setupMenus() {
  document.getElementById('btn-play')?.addEventListener('click', startGame);
  document.getElementById('btn-maps')?.addEventListener('click', () => showOverlay('maps-menu'));
  document.getElementById('btn-drone')?.addEventListener('click', () => showOverlay('drone-menu'));
  document.getElementById('btn-settings')?.addEventListener('click', () => showOverlay('settings-menu'));
  document.getElementById('btn-about')?.addEventListener('click', () => showOverlay('about-menu'));
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
      document.getElementById(btn.getAttribute('data-back'))?.classList.remove('hidden');
      persist();
    });
  });
  const mapGrid = document.getElementById('map-grid');
  if (mapGrid) {
    mapGrid.innerHTML = '';
    Object.entries(MAPS).forEach(([id, m]) => {
      const card = document.createElement('div');
      card.className = 'map-card' + (id === currentMap ? ' selected' : '');
      card.innerHTML = '<div class="icon">' + m.icon + '</div><div class="name">' + m.name + '</div>';
      card.addEventListener('click', () => {
        currentMap = id;
        mapGrid.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected'); loadMap(id); persist();
      });
      mapGrid.appendChild(card);
    });
  }
  const droneGrid = document.getElementById('drone-grid');
  if (droneGrid) {
    droneGrid.innerHTML = '';
    Object.entries(DRONE_PRESETS).forEach(([, p]) => {
      const card = document.createElement('div');
      card.className = 'drone-card';
      card.innerHTML = '<div class="name">' + p.name + '</div>';
      card.addEventListener('click', () => {
        CONFIG.maxThrust = p.thrust; CONFIG.mass = p.mass;
        const ct = document.getElementById('cfg-thrust'), cm = document.getElementById('cfg-mass');
        if (ct) ct.value = p.thrust; if (cm) cm.value = p.mass;
        const vt = document.getElementById('val-thrust'), vm = document.getElementById('val-mass');
        if (vt) vt.textContent = p.thrust + 'N'; if (vm) vm.textContent = p.mass.toFixed(2) + 'kg';
        persist();
      });
      droneGrid.appendChild(card);
    });
  }
  function makeSwatches(cid, list, key) {
    const cont = document.getElementById(cid);
    if (!cont) return;
    cont.innerHTML = '';
    list.forEach(hex => {
      const s = document.createElement('div');
      s.className = 'swatch' + (droneColors[key] === hex ? ' selected' : '');
      s.style.background = '#' + hex.toString(16).padStart(6, '0');
      s.addEventListener('click', () => {
        droneColors[key] = hex;
        cont.querySelectorAll('.swatch').forEach(c => c.classList.remove('selected'));
        s.classList.add('selected'); applyDroneColors(); persist();
      });
      cont.appendChild(s);
    });
  }
  makeSwatches('body-colors', COLORS.body, 'body');
  makeSwatches('arm-colors', COLORS.arm, 'arm');
  makeSwatches('prop-colors', COLORS.prop, 'prop');
  const bind = (id, vid, key, fmt, apply) => {
    const el = document.getElementById(id), val = document.getElementById(vid);
    if (!el || !val) return;
    el.value = CONFIG[key] ?? el.value; val.textContent = fmt(el.value);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value); CONFIG[key] = v; val.textContent = fmt(v);
      if (apply) apply(v); persist();
    });
  };
  bind('cfg-thrust', 'val-thrust', 'maxThrust', v => v + 'N');
  bind('cfg-mass', 'val-mass', 'mass', v => parseFloat(v).toFixed(2) + 'kg');
  bind('cfg-fov', 'val-fov', 'cameraFOV', v => v, v => { if (camMode === 'fpv') { camera.fov = v; camera.updateProjectionMatrix(); } });
  bind('cfg-sens', 'val-sens', 'sensitivity', v => parseFloat(v).toFixed(1) + 'x');
  bind('cfg-expo', 'val-expo', 'expo', v => parseFloat(v).toFixed(2));
  bind('cfg-rate', 'val-rate', 'maxRate', v => v);
  bind('cfg-dead', 'val-dead', 'deadzone', v => parseFloat(v).toFixed(2));
  bind('cfg-vol', 'val-vol', 'volume', v => Math.round(v * 100) + '%');
  const cq = document.getElementById('cfg-quality');
  if (cq) { cq.value = CONFIG.quality; cq.addEventListener('change', e => { CONFIG.quality = e.target.value; persist(); }); }
  const cs = document.getElementById('cfg-sound');
  if (cs) {
    cs.value = CONFIG.soundOn ? 'on' : 'off';
    cs.addEventListener('change', e => {
      CONFIG.soundOn = e.target.value === 'on';
      if (!CONFIG.soundOn) motorNodes.forEach(m => { m.noiseGain.gain.value = 0; m.oscGain.gain.value = 0; });
      persist();
    });
  }
  document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.getAttribute('data-shop');
      ['body','size','colors','cam','stickers','extra'].forEach(s => {
        const el = document.getElementById('shop-' + s);
        if (el) el.classList.toggle('hidden', s !== id);
      });
    });
  });
}
function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  readInput(); updatePhysics(dt);
  if (gameStarted) {
    const a = document.getElementById('alt'), s = document.getElementById('spd'), t = document.getElementById('thr');
    if (a) a.textContent = drone.position.y.toFixed(1);
    if (s) s.textContent = velocity.length().toFixed(1);
    if (t) t.textContent = Math.round(throttle * 100);
    const bat = document.getElementById('battery');
    if (bat) { bat.textContent = 'BAT ' + Math.round(battery) + '%'; bat.className = 'battery' + (battery < 20 ? ' critical' : battery < 40 ? ' low' : ''); }
  }
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime > 500) {
    fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
    const f = document.getElementById('fps');
    if (f) f.textContent = fps + ' FPS';
    frameCount = 0; lastFpsTime = now;
  }
  renderer.render(scene, camera);
}
const loadingEl = document.getElementById('loading');
function hideLoading(msg) {
  if (!loadingEl) return;
  if (msg) loadingEl.innerHTML = '<div style="color:#0f0;text-align:center;padding:24px;max-width:320px;line-height:1.5">' + msg + '</div>';
  else loadingEl.classList.add('hidden');
}
setTimeout(() => {
  if (loadingEl && !loadingEl.classList.contains('hidden') && !loadingEl.dataset.done) {
    hideLoading('Demorou demais. Abra pelo link do site (Vercel).');
  }
}, 12000);
try {
  init();
  if (loadingEl) loadingEl.dataset.done = '1';
} catch (e) {
  console.error(e);
  hideLoading('Erro: ' + (e && e.message ? e.message : e));
}
