(function () {
  var flashlight = null;
  var vhsOn = false;
  var THREE_REF = null;

  function seeded(n) {
    var x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  function makeHouse(THREE, x, z, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var w = opts.w || (6 + seeded(x + z) * 4);
    var d = opts.d || (5 + seeded(x * 2) * 3);
    var h = opts.h || (3.5 + seeded(z * 3) * 4);
    var floors = opts.floors || Math.max(1, Math.floor(h / 3.2));
    var abandoned = !!opts.abandoned;
    var nightLit = !!opts.nightLit;
    var wallCol = abandoned ? (0x5a5548 + Math.floor(seeded(x) * 0x202010)) : (0x8a8a88 + Math.floor(seeded(x) * 0x303030));
    var wall = new THREE.MeshStandardMaterial({ color: wallCol, roughness: abandoned ? 0.95 : 0.7, metalness: 0.05 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
    body.position.y = h / 2; body.castShadow = true; g.add(body);
    var roofH = 1.2 + seeded(z) * 0.8;
    var roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, roofH, 4), new THREE.MeshStandardMaterial({ color: abandoned ? 0x3a3028 : 0x4a2020, roughness: 0.9 }));
    roof.position.y = h + roofH * 0.4; roof.rotation.y = Math.PI / 4; g.add(roof);
    var door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.12), new THREE.MeshStandardMaterial({ color: abandoned ? 0x2a1a10 : 0x3a2518 }));
    door.position.set(0, 1.05, d / 2 + 0.05); g.add(door);
    var glassMat = new THREE.MeshStandardMaterial({ color: abandoned ? 0x334455 : 0x88ccee, transparent: true, opacity: abandoned ? 0.35 : 0.55, roughness: 0.15, metalness: 0.3, emissive: nightLit ? 0xffaa55 : 0x000000, emissiveIntensity: nightLit ? 0.45 : 0 });
    for (var fl = 0; fl < floors; fl++) {
      var wy = 1.4 + fl * 2.8;
      if (wy > h - 0.8) continue;
      [-1, 1].forEach(function (side) {
        var win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.08), glassMat.clone());
        win.position.set(side * (w * 0.28), wy, d / 2 + 0.06);
        win.userData.breakable = true; g.add(win);
      });
      var winS = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 1.1), glassMat.clone());
      winS.position.set(w / 2 + 0.05, wy, 0); winS.userData.breakable = true; g.add(winS);
    }
    if (abandoned) {
      var patch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, h * 0.25, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2a22 }));
      patch.position.set(-w * 0.2, h * 0.5, d / 2 + 0.04); g.add(patch);
    }
    if (nightLit) {
      var light = new THREE.PointLight(0xffcc77, 0.9, 18, 2);
      light.position.set(0, h * 0.55, 0); g.add(light);
    }
    g.position.set(x, 0, z);
    return g;
  }

  function makeSkyscraper(THREE, x, z, floors) {
    var g = new THREE.Group();
    floors = floors || 8 + Math.floor(seeded(x + z) * 12);
    var w = 8 + seeded(x) * 6, d = 8 + seeded(z) * 6, h = floors * 3.2;
    var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 0.55, metalness: 0.25 }));
    body.position.y = h / 2; g.add(body);
    for (var fl = 0; fl < floors; fl++) {
      if (seeded(fl + x) > 0.35) {
        var strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 1.4, 0.06), new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0xffee99, emissiveIntensity: 0.25 + seeded(fl) * 0.4 }));
        strip.position.set(0, 1.6 + fl * 3.2, d / 2 + 0.04);
        strip.userData.breakable = true; g.add(strip);
      }
    }
    g.position.set(x, 0, z);
    return g;
  }

  function makeCar(THREE, x, z, abandoned) {
    var g = new THREE.Group();
    var col = abandoned ? [0x4a4a3a, 0x3a3a4a, 0x5a3a2a][Math.floor(seeded(x * z + 1) * 3)] : [0xcc2222, 0x2266cc, 0xeeeeee, 0x222222, 0xffaa00][Math.floor(seeded(x + z) * 5)];
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.2), new THREE.MeshStandardMaterial({ color: col, metalness: 0.4, roughness: 0.35 }));
    body.position.y = 0.55; g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.55 }));
    cabin.position.set(0, 1.05, -0.2); g.add(cabin);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]].forEach(function (p) {
      var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 10), wheelMat);
      wh.rotation.z = Math.PI / 2; wh.position.set(p[0], 0.32, p[1]); g.add(wh);
    });
    if (abandoned) { body.rotation.z = (seeded(x) - 0.5) * 0.25; body.position.y = 0.4; }
    g.position.set(x, 0, z); g.rotation.y = seeded(x * 0.7) * Math.PI * 2;
    return g;
  }

  function makeStreetLamp(THREE, x, z, lit) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.5, 6), new THREE.MeshStandardMaterial({ color: 0x333338 }));
    pole.position.y = 2.75; g.add(pole);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: lit ? 0xffeebb : 0x000000, emissiveIntensity: lit ? 0.6 : 0 }));
    head.position.set(0.25, 5.4, 0); g.add(head);
    if (lit) { var pl = new THREE.PointLight(0xffeebb, 0.7, 16, 2); pl.position.set(0.25, 5.2, 0); g.add(pl); }
    g.position.set(x, 0, z);
    return g;
  }

  function makeTree(THREE, x, z, dense) {
    var g = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.8 + seeded(x) * 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x4a3728 }));
    trunk.position.y = 0.9; g.add(trunk);
    var layers = dense ? 3 : 2;
    for (var i = 0; i < layers; i++) {
      var fol = new THREE.Mesh(new THREE.ConeGeometry(1.0 + (layers - i) * 0.35, 2.2, 7), new THREE.MeshStandardMaterial({ color: dense ? 0x1a3a18 : 0x2d5a27 }));
      fol.position.y = 2.0 + i * 1.1; g.add(fol);
    }
    g.position.set(x, 0, z);
    return g;
  }

  function makeRoad(THREE, z, length) {
    var g = new THREE.Group();
    var road = new THREE.Mesh(new THREE.PlaneGeometry(12, length || 200), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, z); g.add(road);
    var line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, length || 200), new THREE.MeshStandardMaterial({ color: 0xccaa33 }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.04, z); g.add(line);
    return g;
  }

  function shatterWindow(win, THREE, scene) {
    if (!win || win.userData.broken) return;
    win.userData.broken = true; win.visible = false;
    var worldPos = new THREE.Vector3(); win.getWorldPosition(worldPos);
    for (var i = 0; i < 10; i++) {
      var shard = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.2, 0.12 + Math.random() * 0.15, 0.02), new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.7, roughness: 0.1 }));
      shard.position.copy(worldPos);
      shard.position.x += (Math.random() - 0.5) * 0.5;
      shard.position.y += (Math.random() - 0.5) * 0.5;
      shard.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6);
      shard.userData.life = 1.2 + Math.random() * 0.6;
      scene.add(shard);
      (function (s) {
        var last = performance.now();
        function step(now) {
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          s.userData.life -= dt; s.userData.vel.y -= 12 * dt;
          s.position.addScaledVector(s.userData.vel, dt);
          s.rotation.x += dt * 4; s.material.opacity = Math.max(0, s.userData.life);
          if (s.userData.life <= 0 || s.position.y < 0) { scene.remove(s); return; }
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      })(shard);
    }
  }

  function setupVHS(enable) {
    vhsOn = !!enable;
    var el = document.getElementById('vhs-overlay');
    if (!el) {
      el = document.createElement('div'); el.id = 'vhs-overlay';
      el.innerHTML = '<div class="vhs-scan"></div><div class="vhs-noise"></div><div class="vhs-vignette"></div><div class="vhs-label">REC \u25CF FPV-CAM</div>';
      var st = document.createElement('style');
      st.textContent = '#vhs-overlay{pointer-events:none;position:fixed;inset:0;z-index:35;display:none;mix-blend-mode:soft-light}#vhs-overlay.on{display:block}.vhs-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 3px);animation:vhsScroll 6s linear infinite;opacity:0.35}.vhs-noise{position:absolute;inset:0;opacity:0.08;background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E");animation:vhsFlicker 0.15s steps(2) infinite}.vhs-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.55) 100%)}.vhs-label{position:absolute;top:18px;left:20px;font-family:monospace;font-size:12px;color:rgba(255,80,80,0.85);letter-spacing:2px}@keyframes vhsScroll{from{background-position-y:0}to{background-position-y:40px}}@keyframes vhsFlicker{0%,100%{opacity:0.06}50%{opacity:0.12}}';
      document.head.appendChild(st); document.body.appendChild(el);
    }
    el.classList.toggle('on', vhsOn);
  }

  function setupFlashlight(THREE, drone, enable) {
    if (flashlight) { if (flashlight.parent) flashlight.parent.remove(flashlight); flashlight = null; }
    if (!enable || !drone) return;
    flashlight = new THREE.SpotLight(0xfff5e0, 2.2, 45, Math.PI / 7, 0.4, 1.2);
    flashlight.position.set(0, 0.05, -0.15);
    var target = new THREE.Object3D(); target.position.set(0, -0.05, -8); drone.add(target);
    flashlight.target = target; drone.add(flashlight);
    var fill = new THREE.PointLight(0xffeecc, 0.25, 8); fill.position.set(0, 0.1, 0); drone.add(fill);
    flashlight.userData.fill = fill;
  }

  function buildAbandoned(THREE, addEnv) {
    addEnv(makeRoad(THREE, -40, 220));
    for (var i = 0; i < 28; i++) {
      var x = (seeded(i * 3) - 0.5) * 90; var z = -10 - i * 7 - seeded(i) * 5;
      if (Math.abs(x) < 8) x += x < 0 ? -10 : 10;
      addEnv(makeHouse(THREE, x, z, { abandoned: true, floors: 1 + Math.floor(seeded(i) * 3) }));
    }
    for (var c = 0; c < 12; c++) addEnv(makeCar(THREE, (seeded(c * 9) - 0.5) * 40, -20 - c * 12, true));
    for (var L = 0; L < 10; L++) addEnv(makeStreetLamp(THREE, L % 2 === 0 ? 7 : -7, -15 - L * 18, false));
    for (var t = 0; t < 20; t++) addEnv(makeTree(THREE, (seeded(t * 5) - 0.5) * 160, (seeded(t * 7) - 0.5) * 160, false));
  }

  function buildCity(THREE, addEnv) {
    addEnv(makeRoad(THREE, -50, 260));
    var cross = new THREE.Mesh(new THREE.PlaneGeometry(200, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.95 }));
    cross.rotation.x = -Math.PI / 2; cross.position.set(0, 0.03, -60); addEnv(cross);
    for (var i = 0; i < 16; i++) {
      var side = i % 2 === 0 ? 1 : -1;
      var x = side * (14 + (i % 4) * 11);
      var z = -20 - Math.floor(i / 2) * 22;
      if (i < 8) addEnv(makeSkyscraper(THREE, x, z, 6 + (i % 5) * 2));
      else addEnv(makeHouse(THREE, x, z, { floors: 2 + (i % 3), abandoned: false }));
    }
    for (var c = 0; c < 18; c++) addEnv(makeCar(THREE, (c % 2 === 0 ? 4.5 : -4.5), -8 - c * 9, false));
    for (var L = 0; L < 14; L++) addEnv(makeStreetLamp(THREE, L % 2 === 0 ? 6.5 : -6.5, -10 - L * 14, true));
    for (var s = 0; s < 6; s++) {
      var sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: [0xff2266, 0x22aaff, 0xffaa00][s % 3], emissiveIntensity: 0.8 }));
      sign.position.set((s % 2 === 0 ? 12 : -12), 3.5, -30 - s * 18); addEnv(sign);
    }
  }

  function buildForestNight(THREE, addEnv) {
    for (var t = 0; t < 70; t++) {
      var x = (seeded(t * 11) - 0.5) * 170; var z = (seeded(t * 13) - 0.5) * 170;
      if (Math.abs(x) < 6 && z > -30 && z < 20) continue;
      addEnv(makeTree(THREE, x, z, true));
    }
    [[18, -25], [-22, -48], [12, -75], [-15, -100], [25, -60]].forEach(function (p, idx) {
      addEnv(makeHouse(THREE, p[0], p[1], { w: 5 + idx * 0.3, d: 4.5, h: 3.2, floors: 1, nightLit: true }));
    });
    var path = new THREE.Mesh(new THREE.PlaneGeometry(4, 160), new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 1 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.04, -50); addEnv(path);
  }

  function buildFreestylePlus(THREE, addEnv) {
    for (var i = 0; i < 6; i++) addEnv(makeHouse(THREE, (i % 2 === 0 ? 12 : -14), -25 - i * 20, { floors: 1 + (i % 3) }));
    for (var r = 0; r < 8; r++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.14, 10, 28), new THREE.MeshStandardMaterial({ color: r % 2 ? 0xff6600 : 0x00aaff, emissive: r % 2 ? 0xff4400 : 0x0088ff, emissiveIntensity: 0.3 }));
      ring.position.set((r % 2 ? 7 : -7), 2.5 + (r % 3), -30 - r * 16); ring.rotation.y = Math.PI / 2; addEnv(ring);
    }
  }

  function tickBreakables() {
    var drone = window.__FPV_DRONE, scene = window.__FPV_SCENE, THREE = THREE_REF || window.THREE;
    if (drone && scene && THREE) {
      var dp = drone.position;
      scene.traverse(function (obj) {
        if (!obj.userData || !obj.userData.breakable || obj.userData.broken || !obj.visible) return;
        var wp = new THREE.Vector3(); obj.getWorldPosition(wp);
        if (wp.distanceTo(dp) < 1.4) shatterWindow(obj, THREE, scene);
      });
    }
    requestAnimationFrame(tickBreakables);
  }

  window.__FPV_AFTER_MAP = function (mapId, scene, addEnv, THREE, drone, camera) {
    THREE_REF = THREE;
    window.__FPV_SCENE = scene; window.__FPV_DRONE = drone; window.__FPV_CAMERA = camera;
    try { scene.traverse(function (o) { if (o.type === 'GridHelper') o.visible = mapId === 'open'; }); } catch (e) {}
    if (mapId === 'abandoned') buildAbandoned(THREE, addEnv);
    else if (mapId === 'city') buildCity(THREE, addEnv);
    else if (mapId === 'forest_night' || mapId === 'night') buildForestNight(THREE, addEnv);
    else if (mapId === 'freestyle') buildFreestylePlus(THREE, addEnv);
    var isNight = mapId === 'forest_night' || mapId === 'night';
    setupVHS(isNight); setupFlashlight(THREE, drone, isNight);
    if (isNight) { scene.background = new THREE.Color(0x050510); scene.fog = new THREE.Fog(0x050510, 12, 70); }
    if (mapId === 'abandoned') { scene.background = new THREE.Color(0x6a7a88); scene.fog = new THREE.Fog(0x6a7a88, 60, 220); }
    if (mapId === 'city') { scene.background = new THREE.Color(0x87b0d0); scene.fog = new THREE.Fog(0x87b0d0, 80, 280); }
  };

  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyF' && flashlight) {
      flashlight.visible = !flashlight.visible;
      if (flashlight.userData.fill) flashlight.userData.fill.visible = flashlight.visible;
    }
    if (e.code === 'KeyV') setupVHS(!vhsOn);
  });

  function ensureFlashBtn() {
    if (document.getElementById('btn-flash')) return;
    var btn = document.createElement('button');
    btn.id = 'btn-flash'; btn.textContent = '\uD83D\uDD26'; btn.title = 'Lanterna (F)';
    btn.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top));right:120px;z-index:45;width:40px;height:40px;border-radius:10px;border:1px solid rgba(0,255,100,0.3);background:rgba(0,0,0,0.55);color:#0f0;font-size:18px;cursor:pointer;display:none';
    btn.onclick = function () {
      if (flashlight) {
        flashlight.visible = !flashlight.visible;
        if (flashlight.userData.fill) flashlight.userData.fill.visible = flashlight.visible;
      }
    };
    document.body.appendChild(btn);
    setInterval(function () {
      var night = window.__FPV_CURRENT_MAP === 'forest_night' || window.__FPV_CURRENT_MAP === 'night';
      var hud = document.getElementById('hud');
      var flying = hud && !hud.classList.contains('hidden');
      btn.style.display = night && flying ? 'block' : 'none';
    }, 500);
  }
  ensureFlashBtn();
  tickBreakables();
})();
