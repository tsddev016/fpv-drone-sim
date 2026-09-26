(function () {
  const KEY = 'fpv_profile_v2';
  const LEGACY_KEY = 'fpv_profile_v1';
  const ADMIN_CODE = 'TSDEV-01';
  const PBKDF2_ITERS = 120000;
  const UNLOCKS = {
    body: { standard: 1, slim: 3, wide: 8, whoop: 15 },
    cams: { none: 1, fpv: 1, action: 10 },
    stickers: { none: 1, stripe: 5, x: 12, number: 20 },
    extras: { none: 1, antenna: 6, ledbar: 14, keychain: 25 },
  };
  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64ToBuf(b64) {
    const s = atob(b64);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }
  function randomBytes(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }
  async function hashSecret(password, saltB64) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const salt = new Uint8Array(b64ToBuf(saltB64));
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return bufToB64(bits);
  }
  async function deriveAesKey(password, saltB64) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const salt = new Uint8Array(b64ToBuf(saltB64));
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, ['encrypt', 'decrypt']
    );
  }
  async function encryptText(plain, password, saltB64) {
    if (!plain) return { iv: '', ct: '' };
    const key = await deriveAesKey(password, saltB64);
    const iv = randomBytes(12);
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(String(plain)));
    return { iv: bufToB64(iv.buffer), ct: bufToB64(ct) };
  }
  async function decryptText(payload, password, saltB64) {
    if (!payload || !payload.ct) return '';
    try {
      const key = await deriveAesKey(password, saltB64);
      const iv = new Uint8Array(b64ToBuf(payload.iv));
      const ct = b64ToBuf(payload.ct);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      return new TextDecoder().decode(pt);
    } catch (_) { return ''; }
  }
  function uid() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
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
    return { browser, device, language: navigator.language || '', platform: navigator.platform || '', screen: (screen.width || 0) + 'x' + (screen.height || 0), ua: ua.slice(0, 120) };
  }
  function emptyGameData() {
    return {
      level: 1, xpSeconds: 0, isAdmin: false, rank: 'PILOTO',
      unlocked: { body: ['standard'], cams: ['none', 'fpv'], stickers: ['none'], extras: ['none'] },
      custom: { bodyStyle: 'standard', camType: 'fpv', sticker: 'none', accessory: 'none', bodyColor: 0x1a1a1a, armColor: 0x111111, propColor: 0xdddddd, scale: 1 },
      player: { skin: 0xffdbac, hair: 0x1a1a1a, hairStyle: 'short', shirt: 0x1a5cff, pants: 0x1a1a2e, shoes: 0x111111, outfit: 'tshirt' },
      stats: { flights: 0, totalSeconds: 0, resets: 0 },
    };
  }
  function loadStore() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (_) {}
    try { const legacy = localStorage.getItem(LEGACY_KEY); if (legacy) return { accounts: {}, session: null, legacy: JSON.parse(legacy) }; } catch (_) {}
    return { accounts: {}, session: null };
  }
  function saveStore(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} }
  let store = loadStore();
  let session = null;
  let cachedIp = '';
  function publicIdFromInternal(internalId) {
    let h = 0; const s = String(internalId || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return 'P' + Math.abs(h).toString(36).toUpperCase().slice(0, 8);
  }
  function fetchIpOnce() {
    if (cachedIp) return Promise.resolve(cachedIp);
    return fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { cachedIp = j && j.ip ? String(j.ip).slice(0, 45) : ''; return cachedIp; })
      .catch(() => '');
  }
  function recomputeUnlocks(game) {
    const lv = game.isAdmin ? 9999 : game.level | 0;
    const u = { body: [], cams: [], stickers: [], extras: [] };
    Object.keys(UNLOCKS).forEach(cat => {
      Object.keys(UNLOCKS[cat]).forEach(id => { if (lv >= UNLOCKS[cat][id]) u[cat].push(id); });
    });
    game.unlocked = u; return game;
  }
  function normalizeName(name) {
    return String(name || '').trim().slice(0, 16).replace(/[<>"'`\\]/g, '');
  }
  function accountExists(name) {
    return !!(store.accounts && store.accounts[normalizeName(name).toLowerCase()]);
  }
  async function register(name, password, question, answer) {
    name = normalizeName(name);
    if (!name || name.length < 2) return { ok: false, msg: 'Nome mínimo 2 caracteres' };
    if (!password || String(password).length < 4) return { ok: false, msg: 'Senha mínimo 4 caracteres' };
    if (!question || String(question).trim().length < 3) return { ok: false, msg: 'Pergunta secreta obrigatória' };
    if (!answer || String(answer).trim().length < 2) return { ok: false, msg: 'Resposta obrigatória' };
    const key = name.toLowerCase();
    if (store.accounts[key]) return { ok: false, msg: 'Nome já existe neste aparelho' };
    const salt = bufToB64(randomBytes(16).buffer);
    const passHash = await hashSecret(String(password), salt);
    const ansHash = await hashSecret(String(answer).trim().toLowerCase(), salt);
    const internalId = uid();
    const ip = await fetchIpOnce();
    const encIp = await encryptText(ip, String(password), salt);
    const encId = await encryptText(internalId, String(password), salt);
    let game = emptyGameData();
    if (store.legacy && store.legacy.level) {
      game.level = store.legacy.level;
      game.xpSeconds = store.legacy.xpSeconds || (game.level - 1) * 60;
      game.player = store.legacy.player || game.player;
      recomputeUnlocks(game);
    }
    const now = new Date().toISOString();
    store.accounts[key] = {
      name, salt, passHash,
      securityQuestion: String(question).trim().slice(0, 80),
      answerHash: ansHash, encIp, encId,
      publicId: publicIdFromInternal(internalId),
      deviceInfo: detectDevice(), firstAccess: now, lastAccess: now, game,
    };
    delete store.legacy;
    session = { name, password: String(password), publicId: store.accounts[key].publicId, game };
    store.lastSession = { name: session.name, publicId: session.publicId };
    saveStore(store);
    window.__FPV_PROFILE = toRuntimeProfile();
    return { ok: true, msg: 'Conta criada' };
  }
  async function login(name, password) {
    name = normalizeName(name);
    const key = name.toLowerCase();
    const acc = store.accounts[key];
    if (!acc) return { ok: false, msg: 'Conta não encontrada' };
    const hash = await hashSecret(String(password), acc.salt);
    if (hash !== acc.passHash) return { ok: false, msg: 'Senha incorreta' };
    acc.lastAccess = new Date().toISOString();
    acc.deviceInfo = detectDevice();
    const ip = await fetchIpOnce();
    if (ip) acc.encIp = await encryptText(ip, String(password), acc.salt);
    session = { name: acc.name, password: String(password), publicId: acc.publicId, game: acc.game || emptyGameData() };
    store.lastSession = { name: session.name, publicId: session.publicId };
    saveStore(store);
    window.__FPV_PROFILE = toRuntimeProfile();
    return { ok: true, msg: 'Login ok' };
  }
  async function recover(name, answer, newPassword) {
    name = normalizeName(name);
    const key = name.toLowerCase();
    const acc = store.accounts[key];
    if (!acc) return { ok: false, msg: 'Conta não encontrada' };
    if (!newPassword || String(newPassword).length < 4) return { ok: false, msg: 'Nova senha mín. 4' };
    const ansHash = await hashSecret(String(answer).trim().toLowerCase(), acc.salt);
    if (ansHash !== acc.answerHash) return { ok: false, msg: 'Resposta incorreta' };
    const oldPass = session && session.name === acc.name ? session.password : null;
    let internalId = uid();
    let ip = cachedIp || '';
    if (oldPass) {
      const decId = await decryptText(acc.encId, oldPass, acc.salt);
      const decIp = await decryptText(acc.encIp, oldPass, acc.salt);
      if (decId) internalId = decId;
      if (decIp) ip = decIp;
    }
    if (!ip) ip = await fetchIpOnce();
    const salt = bufToB64(randomBytes(16).buffer);
    acc.salt = salt;
    acc.passHash = await hashSecret(String(newPassword), salt);
    acc.answerHash = await hashSecret(String(answer).trim().toLowerCase(), salt);
    acc.encIp = await encryptText(ip, String(newPassword), salt);
    acc.encId = await encryptText(internalId, String(newPassword), salt);
    acc.publicId = publicIdFromInternal(internalId);
    acc.lastAccess = new Date().toISOString();
    session = { name: acc.name, password: String(newPassword), publicId: acc.publicId, game: acc.game || emptyGameData() };
    store.lastSession = { name: session.name, publicId: session.publicId };
    saveStore(store);
    window.__FPV_PROFILE = toRuntimeProfile();
    return { ok: true, msg: 'Senha redefinida' };
  }
  function getSecurityQuestion(name) {
    const acc = store.accounts[normalizeName(name).toLowerCase()];
    return acc ? acc.securityQuestion : '';
  }
  function logout() {
    persistGame();
    session = null;
    try { delete store.lastSession; saveStore(store); } catch (_) {}
    window.__FPV_PROFILE = guestProfile();
  }
  function guestProfile() {
    return {
      id: 'guest', name: '', level: 1, xpSeconds: 0, isAdmin: false, rank: 'CONVIDADO',
      firstAccess: '', lastAccess: '', ip: '—', deviceInfo: detectDevice(),
      unlocked: { body: ['standard'], cams: ['none', 'fpv'], stickers: ['none'], extras: ['none'] },
      custom: emptyGameData().custom, player: emptyGameData().player,
      stats: { flights: 0, totalSeconds: 0, resets: 0 }, authenticated: false,
    };
  }
  function toRuntimeProfile() {
    if (!session) return guestProfile();
    const g = session.game;
    return {
      id: session.publicId, name: session.name, level: g.level, xpSeconds: g.xpSeconds,
      isAdmin: !!g.isAdmin, rank: g.rank || 'PILOTO', firstAccess: '', lastAccess: new Date().toISOString(),
      ip: '—', deviceInfo: detectDevice(), unlocked: g.unlocked,
      custom: g.custom, player: g.player, stats: g.stats, authenticated: true,
    };
  }
  function persistGame() {
    if (!session) return;
    const key = session.name.toLowerCase();
    if (!store.accounts[key]) return;
    store.accounts[key].game = session.game;
    store.accounts[key].lastAccess = new Date().toISOString();
    store.lastSession = { name: session.name, publicId: session.publicId };
    saveStore(store);
    window.__FPV_PROFILE = toRuntimeProfile();
  }
  function ensure() {
    if (session) { window.__FPV_PROFILE = toRuntimeProfile(); return window.__FPV_PROFILE; }
    window.__FPV_PROFILE = guestProfile();
    return window.__FPV_PROFILE;
  }
  function addPlayTime(seconds) {
    if (!session) return ensure();
    const g = session.game;
    if (g.isAdmin) return toRuntimeProfile();
    const add = Math.max(0, Math.min(5, seconds));
    g.xpSeconds = (g.xpSeconds || 0) + add;
    g.stats.totalSeconds = (g.stats.totalSeconds || 0) + add;
    const newLevel = 1 + Math.floor(g.xpSeconds / 60);
    if (newLevel > g.level) { g.level = newLevel; recomputeUnlocks(g); window.__FPV_LEVEL_UP = g.level; }
    persistGame();
    return toRuntimeProfile();
  }
  function setName() { return ensure(); }
  function isUnlocked(category, id) {
    const p = ensure();
    if (p.isAdmin) return true;
    return ((p.unlocked && p.unlocked[category]) || []).indexOf(id) >= 0;
  }
  function requiredLevel(category, id) {
    return (UNLOCKS[category] && UNLOCKS[category][id]) || 1;
  }
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function showAuthGate() {
    if (document.getElementById('fpv-auth-gate')) return;
    const gate = el(
      '<div id="fpv-auth-gate" style="position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:16px;color:#0f0;font-family:monospace">' +
      '<div style="max-width:360px;width:100%;background:linear-gradient(160deg,rgba(8,28,16,0.98),rgba(2,10,6,0.99));border:1px solid rgba(0,255,120,0.25);border-radius:16px;padding:22px 18px">' +
      '<h2 style="text-align:center;letter-spacing:2px;margin:0 0 6px;font-size:18px">CONTA FPV</h2>' +
      '<p style="text-align:center;font-size:11px;opacity:0.5;margin:0 0 14px;line-height:1.4">Entre com seu nome de piloto</p>' +
      '<div id="auth-step-name"><label style="font-size:11px;opacity:0.7">Nome do piloto</label>' +
      '<input id="auth-name" maxlength="16" placeholder="Seu nome" style="width:100%;margin:6px 0 10px;padding:12px;background:#111;border:1px solid rgba(0,255,100,0.35);border-radius:10px;color:#0f8;font-size:16px;font-family:monospace;box-sizing:border-box" />' +
      '<button type="button" id="auth-next" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">CONTINUAR</button></div>' +
      '<div id="auth-step-login" style="display:none"><label style="font-size:11px;opacity:0.7">Senha</label>' +
      '<input id="auth-pass" type="password" maxlength="64" placeholder="Senha" style="width:100%;margin:6px 0 10px;padding:12px;background:#111;border:1px solid rgba(0,255,100,0.35);border-radius:10px;color:#0f8;font-size:16px;font-family:monospace;box-sizing:border-box" />' +
      '<button type="button" id="auth-login" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer;margin-bottom:8px">ENTRAR</button>' +
      '<button type="button" id="auth-forgot" style="width:100%;padding:10px;border:1px solid rgba(0,255,100,0.3);border-radius:10px;background:transparent;color:#0f0;cursor:pointer;font-size:12px">Esqueci a senha</button></div>' +
      '<div id="auth-step-register" style="display:none"><label style="font-size:11px;opacity:0.7">Crie uma senha</label>' +
      '<input id="auth-reg-pass" type="password" maxlength="64" placeholder="Mín. 4 caracteres" style="width:100%;margin:6px 0 10px;padding:12px;background:#111;border:1px solid rgba(0,255,100,0.35);border-radius:10px;color:#0f8;font-size:16px;font-family:monospace;box-sizing:border-box" />' +
      '<label style="font-size:11px;opacity:0.7">Pergunta secreta</label>' +
      '<input id="auth-reg-q" maxlength="80" placeholder="Ex: nome do seu pet?" style="width:100%;margin:6px 0 10px;padding:12px;background:#111;border:1px solid rgba(0,255,100,0.35);border-radius:10px;color:#0f8;font-size:14px;font-family:monospace;box-sizing:border-box" />' +
      '<label style="font-size:11px;opacity:0.7">Resposta</label>' +
      '<input id="auth-reg-a" maxlength="40" placeholder="Ex: Pablo" style="width:100%;margin:6px 0 10px;padding:12px;background:#111;border:1px solid rgba(0,255,100,0.35);border-radius:10px;color:#0f8;font-size:14px;font-family:monospace;box-sizing:border-box" />' +
      '<button type="button" id="auth-register" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">CRIAR CONTA</button></div>' +
      '<div id="auth-step-recover" style="display:none"><p id="auth-recover-q" style="font-size:13px;margin:0 0 10px;line-height:1.4;color:#9f8"></p>' +
      '<input id="auth-recover-a" maxlength="40" placeholder="Resposta" style="width:100%;margin:6px 0 10px;padding:12px;background:#111;border:1px solid rgba(0,255,100,0.35);border-radius:10px;color:#0f8;font-size:14px;font-family:monospace;box-sizing:border-box" />' +
      '<input id="auth-recover-pass" type="password" maxlength="64" placeholder="Nova senha" style="width:100%;margin:6px 0 10px;padding:12px;background:#111;border:1px solid rgba(0,255,100,0.35);border-radius:10px;color:#0f8;font-size:14px;font-family:monospace;box-sizing:border-box" />' +
      '<button type="button" id="auth-recover-go" style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(180deg,#0f0,#0a0);color:#000;font-weight:700;cursor:pointer">REDEFINIR SENHA</button></div>' +
      '<div id="auth-msg" style="min-height:18px;margin-top:10px;font-size:12px;color:#f86;text-align:center"></div>' +
      '<button type="button" id="auth-back" style="display:none;width:100%;margin-top:8px;padding:10px;border:1px solid rgba(0,255,100,0.25);border-radius:10px;background:transparent;color:#0f0;cursor:pointer;font-size:12px">← Voltar</button>' +
      '</div></div>'
    );
    document.body.appendChild(gate);
    const msg = () => document.getElementById('auth-msg');
    const show = (id) => {
      ['auth-step-name', 'auth-step-login', 'auth-step-register', 'auth-step-recover'].forEach(s => {
        const n = document.getElementById(s); if (n) n.style.display = s === id ? 'block' : 'none';
      });
      const back = document.getElementById('auth-back');
      if (back) back.style.display = id === 'auth-step-name' ? 'none' : 'block';
    };
    document.getElementById('auth-next').onclick = () => {
      const name = (document.getElementById('auth-name').value || '').trim();
      if (name.length < 2) { msg().textContent = 'Nome mínimo 2 caracteres'; return; }
      msg().textContent = '';
      if (accountExists(name)) show('auth-step-login'); else show('auth-step-register');
    };
    document.getElementById('auth-login').onclick = async () => {
      const name = (document.getElementById('auth-name').value || '').trim();
      const pass = document.getElementById('auth-pass').value || '';
      const r = await login(name, pass);
      msg().textContent = r.msg || '';
      if (r.ok) closeAuthGate();
    };
    document.getElementById('auth-register').onclick = async () => {
      const name = (document.getElementById('auth-name').value || '').trim();
      const pass = document.getElementById('auth-reg-pass').value || '';
      const q = document.getElementById('auth-reg-q').value || '';
      const a = document.getElementById('auth-reg-a').value || '';
      const r = await register(name, pass, q, a);
      msg().textContent = r.msg || '';
      if (r.ok) closeAuthGate();
    };
    document.getElementById('auth-forgot').onclick = () => {
      const name = (document.getElementById('auth-name').value || '').trim();
      const q = getSecurityQuestion(name);
      if (!q) { msg().textContent = 'Conta não encontrada'; return; }
      document.getElementById('auth-recover-q').textContent = q;
      show('auth-step-recover');
    };
    document.getElementById('auth-recover-go').onclick = async () => {
      const name = (document.getElementById('auth-name').value || '').trim();
      const a = document.getElementById('auth-recover-a').value || '';
      const np = document.getElementById('auth-recover-pass').value || '';
      const r = await recover(name, a, np);
      msg().textContent = r.msg || '';
      if (r.ok) closeAuthGate();
    };
    document.getElementById('auth-back').onclick = () => { msg().textContent = ''; show('auth-step-name'); };
  }
  function closeAuthGate() {
    const g = document.getElementById('fpv-auth-gate');
    if (g) g.remove();
    refreshProfileUI();
  }
  function refreshProfileUI() {
    const p = ensure();
    const n = document.getElementById('prof-name');
    const l = document.getElementById('prof-level');
    const m = document.getElementById('prof-meta');
    if (n) n.textContent = p.authenticated ? p.name : 'Não logado';
    if (l) l.textContent = p.isAdmin ? '∞' : String(p.level || 1);
    if (m) m.textContent = p.authenticated ? ('Level ' + (p.level || 1) + ' · salvo neste aparelho') : 'Faça login para salvar';
    let hl = document.getElementById('hud-level');
    if (!hl) {
      const tr = document.querySelector('#hud .top-right');
      if (tr) { hl = document.createElement('div'); hl.id = 'hud-level'; tr.appendChild(hl); }
    }
    if (hl) hl.textContent = !p.authenticated ? '—' : p.isAdmin ? 'ADMIN' : 'LV ' + p.level;
  }
  function restoreSession() {
    if (session) return;
    const ls = store.lastSession;
    if (!ls || !ls.name) return;
    const key = String(ls.name).toLowerCase();
    const acc = store.accounts[key];
    if (!acc) return;
    session = {
      name: acc.name,
      password: '',
      publicId: acc.publicId || ls.publicId || '',
      game: acc.game || emptyGameData(),
    };
    window.__FPV_PROFILE = toRuntimeProfile();
  }
  function injectProfileUI() {
    restoreSession();
    const main = document.querySelector('#main-menu .menu-panel');
    if (main && !document.getElementById('profile-card')) {
      const playBtn = document.getElementById('btn-play');
      const card = document.createElement('div');
      card.id = 'profile-card';
      card.style.cssText = 'background:rgba(0,0,0,0.35);border:1px solid rgba(0,255,100,0.2);border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.45;color:#0f0';
      card.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><div style="opacity:0.55;font-size:10px">PILOTO</div><div id="prof-name" style="font-weight:700;color:#9f8">—</div></div><div style="text-align:right"><div style="opacity:0.55;font-size:10px">LEVEL</div><div id="prof-level" style="font-weight:700;font-size:18px;color:#0f8">1</div></div></div><div id="prof-meta" style="margin-top:6px;opacity:0.45;font-size:10px">—</div><div style="margin-top:8px;display:flex;gap:6px"><button type="button" id="btn-auth-open" style="flex:1;background:linear-gradient(180deg,#0f0,#0a0);color:#000;border:none;border-radius:8px;padding:8px 12px;font-weight:700;font-size:11px;cursor:pointer">LOGIN / CONTA</button><button type="button" id="btn-auth-logout" style="background:transparent;color:#0f0;border:1px solid rgba(0,255,100,0.3);border-radius:8px;padding:8px 12px;font-size:11px;cursor:pointer">SAIR</button></div>';
      if (playBtn) main.insertBefore(card, playBtn); else main.appendChild(card);
      document.getElementById('btn-auth-open')?.addEventListener('click', () => showAuthGate());
      document.getElementById('btn-auth-logout')?.addEventListener('click', () => { logout(); refreshProfileUI(); showAuthGate(); });
    }
    refreshProfileUI();
    let acc = 0, last = performance.now();
    setInterval(() => {
      const now = performance.now(); const dt = (now - last) / 1000; last = now;
      const hud = document.getElementById('hud');
      if (session && hud && !hud.classList.contains('hidden')) {
        acc += dt;
        if (acc >= 1) {
          const s = Math.floor(acc); acc -= s;
          addPlayTime(s);
          if (window.__FPV_LEVEL_UP) window.__FPV_LEVEL_UP = null;
          refreshProfileUI();
        }
      }
    }, 1000);
    if (!session) setTimeout(showAuthGate, 400); else refreshProfileUI();
  }
  window.FPVProfile = {
    ensure, save: persistGame, addPlayTime, setName,
    isUnlocked, requiredLevel,
    exportPublic: () => { const p = ensure(); return { name: p.name || 'Piloto', level: p.level }; },
    register, login, recover, logout, accountExists, getSecurityQuestion,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectProfileUI);
  else injectProfileUI();
  ensure();
})();
