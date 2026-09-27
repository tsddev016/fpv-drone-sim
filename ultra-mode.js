(function () {
  var wind = { x: 0, z: 0, t: 0 };
  var ultraOn = false;

  function isUltra() {
    try {
      if (localStorage.getItem('fpv_ultra') === '1') return true;
      if ((localStorage.getItem('fpv_quality') || '') === 'ultra') return true;
      var el = document.getElementById('cfg-quality');
      if (el && el.value === 'ultra') return true;
      var s = localStorage.getItem('fpv_settings');
      if (s && JSON.parse(s).quality === 'ultra') return true;
    } catch (e) {}
    return false;
  }

  function ensureUltraOption() {
    var sel = document.getElementById('cfg-quality');
    if (!sel) return;
    if (![].some.call(sel.options, function (o) { return o.value === 'ultra'; })) {
      var opt = document.createElement('option');
      opt.value = 'ultra';
      opt.textContent = 'Ultra (vento + FX)';
      sel.appendChild(opt);
    }
    if (!sel._ultraBound) {
      sel._ultraBound = true;
      sel.addEventListener('change', function () {
        localStorage.setItem('fpv_quality', sel.value);
        localStorage.setItem('fpv_ultra', sel.value === 'ultra' ? '1' : '0');
        enableUltra(sel.value === 'ultra');
      });
    }
  }

  function ensureFXOverlay() {
    if (document.getElementById('ultra-fx')) return;
    var st = document.createElement('style');
    st.textContent =
      '#ultra-fx{pointer-events:none;position:fixed;inset:0;z-index:34;display:none}' +
      '#ultra-fx.on{display:block}' +
      '#ultra-fx .bloom{position:absolute;inset:0;box-shadow:inset 0 0 80px rgba(180,220,255,0.08),inset 0 0 160px rgba(0,0,0,0.25);mix-blend-mode:screen;opacity:0.5}' +
      '#ultra-fx .godray{position:absolute;inset:0;background:radial-gradient(ellipse at 70% 15%,rgba(255,240,200,0.12),transparent 55%);mix-blend-mode:screen}' +
      '#ultra-fx .grain{position:absolute;inset:0;opacity:0.04;background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")}' +
      '#wind-ind{position:fixed;top:calc(70px + env(safe-area-inset-top));left:12px;z-index:45;font-family:monospace;font-size:10px;color:rgba(160,200,255,0.7);display:none}' +
      '#wind-ind.on{display:block}';
    document.head.appendChild(st);
    var fx = document.createElement('div');
    fx.id = 'ultra-fx';
    fx.innerHTML = '<div class="bloom"></div><div class="godray"></div><div class="grain"></div>';
    document.body.appendChild(fx);
    var wi = document.createElement('div');
    wi.id = 'wind-ind';
    wi.textContent = 'VENTO --';
    document.body.appendChild(wi);
  }

  function enhanceScene(THREE, scene, renderer) {
    if (!scene || !THREE) return;
    var hasHemi = false;
    scene.traverse(function (o) { if (o.isHemisphereLight) hasHemi = true; });
    if (!hasHemi) scene.add(new THREE.HemisphereLight(0xb1e1ff, 0x3a2a1a, 0.45));
    scene.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var m = o.material;
      if (m.isMeshStandardMaterial) {
        if (m.roughness == null || m.roughness > 0.85) m.roughness = 0.72;
        if (m.metalness == null) m.metalness = 0.08;
        m.envMapIntensity = 0.6;
        m.needsUpdate = true;
      }
    });
    if (renderer) {
      try {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (renderer.toneMapping !== undefined && THREE.ACESFilmicToneMapping) {
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.05;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      } catch (e) {}
    }
  }

  function enableUltra(on) {
    ultraOn = !!on;
    ensureFXOverlay();
    var fx = document.getElementById('ultra-fx');
    var wi = document.getElementById('wind-ind');
    if (fx) fx.classList.toggle('on', ultraOn);
    if (wi) wi.classList.toggle('on', ultraOn);
    if (ultraOn && window.__FPV_SCENE && window.THREE) {
      enhanceScene(window.THREE, window.__FPV_SCENE, window.__FPV_RENDERER);
    }
  }

  function physicsTick() {
    wind.t += 0.016;
    var strength = ultraOn ? 1.15 : 0.35;
    wind.x = Math.sin(wind.t * 0.37) * 0.8 * strength + Math.sin(wind.t * 1.1) * 0.25 * strength;
    wind.z = Math.cos(wind.t * 0.29) * 0.7 * strength + Math.sin(wind.t * 0.9) * 0.2 * strength;
    window.__FPV_WIND = { x: wind.x, z: wind.z };

    var wi = document.getElementById('wind-ind');
    if (wi && ultraOn) {
      var dir = Math.abs(wind.x) > Math.abs(wind.z)
        ? (wind.x > 0 ? 'LESTE' : 'OESTE')
        : (wind.z > 0 ? 'SUL' : 'NORTE');
      var kmh = (Math.sqrt(wind.x * wind.x + wind.z * wind.z) * 8).toFixed(0);
      wi.textContent = 'VENTO ' + kmh + ' · ' + dir +
        (window.__FPV_AIRBRAKE ? ' · FREIO' : '') +
        (window.__FPV_TURBO ? ' · TURBO' : '');
    }
    requestAnimationFrame(physicsTick);
  }

  function boot() {
    ensureUltraOption();
    ensureFXOverlay();
    enableUltra(isUltra());
    setInterval(ensureUltraOption, 2000);
    setInterval(function () {
      if (isUltra() !== ultraOn) enableUltra(isUltra());
    }, 1500);
    physicsTick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
