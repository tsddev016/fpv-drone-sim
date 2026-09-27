import * as THREE from 'three';
const parts = 6;
async function load() {
  const chunks = [];
  for (let i = 0; i < parts; i++) {
    const r = await fetch('./app.b64.' + i + '.txt');
    if (!r.ok) throw new Error('part ' + i);
    chunks.push(await r.text());
  }
  const b64 = chunks.join('');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let code = new TextDecoder().decode(bytes);
  code = code.replace(/^import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?\s*/m, '');
  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
  setTimeout(() => {
    const el = document.getElementById('loading');
    if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
  }, 300);
}
load().catch(e => {
  console.error(e);
  const el = document.getElementById('loading');
  if (el) el.innerHTML = '<div style="color:#0f0;padding:24px;text-align:center;font-family:system-ui">Falha ao carregar.<br><button onclick="location.reload()" style="margin-top:12px;padding:10px 16px;border:none;border-radius:8px;background:#0f0;color:#000;font-weight:700">Tentar de novo</button></div>';
});
setTimeout(() => {
  const el = document.getElementById('loading');
  if (el && !el.classList.contains('hidden')) { el.classList.add('hidden'); el.dataset.done = '1'; }
}, 8000);
