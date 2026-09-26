# FPV Drone Sim 3D Pro

Simulador FPV de drone 3D completo que roda no navegador (celular e desktop).

## Características

- **Visão FPV realista** com Three.js
- **Física melhorada**: resposta mais precisa, menos "escorregadio", expo e deadzone configuráveis
- **Modos Acro e Angle** (self-level)
- **4 Mapas**: Racing, Freestyle, Campo Aberto e Noturno
- **Customização de drone**: cores, potência, peso e presets (Racer, Freestyle, Cinewhoop...)
- **Controles**:
  - Touch (sticks Mode 2 otimizados)
  - Teclado (WASD + setas)
  - Gamepad USB / Bluetooth (qualquer controle reconhecido como joystick)
- **Menu completo**: Jogar, Mapas, Meu Drone, Configurações
- **Ajustes**: gráficos, FOV, sensibilidade, expo, max rate, deadzone, som
- **Sons** de motor (Web Audio)
- **HUD** com altitude, velocidade, throttle, bateria, FPS e status do pad
- **PWA**: pode instalar no celular (Adicionar à tela inicial)

## Como jogar

1. Abra `index.html` no Chrome / Firefox / Safari (ou use o link do GitHub Pages).
2. Toque em **JOGAR**.
3. No celular: use os dois sticks virtuais.
4. Com controle: só parear Bluetooth ou conectar USB-OTG — o jogo detecta automaticamente.

### Controles (Mode 2)

| Input              | Stick Esquerdo     | Stick Direito      |
|--------------------|--------------------|--------------------|
| Touch / Gamepad    | Throttle / Yaw     | Pitch / Roll       |
| Teclado            | W/S throttle, A/D yaw | Setas pitch/roll |

- **R** ou botão RESET → reinicia posição
- **M** ou botão MODO → troca Acro ↔ Angle
- **Esc** ou MENU → volta ao menu

## Instalação como App (PWA)

1. Abra o site no Chrome (Android) ou Safari (iOS).
2. Menu → **Adicionar à tela inicial** / **Instalar app**.
3. Abra pelo ícone — roda em tela cheia offline.

## Publicação

- GitHub: este repositório
- Pode ser servido por qualquer host estático (GitHub Pages, Netlify, etc.)

## Tecnologias

- Three.js r160
- Web Audio API
- Gamepad API
- Service Worker + Manifest (PWA)
- localStorage para salvar configurações

Feito para treino de FPV no celular e desktop. Divirta-se! 🚁
