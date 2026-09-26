/**
 * AEGIS — Anti-Exploit Guard Integrity System
 * Camada anti-cheat cliente: selo de progresso, level vs tempo, quarentena.
 */
(function () {
  const AEGIS = {
    name: 'AEGIS',
    version: 1,
    maxViolations: 5,
    maxLevelFromXp(xp) {
      return 1 + Math.floor((Number(xp) || 0) / 60);
    },
  };

  function fingerprint(game) {
    const g = game || {};
    const parts = [
      AEGIS.version,
      g.level | 0,
      Math.floor(Number(g.xpSeconds) || 0),
      g.isAdmin ? 1 : 0,
      (g.stats && g.stats.totalSeconds) | 0,
      (g.stats && g.stats.flights) | 0,
      g.rank || 'PILOTO',
    ];
    let h = 2166136261;
    const s = parts.join('|');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= (g.level | 0) * 2654435761;
    h ^= Math.floor(Number(g.xpSeconds) || 0) * 1597334677;
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function seal(game) {
    if (!game) return;
    game._aegis = { v: AEGIS.version, seal: fingerprint(game), ts: Date.now() };
  }

  function check(game) {
    const report = { ok: true, fixes: [] };
    if (!game) return report;

    const maxLv = AEGIS.maxLevelFromXp(game.xpSeconds);
    if ((game.level | 0) > maxLv + 1 && !game.isAdmin) {
      report.ok = false;
      report.fixes.push('level>xp');
      game.level = maxLv;
    }
    if (Number(game.xpSeconds) < 0 || !isFinite(game.xpSeconds)) {
      report.ok = false;
      report.fixes.push('xp-invalid');
      game.xpSeconds = Math.max(0, ((game.level | 0) - 1) * 60);
    }
    if (game.xpSeconds > 720000 && !game.isAdmin) {
      report.ok = false;
      report.fixes.push('xp-cap');
      game.xpSeconds = 720000;
      game.level = AEGIS.maxLevelFromXp(game.xpSeconds);
    }
    if (game.isAdmin && game.rank !== 'ADMIN') {
      report.ok = false;
      report.fixes.push('admin-rank');
      game.isAdmin = false;
      game.rank = 'PILOTO';
      game.level = AEGIS.maxLevelFromXp(game.xpSeconds);
    }
    const sealed = game._aegis && game._aegis.seal;
    if (!sealed && ((game.level | 0) > 5 || game.isAdmin)) {
      report.ok = false;
      report.fixes.push('missing-seal');
      if (game.isAdmin) {
        game.isAdmin = false;
        game.rank = 'PILOTO';
        report.fixes.push('admin-stripped');
      }
      game.level = Math.min(game.level | 0, AEGIS.maxLevelFromXp(game.xpSeconds));
    } else if (sealed && sealed !== fingerprint(game)) {
      report.ok = false;
      report.fixes.push('seal-mismatch');
    }
    if (!game.stats) game.stats = { flights: 0, totalSeconds: 0, resets: 0 };
    seal(game);
    return report;
  }

  function getStore() {
    try {
      const raw = localStorage.getItem('fpv_profile_v2');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveStore(st) {
    try {
      localStorage.setItem('fpv_profile_v2', JSON.stringify(st));
    } catch (_) {}
  }

  function logViolation(name, fixes) {
    const st = getStore();
    if (!st) return;
    st._aegisLog = st._aegisLog || [];
    st._aegisLog.push({ t: new Date().toISOString(), name: name || '?', fixes: fixes.slice() });
    if (st._aegisLog.length > 30) st._aegisLog = st._aegisLog.slice(-30);
    const key = (name || '').toLowerCase();
    if (key && st.accounts && st.accounts[key]) {
      st.accounts[key].aegisViolations = (st.accounts[key].aegisViolations || 0) + 1;
      if (st.accounts[key].aegisViolations >= AEGIS.maxViolations && st.accounts[key].game) {
        const g = st.accounts[key].game;
        g.isAdmin = false;
        g.rank = 'PILOTO';
        g.level = Math.min(g.level | 0, AEGIS.maxLevelFromXp(g.xpSeconds));
        seal(g);
      }
    }
    saveStore(st);
    try {
      console.warn('[AEGIS]', fixes.join(', '));
    } catch (_) {}
  }

  function patch() {
    const P = window.FPVProfile;
    if (!P || P._aegisPatched) return false;

    const origAdd = P.addPlayTime;
    const origSave = P.save;
    const origLogin = P.login;
    const origRegister = P.register;
    const origAdmin = P.tryActivateAdmin;

    P.addPlayTime = function (seconds) {
      const p = P.ensure();
      if (p && p.authenticated) {
        const st = getStore();
        const key = (p.name || '').toLowerCase();
        const game = st && st.accounts && st.accounts[key] && st.accounts[key].game;
        if (game) {
          const rep = check(game);
          if (!rep.ok) logViolation(p.name, rep.fixes);
          const viol = st.accounts[key].aegisViolations || 0;
          if (viol >= AEGIS.maxViolations) {
            st.accounts[key].game = game;
            saveStore(st);
            return P.ensure();
          }
          st.accounts[key].game = game;
          saveStore(st);
        }
      }
      const out = origAdd.call(P, seconds);
      try {
        const st2 = getStore();
        const p2 = P.ensure();
        const key2 = (p2.name || '').toLowerCase();
        if (st2 && st2.accounts && st2.accounts[key2] && st2.accounts[key2].game) {
          seal(st2.accounts[key2].game);
          saveStore(st2);
        }
      } catch (_) {}
      return out;
    };

    if (typeof origLogin === 'function') {
      P.login = async function (name, password) {
        const r = await origLogin.call(P, name, password);
        if (r && r.ok) {
          const st = getStore();
          const key = String(name || '').trim().toLowerCase();
          if (st && st.accounts && st.accounts[key] && st.accounts[key].game) {
            const rep = check(st.accounts[key].game);
            if (!rep.ok) {
              logViolation(name, rep.fixes);
              r.msg = (r.msg || 'Login ok') + ' · AEGIS corrigiu';
            }
            seal(st.accounts[key].game);
            saveStore(st);
          }
        }
        return r;
      };
    }

    if (typeof origRegister === 'function') {
      P.register = async function (name, password, question, answer) {
        const r = await origRegister.call(P, name, password, question, answer);
        if (r && r.ok) {
          const st = getStore();
          const key = String(name || '').trim().toLowerCase();
          if (st && st.accounts && st.accounts[key] && st.accounts[key].game) {
            seal(st.accounts[key].game);
            st.accounts[key].aegisViolations = 0;
            saveStore(st);
          }
          r.msg = 'Conta criada · AEGIS ativo';
        }
        return r;
      };
    }

    if (typeof origAdmin === 'function') {
      P.tryActivateAdmin = async function (code, name) {
        const r = await origAdmin.call(P, code, name);
        if (r && r.ok) {
          const st = getStore();
          const p = P.ensure();
          const key = (p.name || '').toLowerCase();
          if (st && st.accounts && st.accounts[key] && st.accounts[key].game) {
            st.accounts[key].game.isAdmin = true;
            st.accounts[key].game.rank = 'ADMIN';
            seal(st.accounts[key].game);
            saveStore(st);
          }
          r.msg = 'Admin · AEGIS selado';
        }
        return r;
      };
    }

    if (typeof origSave === 'function') {
      P.save = function () {
        const st = getStore();
        const p = P.ensure();
        const key = (p.name || '').toLowerCase();
        if (st && st.accounts && st.accounts[key] && st.accounts[key].game) {
          seal(st.accounts[key].game);
          saveStore(st);
        }
        return origSave.call(P);
      };
    }

    P.aegisStatus = function () {
      const st = getStore();
      const p = P.ensure();
      const key = (p.name || '').toLowerCase();
      const viol = st && st.accounts && st.accounts[key] ? st.accounts[key].aegisViolations || 0 : 0;
      return {
        name: AEGIS.name,
        version: AEGIS.version,
        violations: viol,
        maxViolations: AEGIS.maxViolations,
        log: ((st && st._aegisLog) || []).slice(-5),
      };
    };

    P._aegisPatched = true;
    window.__AEGIS = AEGIS;
    return true;
  }

  function boot() {
    if (patch()) return;
    let n = 0;
    const iv = setInterval(() => {
      n++;
      if (patch() || n > 40) clearInterval(iv);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
