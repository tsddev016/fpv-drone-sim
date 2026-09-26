import * as THREE from 'three';
const SAVE_KEY = 'fpv_drone_sim_pro_v4';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } }
function saveData(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {} }
const saved = loadSave();
const PLAYER_SKINS = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3317];
const PLAYER_HAIRS = [0x1a1a1a, 0x3b2f2f, 0x6b4423, 0xc4a35a, 0xe8e8e8, 0xff4444, 0x2244ff];
const PLAYER_CLOTHES = [0x1a5cff, 0xff3333, 0x22aa44, 0xffaa00, 0x222222, 0xffffff, 0x8844ff, 0x00cccc];
const PLAYER_PANTS = [0x1a1a2e, 0x2c3e50, 0x3d5a3d, 0x5a3d1a, 0x111111, 0x444444, 0x1a3a6e];
const PLAYER_SHOES = [0x111111, 0xffffff, 0xff2222, 0x2244ff, 0x888888, 0x5a3a1a];
let playerCustom = {
  skin: saved.pSkin ?? 0xffdbac, hair: saved.pHair ?? 0x1a1a1a, hairStyle: saved.pHairStyle ?? 'short',
  shirt: saved.pShirt ?? 0x1a5cff, pants: saved.pPants ?? 0x1a1a2e, shoes: saved.pShoes ?? 0x111111, outfit: saved.pOutfit ?? 'tshirt',
};
let sessionCode = saved.session || '';
let pendingStartMode = null;
let playerMesh = null;
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
let input = { throttle: 0, yaw: 0, pitch: 0, roll: 0, moveX: 0, moveY: 0 };
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let mode = isTouchDevice ? 'angle' : 'acro';
let controlScheme = isTouchDevice ? 'arcade' : 'mode2';
let camMode = saved.camMode ?? 'fpv';
let gameStarted = false;
let playMode = 'drone';
let walkPos = new THREE.Vector3(0, 1.7, 4);
let walkYaw = 0;
let cutsceneActive = false;
let tutorialStep = 0;
let tutorialActive = false;
let tutProgress = 0;
let tutTimer = 0;
const TUTORIAL_STEPS = [
  { t:'Bem-vindo', d:'Use sticks ou teclado.', o:'Toque stick ou W', check:()=> sticks.left.active||sticks.right.active||!!(window._keys&&window._keys.KeyW) },
  { t:'Subir 3m', d:'Suba o drone.', o:'ALT >= 3', check:()=> drone.position.y >= 3 },
  { t:'Subir 8m', d:'Continue.', o:'ALT >= 8', check:()=> drone.position.y >= 8 },
  { t:'Hover', d:'Fique 5-12m por 2s.', o:'Hover 2s', check:()=> drone.position.y>=5 && drone.position.y<=12 && tutProgress>=1 },
  { t:'Avancar', d:'Va pra frente.', o:'Z < -15', check:()=> drone.position.z < -15 },
  { t:'Girar', d:'Yaw com stick.', o:'Yaw>45', check:()=> { const e=new THREE.Euler().setFromQuaternion(drone.quaternion,'YXZ'); return Math.abs(e.y)>0.8; } },
  { t:'Inclinar', d:'Stick direito.', o:'Incline', check:()=> { const up=new THREE.Vector3(0,1,0).applyQuaternion(drone.quaternion); return Math.sqrt(up.x*up.x+up.z*up.z)>0.34; } },
  { t:'Velocidade', d:'Va rapido.', o:'8m/s', check:()=> velocity.length()>=8 },
  { t:'Portao', d:'Passe o portao.', o:'Z<-40', check:()=> drone.position.z < -40 && drone.position.y > 1 && drone.position.y < 6 },
  { t:'Anel', d:'Passe o anel.', o:'Z<-50', check:()=> drone.position.z < -50 && drone.position.y>=2 && drone.position.y<=5 },
  { t:'Camera', d:'Troque CAM.', o:'Troque', check:()=> camMode==='chase'||window.__tutCamToggled },
  { t:'Modo', d:'Troque MODO.', o:'Troque', check:()=> mode==='acro'||window.__tutModeToggled },
  { t:'Reset', d:'Use RESET.', o:'Reset', check:()=> !!window.__tutResetUsed },
  { t:'20m', d:'Suba alto.', o:'20m', check:()=> drone.position.y >= 20 },
  { t:'Fim!', d:'Parabens!', o:'No ar', check:()=> drone.position.y > 2 && tutProgress>=1 },
];
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
      const bp = audioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 180 + i * 40; bp.Q.value = 1.2;
      const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = audioCtx.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(audioCtx.destination); src.start();
      const osc = audioCtx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 55 + i * 8;
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
  sun.position.set(60, 110, 40); sun.castShadow = q !== 'low'; scene.add(sun);
  createDrone(); loadMap(currentMap); setupEvents(); setupMenus(); applyCameraMode(); animate();
  if (isTouchDevice) {
    const tc = document.getElementById('touch-controls');
    if (tc) tc.style.display = 'block';
    const ll = document.querySelector('#stick-left .stick-label');
    const rl = document.querySelector('#stick-right .stick-label');
    if (ll) ll.textContent = 'MOVER';
    if (rl) rl.textContent = 'INCLINAR';
  }
  const bar = document.getElementById('load-bar');
  const tip = document.getElementById('load-tip');
  const tips = ['Inicializando...', 'Calibrando...', 'Mapa...', 'Fisica...', 'Pronto!'];
  let li = 0;
  const loadIv = setInterval(() => {
    li++;
    if (bar) bar.style.width = Math.min(100, li * 22) + '%';
    if (tip) tip.textContent = tips[Math.min(li, tips.length-1)];
    if (li >= 5) {
      clearInterval(loadIv);
      if (bar) bar.style.width = '100%';
      setTimeout(() => { const el = document.getElementById('loading'); if (el) { el.classList.add('hidden'); el.dataset.done = '1'; } }, 280);
    }
  }, 180);
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
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.1), bodyMat); top.position.y = 0.028; drone.add(top);
  const bat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.12), new THREE.MeshStandardMaterial({ color: 0x222266 })); bat.position.y = -0.03; drone.add(bat);
  const armMat = new THREE.MeshStandardMaterial({ color: droneColors.arm, roughness: 0.45, metalness: 0.55 });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.028), armMat);
    const angle = (i * Math.PI / 2) + Math.PI / 4;
    arm.position.set(Math.cos(angle) * 0.11, 0, Math.sin(angle) * 0.11);
    arm.rotation.y = angle; drone.add(arm); arms.push(arm);
  }
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7 });
  const propMat = new THREE.MeshStandardMaterial({ color: droneColors.prop, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
  [[0.135, 0.02, 0.135], [-0.135, 0.02, 0.135], [-0.135, 0.02, -0.135], [0.135, 0.02, -0.135]].forEach((pos, i) => {
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), motorMat);
    motor.position.set(...pos); drone.add(motor);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.003, 0.02), propMat);
    prop.position.set(pos[0], pos[1] + 0.018, pos[2]);
    prop.userData.spinDir = (i % 2 === 0) ? 1 : -1; drone.add(prop); props.push(prop);
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
  window.__tutCamToggled = true;
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
  const left = new THREE.Mesh(new THREE.BoxGeometry((w - holeW) / 2, h, d), mat);
  left.position.set(-(holeW / 2 + (w - holeW) / 4), h / 2, 0); group.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry((w - holeW) / 2, h, d), mat);
  right.position.set(holeW / 2 + (w - holeW) / 4, h / 2, 0); group.add(right);
  if (holeY > 0.3) {
    const bot = new THREE.Mesh(new THREE.BoxGeometry(holeW, holeY, d), mat);
    bot.position.set(0, holeY / 2, 0); group.add(bot);
  }
  const topH = h - holeY - holeH;
  if (topH > 0.2) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(holeW, topH, d), mat);
    top.position.set(0, holeY + holeH + topH / 2, 0); group.add(top);
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
  if (mapId === 'racing' || mapId === 'night') {
    [[0, -18], [9, -42], [-7, -68], [12, -95], [0, -125]].forEach((pos, idx) => {
      const gate = new THREE.Group();
      const col = idx % 2 === 0 ? 0xff2222 : 0x2244ff;
      const pm = new THREE.MeshStandardMaterial({ color: col });
      [-2.7, 2.7].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.5, 8), pm); p.position.set(x, 2.25, 0); gate.add(p); });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 0.2), pm); bar.position.set(0, 4.5, 0); gate.add(bar);
      gate.position.set(pos[0], 0, pos[1]); addEnv(gate);
    });
  }
  if (mapId === 'freestyle' || mapId === 'racing') {
    [[12, -30, 8, 6, 4, 1.5, 2.5, 3], [-14, -55, 10, 8, 5, 2, 3, 3.5], [8, -80, 7, 5, 6, 1, 2.2, 2.8]].forEach(([x, z, w, h, d, hy, hh, hw]) => addEnv(makeBuildingWithHole(x, z, w, h, d, hy, hh, hw)));
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xff8800 }));
      ring.position.set((i % 2 === 0 ? 6 : -6), 2.5 + (i % 3), -45 - i * 22);
      ring.rotation.y = Math.PI / 2; addEnv(ring);
    }
  }
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
  for (let i = 0; i < 40; i++) {
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
function applyExpo(v, expo) { const s = Math.sign(v), a = Math.abs(v); return s * (a * a * a * expo + a * (1 - expo)); }
function applyDeadzone(v, dz) { if (Math.abs(v) < dz) return 0; return Math.sign(v) * (Math.abs(v) - dz) / (1 - dz); }
function readInput() {
  input.throttle = 0; input.yaw = 0; input.pitch = 0; input.roll = 0; input.moveX = 0; input.moveY = 0;
  const dz = Math.max(CONFIG.deadzone, 0.08), expo = CONFIG.expo, sens = CONFIG.sensitivity;
  const touchActive = sticks.left.active || sticks.right.active;
  if (touchActive && controlScheme === 'arcade') {
    const lx = applyExpo(applyDeadzone(sticks.left.x, dz), expo);
    const ly = applyExpo(applyDeadzone(sticks.left.y, dz), expo);
    const rx = applyExpo(applyDeadzone(sticks.right.x, dz), expo);
    const ry = applyExpo(applyDeadzone(sticks.right.y, dz), expo);
    input.moveX = lx * sens; input.moveY = -ly * sens;
    input.pitch = ry * sens; input.roll = rx * sens; input.yaw = lx * 0.35 * sens;
    input.throttle = Math.min(1, 0.48 + Math.max(0, -ly) * 0.12);
  } else if (touchActive) {
    input.throttle = Math.max(0, Math.min(1, (1 - sticks.left.y) / 2));
    input.yaw = applyExpo(applyDeadzone(sticks.left.x, dz), expo) * sens * 0.7;
    input.pitch = applyExpo(applyDeadzone(-sticks.right.y, dz), expo) * sens;
    input.roll = applyExpo(applyDeadzone(sticks.right.x, dz), expo) * sens;
  }
  const k = window._keys || {};
  if (k['KeyW']) { input.throttle = Math.min(1, Math.max(input.throttle, 0.85)); input.moveY = 1; }
  if (k['KeyS']) { input.throttle = Math.max(input.throttle, 0.35); input.moveY = -1; }
  if (k['KeyA']) input.yaw = -1; if (k['KeyD']) input.yaw = 1;
  if (k['ArrowUp']) input.pitch = -1; if (k['ArrowDown']) input.pitch = 1;
  if (k['ArrowLeft']) input.roll = -1; if (k['ArrowRight']) input.roll = 1;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let padFound = false;
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    padFound = true;
    input.throttle = Math.max(0, Math.min(1, (-(pad.axes[1] || 0) + 1) / 2));
    input.yaw = applyExpo(applyDeadzone(pad.axes[0] || 0, dz), expo) * sens;
    input.pitch = applyExpo(applyDeadzone(pad.axes[3] || 0, dz), expo) * sens;
    input.roll = applyExpo(applyDeadzone(pad.axes[2] || 0, dz), expo) * sens;
    break;
  }
  if (window.__FPV_PAD_INPUT && window.__FPV_PAD_INPUT.connected) {
    const p = window.__FPV_PAD_INPUT;
    input.throttle = p.throttle; input.yaw = p.yaw; input.pitch = p.pitch; input.roll = p.roll;
  }
  const ps = document.getElementById('pad-status');
  if (ps) {
    if (window.__FPV_PAD_INPUT && window.__FPV_PAD_INPUT.connected) ps.textContent = 'PAD · ' + (window.__FPV_PAD_INPUT.name || 'OK');
    else if (padFound) ps.textContent = 'PAD OK';
    else if (touchActive) ps.textContent = 'TOQUE ARCADE';
    else ps.textContent = sessionCode ? ('SALA ' + sessionCode) : 'No Pad';
  }
  throttle = input.throttle;
}
function updatePhysics(dt) {
  if (!gameStarted || playMode === 'walk') return;
  const maxRateRad = THREE.MathUtils.degToRad(CONFIG.maxRate);
  let targetWx = input.pitch * maxRateRad;
  let targetWy = input.yaw * maxRateRad * 0.45;
  let targetWz = input.roll * maxRateRad;
  if (mode === 'angle' || controlScheme === 'arcade') {
    const maxTilt = THREE.MathUtils.degToRad(45);
    const euler = new THREE.Euler().setFromQuaternion(drone.quaternion, 'YXZ');
    const kp = 12;
    targetWx = (input.pitch * maxTilt - euler.x) * kp;
    targetWz = (input.roll * maxTilt - euler.z) * kp;
    targetWy = input.yaw * maxRateRad * 0.5;
  }
  const angAccel = 40;
  angularVelocity.x += (targetWx - angularVelocity.x) * Math.min(1, angAccel * dt);
  angularVelocity.y += (targetWy - angularVelocity.y) * Math.min(1, angAccel * dt);
  angularVelocity.z += (targetWz - angularVelocity.z) * Math.min(1, angAccel * dt);
  if (Math.sqrt((input.pitch||0)**2+(input.roll||0)**2+(input.yaw||0)**2+(input.moveX||0)**2+(input.moveY||0)**2) < 0.08) angularVelocity.multiplyScalar(0.82);
  const wx = angularVelocity.x * dt, wy = angularVelocity.y * dt, wz = angularVelocity.z * dt;
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), wy));
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), wx));
  drone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), wz));
  drone.quaternion.normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(drone.quaternion);
  let thrustMul = throttle * CONFIG.maxThrust;
  if (mode === 'angle' || controlScheme === 'arcade') {
    const tilt = Math.sqrt(up.x * up.x + up.z * up.z);
    thrustMul *= (1 + tilt * 0.55);
  }
  const force = up.multiplyScalar(thrustMul);
  force.y -= CONFIG.mass * CONFIG.gravity;
  if (controlScheme === 'arcade' && (Math.abs(input.moveX) > 0.02 || Math.abs(input.moveY) > 0.02)) {
    const yawOnly = new THREE.Euler().setFromQuaternion(drone.quaternion, 'YXZ');
    const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawOnly.y, 0));
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(facing);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);
    force.add(forward.multiplyScalar(input.moveY * 18 * CONFIG.mass));
    force.add(right.multiplyScalar(input.moveX * 18 * CONFIG.mass));
  }
  const speed = velocity.length();
  const drag = CONFIG.drag * (1 + speed * 0.05);
  force.x -= velocity.x * drag; force.y -= velocity.y * drag * 0.9; force.z -= velocity.z * drag;
  velocity.add(force.divideScalar(CONFIG.mass).multiplyScalar(dt));
  const hVel = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  if (hVel > 28) { velocity.x *= 28 / hVel; velocity.z *= 28 / hVel; }
  const nextPos = drone.position.clone().add(velocity.clone().multiplyScalar(dt));
  if (nextPos.y < 0.08) {
    nextPos.y = 0.08;
    if (velocity.y < 0) velocity.y *= -0.1;
    velocity.x *= 0.75; velocity.z *= 0.75; angularVelocity.multiplyScalar(0.55);
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
  if (!drone) return;
  window.__tutResetUsed = true;
  drone.position.set(0, CONFIG.respawnHeight, 0);
  drone.quaternion.identity();
  velocity.set(0, 0, 0); angularVelocity.set(0, 0, 0);
  throttle = 0; battery = Math.min(100, battery + 20);
  if (playMode !== 'walk') applyCameraMode();
  showMsg('RESET');
}
function toggleMode() {
  mode = mode === 'acro' ? 'angle' : 'acro';
  window.__tutModeToggled = true;
  const ml = document.getElementById('mode-label');
  if (ml) ml.textContent = mode.toUpperCase();
  const bm = document.getElementById('btn-mode');
  if (bm) bm.textContent = 'MODO: ' + mode.toUpperCase();
  showMsg(mode.toUpperCase());
}
function hideAllOverlays() { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); }
function showGameChrome(show) {
  document.getElementById('hud')?.classList.toggle('hidden', !show);
  ['btn-reset', 'btn-mode', 'btn-menu', 'btn-cam'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
  });
}
function normalizeSessionCode(raw) {
  let s = String(raw || '').toUpperCase();
  s = s.replace(/[0-9]/g, '');
  s = s.replace(/[^A-Z_\-\.]/g, '');
  return s.slice(0, 8);
}
function openSessionMenu(modeName) {
  pendingStartMode = modeName || 'drone';
  hideAllOverlays();
  document.getElementById('session-menu')?.classList.remove('hidden');
  const input = document.getElementById('session-code');
  const err = document.getElementById('session-error');
  if (err) err.textContent = '';
  if (input) { input.value = sessionCode || ''; setTimeout(() => input.focus(), 80); }
}
function confirmSession(useCode) {
  const input = document.getElementById('session-code');
  const err = document.getElementById('session-error');
  if (useCode) {
    const code = normalizeSessionCode(input ? input.value : '');
    if (input) input.value = code;
    if (!code || code.length < 2) {
      if (err) err.textContent = 'Min. 2 letras (max 8). Sem numeros.';
      return;
    }
    sessionCode = code;
  } else sessionCode = '';
  persist();
  const modeName = pendingStartMode || 'drone';
  pendingStartMode = null;
  startGame({ mode: modeName });
  if (sessionCode) showMsg('SALA: ' + sessionCode);
}
function startGame(opts) {
  opts = opts || {};
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  hideAllOverlays();
  playMode = opts.mode || 'drone';
  tutorialActive = playMode === 'tutorial';
  tutorialStep = 0; tutProgress = 0; tutTimer = 0;
  window.__tutCamToggled = false; window.__tutModeToggled = false; window.__tutResetUsed = false;
  cutsceneActive = false;
  document.getElementById('cutscene')?.classList.remove('show');
  document.getElementById('btn-deploy')?.classList.remove('show');
  document.getElementById('tutorial-hud')?.classList.toggle('show', tutorialActive);
  if (playMode === 'walk') startWalkMode();
  else {
    showGameChrome(true);
    gameStarted = true;
    controlScheme = isTouchDevice ? 'arcade' : 'mode2';
    if (drone) drone.visible = true;
    resetDrone();
    if (tutorialActive) { loadMap('racing'); updateTutorialUI(); showMsg('TUTORIAL'); }
    else showMsg(isTouchDevice ? 'Esq ANDAR · Dir INCLINAR' : 'VOA!');
  }
}
function startWalkMode() {
  gameStarted = true; playMode = 'walk';
  showGameChrome(false);
  document.getElementById('btn-menu')?.classList.remove('hidden');
  document.getElementById('btn-deploy')?.classList.add('show');
  document.getElementById('hud')?.classList.remove('hidden');
  if (drone) { drone.visible = false; drone.position.set(0, -10, 0); }
  walkPos.set(0, 1.7, 6); walkYaw = 0;
  if (camera.parent === drone) drone.remove(camera);
  if (!camera.parent) scene.add(camera);
  camera.position.copy(walkPos); camera.rotation.set(0, walkYaw, 0); camera.fov = 75; camera.updateProjectionMatrix();
  createPlayerMesh();
  showMsg(sessionCode ? ('Sala ' + sessionCode) : 'Explore');
}
function deployDroneCutscene() {
  if (cutsceneActive || playMode !== 'walk') return;
  cutsceneActive = true;
  document.getElementById('btn-deploy')?.classList.remove('show');
  const cs = document.getElementById('cutscene');
  const ct = document.getElementById('cutscene-text');
  const lines = ['Voce tira o drone da mochila...', 'Coloca no chao e liga...', 'Decolagem FPV!'];
  let i = 0;
  if (cs) cs.classList.add('show');
  function nextLine() {
    if (ct) ct.textContent = lines[i];
    i++;
    if (i === 1 && drone) {
      if (playerMesh) playerMesh.visible = false;
      drone.visible = true;
      drone.position.set(walkPos.x, 0.15, walkPos.z - 1.2);
      drone.quaternion.identity(); velocity.set(0,0,0); angularVelocity.set(0,0,0);
    }
    if (i === 2 && drone) { drone.position.y = 1.2; throttle = 0.5; }
    if (i >= lines.length) {
      setTimeout(() => {
        if (cs) cs.classList.remove('show');
        cutsceneActive = false; playMode = 'drone'; gameStarted = true;
        showGameChrome(true); camMode = 'fpv'; applyCameraMode();
        controlScheme = isTouchDevice ? 'arcade' : 'mode2';
        showMsg('Controle FPV!');
      }, 900);
      return;
    }
    setTimeout(nextLine, 1100);
  }
  nextLine();
}
function updateWalk(dt) {
  if (playMode !== 'walk' || cutsceneActive) return;
  const k = window._keys || {};
  let mx = 0, mz = 0;
  if (k['KeyW'] || k['ArrowUp']) mz -= 1;
  if (k['KeyS'] || k['ArrowDown']) mz += 1;
  if (k['KeyA'] || k['ArrowLeft']) mx -= 1;
  if (k['KeyD'] || k['ArrowRight']) mx += 1;
  if (sticks.left.active) { mx += sticks.left.x; mz += sticks.left.y; }
  if (sticks.right.active) walkYaw -= sticks.right.x * 1.8 * dt;
  if (k['KeyQ']) walkYaw += 1.5 * dt;
  if (k['KeyE']) walkYaw -= 1.5 * dt;
  const speed = 5, cos = Math.cos(walkYaw), sin = Math.sin(walkYaw);
  walkPos.x += (mx * cos + mz * sin) * speed * dt;
  walkPos.z += (-mx * sin + mz * cos) * speed * dt;
  walkPos.y = 1.7;
  camera.position.copy(walkPos);
  camera.rotation.order = 'YXZ'; camera.rotation.y = walkYaw; camera.rotation.x = 0;
  if (playerMesh) {
    playerMesh.position.set(walkPos.x, 0, walkPos.z);
    playerMesh.rotation.y = walkYaw;
    playerMesh.visible = false;
  }
}
function updateTutorialUI() {
  if (!tutorialActive) return;
  const step = TUTORIAL_STEPS[tutorialStep]; if (!step) return;
  const n = document.getElementById('tut-step-num');
  const t = document.getElementById('tut-title');
  const d = document.getElementById('tut-desc');
  const o = document.getElementById('tut-obj');
  const p = document.getElementById('tut-progress');
  if (n) n.textContent = 'PASSO ' + (tutorialStep+1) + ' / ' + TUTORIAL_STEPS.length;
  if (t) t.textContent = step.t;
  if (d) d.textContent = step.d;
  if (o) o.textContent = 'Objetivo: ' + step.o;
  if (p) p.style.width = ((tutorialStep / TUTORIAL_STEPS.length) * 100) + '%';
}
function updateTutorial(dt) {
  if (!tutorialActive || !gameStarted || playMode === 'walk') return;
  const step = TUTORIAL_STEPS[tutorialStep]; if (!step) return;
  if (tutorialStep === 3 || tutorialStep === 14) {
    if (step.check()) tutTimer += dt; else tutTimer = Math.max(0, tutTimer - dt * 2);
    tutProgress = Math.min(1, tutTimer / 2);
  } else tutProgress = step.check() ? 1 : 0;
  const p = document.getElementById('tut-progress');
  if (p) p.style.width = ((tutorialStep / TUTORIAL_STEPS.length + (1/TUTORIAL_STEPS.length)*tutProgress) * 100) + '%';
  if (tutProgress >= 1 || (tutorialStep !== 3 && tutorialStep !== 14 && step.check())) {
    tutorialStep++; tutTimer = 0; tutProgress = 0;
    if (tutorialStep >= TUTORIAL_STEPS.length) {
      tutorialActive = false;
      document.getElementById('tutorial-hud')?.classList.remove('show');
      showMsg('TUTORIAL COMPLETO!');
      setTimeout(openMenu, 2200);
    } else { updateTutorialUI(); showMsg('Passo ' + (tutorialStep+1)); }
  }
}
function openMenu() {
  gameStarted = false; tutorialActive = false; playMode = 'drone'; cutsceneActive = false;
  document.getElementById('tutorial-hud')?.classList.remove('show');
  document.getElementById('btn-deploy')?.classList.remove('show');
  document.getElementById('cutscene')?.classList.remove('show');
  document.getElementById('hud')?.classList.add('hidden');
  ['btn-reset', 'btn-mode', 'btn-menu', 'btn-cam'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  document.getElementById('main-menu')?.classList.remove('hidden');
  if (drone) drone.visible = true;
  if (playerMesh && scene) { scene.remove(playerMesh); playerMesh = null; }
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
    session: sessionCode,
    pSkin: playerCustom.skin, pHair: playerCustom.hair, pHairStyle: playerCustom.hairStyle,
    pShirt: playerCustom.shirt, pPants: playerCustom.pants, pShoes: playerCustom.shoes, pOutfit: playerCustom.outfit,
  });
}
function createPlayerMesh() {
  if (!scene) return;
  if (playerMesh) scene.remove(playerMesh);
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: playerCustom.skin, roughness: 0.85 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: playerCustom.shirt, roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: playerCustom.pants, roughness: 0.75 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: playerCustom.shoes, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: playerCustom.hair, roughness: 0.9 });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 8), pantsMat); legL.position.set(-0.1, 0.35, 0); g.add(legL);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 8), pantsMat); legR.position.set(0.1, 0.35, 0); g.add(legR);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.2), shoeMat); shoeL.position.set(-0.1, 0.1, 0.02); g.add(shoeL);
  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.2), shoeMat); shoeR.position.set(0.1, 0.1, 0.02); g.add(shoeR);
  let torsoH = playerCustom.outfit === 'hoodie' ? 0.45 : (playerCustom.outfit === 'tank' ? 0.35 : 0.4);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, torsoH, 0.18), shirtMat); torso.position.y = 0.75; g.add(torso);
  if (playerCustom.outfit === 'hoodie') {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), shirtMat); hood.position.set(0, 1.05, -0.02); g.add(hood);
  }
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.4, 8), skinMat); armL.position.set(-0.22, 0.72, 0); armL.rotation.z = 0.15; g.add(armL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.4, 8), skinMat); armR.position.set(0.22, 0.72, 0); armR.rotation.z = -0.15; g.add(armR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), skinMat); head.position.y = 1.12; g.add(head);
  if (playerCustom.hairStyle !== 'bald') {
    if (playerCustom.hairStyle === 'short') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      hair.position.y = 1.18; g.add(hair);
    } else if (playerCustom.hairStyle === 'long') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), hairMat); hair.position.y = 1.16; g.add(hair);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.25, 0.08), hairMat); back.position.set(0, 1.0, -0.1); g.add(back);
    } else if (playerCustom.hairStyle === 'mohawk') {
      const moh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.22), hairMat); moh.position.set(0, 1.28, 0); g.add(moh);
    }
  }
  g.position.set(walkPos.x, 0, walkPos.z);
  scene.add(g);
  playerMesh = g;
}
function rebuildPlayerMesh() {
  if (playerMesh && scene) { scene.remove(playerMesh); playerMesh = null; }
  if (playMode === 'walk') createPlayerMesh();
}
function setupPlayerCustomization() {
  function swatches(cid, list, key) {
    const cont = document.getElementById(cid);
    if (!cont) return;
    cont.innerHTML = '';
    list.forEach(hex => {
      const s = document.createElement('div');
      s.className = 'swatch' + (playerCustom[key] === hex ? ' selected' : '');
      s.style.background = '#' + hex.toString(16).padStart(6, '0');
      s.addEventListener('click', () => {
        playerCustom[key] = hex;
        cont.querySelectorAll('.swatch').forEach(c => c.classList.remove('selected'));
        s.classList.add('selected');
        rebuildPlayerMesh(); persist();
      });
      cont.appendChild(s);
    });
  }
  swatches('player-skin-colors', PLAYER_SKINS, 'skin');
  swatches('player-hair-colors', PLAYER_HAIRS, 'hair');
  swatches('player-shirt-colors', PLAYER_CLOTHES, 'shirt');
  swatches('player-pants-colors', PLAYER_PANTS, 'pants');
  swatches('player-shoes-colors', PLAYER_SHOES, 'shoes');
  const hairStyles = [{ id: 'short', t: 'Curto' }, { id: 'long', t: 'Longo' }, { id: 'mohawk', t: 'Moicano' }, { id: 'bald', t: 'Careca' }];
  const hairGrid = document.getElementById('player-hair-style');
  if (hairGrid) {
    hairGrid.innerHTML = '';
    hairStyles.forEach(h => {
      const el = document.createElement('div');
      el.className = 'shop-option' + (playerCustom.hairStyle === h.id ? ' selected' : '');
      el.innerHTML = '<span class="t">' + h.t + '</span>';
      el.addEventListener('click', () => {
        playerCustom.hairStyle = h.id;
        hairGrid.querySelectorAll('.shop-option').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        rebuildPlayerMesh(); persist();
      });
      hairGrid.appendChild(el);
    });
  }
  const outfits = [{ id: 'tshirt', t: 'Camiseta' }, { id: 'hoodie', t: 'Moletom' }, { id: 'tank', t: 'Regata' }];
  const outGrid = document.getElementById('player-outfit-style');
  if (outGrid) {
    outGrid.innerHTML = '';
    outfits.forEach(o => {
      const el = document.createElement('div');
      el.className = 'shop-option' + (playerCustom.outfit === o.id ? ' selected' : '');
      el.innerHTML = '<span class="t">' + o.t + '</span>';
      el.addEventListener('click', () => {
        playerCustom.outfit = o.id;
        outGrid.querySelectorAll('.shop-option').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        rebuildPlayerMesh(); persist();
      });
      outGrid.appendChild(el);
    });
  }
}
function setupMenus() {
  document.getElementById('btn-play')?.addEventListener('click', () => openSessionMenu('drone'));
  document.getElementById('btn-tutorial')?.addEventListener('click', () => openSessionMenu('tutorial'));
  document.getElementById('btn-walk')?.addEventListener('click', () => openSessionMenu('walk'));
  document.getElementById('btn-deploy')?.addEventListener('click', deployDroneCutscene);
  document.getElementById('btn-session-go')?.addEventListener('click', () => confirmSession(true));
  document.getElementById('btn-session-solo')?.addEventListener('click', () => confirmSession(false));
  const sessInput = document.getElementById('session-code');
  if (sessInput) {
    sessInput.addEventListener('input', () => {
      const v = normalizeSessionCode(sessInput.value);
      if (sessInput.value !== v) sessInput.value = v;
    });
    sessInput.addEventListener('keydown', e => { if (e.key === 'Enter') confirmSession(true); });
  }
  setupPlayerCustomization();
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
        CONFIG.maxThrust = p.thrust; CONFIG.mass = p.mass; persist();
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
        if (window.__FPV_SHOP_REFRESH) window.__FPV_SHOP_REFRESH();
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
}
function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  readInput();
  if (playMode === 'walk') updateWalk(dt);
  else { updatePhysics(dt); updateTutorial(dt); }
  if (gameStarted && playMode !== 'walk') {
    const a = document.getElementById('alt'), s = document.getElementById('spd'), t = document.getElementById('thr');
    if (a) a.textContent = drone.position.y.toFixed(1);
    if (s) s.textContent = velocity.length().toFixed(1);
    if (t) t.textContent = Math.round(throttle * 100);
    const bat = document.getElementById('battery');
    if (bat) bat.textContent = 'BAT ' + Math.round(battery) + '%';
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
try { init(); } catch (e) { console.error(e); const el = document.getElementById('loading'); if (el) el.innerHTML = '<div style="color:#0f0;padding:24px">Erro: ' + e.message + '</div>'; }
