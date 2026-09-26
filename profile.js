/**
 * FPV Profile — mini database local (localStorage)
 * Dados no navegador. IP: 1x api.ipify.org. Admin TSDEV-01 e cliente-side.
 */
(function () {
  const KEY = 'fpv_profile_v1';
  const ADMIN_CODE = 'TSDEV-01';

  const UNLOCKS = {
    body: { standard: 1, slim: 3, wide: 8, whoop: 15 },
    cams: { none: 1, fpv: 1, action: 10 },
    stickers: { none: 1, stripe: 5, x: 12, number: 20 },
    extras: { none: 1, antenna: 6, ledbar: 14, keychain: 25 },
  };

  function uid() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function detectDevice() {
    const ua = navigator.userAgent || '';
    let browser = 'Desconhecido';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
    else if (/OPR\//.test(ua)) browser = 'Opera';
    let device = 'Desktop';
    if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = 'Mobile';
    else if (/iPad|Tablet/i.test(ua)) device = 'Tablet';
    if (/Android/i.test(ua)) device += ' Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) device += ' iOS';
    else if (/Windows/i.test(ua)) device += ' Windows';
    else if (/Mac OS/i.test(ua)) device += ' Mac';
    else if (/Linux/i.test(ua)) device += ' Linux';
    return {
      browser, device,
      language: navigator.language || '',
      platform: navigator.platform || '',
      screen: (screen.width || 0) + 'x' + (screen.height || 0),
      ua: ua.slice(0, 180),
    };
  }

  function defaultProfile() {
    const now = new Date().toISOString();
    return {
      id: uid(), name: '', level: 1, xpSeconds: 0, isAdmin: false, rank: 'PILOTO',
      firstAccess: now, lastAccess: now, ip: '', deviceInfo: detectDevice(),
      unlocked: { body: ['standard'], cams: ['none', 'fpv'], stickers: ['none'], extras: ['none'] },
      custom: { bodyStyle: 'standard', camType: 'fpv', sticker: 'none', accessory: 'none', bodyColor: 0x1a1a1a, armColor: 0x111111, propColor: 0xdddddd, scale: 1 },
      player: { skin: 0xffdbac, hair: 0x1a1a1a, hairStyle: 'short', shirt: 0x1a5cff, pants: 0x1a1a2e, shoes: 0x111111, outfit: 'tshirt' },
      stats: { flights: 0, totalSeconds: 0, resets: 0 },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function save(p) {
    try {
      p.lastAccess = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch (_) {}
    window.__FPV_PROFILE = p;
  }

  function ensure() {
    let p = load();
    if (!p || !p.id) {
      p = defaultProfile();
      save(p);
      fetchIpOnce(p);
    } else {
      p.deviceInfo = detectDevice();
      p.lastAccess = new Date().toISOString();
      if (!p.unlocked) p.unlocked = defaultProfile().unlocked;
      if (!p.stats) p.stats = { flights: 0, totalSeconds: 0, resets: 0 };
      if (typeof p.xpSeconds !== 'number') p.xpSeconds = Math.max(0, (p.level - 1) * 60);
      save(p);
    }
    return p;
  }

  function fetchIpOnce(p) {
    if (p.ip) return;
    fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (j && j.ip) { p.ip = String(j.ip).slice(0, 45); save(p); } })
      .catch(() => {});
  }

  function recomputeUnlocks(p) {
    const lv = p.isAdmin ? 9999 : p.level | 0;
    const u = { body: [], cams: [], stickers: [], extras: [] };
    Object.keys(UNLOCKS).forEach(cat => {
      Object.keys(UNLOCKS[cat]).forEach(id => {
        if (lv >= UNLOCKS[cat][id]) u[cat].push(id);
      });
    });
    p.unlocked = u;
    return p;
  }

  function addPlayTime(seconds) {
    const p = window.__FPV_PROFILE || ensure();
    if (p.isAdmin) return p;
    const add = Math.max(0, Math.min(5, seconds));
    p.xpSeconds = (p.xpSeconds || 0) + add;
    p.stats.totalSeconds = (p.stats.totalSeconds || 0) + add;
    const newLevel = 1 + Math.floor(p.xpSeconds / 60);
    if (newLevel > p.level) {
      p.level = newLevel;
      recomputeUnlocks(p);
      window.__FPV_LEVEL_UP = p.level;
    }
    save(p);
    return p;
  }

  function setName(name) {
    const p = window.__FPV_PROFILE || ensure();
    name = String(name || '').trim().slice(0, 16).replace(/[<>"'`]/g, '');
    p.name = name;
    save(p);
    return p;
  }

  function tryActivateAdmin(code, name) {
    const p = window.__FPV_PROFILE || ensure();
    if (String(code || '').trim() !== ADMIN_CODE) return { ok: false, msg: 'Codigo invalido' };
    p.id = '01';
    p.name = name && String(name).trim() ? String(name).trim().slice(0, 16) : 'TSDEV';
    p.isAdmin = true;
    p.rank = 'ADMIN';
    p.level = 9999;
    p.xpSeconds = 9999 * 60;
    recomputeUnlocks(p);
    save(p);
    return { ok: true, msg: 'Admin TSDEV ativo (local)' };
  }

  function isUnlocked(category, id) {
    const p = window.__FPV_PROFILE || ensure();
    if (p.isAdmin) return true;
    const list = (p.unlocked && p.unlocked[category]) || [];
    return list.indexOf(id) >= 0;
  }

  function requiredLevel(category, id) {
    return (UNLOCKS[category] && UNLOCKS[category][id]) || 1;
  }

  function exportPublic() {
    const p = window.__FPV_PROFILE || ensure();
    return { id: p.id, name: p.name || 'Piloto', level: p.level, rank: p.rank, isAdmin: !!p.isAdmin };
  }

  window.FPVProfile = {
    ensure, save, addPlayTime, setName, tryActivateAdmin,
    isUnlocked, requiredLevel, exportPublic, UNLOCKS, KEY,
  };

  function injectProfileUI() {
    const main = document.querySelector('#main-menu .menu-panel');
    if (!main || document.getElementById('profile-card')) return;
    const playBtn = document.getElementById('btn-play');
    const card = document.createElement('div');
    card.id = 'profile-card';
    card.style.cssText = 'background:rgba(0,0,0,0.35);border:1px solid rgba(0,255,100,0.2);border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.45;color:#0f0';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><div style="opacity:0.55;font-size:10px">PILOTO</div><div id="prof-name" style="font-weight:700;color:#9f8">Piloto</div></div><div style="text-align:right"><div style="opacity:0.55;font-size:10px">LEVEL</div><div id="prof-level" style="font-weight:700;font-size:18px;color:#0f8">1</div></div></div><div id="prof-meta" style="margin-top:6px;opacity:0.45;font-size:10px">ID · —</div><div style="margin-top:8px;display:flex;gap:6px"><input id="prof-name-input" type="text" maxlength="16" placeholder="Seu nome" style="flex:1;background:#111;border:1px solid rgba(0,255,100,0.3);color:#0f0;border-radius:8px;padding:8px 10px;font-family:monospace;font-size:12px" /><button type="button" id="btn-prof-save" style="background:linear-gradient(180deg,#0f0,#0a0);color:#000;border:none;border-radius:8px;padding:8px 12px;font-weight:700;font-size:11px;cursor:pointer">OK</button></div>';
    if (playBtn) main.insertBefore(card, playBtn);
    else main.appendChild(card);

    const settings = document.querySelector('#settings-menu .menu-panel');
    if (settings && !document.getElementById('admin-code')) {
      const box = document.createElement('div');
      box.innerHTML = '<div class="menu-section">Conta local</div><p style="font-size:11px;opacity:0.5;margin:6px 0 8px">Perfil no localStorage. Admin: codigo TSDEV-01</p><div class="setting-row"><label>Codigo admin</label><input type="password" id="admin-code" maxlength="24" placeholder="••••" style="background:#111;color:#0f0;border:1px solid rgba(0,255,100,0.3);border-radius:6px;padding:5px 8px;font-family:monospace;font-size:12px;max-width:130px" /></div><button type="button" class="menu-btn secondary" id="btn-admin-activate" style="margin-top:4px">Ativar ADMIN (local)</button><div id="admin-msg" style="font-size:11px;min-height:16px;margin-top:4px;opacity:0.7"></div>';
      const back = settings.querySelector('.back-btn');
      if (back) settings.insertBefore(box, back);
      else settings.appendChild(box);
    }

    function refresh() {
      const pr = ensure();
      const n = document.getElementById('prof-name');
      const l = document.getElementById('prof-level');
      const m = document.getElementById('prof-meta');
      const inp = document.getElementById('prof-name-input');
      if (n) n.textContent = pr.name || 'Piloto';
      if (l) l.textContent = pr.isAdmin ? '∞' : String(pr.level);
      if (m) {
        const d = pr.deviceInfo || {};
        m.textContent = 'ID ' + String(pr.id || '').slice(0, 8) + ' · ' + (d.browser || '') + ' · ' + (d.device || '') + (pr.ip ? ' · IP ' + pr.ip : '');
      }
      if (inp && document.activeElement !== inp) inp.value = pr.name || '';
      let hl = document.getElementById('hud-level');
      if (!hl) {
        const tr = document.querySelector('#hud .top-right');
        if (tr) { hl = document.createElement('div'); hl.id = 'hud-level'; tr.appendChild(hl); }
      }
      if (hl) hl.textContent = pr.isAdmin ? 'ADMIN' : ('LV ' + pr.level);
    }

    document.getElementById('btn-prof-save')?.addEventListener('click', () => {
      const inp = document.getElementById('prof-name-input');
      if (inp) setName(inp.value);
      refresh();
    });
    document.getElementById('btn-admin-activate')?.addEventListener('click', () => {
      const code = document.getElementById('admin-code')?.value || '';
      const name = document.getElementById('prof-name-input')?.value || 'TSDEV';
      const r = tryActivateAdmin(code, name);
      const msg = document.getElementById('admin-msg');
      if (msg) msg.textContent = r.msg;
      refresh();
    });

    refresh();
    window.__FPV_REFRESH_PROFILE_UI = refresh;

    let acc = 0, last = performance.now();
    setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const hud = document.getElementById('hud');
      if (hud && !hud.classList.contains('hidden')) {
        acc += dt;
        if (acc >= 1) {
          const s = Math.floor(acc);
          acc -= s;
          addPlayTime(s);
          if (window.__FPV_LEVEL_UP) {
            window.__FPV_LEVEL_UP = null;
            refresh();
          } else {
            const pr = window.__FPV_PROFILE;
            const hl = document.getElementById('hud-level');
            if (hl && pr) hl.textContent = pr.isAdmin ? 'ADMIN' : ('LV ' + pr.level);
          }
        }
      }
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectProfileUI);
  else injectProfileUI();

  ensure();
})();
