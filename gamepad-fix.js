(function () {
  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    if (cb) s.onload = cb;
    document.head.appendChild(s);
  }
  function afterProfile() {
    loadScript('aegis.js');
    loadScript('support.js');
    loadScript('portfolio-polish.js');
  }
  if (window.FPVProfile) afterProfile();
  else loadScript('profile.js', afterProfile);
})();

/**
 * FPV Gamepad Config — controle por gamepad externo (USB/Bluetooth)
 * Mode 2 padrão FPV:
 *   Stick ESQUERDO:  X = Yaw,  Y = Throttle
 *   Stick DIREITO:   X = Roll, Y = Pitch
 * Preferências salvas em localStorage (fpv_pad_cfg_v1)
 */
(function () {
  const SAVE_KEY = 'fpv_pad_cfg_v1';

  const DEFAULTS = {
    mode: 'mode2',          // mode2 | mode1
    deadzone: 0.08,
    expo: 0.30,
    sens: 1.0,
    invertYaw: false,
    invertThrottle: false,
    invertPitch: false,
    invertRoll: true,       // true por padrão: corrige "inclina esquerda → vai direita"
    axisYaw: 0,
    axisThrottle: 1,
    axisRoll: 2,
    axisPitch: 3,
    swapSticks: false,
  };

  function loadCfg() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (_) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveCfg(cfg) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(cfg));
    } catch (_) {}
  }

  let cfg = loadCfg();
  window.__FPV_PAD_CFG = cfg;

  window.__FPV_PAD_INPUT = {
    throttle: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    connected: false,
    name: '',
    raw: { ax0: 0, ax1: 0, ax2: 0, ax3: 0 },
    buttons: {},
  };

  function dz(v, d) {
    if (Math.abs(v) < d) return 0;
    return Math.sign(v) * (Math.abs(v) - d) / (1 - d);
  }

  function expo(v, e) {
    const s = Math.sign(v);
    const a = Math.abs(v);
    return s * (a * a * a * e + a * (1 - e));
  }

  function axis(pad, idx) {
    if (!pad || !pad.axes || idx < 0 || idx >= pad.axes.length) return 0;
    return pad.axes[idx] || 0;
  }

  function poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        pad = pads[i];
        break;
      }
    }

    const out = window.__FPV_PAD_INPUT;
    if (!pad) {
      out.connected = false;
      out.name = '';
      out.throttle = 0;
      out.yaw = 0;
      out.pitch = 0;
      out.roll = 0;
      requestAnimationFrame(poll);
      return;
    }

    out.connected = true;
    out.name = (pad.id || 'PAD').split('(')[0].trim().slice(0, 22);
    out.raw.ax0 = axis(pad, 0);
    out.raw.ax1 = axis(pad, 1);
    out.raw.ax2 = axis(pad, 2);
    out.raw.ax3 = axis(pad, 3);

    const dead = cfg.deadzone;
    const exp = cfg.expo;
    const sens = cfg.sens;

    // Índices dos eixos (Mode 2 padrão; Mode 1 troca throttle/pitch)
    let iYaw = cfg.axisYaw;
    let iThr = cfg.axisThrottle;
    let iRoll = cfg.axisRoll;
    let iPitch = cfg.axisPitch;

    if (cfg.mode === 'mode1') {
      // Mode 1: throttle no stick direito Y, pitch no esquerdo Y
      iThr = cfg.axisPitch;
      iPitch = cfg.axisThrottle;
    }
    if (cfg.swapSticks) {
      const tY = iYaw, tT = iThr;
      iYaw = iRoll;
      iThr = iPitch;
      iRoll = tY;
      iPitch = tT;
    }

    let thrRaw = axis(pad, iThr);
    let yawRaw = axis(pad, iYaw);
    let pitchRaw = axis(pad, iPitch);
    let rollRaw = axis(pad, iRoll);

    // Inversões
    if (cfg.invertThrottle) thrRaw = -thrRaw;
    if (cfg.invertYaw) yawRaw = -yawRaw;
    if (cfg.invertPitch) pitchRaw = -pitchRaw;
    if (cfg.invertRoll) rollRaw = -rollRaw;

    // Throttle: stick pra cima (valor negativo no browser) → 1
    out.throttle = Math.max(0, Math.min(1, (-thrRaw + 1) / 2));
    out.yaw = expo(dz(yawRaw, dead), exp) * sens;
    out.pitch = expo(dz(pitchRaw, dead), exp) * sens;
    out.roll = expo(dz(rollRaw, dead), exp) * sens;

    // RT (botão 7) = boost throttle
    if (pad.buttons && pad.buttons[7] && pad.buttons[7].value > 0.05) {
      out.throttle = Math.min(1, out.throttle + pad.buttons[7].value * 0.35);
    }

    // D-pad
    if (pad.buttons) {
      if (pad.buttons[12] && pad.buttons[12].pressed) out.pitch = -1; // up
      if (pad.buttons[13] && pad.buttons[13].pressed) out.pitch = 1;  // down
      if (pad.buttons[14] && pad.buttons[14].pressed) out.roll = -1;  // left
      if (pad.buttons[15] && pad.buttons[15].pressed) out.roll = 1;   // right

      // A / Cross (0) = reset
      if (pad.buttons[0] && pad.buttons[0].pressed && !out.buttons.a) {
        out.buttons.a = true;
        const btn = document.getElementById('btn-reset');
        if (btn) btn.click();
      } else if (!pad.buttons[0] || !pad.buttons[0].pressed) {
        out.buttons.a = false;
      }

      // B / Circle (1) = toggle câmera
      if (pad.buttons[1] && pad.buttons[1].pressed && !out.buttons.b) {
        out.buttons.b = true;
        const btn = document.getElementById('btn-cam');
        if (btn) btn.click();
      } else if (!pad.buttons[1] || !pad.buttons[1].pressed) {
        out.buttons.b = false;
      }

      // X / Square (2) = toggle mode
      if (pad.buttons[2] && pad.buttons[2].pressed && !out.buttons.x) {
        out.buttons.x = true;
        const btn = document.getElementById('btn-mode');
        if (btn) btn.click();
      } else if (!pad.buttons[2] || !pad.buttons[2].pressed) {
        out.buttons.x = false;
      }
    }

    // Atualiza barras do painel de config (se aberto)
    updateLiveBars(out);

    requestAnimationFrame(poll);
  }

  function updateLiveBars(out) {
    const set = (id, v, isThr) => {
      const el = document.getElementById(id);
      if (!el) return;
      const pct = isThr ? Math.round(v * 100) : Math.round(((v + 1) / 2) * 100);
      el.style.width = Math.max(0, Math.min(100, pct)) + '%';
      el.style.background = isThr
        ? 'linear-gradient(90deg,#0a6,#0f8)'
        : v > 0.05
          ? 'linear-gradient(90deg,#0a6,#0f8)'
          : v < -0.05
            ? 'linear-gradient(90deg,#f60,#f30)'
            : 'rgba(0,255,100,0.25)';
    };
    set('pad-bar-thr', out.throttle, true);
    set('pad-bar-yaw', out.yaw, false);
    set('pad-bar-pitch', out.pitch, false);
    set('pad-bar-roll', out.roll, false);

    const nameEl = document.getElementById('pad-cfg-name');
    if (nameEl) nameEl.textContent = out.connected ? out.name : 'Nenhum gamepad';
  }

  // ——— UI de configuração injetada no menu Settings ———
  function injectSettingsUI() {
    if (document.getElementById('pad-cfg-panel')) return;
    const menu = document.getElementById('settings-menu');
    if (!menu) return;
    const panel = menu.querySelector('.menu-panel');
    if (!panel) return;

    const box = document.createElement('div');
    box.id = 'pad-cfg-panel';
    box.innerHTML =
      '<div class="menu-section" style="margin-top:14px">Gamepad externo</div>' +
      '<div style="font-size:11px;opacity:0.7;margin-bottom:8px">Status: <span id="pad-cfg-name" style="color:#0f8">—</span></div>' +
      '<div class="setting-row"><label>Modo</label>' +
      '<select id="pad-cfg-mode" style="background:#111;color:#0f0;border:1px solid rgba(0,255,100,0.3);border-radius:6px;padding:5px 8px;font-family:monospace;font-size:12px">' +
      '<option value="mode2">Mode 2 (FPV padrão)</option>' +
      '<option value="mode1">Mode 1</option></select></div>' +
      '<div class="setting-row"><label>Inverter Yaw</label><input type="checkbox" id="pad-inv-yaw" /></div>' +
      '<div class="setting-row"><label>Inverter Roll</label><input type="checkbox" id="pad-inv-roll" /></div>' +
      '<div class="setting-row"><label>Inverter Pitch</label><input type="checkbox" id="pad-inv-pitch" /></div>' +
      '<div class="setting-row"><label>Inverter Throttle</label><input type="checkbox" id="pad-inv-thr" /></div>' +
      '<div class="setting-row"><label>Trocar sticks</label><input type="checkbox" id="pad-swap" /></div>' +
      '<div class="setting-row"><label>Deadzone pad</label>' +
      '<input type="range" id="pad-cfg-dead" min="0" max="0.3" step="0.01" style="width:110px;accent-color:#0f0" />' +
      '<span class="value" id="pad-cfg-dead-val">0.08</span></div>' +
      '<div class="setting-row"><label>Expo pad</label>' +
      '<input type="range" id="pad-cfg-expo" min="0" max="0.8" step="0.05" style="width:110px;accent-color:#0f0" />' +
      '<span class="value" id="pad-cfg-expo-val">0.30</span></div>' +
      '<div class="setting-row"><label>Sens pad</label>' +
      '<input type="range" id="pad-cfg-sens" min="0.3" max="2" step="0.1" style="width:110px;accent-color:#0f0" />' +
      '<span class="value" id="pad-cfg-sens-val">1.0</span></div>' +
      '<div style="margin-top:10px;font-size:10px;opacity:0.6;font-family:monospace">Live (mova o stick)</div>' +
      barHTML('THR', 'pad-bar-thr') +
      barHTML('YAW', 'pad-bar-yaw') +
      barHTML('PIT', 'pad-bar-pitch') +
      barHTML('ROL', 'pad-bar-roll') +
      '<div style="font-size:10px;opacity:0.45;margin-top:8px;line-height:1.4">' +
      'A = Reset · B = Câmera · X = Mode<br>RT = boost throttle · D-pad = pitch/roll</div>';

    // Inserir antes do botão VOLTAR
    const back = panel.querySelector('.back-btn');
    if (back) panel.insertBefore(box, back);
    else panel.appendChild(box);

    // Popular valores
    const $ = (id) => document.getElementById(id);
    $('pad-cfg-mode').value = cfg.mode;
    $('pad-inv-yaw').checked = !!cfg.invertYaw;
    $('pad-inv-roll').checked = !!cfg.invertRoll;
    $('pad-inv-pitch').checked = !!cfg.invertPitch;
    $('pad-inv-thr').checked = !!cfg.invertThrottle;
    $('pad-swap').checked = !!cfg.swapSticks;
    $('pad-cfg-dead').value = cfg.deadzone;
    $('pad-cfg-dead-val').textContent = Number(cfg.deadzone).toFixed(2);
    $('pad-cfg-expo').value = cfg.expo;
    $('pad-cfg-expo-val').textContent = Number(cfg.expo).toFixed(2);
    $('pad-cfg-sens').value = cfg.sens;
    $('pad-cfg-sens-val').textContent = Number(cfg.sens).toFixed(1);

    function apply() {
      cfg.mode = $('pad-cfg-mode').value;
      cfg.invertYaw = $('pad-inv-yaw').checked;
      cfg.invertRoll = $('pad-inv-roll').checked;
      cfg.invertPitch = $('pad-inv-pitch').checked;
      cfg.invertThrottle = $('pad-inv-thr').checked;
      cfg.swapSticks = $('pad-swap').checked;
      cfg.deadzone = parseFloat($('pad-cfg-dead').value);
      cfg.expo = parseFloat($('pad-cfg-expo').value);
      cfg.sens = parseFloat($('pad-cfg-sens').value);
      $('pad-cfg-dead-val').textContent = cfg.deadzone.toFixed(2);
      $('pad-cfg-expo-val').textContent = cfg.expo.toFixed(2);
      $('pad-cfg-sens-val').textContent = cfg.sens.toFixed(1);
      window.__FPV_PAD_CFG = cfg;
      saveCfg(cfg);
    }

    ['pad-cfg-mode', 'pad-inv-yaw', 'pad-inv-roll', 'pad-inv-pitch', 'pad-inv-thr', 'pad-swap'].forEach((id) => {
      $(id).addEventListener('change', apply);
    });
    ['pad-cfg-dead', 'pad-cfg-expo', 'pad-cfg-sens'].forEach((id) => {
      $(id).addEventListener('input', apply);
    });
  }

  function barHTML(label, id) {
    return (
      '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:10px;font-family:monospace">' +
      '<span style="width:28px;opacity:0.7">' + label + '</span>' +
      '<div style="flex:1;height:8px;background:rgba(0,255,100,0.1);border-radius:4px;overflow:hidden">' +
      '<div id="' + id + '" style="height:100%;width:50%;background:rgba(0,255,100,0.25);border-radius:4px"></div>' +
      '</div></div>'
    );
  }

  // Observa abertura do menu de settings
  function watchSettings() {
    const menu = document.getElementById('settings-menu');
    if (!menu) {
      setTimeout(watchSettings, 500);
      return;
    }
    const obs = new MutationObserver(() => {
      if (!menu.classList.contains('hidden')) injectSettingsUI();
    });
    obs.observe(menu, { attributes: true, attributeFilter: ['class'] });
    // também no clique do botão settings
    document.getElementById('btn-settings')?.addEventListener('click', () => setTimeout(injectSettingsUI, 50));
  }

  window.addEventListener('gamepadconnected', function (e) {
    var el = document.getElementById('pad-status');
    if (el) el.textContent = 'OK: ' + (e.gamepad.id || 'PAD').slice(0, 20);
  });
  window.addEventListener('gamepaddisconnected', function () {
    var el = document.getElementById('pad-status');
    if (el) el.textContent = 'Pad off';
  });

  // Chrome só libera getGamepads após interação do usuário
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(function (ev) {
    window.addEventListener(
      ev,
      function () {
        try {
          navigator.getGamepads();
        } catch (e) {}
      },
      { passive: true }
    );
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchSettings);
  } else {
    watchSettings();
  }

  poll();

  // API pública
  window.__FPV_PAD_SET = function (partial) {
    Object.assign(cfg, partial);
    window.__FPV_PAD_CFG = cfg;
    saveCfg(cfg);
  };
  window.__FPV_PAD_GET = function () {
    return Object.assign({}, cfg);
  };
})();
