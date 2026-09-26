/**
 * FPV Profile — mini database local (localStorage)
 * Dados ficam no navegador do jogador.
 * IP publico: 1 consulta opcional a api.ipify.org.
 * Admin TSDEV (id 01) e cliente-side (F12 contorna).
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
      id: uid(),
      name: '',
      level: 1,
      xpSeconds: 0,
      isAdmin: false,
      rank: 'PILOTO',
      firstAccess: now,
      lastAccess: now,
      ip: '',
      deviceInfo: detectDevice(),
      unlocked: { body: ['standard'], cams: ['none', 'fpv'], stickers: ['none'], extras: ['none'] },
      custom: {
        bodyStyle: 'standard', camType: 'fpv', sticker: 'none', accessory: 'none',
        bodyColor: 0x1a1a1a, armColor: 0x111111, propColor: 0xdddddd, scale: 1,
      },
      player: {
        skin: 0xffdbac, hair: 0x1a1a1a, hairStyle: 'short',
        shirt: 0x1a5cff, pants: 0x1a1a2e, shoes: 0x111111, outfit: 'tshirt',
      },
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
      .then(j => {
        if (j && j.ip) { p.ip = String(j.ip).slice(0, 45); save(p); }
      })
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

  ensure();
})();
