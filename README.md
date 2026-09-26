# FPV Drone Sim 3D Pro

Simulador FPV de drone **no navegador**. Funciona no celular, PC e Smart TV.

## Jogar

Depois do deploy na Vercel, abra o link no Chrome / Safari.

## Deploy na Vercel (2 minutos)

1. Entre em [vercel.com](https://vercel.com) com a conta GitHub
2. **Add New Project** → importe o repo `tsddev016/fpv-drone-sim`
3. Framework: Other (ou deixe automático)
4. Clique **Deploy**

A Vercel gera um link tipo `https://fpv-drone-sim-xxx.vercel.app`

## Controles

| Input | Esquerdo | Direito |
|-------|----------|--------|
| Touch / Gamepad | Throttle / Yaw | Pitch / Roll |
| Teclado | W/S + A/D | Setas |

- **R** = Reset | **M** = Acro/Angle | **Esc** = Menu

## Arquivos

- `index.html` — interface + menus
- `app.js` — física e jogo (Three.js)
- `vercel.json` — config Vercel

Só precisa do navegador. Sem APK, sem Python, sem instalador.
