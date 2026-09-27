(function () {
  var hits = 0;
  var MAX_HITS = 5;
  var INSTANT_BREAK_SPEED = 10;
  var MIN_IMPACT = 2.5;
  var cooldown = 0;
  var broken = false;
  var lastPos = { x: 0, y: 1, z: 0 };

  function ensureUI() {
    if (document.getElementById('cam-crack')) return;
    var st = document.createElement('style');
    st.textContent =
      '#cam-crack{pointer-events:none;position:fixed;inset:0;z-index:36;display:none;opacity:0;transition:opacity 0.15s}' +
      '#cam-crack.on{display:block}' +
      '#cam-crack .crack-svg{position:absolute;inset:0;width:100%;height:100%;opacity:0.85}' +
      '#cam-crack.level-1{opacity:0.35}#cam-crack.level-2{opacity:0.5}#cam-crack.level-3{opacity:0.65}' +
      '#cam-crack.level-4{opacity:0.8}#cam-crack.level-5{opacity:1}' +
      '#cam-crack.broken{opacity:1;background:rgba(0,0,0,0.55)}' +
      '#cam-crack .broken-msg{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);font-family:monospace;font-size:18px;color:#f44;text-align:center;letter-spacing:2px;text-shadow:0 0 12px #f00}' +
      '#cam-hits{position:fixed;top:calc(52px + env(safe-area-inset-top));left:12px;z-index:45;font-family:monospace;font-size:11px;color:rgba(255,200,180,0.85);display:none;pointer-events:none}';
    document.head.appendChild(st);
    var el = document.createElement('div');
    el.id = 'cam-crack';
    el.innerHTML =
      '<svg class="crack-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<path id="crack-p1" d="" fill="none" stroke="rgba(220,220,255,0.55)" stroke-width="0.35"/>' +
      '<path id="crack-p2" d="" fill="none" stroke="rgba(180,200,255,0.4)" stroke-width="0.25"/>' +
      '<path id="crack-p3" d="" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.2"/></svg>' +
      '<div class="broken-msg" style="display:none">CAMERA QUEBRADA<br><span style="font-size:12px;opacity:0.7">RESET...</span></div>';
    document.body.appendChild(el);
    var hitsEl = document.createElement('div');
    hitsEl.id = 'cam-hits'; hitsEl.textContent = 'CAM 0/5';
    document.body.appendChild(hitsEl);
  }

  function crackPaths(level) {
    var paths = ['',
      'M20,15 L35,40 L28,55 L45,70',
      'M20,15 L35,40 L28,55 L45,70 M60,10 L55,35 L70,50 L65,80',
      'M20,15 L35,40 L28,55 L45,70 M60,10 L55,35 L70,50 L65,80 M10,60 L30,65 L40,85 M80,30 L75,55 L90,70',
      'M20,15 L35,40 L28,55 L45,70 M60,10 L55,35 L70,50 L65,80 M10,60 L30,65 L40,85 M80,30 L75,55 L90,70 M50,5 L48,50 L52,95 M5,40 L50,45 L95,42',
      'M20,15 L35,40 L28,55 L45,70 M60,10 L55,35 L70,50 L65,80 M10,60 L30,65 L40,85 M80,30 L75,55 L90,70 M50,5 L48,50 L52,95 M5,40 L50,45 L95,42 M15,90 L40,60 L70,90 M30,20 L60,25 L80,15'];
    var p1 = document.getElementById('crack-p1');
    var p2 = document.getElementById('crack-p2');
    var p3 = document.getElementById('crack-p3');
    if (p1) p1.setAttribute('d', paths[Math.min(level, 5)] || '');
    if (p2) p2.setAttribute('d', level >= 3 ? 'M25,80 L50,40 L75,85 M40,10 L42,90' : '');
    if (p3) p3.setAttribute('d', level >= 4 ? 'M5,50 L95,55 M50,0 L48,100' : '');
  }

  function updateVisual() {
    ensureUI();
    var el = document.getElementById('cam-crack');
    var hitsEl = document.getElementById('cam-hits');
    var hud = document.getElementById('hud');
    var flying = hud && !hud.classList.contains('hidden');
    if (hitsEl) {
      hitsEl.style.display = flying ? 'block' : 'none';
      hitsEl.textContent = broken ? 'CAM X' : ('CAM ' + hits + '/' + MAX_HITS);
      hitsEl.style.color = hits >= 4 ? '#f66' : hits >= 2 ? '#fc8' : 'rgba(255,200,180,0.85)';
    }
    if (!el) return;
    if (!flying) { el.classList.remove('on'); return; }
    el.className = 'on';
    for (var i = 1; i <= 5; i++) el.classList.remove('level-' + i);
    if (broken) {
      el.classList.add('level-5', 'broken');
      var msg = el.querySelector('.broken-msg');
      if (msg) msg.style.display = 'block';
      crackPaths(5);
    } else if (hits > 0) {
      el.classList.add('level-' + Math.min(hits, 5));
      var msg2 = el.querySelector('.broken-msg');
      if (msg2) msg2.style.display = 'none';
      crackPaths(hits);
    } else {
      el.classList.remove('on');
      var msg3 = el.querySelector('.broken-msg');
      if (msg3) msg3.style.display = 'none';
    }
  }

  function resetCamera() {
    hits = 0; broken = false; cooldown = 0.5; updateVisual();
  }

  function triggerBreak() {
    if (broken) return;
    broken = true; hits = MAX_HITS; updateVisual();
    try { if (typeof window.showMsg === 'function') window.showMsg('CAMERA QUEBRADA'); } catch (e) {}
    setTimeout(function () {
      try { var btn = document.getElementById('btn-reset'); if (btn) btn.click(); } catch (e) {}
      setTimeout(resetCamera, 400);
    }, 900);
  }

  function registerHit(speed) {
    if (broken || cooldown > 0) return;
    cooldown = 0.45;
    if (speed >= INSTANT_BREAK_SPEED) { triggerBreak(); return; }
    hits = Math.min(MAX_HITS, hits + 1);
    updateVisual();
    try {
      if (typeof window.showMsg === 'function')
        window.showMsg(hits >= MAX_HITS ? 'CAMERA CRITICA' : ('TRINCA ' + hits + '/' + MAX_HITS));
    } catch (e) {}
    if (hits >= MAX_HITS) triggerBreak();
  }

  function tick() {
    ensureUI();
    var drone = window.__FPV_DRONE;
    var scene = window.__FPV_SCENE;
    var THREE = window.THREE;
    var dt = 1 / 60;
    if (cooldown > 0) cooldown -= dt;
    var hud = document.getElementById('hud');
    var flying = hud && !hud.classList.contains('hidden');
    if (!flying || !drone) { updateVisual(); requestAnimationFrame(tick); return; }

    var pos = drone.position;
    var vx = pos.x - lastPos.x, vy = pos.y - lastPos.y, vz = pos.z - lastPos.z;
    var approxSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz) * 60;

    if (pos.y < 0.35 && lastPos.y > 0.4) {
      var impact = Math.max(approxSpeed, Math.abs(vy) * 60);
      if (impact >= MIN_IMPACT) registerHit(impact);
    }

    if (scene && THREE && approxSpeed >= MIN_IMPACT * 0.7) {
      var hitSolid = false;
      var droneR = 0.4;
      var box = new THREE.Box3();
      var sphere = new THREE.Sphere(new THREE.Vector3(pos.x, pos.y, pos.z), droneR);
      scene.traverse(function (obj) {
        if (hitSolid || !obj.isMesh || !obj.visible) return;
        if (obj.userData && (obj.userData.breakable || obj.userData.noCollision)) return;
        if (!obj.geometry) return;
        if (obj.geometry.type === 'PlaneGeometry') return;
        if (obj.type === 'GridHelper') return;
        var p = obj.parent;
        while (p) {
          if (p === drone || (p.userData && p.userData.realistic)) return;
          p = p.parent;
        }
        try {
          box.setFromObject(obj);
          if (box.isEmpty()) return;
          var size = new THREE.Vector3();
          box.getSize(size);
          if (size.x > 40 || size.z > 40) return;
          if (size.y < 0.08 && size.x > 8) return;
          if (box.intersectsSphere(sphere)) hitSolid = true;
        } catch (e) {}
      });
      if (hitSolid) {
        registerHit(approxSpeed);
        try { if (pos.y < 3) drone.position.y += 0.12; } catch (e) {}
      }
    }

    lastPos.x = pos.x; lastPos.y = pos.y; lastPos.z = pos.z;
    updateVisual();
    requestAnimationFrame(tick);
  }

  window.__FPV_CAM_HIT = registerHit;
  window.__FPV_CAM_RESET = resetCamera;

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'btn-reset') setTimeout(resetCamera, 100);
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ensureUI(); tick(); });
  else { ensureUI(); tick(); }
})();
