/**
 * Apoiar o projeto — PIX com QR do desenvolvedor
 */
(function () {
  const PIX_KEY = '';
  const PIX_NAME = 'Desenvolvedor';
  const PIX_MSG = 'Obrigado pelo apoio!';
  // QR embutido (mesmo do arquivo enviado)
  const PIX_QR_SRC = 'pix-qr.png';

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function injectStyles() {
    if (document.getElementById('support-styles')) return;
    const s = document.createElement('style');
    s.id = 'support-styles';
    s.textContent =
      '#support-overlay{position:fixed;inset:0;z-index:280;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif;color:#cfe}' +
      '#support-overlay.hidden{display:none!important}' +
      '.support-card{width:100%;max-width:380px;background:linear-gradient(165deg,rgba(8,32,18,0.98),rgba(2,12,8,0.99));border:1px solid rgba(0,255,120,0.28);border-radius:18px;padding:22px 18px 18px}' +
      '.support-card h2{margin:0 0 4px;text-align:center;letter-spacing:2px;font-size:17px;color:#9f8;font-family:monospace}' +
      '.support-card .sub{text-align:center;font-size:12px;opacity:0.5;margin:0 0 16px;line-height:1.4}' +
      '.support-qr-wrap{display:flex;justify-content:center;margin-bottom:14px}' +
      '.support-qr{width:200px;height:200px;background:#fff;border:2px solid rgba(0,255,100,0.35);border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
      '.support-qr img{width:100%;height:100%;object-fit:contain;display:block}' +
      '.support-field{background:rgba(0,0,0,0.4);border:1px solid rgba(0,255,100,0.22);border-radius:10px;padding:10px 12px;margin-bottom:10px}' +
      '.support-field label{display:block;font-size:10px;opacity:0.5;margin-bottom:4px;letter-spacing:1px;font-family:monospace}' +
      '.support-field .val{font-size:13px;color:#9f8;word-break:break-all;line-height:1.35;font-family:monospace}' +
      '.support-actions{display:flex;gap:8px;margin-top:6px}' +
      '.support-actions button{flex:1;padding:12px 10px;border:none;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer}' +
      '.support-actions .primary{background:linear-gradient(180deg,#0f0,#0a0);color:#000}' +
      '.support-actions .ghost{background:transparent;color:#0f0;border:1px solid rgba(0,255,100,0.35)}' +
      '.support-note{margin-top:12px;font-size:11px;opacity:0.4;text-align:center;line-height:1.45}' +
      '.support-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,40,20,0.95);border:1px solid rgba(0,255,100,0.4);color:#0f0;padding:10px 18px;border-radius:10px;font-size:12px;z-index:290;opacity:0;transition:opacity .25s;pointer-events:none}' +
      '.support-toast.show{opacity:1}';
    document.head.appendChild(s);
  }

  function toast(msg) {
    let t = document.getElementById('support-toast');
    if (!t) {
      t = el('<div id="support-toast" class="support-toast"></div>');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function openSupport() {
    injectStyles();
    let ov = document.getElementById('support-overlay');
    if (!ov) {
      ov = el(
        '<div id="support-overlay" class="hidden"><div class="support-card">' +
          '<h2>APOIAR O PROJETO</h2>' +
          '<p class="sub">Escaneie o QR Code PIX</p>' +
          '<div class="support-qr-wrap"><div class="support-qr">' +
          '<img src="' + PIX_QR_SRC + '" alt="QR Code PIX" width="200" height="200" onerror="this.style.display=\'none\'" />' +
          '</div></div>' +
          '<div class="support-field"><label>INSTRUÇÃO</label><div class="val">Abra o app do banco e escaneie o QR</div></div>' +
          '<div class="support-actions">' +
          '<button type="button" class="primary" id="support-close">FECHAR</button>' +
          '</div><p class="support-note">' + PIX_MSG + '</p></div></div>'
      );
      document.body.appendChild(ov);
      document.getElementById('support-close').onclick = closeSupport;
      ov.addEventListener('click', (e) => { if (e.target === ov) closeSupport(); });
    }
    ov.classList.remove('hidden');
  }

  function closeSupport() {
    const ov = document.getElementById('support-overlay');
    if (ov) ov.classList.add('hidden');
  }

  function injectButton() {
    injectStyles();
    const about = document.getElementById('btn-about');
    const panel = document.querySelector('#main-menu .menu-panel');
    if (!panel || document.getElementById('btn-support')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn secondary';
    btn.id = 'btn-support';
    btn.textContent = 'APOIAR';
    btn.style.borderColor = 'rgba(255,80,120,0.35)';
    btn.style.color = '#f8a';
    if (about) about.parentNode.insertBefore(btn, about);
    else panel.appendChild(btn);
    btn.addEventListener('click', openSupport);
  }

  window.FPVSupport = { open: openSupport, close: closeSupport };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButton);
  else injectButton();
})();
