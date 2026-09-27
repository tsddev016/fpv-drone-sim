# FPV Drone Sim — Simulador FPV no navegador

Simulador de drone **FPV** em 3D no browser (Three.js).  
Funciona em **PC**, **celular** e **Smart TV** pelo navegador.

**Jogar:** após o deploy na Vercel, abra o link no Chrome / Safari / Edge.

---

## Índice

1. [Como jogar](#como-jogar)
2. [Controles](#controles)
3. [Mapas](#mapas)
4. [Sistemas do jogo](#sistemas-do-jogo)
5. [Loja e customização](#loja-e-customização)
6. [Qualidade / modo Ultra](#qualidade--modo-ultra)
7. [Código secreto](#código-secreto)
8. [Arquitetura dos arquivos](#arquitetura-dos-arquivos)
9. [Histórico de atualizações](#histórico-de-atualizações)
10. [Roadmap PC / instalador / mobile](#roadmap-pc--instalador--mobile)
11. [Desenvolvimento](#desenvolvimento)

---

## Como jogar

1. Abra o site no navegador.
2. No menu principal: **VOAR AGORA** (ou modo caminhada / tutorial).
3. Escolha o **mapa** e inicie a sessão.
4. Use sticks na tela, teclado ou **controle USB/Bluetooth**.

### Atalhos rápidos

| Tecla | Ação |
|-------|------|
| **R** | Reset do drone |
| **M** | Alterna ACRO / ANGLE |
| **C** | Câmera FPV / 3D |
| **F** | Lanterna (mapa noturno) |
| **V** | Liga/desliga efeito VHS |
| **Q** | Freio de ar (segure) |
| **E** | Turbo (segure) |
| **PageUp / Home / PageDown** | Sobe / Para / Desce |
| **Esc** | Menu |

---

## Controles

### Touch (celular)

- **Stick esquerdo:** movimento / yaw (modo arcade)
- **Stick direito:** pitch / roll
- **3 botões de altura (direita):** SOBE · PARA · DESCE

### Teclado (PC)

- **WASD / setas:** movimento e inclinação
- **PageUp / Home / PageDown:** altura

### Gamepad (recomendado)

| Botão | Função |
|-------|--------|
| **R1** | Sobe |
| **R2** | Desce |
| **L3** (clique stick esquerdo) | **PARA** (neutro / paira) |
| **L1** | **Freio de ar** (segura) — *não* sobe/desce |
| **L2** | **Turbo** (segura) — *não* sobe/desce |
| **D-pad / stick esquerdo** | No **menu**: move o **cursor** na tela |
| **A / botão 0** | Confirma no menu |
| **B / botão 1** | Voltar no menu |

> **Importante:** L1 e L2 **não** controlam altura. Só R1/R2/L3 e os botões na tela.

---

## Mapas

| ID | Nome | Conteúdo |
|----|------|----------|
| `abandoned` | **Cidade Abandonada** | Casas deterioradas, carros enferrujados, postes apagados |
| `city` | **Cidade Ativa** | Prédios, casas, carros, postes acesos, neon |
| `freestyle` | **Freestyle** | Estruturas + gates para manobra |
| `forest_night` | **Floresta Noturna** | Árvores densas, cabanas iluminadas, **lanterna**, **VHS** |
| `racing` | **Racing** | Gates de corrida |

### Interações nos mapas

- **Janelas quebráveis:** colidir com o vidro → estilhaços.
- **Floresta noturna:** botão de lanterna ou tecla **F**; tecla **V** (VHS).

---

## Sistemas do jogo

### Física de voo

- Modo **ACRO** (padrão): rates altos, 360° / flips.
- Modo **ANGLE**: limita inclinação.
- **Altura bipolar em 3 estados:** SOBE / PARA / DESCE (não sobe sozinho no neutro).
- **Realismo:**
  - Cambalhota → perde velocidade
  - Mergulho → ganha velocidade
  - Subida → perde velocidade horizontal
  - **Vento** (mais forte no Ultra)
  - **Freio L1** / **Turbo L2**

### Câmera (dano)

- Cada batida (chão ou objeto) → **trinca** na lente (`CAM 1/5` … `5/5`).
- **5ª batida** → câmera quebra → reset automático.
- Impacto em alta velocidade (~36 km/h / ~10 m/s) → quebra **na hora**.
- Overlay visual de rachaduras na tela.

Arquivo: `camera-damage.js`.

### Modelo 3D do drone

Modelo procedural detalhado:

- Placas de carbono, FC, ESCs
- Bateria LiPo + XT60 + cintas
- Braços em X, motores com bell, hélices 2 pás girando
- Câmera FPV inclinada + lente
- Antena SMA, LEDs frente/trás
- **Figurinhas** (texturas canvas): stripe, X, número 7, caveira, chama, xadrez

Arquivo: `drone-realistic.js`.

### Loja / perfil

- Customização de cores do drone e personagem.
- Código de desbloqueio no menu.
- Scroll nos menus (mouse e touch).

---

## Qualidade / modo Ultra

Em **Configurações → Qualidade** existe a opção:

**Ultra (vento + FX)**

- Vento dinâmico + indicador na HUD
- Bloom / god rays / grain
- Sombras mais suaves e materiais com mais contraste
- Tone mapping ACES

> Ray tracing real de GPU no browser é limitado; o Ultra usa iluminação + pós-processamento + vento.

---

## Código secreto

No **menu principal**, campo **CÓDIGO**:

```text
FPV-KING-360
```

Desbloqueia itens da loja / perfil.

---

## Arquitetura dos arquivos

| Arquivo | Função |
|---------|--------|
| `index.html` | UI, menus, HUD, CSS base |
| `app.js` | Loader: scripts de patch + `game-loader.js` |
| `game-loader.js` | Baixa o core e aplica patches |
| `throttle-control.js` | Altura + R1/R2/L1/L2/L3 |
| `drone-realistic.js` | Modelo 3D + figurinhas |
| `camera-damage.js` | Trincas / quebra de câmera |
| `maps-boost.js` | Mapas, vidro, lanterna, VHS |
| `ultra-mode.js` | Ultra, vento, FX |
| `menu-cursor.js` | Cursor D-pad nos menus |
| `unlock-code.js` | Código secreto |
| `ui-fix.js` | Scroll, HUD settings |
| `shop.js` / `shop-boot.js` | Loja 3D |
| `profile.js` | Perfil / progresso |
| `vercel.json` | Deploy Vercel |

O **core** de física/render é carregado de um commit fixo e **patchado em runtime** por `game-loader.js`.

---

## Histórico de atualizações

### Controles e altura
- [x] 3 botões de altura (SOBE / PARA / DESCE)
- [x] Neutro real (não sobe sozinho)
- [x] R1 sobe · R2 desce · L3 para
- [x] L1 freio · L2 turbo (separados da altura)
- [x] Inversão de sticks corrigida
- [x] Cursor no menu com D-pad
- [x] Scroll em config/loja

### Física e câmera
- [x] ACRO com 360° / rates altos
- [x] Perda de speed no flip; ganho no mergulho
- [x] Trinca de câmera (5 hits / quebra em alta velocidade)
- [x] Reset automático ao quebrar a câmera

### Visual e mapas
- [x] Modelo de drone realista (procedural)
- [x] Figurinhas com textura
- [x] Mapas: abandonada, cidade, freestyle, floresta noturna, racing
- [x] Janelas quebráveis
- [x] Lanterna + VHS na floresta noturna
- [x] Modo Ultra (vento, FX, sombras)

### Meta / loja
- [x] Código de desbloqueio
- [x] HUD customizável
- [x] README completo

---

## Roadmap PC / instalador / mobile

### Agora (navegador)
Foco atual: **web** (Vercel) — zero instalação.

### Próximo — PC (instalador)
1. **Electron** ou **Tauri** com o mesmo HTML/JS
2. Ou servidor local em **Python** + janela
3. Instalador (Inno Setup / NSIS) extrai HTML, JS, assets, modelos, figurinhas

Estrutura futura sugerida:

```text
desktop/
  main.js
  package.json
  installer/
assets/
  stickers/
  models/
  textures/
```

### Depois — Android (APK)
- Capacitor ou TWA a partir do build web
- APK com assets offline

### TV
- Browser da TV ou Android TV com o mesmo pacote web

---

## Desenvolvimento

```bash
git clone https://github.com/tsddev016/fpv-drone-sim.git
cd fpv-drone-sim
npx serve .
# ou: python -m http.server 8080
```

Abra `http://localhost:8080`. Deploy: Vercel + `vercel.json`.

---

## Créditos

- Three.js — render 3D
- Repo: `tsddev016/fpv-drone-sim`
