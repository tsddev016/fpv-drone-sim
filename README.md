# FPV Drone Sim 3D Pro

Simulador FPV de drone 3D completo — roda no navegador (celular e desktop).

**Arquivo principal:** [`fpv.html`](fpv.html)

## Características

- Visão FPV realista (Three.js)
- Física precisa (menos "escorregadio"), expo e deadzone configuráveis
- Modos **Acro** e **Angle** (self-level)
- 4 mapas: Racing, Freestyle, Campo Aberto, Noturno
- Customização de drone (cores, potência, peso, presets)
- Controles: touch (Mode 2), teclado, gamepad USB/Bluetooth
- Menu completo: Jogar, Mapas, Meu Drone, Configurações
- Sons de motor, HUD com bateria/FPS, PWA instalável

## Como rodar

### Opção 1 — Direto no navegador
Abra o arquivo `fpv.html` no Chrome, Firefox ou Safari.

### Opção 2 — Servidor local (recomendado)
```bash
python fpv.py
```
Isso sobe um servidor em `http://127.0.0.1:8080/fpv.html` e abre o navegador automaticamente.

### Controles (Mode 2)

| Input           | Stick Esquerdo   | Stick Direito   |
|-----------------|------------------|-----------------|
| Touch / Gamepad | Throttle / Yaw   | Pitch / Roll    |
| Teclado         | W/S throttle, A/D yaw | Setas pitch/roll |

- **R** ou botão RESET → reinicia posição  
- **M** ou botão MODO → troca Acro ↔ Angle  
- **Esc** ou MENU → volta ao menu  

## PWA (instalar no celular)

1. Abra `fpv.html` no Chrome (Android) ou Safari (iOS)
2. Menu → **Adicionar à tela inicial** / **Instalar app**
3. Use pelo ícone — funciona offline

## Estrutura

```
fpv-drone-sim/
├── fpv.html        # Página principal do simulador
├── game.js         # Lógica do jogo (Three.js)
├── fpv.py          # Launcher Python (servidor local)
├── manifest.json   # PWA
├── sw.js           # Service Worker
├── icon-192.png
├── icon-512.png
└── README.md
```

## Tecnologias

- Three.js r160
- Web Audio API
- Gamepad API
- Service Worker + Manifest (PWA)
- localStorage (salva configurações)

Feito para treino de FPV. Divirta-se! 🚁
