(function () {
  function polishUI() {
    var btn = document.getElementById('btn-tutorial');
    if (btn) btn.textContent = '📘 TUTORIAL (FÁCIL · 8 PASSOS)';
    var hud = document.getElementById('tutorial-hud');
    if (hud && !document.getElementById('tut-hint-extra')) {
      var extra = document.createElement('div');
      extra.id = 'tut-hint-extra';
      extra.style.cssText = 'font-size:11px;color:rgba(160,200,255,0.75);margin-top:6px;line-height:1.4';
      extra.textContent = 'Dica: no celular use SOBE / PARA / DESCE à direita.';
      var card = hud.querySelector('.card');
      if (card) card.appendChild(extra);
    }
  }
  setInterval(polishUI, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', polishUI);
  else polishUI();
})();
