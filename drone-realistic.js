(function () {
  var stickerTextures = {};

  function makeCanvasTex(THREE, drawFn, w, h) {
    w = w || 256; h = h || 256;
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    drawFn(ctx, w, h);
    var tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function loadStickers(THREE, cb) {
    stickerTextures.stripe = makeCanvasTex(THREE, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(0, h * 0.15, w, h * 0.14);
      ctx.fillStyle = 'rgba(255,40,40,0.95)';
      ctx.fillRect(0, h * 0.38, w, h * 0.14);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(0, h * 0.61, w, h * 0.14);
    }, 256, 128);

    stickerTextures.x = makeCanvasTex(THREE, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,30,30,0.95)';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(w - 40, h - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 40, 40); ctx.lineTo(40, h - 40); ctx.stroke();
    });

    stickerTextures.number = makeCanvasTex(THREE, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,220,0,0.98)';
      ctx.font = 'bold 160px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('7', w / 2, h / 2);
    });

    stickerTextures.skull = makeCanvasTex(THREE, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(240,240,240,0.95)';
      ctx.beginPath(); ctx.ellipse(w/2, h*0.42, 70, 75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(w*0.38, h*0.4, 16, 18, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w*0.62, h*0.4, 16, 18, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w/2, h*0.52); ctx.lineTo(w*0.42, h*0.68); ctx.lineTo(w*0.58, h*0.68); ctx.fill();
    });

    stickerTextures.flame = makeCanvasTex(THREE, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      var grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(255,230,80,0.95)');
      grd.addColorStop(0.5, 'rgba(255,100,0,0.95)');
      grd.addColorStop(1, 'rgba(180,20,0,0.9)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(w/2, 20);
      ctx.bezierCurveTo(w*0.2, h*0.4, w*0.15, h*0.7, w/2, h-20);
      ctx.bezierCurveTo(w*0.85, h*0.7, w*0.8, h*0.4, w/2, 20);
      ctx.fill();
    });

    stickerTextures.check = makeCanvasTex(THREE, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      var s = 32;
      for (var y = 0; y < h; y += s) {
        for (var x = 0; x < w; x += s) {
          ctx.fillStyle = ((x/s + y/s) % 2 === 0) ? 'rgba(20,20,20,0.95)' : 'rgba(240,240,240,0.95)';
          ctx.fillRect(x, y, s, s);
        }
      }
    }, 256, 128);

    if (cb) cb();
  }

  function buildRealisticDrone(THREE, colors, stickerId) {
    colors = colors || {};
    var bodyCol = colors.body != null ? colors.body : 0x2a2a2e;
    var armCol = colors.arm != null ? colors.arm : 0x1a1a1c;
    var propCol = colors.prop != null ? colors.prop : 0x111111;

    var g = new THREE.Group();
    g.name = 'fpv-realistic';

    var carbon = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.45, metalness: 0.55 });
    var bottomPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.16), carbon);
    bottomPlate.position.y = -0.012; bottomPlate.castShadow = true; g.add(bottomPlate);
    var topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.14), carbon);
    topPlate.position.y = 0.028; g.add(topPlate);

    var fc = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.022, 0.055), new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.5 }));
    fc.position.y = 0.01; g.add(fc);

    for (var e = 0; e < 4; e++) {
      var esc = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.03), new THREE.MeshStandardMaterial({ color: 0x222244, metalness: 0.4 }));
      var a = (e * Math.PI) / 2 + Math.PI / 4;
      esc.position.set(Math.cos(a) * 0.05, 0.002, Math.sin(a) * 0.05);
      esc.rotation.y = a; g.add(esc);
    }

    var bat = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.032, 0.14), new THREE.MeshStandardMaterial({ color: 0x1a1a55, roughness: 0.6 }));
    bat.position.set(0, -0.038, 0); g.add(bat);
    var xt = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.018), new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.5 }));
    xt.position.set(0.04, -0.038, 0.08); g.add(xt);
    var strapMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    var s1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.012), strapMat);
    s1.position.set(0, -0.018, 0.02); g.add(s1);
    var s2 = s1.clone(); s2.position.z = -0.02; g.add(s2);

    var armMat = new THREE.MeshStandardMaterial({ color: armCol, roughness: 0.4, metalness: 0.6 });
    var armLen = 0.34;
    var motorPositions = [];
    for (var i = 0; i < 4; i++) {
      var angle = (i * Math.PI) / 2 + Math.PI / 4;
      var arm = new THREE.Group();
      var beam = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.014, 0.022), armMat);
      beam.position.x = armLen / 2; arm.add(beam);
      var mount = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 12), armMat);
      mount.position.x = armLen - 0.01; arm.add(mount);
      arm.position.set(Math.cos(angle) * 0.04, 0, Math.sin(angle) * 0.04);
      arm.rotation.y = angle; g.add(arm);
      motorPositions.push([
        Math.cos(angle) * (0.04 + armLen - 0.01),
        0.02,
        Math.sin(angle) * (0.04 + armLen - 0.01),
        i
      ]);
    }

    var motorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.75, roughness: 0.3 });
    var bellMat = new THREE.MeshStandardMaterial({ color: 0x444448, metalness: 0.85, roughness: 0.25 });
    var propMat = new THREE.MeshStandardMaterial({ color: propCol, transparent: true, opacity: 0.75, side: THREE.DoubleSide, roughness: 0.55 });
    var props = [];

    motorPositions.forEach(function (pos) {
      var motorG = new THREE.Group();
      motorG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.028, 14), motorMat));
      var bell = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.012, 14), bellMat);
      bell.position.y = 0.018; motorG.add(bell);
      var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 }));
      shaft.position.y = 0.028; motorG.add(shaft);

      var propG = new THREE.Group();
      for (var b = 0; b < 2; b++) {
        var blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.002, 0.028), propMat);
        blade.rotation.x = (b === 0 ? 1 : -1) * 0.12;
        blade.rotation.y = b * Math.PI;
        blade.scale.set(1, 1, 0.7);
        propG.add(blade);
      }
      propG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 10), new THREE.MeshStandardMaterial({ color: 0x111111 })));
      propG.position.y = 0.035;
      propG.userData.spinDir = pos[3] % 2 === 0 ? 1 : -1;
      motorG.add(propG);
      props.push(propG);
      motorG.position.set(pos[0], pos[1], pos[2]);
      g.add(motorG);
    });

    var camBody = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, 0.04), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4 }));
    camBody.position.set(0, 0.0, 0.095); camBody.rotation.x = -0.25; g.add(camBody);
    var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.016, 12), new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.6 }));
    lens.rotation.x = Math.PI / 2 - 0.25; lens.position.set(0, 0.002, 0.118); g.add(lens);

    var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7 }));
    ant.position.set(-0.04, 0.05, -0.06); ant.rotation.z = 0.35; g.add(ant);
    var antTip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    antTip.position.set(-0.055, 0.085, -0.06); g.add(antTip);

    var ledMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 0.9 });
    var ledL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.008), ledMat);
    ledL.position.set(-0.04, 0.01, -0.08); g.add(ledL);
    var ledR = ledL.clone(); ledR.position.x = 0.04; g.add(ledR);
    var ledW = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 0.7 });
    var fl = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.006), ledW);
    fl.position.set(-0.03, 0.01, 0.08); g.add(fl);
    var fr = fl.clone(); fr.position.x = 0.03; g.add(fr);

    if (stickerId && stickerId !== 'none' && stickerTextures[stickerId]) {
      var decal = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1, 0.05),
        new THREE.MeshStandardMaterial({ map: stickerTextures[stickerId], transparent: true, roughness: 0.6, depthWrite: false })
      );
      decal.rotation.x = -Math.PI / 2;
      decal.position.y = 0.033;
      g.add(decal);
    }

    g.userData.props = props;
    g.userData.realistic = true;
    return g;
  }

  function enhance() {
    var drone = window.__FPV_DRONE;
    var THREE = window.THREE;
    if (!drone || !THREE) return false;
    if (drone.userData && drone.userData.realisticDone) return true;

    drone.children.slice().forEach(function (c) {
      if (c.isCamera || (c.type && String(c.type).indexOf('Camera') >= 0)) return;
      if (c.isLight || c.type === 'SpotLight' || c.type === 'PointLight') return;
      drone.remove(c);
    });

    var colors = window.__FPV_DRONE_COLORS || {};
    try {
      var raw = localStorage.getItem('fpv_drone_cfg');
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg.body) colors.body = cfg.body;
        if (cfg.arm) colors.arm = cfg.arm;
        if (cfg.prop) colors.prop = cfg.prop;
        if (cfg.sticker) colors.sticker = cfg.sticker;
      }
    } catch (e) {}

    var sticker = colors.sticker || 'none';
    var model = buildRealisticDrone(THREE, colors, sticker);
    drone.add(model);
    drone.userData.realisticDone = true;
    drone.userData.realisticModel = model;

    if (model.userData.props) {
      window.__FPV_REAL_PROPS = model.userData.props;
      if (!window.__FPV_PROP_SPIN) {
        window.__FPV_PROP_SPIN = true;
        (function spinLoop() {
          var list = window.__FPV_REAL_PROPS || [];
          var thr = typeof window.__FPV_CLIMB === 'number' ? Math.abs(window.__FPV_CLIMB) * 0.5 + 0.5 : 0.7;
          list.forEach(function (p) {
            if (p && p.userData) p.rotation.y += (p.userData.spinDir || 1) * (0.4 + thr * 1.8);
          });
          requestAnimationFrame(spinLoop);
        })();
      }
    }
    return true;
  }

  function tryEnhance() {
    if (!window.THREE) {
      import('https://unpkg.com/three@0.160.0/build/three.module.js').then(function (mod) {
        window.THREE = mod;
        loadStickers(mod, function () { enhance(); });
      }).catch(function () {});
      return;
    }
    loadStickers(window.THREE, function () { enhance(); });
  }

  function boot() {
    setInterval(function () {
      if (window.__FPV_DRONE && !(window.__FPV_DRONE.userData && window.__FPV_DRONE.userData.realisticDone)) {
        tryEnhance();
      }
    }, 800);
    setTimeout(tryEnhance, 1500);
    setTimeout(tryEnhance, 3500);
  }

  var _lastDrone = null;
  setInterval(function () {
    if (window.__FPV_DRONE && window.__FPV_DRONE !== _lastDrone) {
      _lastDrone = window.__FPV_DRONE;
      if (window.THREE) loadStickers(window.THREE, function () { enhance(); });
    }
  }, 500);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
