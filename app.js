import * as THREE from 'three';
const SAVE_KEY = 'fpv_drone_sim_pro_v2';
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function saveData(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}
const saved = loadSave();
const CONFIG = {
  gravity: 9.81,
  mass: saved.mass ?? 0.5,
  maxThrust: saved.thrust ?? 18,
  drag: 0.12,
  angularDrag: 4.2,
  maxRate: saved.rate ?? 750,
  expo: saved.expo ?? 0.35,
  sensitivity: saved.sens ?? 1.0,
  deadzone: saved.dead ?? 0.06,
  cameraFOV: saved.fov ?? 100,
  cameraOffset: new THREE.Vector3(0, 0.04, 0.10),
  respawnHeight: 2.2,
  quality: saved.quality ?? 'medium',
  soundOn: saved.sound !== 'off',
  volume: saved.vol ?? 0.5,
};
const COLORS = {
  body: [0x222222, 0x111111, 0x1a1a2e, 0x0d1b2a, 0x3d0000, 0x1b4332, 0x240046],
  arm: [0x111111, 0x222222, 0x333333, 0x0a0a0a, 0x1a1a1a],
  prop: [0xcccccc, 0xff4444, 0x44ff44, 0x4488ff, 0xffaa00, 0xff66cc, 0xffffff],
};
let droneColors = {
  body: saved.bodyColor ?? 0x222222,
  arm: saved.armColor ?? 0x111111,
  prop: saved.propColor ?? 0xcccccc,
};
const MAPS = {
  racing: { name: 'Racing', icon: 'R', desc: 'Gates', fog: 0x87CEEB, ground: 0x3a7d3a, sky: 0x87CEEB },
  freestyle: { name: 'Freestyle', icon: 'F', desc: 'Obstacles', fog: 0x6a8faf, ground: 0x4a5a3a, sky: 0x6a8faf },
  open: { name: 'Open', icon: 'O', desc: 'Field', fog: 0xa0c8e8, ground: 0x5a8a4a, sky: 0xa0c8e8 },
  night: { name: 'Night', icon: 'N', desc: 'Night', fog: 0x0a0a18, ground: 0x1a1a22, sky: 0x0a0a18 },
};
let currentMap = saved.map ?? 'racing';
const DRONE_PRESETS = {
  balanced: { name: 'Balanced', icon: 'B', thrust: 18, mass: 0.5 },
  racer: { name: 'Racer', icon: 'R', thrust: 24, mass: 0.42 },
  freestyle: { name: 'Freestyle', icon: 'F', thrust: 20, mass: 0.48 },
  cinewhoop: { name: 'Cine', icon: 'C', thrust: 14, mass: 0.65 },
};
let scene, camera, renderer, clock;
let drone, droneBody, props = [], arms = [];
let velocity = new THREE.Vector3();
let angularVelocity = new THREE.Vector3();
let throttle = 0;
let input = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
let mode = 'acro';
let gameStarted = false;
let frameCount = 0, lastFpsTime = 0, fps = 60;
let battery = 100;
let envObjects = [];
let audioCtx = null, engineOsc = null, engineGain = null;
const sticks = {
  left: { active: false, id: null, x: 0, y: 0, base: null, knob: null },
  right: { active: false, id: null, x: 0, y: 0, base: null, knob: null }
};
function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 80;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  } catch (e) {}
}
function updateEngineSound() {
  if (!audioCtx || !CONFIG.soundOn || !engineGain) return;
  engineGain.gain.setTargetAtTime(throttle * CONFIG.volume * 0.35, audioCtx.currentTime, 0.05);
  engineOsc.frequency.setTargetAtTime(70 + throttle * 180, audioCtx.currentTime, 0.08);
}
function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(CONFIG.cameraFOV, window.innerWidth / window.innerHeight, 0.04, 400);
  const quality = CONFIG.quality;
  const pixelRatio = quality === 'low' ? 1 : Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5);
  renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = quality !== 'low';
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x334433, 0.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(60, 110, 40);
  sun.castShadow = quality !== 'low';
  scene.add(sun);
  createDrone();
  loadMap(currentMap);
  setupEvents();
  setupMenus();
  animate();
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.getElementById('touch-controls').style.display = 'block';
  }
  setTimeout(() => {
    const el = document.getElementById('loading');
    if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  }, 400);
}
function createDrone() {
  if (drone) { scene.remove(drone); props = []; arms = []; }
  drone = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: droneColors.body, roughness: 0.4, metalness: 0.55 });
  droneBody = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.042, 0.13), bodyMat);
  droneBody.castShadow = true;
  drone.add(droneBody);
  const armMat = new THREE.MeshStandardMaterial({ color: droneColors.arm, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.016, 0.026), armMat);
    const angle = (i * Math.PI / 2) + Math.PI / 4;
    arm.position.set(Math.cos(angle) * 0.105, 0, Math.sin(angle) * 0.105);
    arm.rotation.y = angle;
    arm.castShadow = true;
    drone.add(arm);
    arms.push(arm);
  }
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const propMat = new THREE.MeshStandardMaterial({ color: droneColors.prop, transparent: true, opacity: 0.75 });
  [[0.125, 0.022, 0.125], [-0.125, 0.022, 0.125], [-0.125, 0.022, -0.125], [0.125, 0.022, -0.125]].forEach((pos, i) => {
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.026, 10), motorMat);
    motor.position.set(...pos);
    drone.add(motor);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.0035, 0.018), propMat);
    prop.position.set(pos[0], pos[1] + 0.016, pos[2]);
    prop.userData.spinDir = (i % 2 === 0) ? 1 : -1;
    drone.add(prop);
    props.push(prop);
  });
  drone.position.set(0, CONFIG.respawnHeight, 0);
  scene.add(drone);
  drone.add(camera);
  camera.position.copy(CONFIG.cameraOffset);
}
function applyDroneColors() {
  if (droneBody) droneBody.material.color.setHex(droneColors.body);
  arms.forEach(a => a.material.color.setHex(droneColors.arm));
  props.forEach(p => p.material.color.setHex(droneColors.prop));
}
function clearEnv() {
  envObjects.forEach(o => { scene.remove(o); if (o.geometry) o.geometry.dispose(); });
  envObjects = [];
}
function addEnv(obj) { scene.add(obj); envObjects.push(obj); }
function loadMap(mapId) {
  currentMap = mapId;
  clearEnv();
  const m = MAPS[mapId] || MAPS.racing;
  scene.background = new THREE.Color(m.sky);
  scene.fog = new THREE.Fog(m.fog, mapId === 'night' ? 40 : 90, mapId === 'night' ? 160 : 280);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(380, 380, 32, 32), new THREE.MeshStandardMaterial({ color: m.ground, roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  addEnv(ground);
  const grid = new THREE.GridHelper(200, 40, 0x2a5a2a, 0x2a5a2a);
  grid.position.y = 0.015;
  addEnv(grid);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.025;
  addEnv(pad);
  if (mapId === 'racing' || mapId === 'night') {
    [[0, -18], [9, -40], [-6, -62], [12, -90], [0, -120], [-14, -150], [6, -180]].forEach((pos, idx) => {
      const gate = new THREE.Group();
      const col = idx % 2 === 0 ? 0xff2222 : 0x2222ff;
      const poleMat = new THREE.MeshStandardMaterial({ color: col });
      [-2.6, 2.6].forEach(x => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 8), poleMat);
        p.position.set(x, 2.1, 0);
        gate.add(p);
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.18, 0.18), poleMat);
      bar.position.set(0, 4.2, 0);
      gate.add(bar);
      gate.position.set(pos[0], 0, pos[1]);
      addEnv(gate);
    });
  }
  if (mapId === 'freestyle') {
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
    [[8, 3, -25, 4, 6, 3], [-10, 2, -40, 5, 4, 4], [0, 1.5, -55, 8, 3, 2], [15, 4, -70, 3, 8, 3]].forEach(([x, y, z, w, h, d]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMat);
      b.position.set(x, y, z);
      addEnv(b);
    });
  }
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 170;
    const z = (Math.random() - 0.5) * 170;
    if (Math.abs(x) < 14 && z > -195 && z < 15) continue;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.4, 6), trunkMat);
    trunk.position.y = 0.7;
    tree.add(trunk);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.8, 7), treeMat);
    foliage.position.y = 2.6;
    tree.add(foliage);
    tree.position.set(x, 0, z);
    addEnv(tree);
  }
  const mn = document.getElementById('map-name');
  if (mn) mn.textContent = m.name.toUpperCase();
}
function setupEvents() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyR' && gameStarted) resetDrone();
    if (e.code === 'KeyM' && gameStarted) toggleMode();
    if (e.code === 'Escape' && gameStarted) openMenu();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window._keys = keys;
  document.getElementById('btn-reset').addEventListener('click', resetDrone);
  document.getElementById('btn-mode').addEventListener('click', toggleMode);
  document.getElementById('btn-menu').addEventListener('click', openMenu);
  setupTouchSticks();
}
function setupTouchSticks() {
  sticks.left.base = document.getElementById('stick-left');
  sticks.left.knob = document.getElementById('knob-left');
  sticks.right.base = document.getElementById('stick-right');
  sticks.right.knob = document.getElementById('knob-right');
  function handleStart(e, side) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    sticks[side].active = true;
    sticks[side].id = touch.identifier;
    updateStick(side, touch.clientX, touch.clientY);
  }
  function handleMove(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (sticks.left.active && touch.identifier === sticks.left.id) updateStick('left', touch.clientX, touch.clientY);
      if (sticks.right.active && touch.identifier === sticks.right.id) updateStick('right', touch.clientX, touch.clientY);
    }
  }
  function handleEnd(e) {
    for (const touch of e.changedTouches) {
      ['left', 'right'].forEach(side => {
        if (touch.identifier === sticks[side].id) {
          sticks[side].active = false;
          sticks[side].id = null;
          sticks[side].x = 0;
          sticks[side].y = 0;
          sticks[side].knob.style.transform = 'translate(-50%, -50%)';
        }
      });
    }
  }
  sticks.left.base.addEventListener('touchstart', e => handleStart(e, 'left'), { passive: false });
  sticks.right.base.addEventListener('touchstart', e => handleStart(e, 'right'), { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);
}
function updateStick(side, clientX, clientY) {
  const base = sticks[side].base;
  const rect = base.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx, dy = clientY - cy;
  const max = rect.width / 2 - 12;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
  sticks[side].x = dx / max;
  sticks[side].y = dy / max;
  sticks[side].knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
}
function applyExpo(v, expo) {
  const s = Math.sign(v);
  const a = Math.abs(v);
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
  if (k['KeyS']) input.throttle = Math.max(0, input.throttle - 0.6);
  if (k['KeyA']) input.yaw = Math.max(-1, input.yaw - 1);
  if (k['KeyD']) input.yaw = Math.min(1, input.yaw + 1);
  if (k['ArrowUp']) input.pitch = Math.max(-1, input.pitch - 1);
  if (k['ArrowDown']) input.pitch = Math.min(1, input.pitch + 1);
  if (k['ArrowLeft']) input.roll = Math.max(-1, input.roll - 1);
  if (k['ArrowRight']) input.roll = Math.min(1, input.roll + 1);
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let padFound = false;
  for (const pad of pads) {
    if (!pad) continue;
    padFound = true;
    if (Math.abs(pad.axes[1]) > 0.04 || Math.abs(pad.axes[0]) > 0.04 || Math.abs(pad.axes[3]) > 0.04 || Math.abs(pad.axes[2]) > 0.04) {
      input.throttle = Math.max(0, Math.min(1, (applyDeadzone(-pad.axes[1], dz) + 1) / 2));
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
  let targetWy = input.yaw * maxRateRad * 0.55;
  let targetWz = input.roll * maxRateRad;
  if (mode === 'angle') {
    const maxTilt = THREE.MathUtils.degToRad(48);
    const euler = new THREE.Euler().setFromQuaternion(drone.quaternion, 'YXZ');
    const kp = 8.5;
    targetWx = (input.pitch * maxTilt - euler.x) * kp;
    targetWz = (input.roll * maxTilt - euler.z) * kp;
    targetWy = input.yaw * maxRateRad * 0.45;
  }
  const angAccel = 32;
  angularVelocity.x += (targetWx - angularVelocity.x) * Math.min(1, angAccel * dt);
  angularVelocity.y += (targetWy - angularVelocity.y) * Math.min(1, angAccel * dt);
  angularVelocity.z += (targetWz - angularVelocity.z) * Math.min(1, angAccel * dt);
  const stickMag = Math.sqrt(input.pitch ** 2 + input.roll ** 2 + input.yaw ** 2);
  if (stickMag < 0.12) angularVelocity.multiplyScalar(0.92);
  const wx = angularVelocity.x * dt, wy = angularVelocity.y * dt, wz = angularVelocity.z * dt;
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), wy));
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), wx));
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), wz));
  drone.quaternion.normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(drone.quaternion);
  const force = up.multiplyScalar(throttle * CONFIG.maxThrust);
  force.y -= CONFIG.mass * CONFIG.gravity;
  const speed = velocity.length();
  const dragFactor = CONFIG.drag * (1 + speed * 0.08);
  force.x -= velocity.x * dragFactor;
  force.y -= velocity.y * dragFactor * 0.9;
  force.z -= velocity.z * dragFactor;
  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));
  const nextPos = drone.position.clone().add(velocity.clone().multiplyScalar(dt));
  if (nextPos.y < 0.07) {
    nextPos.y = 0.07;
    if (velocity.y < 0) velocity.y *= -0.15;
    velocity.x *= 0.82;
    velocity.z *= 0.82;
    angularVelocity.multiplyScalar(0.7);
  }
  drone.position.copy(nextPos);
  props.forEach(p => { p.rotation.y += p.userData.spinDir * (8 + throttle * 55) * dt; });
  if (Math.abs(drone.position.x) > 185 || Math.abs(drone.position.z) > 185) {
    showMsg('FORA');
    setTimeout(resetDrone, 700);
  }
  battery -= (0.008 + throttle * 0.025) * dt;
  if (battery < 0) battery = 0;
  updateEngineSound();
}
function resetDrone() {
  drone.position.set(0, CONFIG.respawnHeight, 0);
  drone.quaternion.identity();
  velocity.set(0, 0, 0);
  angularVelocity.set(0, 0, 0);
  throttle = 0;
  battery = Math.min(100, battery + 15);
  showMsg('RESET');
}
function toggleMode() {
  mode = mode === 'acro' ? 'angle' : 'acro';
  document.getElementById('mode-label').textContent = mode.toUpperCase();
  document.getElementById('btn-mode').textContent = 'MODO: ' + mode.toUpperCase();
  showMsg(mode.toUpperCase());
}
function startGame() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('btn-reset').classList.remove('hidden');
  document.getElementById('btn-mode').classList.remove('hidden');
  document.getElementById('btn-menu').classList.remove('hidden');
  gameStarted = true;
  resetDrone();
  showMsg('VOA!');
}
function openMenu() {
  gameStarted = false;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('btn-reset').classList.add('hidden');
  document.getElementById('btn-mode').classList.add('hidden');
  document.getElementById('btn-menu').classList.add('hidden');
  document.getElementById('main-menu').classList.remove('hidden');
  if (engineGain) engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
}
function showMsg(text) {
  const el = document.getElementById('msg');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1100);
}
function persist() {
  saveData({
    map: currentMap, mass: CONFIG.mass, thrust: CONFIG.maxThrust, rate: CONFIG.maxRate,
    expo: CONFIG.expo, sens: CONFIG.sensitivity, dead: CONFIG.deadzone, fov: CONFIG.cameraFOV,
    quality: CONFIG.quality, sound: CONFIG.soundOn ? 'on' : 'off', vol: CONFIG.volume,
    bodyColor: droneColors.body, armColor: droneColors.arm, propColor: droneColors.prop,
  });
}
function setupMenus() {
  document.getElementById('btn-play').addEventListener('click', startGame);
  document.getElementById('btn-maps').addEventListener('click', () => showOverlay('maps-menu'));
  document.getElementById('btn-drone').addEventListener('click', () => showOverlay('drone-menu'));
  document.getElementById('btn-settings').addEventListener('click', () => showOverlay('settings-menu'));
  document.getElementById('btn-about').addEventListener('click', () => showOverlay('about-menu'));
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
      document.getElementById(btn.getAttribute('data-back')).classList.remove('hidden');
      persist();
    });
  });
  const mapGrid = document.getElementById('map-grid');
  Object.entries(MAPS).forEach(([id, m]) => {
    const card = document.createElement('div');
    card.className = 'map-card' + (id === currentMap ? ' selected' : '');
    card.innerHTML = '<div class="icon">' + m.icon + '</div><div class="name">' + m.name + '</div>';
    card.addEventListener('click', () => {
      currentMap = id;
      mapGrid.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      loadMap(id);
      persist();
    });
    mapGrid.appendChild(card);
  });
  const droneGrid = document.getElementById('drone-grid');
  Object.entries(DRONE_PRESETS).forEach(([id, p]) => {
    const card = document.createElement('div');
    card.className = 'drone-card';
    card.innerHTML = '<div class="icon">' + p.icon + '</div><div class="name">' + p.name + '</div>';
    card.addEventListener('click', () => {
      CONFIG.maxThrust = p.thrust;
      CONFIG.mass = p.mass;
      document.getElementById('cfg-thrust').value = p.thrust;
      document.getElementById('cfg-mass').value = p.mass;
      document.getElementById('val-thrust').textContent = p.thrust + 'N';
      document.getElementById('val-mass').textContent = p.mass.toFixed(2) + 'kg';
      persist();
    });
    droneGrid.appendChild(card);
  });
  function makeSwatches(containerId, colorList, key) {
    const cont = document.getElementById(containerId);
    if (!cont) return;
    colorList.forEach(hex => {
      const s = document.createElement('div');
      s.className = 'swatch' + (droneColors[key] === hex ? ' selected' : '');
      s.style.background = '#' + hex.toString(16).padStart(6, '0');
      s.addEventListener('click', () => {
        droneColors[key] = hex;
        cont.querySelectorAll('.swatch').forEach(c => c.classList.remove('selected'));
        s.classList.add('selected');
        applyDroneColors();
        persist();
      });
      cont.appendChild(s);
    });
  }
  makeSwatches('body-colors', COLORS.body, 'body');
  makeSwatches('arm-colors', COLORS.arm, 'arm');
  makeSwatches('prop-colors', COLORS.prop, 'prop');
  const bindRange = (id, valId, key, fmt, apply) => {
    const el = document.getElementById(id);
    const val = document.getElementById(valId);
    if (!el || !val) return;
    el.value = CONFIG[key] ?? el.value;
    val.textContent = fmt(el.value);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      CONFIG[key] = v;
      val.textContent = fmt(v);
      if (apply) apply(v);
      persist();
    });
  };
  bindRange('cfg-thrust', 'val-thrust', 'maxThrust', v => v + 'N');
  bindRange('cfg-mass', 'val-mass', 'mass', v => parseFloat(v).toFixed(2) + 'kg');
  bindRange('cfg-fov', 'val-fov', 'cameraFOV', v => v, v => { camera.fov = v; camera.updateProjectionMatrix(); });
  bindRange('cfg-sens', 'val-sens', 'sensitivity', v => parseFloat(v).toFixed(1) + 'x');
  bindRange('cfg-expo', 'val-expo', 'expo', v => parseFloat(v).toFixed(2));
  bindRange('cfg-rate', 'val-rate', 'maxRate', v => v);
  bindRange('cfg-dead', 'val-dead', 'deadzone', v => parseFloat(v).toFixed(2));
  bindRange('cfg-vol', 'val-vol', 'volume', v => Math.round(v * 100) + '%');
  const cq = document.getElementById('cfg-quality');
  if (cq) { cq.value = CONFIG.quality; cq.addEventListener('change', e => { CONFIG.quality = e.target.value; persist(); }); }
  const cs = document.getElementById('cfg-sound');
  if (cs) { cs.value = CONFIG.soundOn ? 'on' : 'off'; cs.addEventListener('change', e => { CONFIG.soundOn = e.target.value === 'on'; persist(); }); }
}
function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  readInput();
  updatePhysics(dt);
  if (gameStarted) {
    document.getElementById('alt').textContent = drone.position.y.toFixed(1);
    document.getElementById('spd').textContent = velocity.length().toFixed(1);
    document.getElementById('thr').textContent = Math.round(throttle * 100);
    const batEl = document.getElementById('battery');
    if (batEl) batEl.textContent = 'BAT ' + Math.round(battery) + '%';
  }
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime > 500) {
    fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
    document.getElementById('fps').textContent = fps + ' FPS';
    frameCount = 0;
    lastFpsTime = now;
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
    hideLoading('Demorou demais. Abra pelo link do site (Vercel), nao como arquivo baixado.');
  }
}, 12000);
try {
  init();
  if (loadingEl) loadingEl.dataset.done = '1';
} catch (e) {
  console.error(e);
  hideLoading('Erro: ' + (e && e.message ? e.message : e));
}
