import * as THREE from 'three';

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }
  // fallback: pako-free pure JS inflate is heavy; show error
  throw new Error('Sem DecompressionStream');
}

async function load() {
  const r = await fetch('./app.zlib.b64.txt');
  if (!r.ok) throw new Error('payload');
  const b64 = (await r.text()).trim();
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const raw = await inflateRaw(bytes);
  let code = new TextDecoder().decode(raw);
  code = code.replace(/^import\s*\*\s*as\s*THREE\s*from\s*['"]three['"]\s*;?\s*/m, '');
  const blob = new Blob([code], { type: 'text/javascript' });
  await import(URL.createObjectURL(blob));
  const el = document.getElementById('loading');
  if (el) { el.classList.add('hidden'); el.dataset.done = '1'; }
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
