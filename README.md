# ZYRO — O futuro não espera. Corra!

Endless runner de 3 faixas feito **só com HTML, CSS e JavaScript** para a disciplina
Desenvolvimento Front-end (Análise e Desenvolvimento de Sistemas · Senac).
Sem servidor, sem banco de dados, sem login, sem bibliotecas externas.

## Como jogar

1. Abra o arquivo **`index.html`** no navegador (duplo clique já funciona, não precisa de servidor).
2. Clique em **JOGAR**.

| Ação | Computador | Celular |
|---|---|---|
| Faixa à esquerda / direita | ← → ou A D | Deslizar o dedo para os lados |
| Pular | ↑ ou W | Deslizar para cima |
| Deslizar | ↓ ou S | Deslizar para baixo |
| ZYRO SHIFT | Shift | Botão **Z** na tela |
| Pausar | Esc ou P | Botão de pausa |

**ZYRO SHIFT:** a barra enche ao coletar ZYRO CORES (+2%), fazer desvios perfeitos (+5%) e
desviar por pouco (+8%). Em 100%, aperte Shift: por 5 segundos você atravessa obstáculos e
ganha +100 pontos por obstáculo.

## O que está funcionando

- Pista de 3 faixas em perspectiva pseudo-3D (Canvas 2D).
- Velocidade em medidas: começa em 100 e sobe +25 a cada 500 m, até 1000 (100 medidas = 12 m/s; 1000 = 120 m/s, aos 18 km).
- ZYRO desenhado e animado: corrida, troca de faixa, pulo, deslize, SHIFT, colisão e comemoração.
- 5 obstáculos (barreira vermelha, baixa, elevada, bloco energético, portão de energia) e sequências combinadas.
- Gerador de obstáculos justo: toda fileira tem rota possível e tempo mínimo de reação; perto de carros estacionados ninguém fica encurralado.
- Colisão real por faixa, profundidade e altura.
- ZYRO CORES (dourado e Super Core azul), ímã, coleta com brilho e "pulo" no HUD.
- Pontuação por distância, cores, desvios perfeitos, combos (x2, x3) e SHIFT; mensagens PERFECT!, AWESOME!, COMBO, SHIFT READY!, NEW RECORD!.
- ZYRO SHIFT funcionando de verdade (não é só efeito visual).
- Power-ups: Magnet Core, Shield, Score Boost e **Jetpack**.
- **Tráfego aéreo na contramão:** carros voadores surgem ao fundo e vêm em alta velocidade na direção do Zyro
  (buzinam quando estão perto na sua faixa). O carro rosa vem baixo: troque de faixa. O carro violeta vem alto:
  deslize por baixo. Batida de frente = fim de corrida (o Shield protege uma vez).
- **Carros estacionados e rampas:** vans voadoras paradas no ar ocupam uma faixa. Com rampa amarela, o Zyro sobe
  sozinho para o teto e corre por cima (com cores no caminho); sem rampa, a frente e as laterais bloqueiam.
  Do teto dá para pular para a faixa do lado. Com SHIFT ou Shield, bater na van joga o Zyro para o teto.
- **Jetpack:** decola para 9 m de altura, voa 40% mais rápido por 9 s por cima de tudo, segue uma trilha de cores
  no céu e, no fim, descarta o propulsor e desce suave numa área sem obstáculos (com 1,2 s de proteção).
- 3 zonas com visual próprio: Nova City (0 m), Sky District (1.500 m) e Hyper Core (3.000 m).
- 7 telas: Menu, Como jogar, Gameplay, Pausa, Game Over, Recordes e Configurações.
- Recordes, estatísticas, histórico e configurações salvos no navegador (localStorage).
- Sons e música gerados com a Web Audio API (nenhum arquivo de áudio).
- Configurações: volume dos efeitos, música, redução de animações, qualidade gráfica, ajuda e apagar dados.
- Responsivo: desktop, notebook, tablet e celular (em pé e deitado).

## Testes automáticos

Abra **`testes.html`** (ou `index.html?testes=1`, ou `index.html#testes`). A página roda os **18 testes obrigatórios do
roteiro** + 5 extras + 3 das novas mecânicas (contramão, carros com rampa e Jetpack), clicando nos botões de verdade, e mostra o resultado. Seus recordes são
guardados antes e restaurados depois.

Dica para apresentar: `index.html?debug=1` mostra FPS, velocidade e as caixas de colisão.

## Estrutura

```
zyro/
├── index.html            ← todas as telas + <canvas>
├── testes.html           ← abre os testes automáticos
├── css/
│   ├── tokens.css        ← cores, fontes, espaçamentos (Design System do Figma)
│   ├── componentes.css   ← botões, HUD, barra SHIFT, controles
│   └── telas.css         ← layout das 7 telas + celular
├── js/
│   ├── config.js         ← TODAS as regras e números do jogo (balanceamento)
│   ├── main.js           ← inicia tudo e roda o laço principal
│   ├── core/             ← utils, storage (localStorage), audio, input (teclado/toque)
│   ├── game/             ← regras: player, lanes, obstacles, collision, collectibles,
│   │                        score, shift, progression, game
│   ├── render/           ← desenho: camera (projeção 3D), scenery, sprites, vehicles (carros voadores), character, effects, renderer
│   └── ui/               ← art (SVGs), hud, screens (menus)
├── testes/               ← bot.js (jogador automático) e testes.js
└── assets/fonts/         ← Exo 2 e Space Grotesk (licença SIL OFL)
```

A lógica do jogo (`js/game`) não desenha nada: ela só simula e avisa por eventos (`ZYRO.Bus`).
O desenho (`js/render`) e a interface (`js/ui`) escutam esses eventos. Por isso dá para testar as
regras sem a tela.

## Como ajustar

Quase tudo está em `js/config.js`: velocidade inicial e máxima, distância das zonas, duração do
SHIFT, pontos de cada ação, tempo entre obstáculos, duração dos power-ups.
