# FPV Drone Sim

> Simulador de drone **FPV** em 3D no navegador — PC, celular e TV.

[![Three.js](https://img.shields.io/badge/Three.js-0.160-black)](https://threejs.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com/)

---

## Jogar

Abra o site no **Chrome**, **Safari** ou **Edge** (após o deploy na Vercel).

| Plataforma | Como |
|------------|------|
| PC | Mouse, teclado ou controle USB/Bluetooth |
| Celular | Sticks na tela + botões de altura |
| Controle | R1/R2 altura · L1 freio · L2 turbo · L3 pairar |

---

## Controles rápidos

### Altura
| Ação | Touch | Teclado | Gamepad |
|------|-------|---------|---------|
| Subir | botão **SOBE** | PageUp | **R1** |
| Pairar | botão **PARA** | Home | **L3** |
| Descer | botão **DESCE** | PageDown | **R2** |

### Outros
| Ação | Tecla | Gamepad |
|------|-------|---------|
| Freio de ar | **Q** | **L1** |
| Turbo | **E** | **L2** |
| Reset | **R** | — |
| Câmera FPV/3D | **C** | — |
| Modo Acro/Angle | **M** | — |
| Lanterna (noite) | **F** | — |
| VHS | **V** | — |

No **menu**, o D-pad move um cursor; **A** confirma; **B** volta.

---

## Tutorial (novo · 8 passos)

1. Mover os sticks  
2. Subir (~3 m)  
3. Pairar (PARA / L3)  
4. Avançar  
5. Girar (yaw)  
6. Inclinar  
7. Trocar câmera ou modo  
8. Concluir  

Objetivo: aprender o básico em poucos minutos.

---

## Mapas

| Mapa | Destaque |
|------|----------|
| Cidade Abandonada | Casas velhas, carros, postes apagados |
| Cidade Ativa | Prédios, neon, postes acesos |
| Freestyle | Gates e manobras |
| Floresta Noturna | Escuro, lanterna, efeito VHS |
| Racing | Portões de corrida |

Janelas quebráveis · vento no modo Ultra · trincas na câmera ao colidir.

---

## Estrutura do projeto

```text
fpv-drone-sim/
├── index.html          # Interface (menus, HUD)
├── app.js              # Entrada: carrega patches + game-loader
├── game-loader.js      # Core + patches (física, tutorial, mapas)
├── vercel.json         # Deploy
│
├── throttle-control.js # SOBE / PARA / DESCE + ombros do pad
├── drone-realistic.js  # Modelo 3D do drone
├── camera-damage.js    # Trincas / quebra da câmera
├── maps-boost.js       # Mapas detalhados
├── visual-boost.js     # Texturas, luz, céu
├── ultra-mode.js       # Vento + FX Ultra
├── tutorial-boost.js   # Tutorial fácil
├── menu-cursor.js      # Cursor no menu (D-pad)
├── unlock-code.js      # Código secreto
├── ui-fix.js          # Scroll e ajustes de UI
├── shop.js / shop-boot.js / profile.js
│
├── docs/
│   └── CHANGELOG.md    # Histórico das mudanças
└── README.md           # Este arquivo
```

Arquivos antigos de build (`app.part*`, `app.b64*`, etc.) são restos e podem ser ignorados.

---

## Código secreto

No menu principal → campo **CÓDIGO**:

```text
FPV-KING-360
```

---

## Desenvolvimento local

```bash
git clone https://github.com/tsddev016/fpv-drone-sim.git
cd fpv-drone-sim
npx serve .
# ou: python -m http.server 8080
```

---

## Roadmap

- [x] Controles de altura + freio/turbo
- [x] Tutorial fácil (8 passos)
- [x] Mapas + drone detalhado + câmera com dano
- [ ] Modelos `.glb` profissionais
- [ ] App desktop (Electron/Tauri) + instalador
- [ ] APK (Capacitor)

---

## Licença

A definir pelo autor do repositório (**tsddev016**).
