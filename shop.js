import * as THREE from 'three';

let preview = {
  renderer: null, scene: null, camera: null, mesh: null,
  animId: null, dragging: false, lastX: 0, rotY: 0.6, auto: true
};

const BODY = {
  standard: { name: 'Standard', desc: '5" classico' },
  slim: { name: 'Slim', desc: 'estreito' },
  wide: { name: 'Wide', desc: 'bracos longos' },
  whoop: { name: 'Whoop', desc: 'ducted' },
};
const CAMS = {
  none: { name: 'Sem cam', desc: '' },
  fpv: { name: 'FPV', desc: 'frontal' },
  action: { name: 'Action', desc: 'GoPro' },
};
const STICKERS = {
  none: { name: 'Nenhum', desc: '' },
  stripe: { name: 'Listras', desc: 'racing' },
  x: { name: 'X Mark', desc: 'cruz' },
  number: { name: 'Numero 7', desc: 'piloto' },
};
const EXTRAS = {
  none: { name: 'Nenhum', desc: '' },
  antenna: { name: 'Antena', desc: 'RX' },
  ledbar: { name: 'LED bar', desc: 'traseira' },
  keychain: { name: 'Chaveiro', desc: 'enfeite' },
};

function getCustom() {
  return window.__FPV_CUSTOM || {
    bodyStyle: 'standard', scale: 1, camType: 'fpv',
    sticker: 'none', accessory: 'none', propSpin: 1,
    body: 0x1a1a1a, arm: 0x111111, prop: 0xdddddd,
  };
}

function buildPreviewDrone() {
  const C = getCustom();
  const g = new THREE.Group();
  let bodyW = 0.14, bodyH = 0.045, bodyD = 0.14, armLen = 0.32, armSpread = 0.11, md = 0.135;
  if (C.bodyStyle === 'slim') { bodyW = 0.1; bodyD = 0.12; armLen = 0.28; armSpread = 0.09; md = 0.12; }
  if (C.bodyStyle === 'wide') { bodyW = 0.16; armLen = 0.38; armSpread = 0.14; md = 0.16; }
  if (C.bodyStyle === 'whoop') { bodyW = 0.12; armLen = 0.2; armSpread = 0.08; md = 0.1; }

  const bodyMat = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.35, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), bodyMat);
  g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.7, 0.012, bodyD * 0.7), bodyMat);
  top.position.y = bodyH * 0.55; g.add(top);

  const armMat = new THREE.MeshStandardMaterial({ color: C.arm, roughness: 0.45, metalness: 0.55 });
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.018, 0.028), armMat);
    const a = (i * Math.PI / 2) + Math.PI / 4;
    arm.position.set(Math.cos(a) * armSpread, 0, Math.sin(a) * armSpread);
    arm.rotation.y = a; g.add(arm);
  }

  const motorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7 });
  const propMat = new THREE.MeshStandardMaterial({ color: C.prop, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const positions = [[md, 0.02, md], [-md, 0.02, md], [-md, 0.02, -md], [md, 0.02, -md]];
  positions.forEach((pos, i) => {
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10), motorMat);
    motor.position.set(...pos); g.add(motor);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.003, 0.02), propMat);
    prop.position.set(pos[0], pos[1] + 0.018, pos[2]);
    prop.userData.spinDir = (i % 2 === 0) ? 1 : -1;
    g.add(prop);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshStandardMaterial({
      color: i < 2 ? 0xff2222 : 0xffffff, emissive: i < 2 ? 0xff0000 : 0xaaaaaa, emissiveIntensity: 0.9
    }));
    led.position.set(pos[0] * 0.7, -0.01, pos[2] * 0.7); g.add(led);
  });

  if (C.camType === 'fpv') {
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    cam.position.set(0, -0.005, bodyD * 0.65); g.add(cam);
  } else if (C.camType === 'action') {
    const gp = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.035), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    gp.position.set(0, bodyH * 0.7, 0); g.add(gp);
  }

  if (C.sticker === 'stripe') {
    const s = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.9, 0.002, 0.015), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    s.position.y = bodyH * 0.52; g.add(s);
  } else if (C.sticker === 'x') {
    const x1 = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.7, 0.002, 0.012), new THREE.MeshStandardMaterial({ color: 0xff2200 }));
    x1.position.y = bodyH * 0.52; x1.rotation.y = Math.PI / 4; g.add(x1);
  } else if (C.sticker === 'number') {
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.002, 0.05), new THREE.MeshStandardMaterial({ color: 0xffee00 }));
    n.position.y = bodyH * 0.52; g.add(n);
  }

  if (C.accessory === 'antenna') {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
    ant.position.set(0.04, 0.08, -0.06); ant.rotation.z = 0.3; g.add(ant);
  } else if (C.accessory === 'ledbar') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff66, emissiveIntensity: 1 }));
    bar.position.set(0, 0, -bodyD * 0.55); g.add(bar);
  } else if (C.accessory === 'keychain') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
    ring.position.set(-0.06, -0.02, 0.06); g.add(ring);
  }

  const sc = C.scale || 1;
  g.scale.set(sc, sc, sc);
  return g;
}

function refreshMesh() {
  if (!preview.scene) return;
  if (preview.mesh) preview.scene.remove(preview.mesh);
  preview.mesh = buildPreviewDrone();
  preview.mesh.rotation.y = preview.rotY;
  preview.scene.add(preview.mesh);
}

function initPreview() {
  const canvas = document.getElementById('drone-preview-canvas');
  const wrap = document.getElementById('drone-preview-wrap');
  if (!canvas || !wrap) return;

  const w = Math.max(wrap.clientWidth || 260, 200);
  const h = Math.max(wrap.clientHeight || 260, 200);

  if (!preview.renderer) {
    preview.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    preview.renderer.setSize(w, h, false);
    preview.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    preview.scene = new THREE.Scene();
    preview.scene.background = new THREE.Color(0x0a150a);
    preview.camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 20);
    preview.camera.position.set(0.55, 0.4, 0.85);
    preview.camera.lookAt(0, 0, 0);
    preview.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.95);
    dl.position.set(2, 3, 2);
    preview.scene.add(dl);

    const onDown = (e) => {
      preview.dragging = true;
      preview.auto = false;
      preview.lastX = e.touches ? e.touches[0].clientX : e.clientX;
    };
    const onMove = (e) => {
      if (!preview.dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      preview.rotY += (x - preview.lastX) * 0.012;
      preview.lastX = x;
      if (preview.mesh) preview.mesh.rotation.y = preview.rotY;
    };
    const onUp = () => {
      preview.dragging = false;
      setTimeout(() => { preview.auto = true; }, 1800);
    };
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchend', onUp);
  } else {
    preview.renderer.setSize(w, h, false);
  }

  refreshMesh();

  if (preview.animId) cancelAnimationFrame(preview.animId);
  const tick = () => {
    preview.animId = requestAnimationFrame(tick);
    if (preview.mesh && preview.auto && !preview.dragging) {
      preview.rotY += 0.01;
      preview.mesh.rotation.y = preview.rotY;
    }
    if (preview.mesh) {
      preview.mesh.traverse(o => {
        if (o.userData && o.userData.spinDir) {
          o.rotation.y += o.userData.spinDir * 0.3 * (getCustom().propSpin || 1);
        }
      });
    }
    if (preview.renderer && preview.scene && preview.camera) {
      preview.renderer.render(preview.scene, preview.camera);
    }
  };
  tick();
}

function stopPreview() {
  if (preview.animId) cancelAnimationFrame(preview.animId);
  preview.animId = null;
}

function fillGrid(gridId, options, current, onPick) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  Object.entries(options).forEach(([id, info]) => {
    const div = document.createElement('div');
    div.className = 'shop-option' + (current === id ? ' selected' : '');
    div.innerHTML = '<span class="t">' + info.name + '</span><span class="d">' + (info.desc || '') + '</span>';
    div.addEventListener('click', () => {
      grid.querySelectorAll('.shop-option').forEach(c => c.classList.remove('selected'));
      div.classList.add('selected');
      onPick(id);
      refreshMesh();
    });
    grid.appendChild(div);
  });
}

function setupShopUI() {
  document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.getAttribute('data-shop');
      ['body', 'size', 'colors', 'cam', 'stickers', 'extra'].forEach(s => {
        const el = document.getElementById('shop-' + s);
        if (el) el.classList.toggle('hidden', s !== id);
      });
    });
  });

  const C = getCustom();
  fillGrid('shop-body-grid', BODY, C.bodyStyle, id => {
    getCustom().bodyStyle = id;
    if (window.__FPV_SAVE_CUSTOM) window.__FPV_SAVE_CUSTOM();
  });
  fillGrid('shop-cam-grid', CAMS, C.camType, id => {
    getCustom().camType = id;
    if (window.__FPV_SAVE_CUSTOM) window.__FPV_SAVE_CUSTOM();
  });
  fillGrid('shop-sticker-grid', STICKERS, C.sticker, id => {
    getCustom().sticker = id;
    if (window.__FPV_SAVE_CUSTOM) window.__FPV_SAVE_CUSTOM();
  });
  fillGrid('shop-extra-grid', EXTRAS, C.accessory, id => {
    getCustom().accessory = id;
    if (window.__FPV_SAVE_CUSTOM) window.__FPV_SAVE_CUSTOM();
  });

  const scaleEl = document.getElementById('cfg-scale');
  const scaleVal = document.getElementById('val-scale');
  if (scaleEl && scaleVal) {
    scaleEl.value = C.scale;
    scaleVal.textContent = Number(C.scale).toFixed(2) + 'x';
    scaleEl.oninput = () => {
      getCustom().scale = parseFloat(scaleEl.value);
      scaleVal.textContent = getCustom().scale.toFixed(2) + 'x';
      refreshMesh();
      if (window.__FPV_SAVE_CUSTOM) window.__FPV_SAVE_CUSTOM();
    };
  }
  const spinEl = document.getElementById('cfg-prop-spin');
  const spinVal = document.getElementById('val-prop-spin');
  if (spinEl && spinVal) {
    spinEl.value = C.propSpin;
    spinVal.textContent = Number(C.propSpin).toFixed(1) + 'x';
    spinEl.oninput = () => {
      getCustom().propSpin = parseFloat(spinEl.value);
      spinVal.textContent = getCustom().propSpin.toFixed(1) + 'x';
      if (window.__FPV_SAVE_CUSTOM) window.__FPV_SAVE_CUSTOM();
    };
  }
}

export function openShop() {
  setupShopUI();
  setTimeout(() => initPreview(), 60);
}

export function closeShop() {
  stopPreview();
}

export function notifyCustomChanged() {
  if (preview.scene) refreshMesh();
}

window.__FPV_OPEN_SHOP = openShop;
window.__FPV_CLOSE_SHOP = closeShop;
window.__FPV_SHOP_REFRESH = notifyCustomChanged;
