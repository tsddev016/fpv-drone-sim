(function() {
  window.__FPV_PAD_INPUT = { throttle: 0, yaw: 0, pitch: 0, roll: 0, connected: false, name: '' };
  function dz(v, d) {
    if (Math.abs(v) < d) return 0;
    return Math.sign(v) * (Math.abs(v) - d) / (1 - d);
  }
  function expo(v, e) {
    const s = Math.sign(v), a = Math.abs(v);
    return s * (a * a * a * e + a * (1 - e));
  }
  function poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
    }
    const out = window.__FPV_PAD_INPUT;
    if (!pad) {
      out.connected = false;
      out.name = '';
      requestAnimationFrame(poll);
      return;
    }
    out.connected = true;
    out.name = (pad.id || 'PAD').split('(')[0].trim().slice(0, 20);
    const dead = 0.08, exp = 0.3, sens = 1;
    out.throttle = Math.max(0, Math.min(1, (-(pad.axes[1] || 0) + 1) / 2));
    out.yaw = expo(dz(pad.axes[0] || 0, dead), exp) * sens;
    out.pitch = expo(dz(pad.axes[3] || 0, dead), exp) * sens;
    out.roll = expo(dz(pad.axes[2] || 0, dead), exp) * sens;
    if (pad.buttons && pad.buttons[7] && pad.buttons[7].value > 0.05) {
      out.throttle = Math.min(1, out.throttle + pad.buttons[7].value * 0.4);
    }
    if (pad.buttons) {
      if (pad.buttons[12] && pad.buttons[12].pressed) out.pitch = -1;
      if (pad.buttons[13] && pad.buttons[13].pressed) out.pitch = 1;
      if (pad.buttons[14] && pad.buttons[14].pressed) out.roll = -1;
      if (pad.buttons[15] && pad.buttons[15].pressed) out.roll = 1;
    }
    requestAnimationFrame(poll);
  }
  window.addEventListener('gamepadconnected', (e) => {
    const el = document.getElementById('pad-status');
    if (el) el.textContent = 'OK: ' + (e.gamepad.id || 'PAD').slice(0, 20);
  });
  window.addEventListener('gamepaddisconnected', () => {
    const el = document.getElementById('pad-status');
    if (el) el.textContent = 'Pad off';
  });
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
    window.addEventListener(ev, () => { try { navigator.getGamepads(); } catch (e) {} }, { passive: true });
  });
  poll();
})();
