# Layout Visual — Dashboard Smart Parking

## 📱 Visualização da Tela Refatorada

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌─────┐                                                     ┌──────────────┐  │
│  │ ☰   │     [Status: Tempo Real Ativo ● Verde]             │   Dashboard  │  │
│  │ RPT │                                                     ├──────────────┤  │
│  │ ────│                                                     │              │  │
│  │ Histórico                                                 │ Filtro:      │  │
│  │ ────────                                                  │ [Hoje ▾]     │  │
│  │ Ocupação                                                  ├──────────────┤  │
│  │ ────────                                                  │              │  │
│  │ Tempo                                                     │ ╔════════════╗│  │
│  │ Médio                                                     │ ║ Ocupação   ║│  │
│  │ ────────                                                  │ ║ Atual      ║│  │
│  │ Ranking                                                   │ ║ 75% [◐]    ║│  │
│  │ ────────                                                  │ ╚════════════╝│  │
│  │        ◄── SIDEBAR ESQUERDO                              │ +2.3% ↗      │  │
│  │            (Relatórios)                                  │ 17/22 vagas  │  │
│  │                                                           ├──────────────┤  │
│  │                  ┌───────────────────────┐               │              │  │
│  │                  │                       │               │ ╔════════════╗│  │
│  │                  │                       │               │ ║ Entradas   ║│  │
│  │                  │   VISUALIZAÇÃO 3D     │               │ ║ Hoje       ║│  │
│  │                  │   (React Three Fiber) │               │ ║ 45 ⬆️      ║│  │
│  │                  │                       │               │ ║ 6/h média  ║│  │
│  │                  │   Vagas Vermelhas/    │               │ ╚════════════╝│  │
│  │                  │   Verdes em Tempo     │               │ +5.2% ↗      │  │
│  │                  │   Real                │               ├──────────────┤  │
│  │                  │                       │               │              │  │
│  │                  │                       │               │ ╔════════════╗│  │
│  │                  │                       │               │ ║ Horário de ║│  │
│  │                  │                       │               │ ║ Pico       ║│  │
│  │                  │   SignalR: Mqtt →     │               │ ║ 14:00-15:30║│  │
│  │                  │   Backend → 3D        │               │ ║ 92% ocupa. ║│  │
│  │                  │                       │               │ ╚════════════╝│  │
│  │                  │                       │               │              │  │
│  │                  └───────────────────────┘               │ ═════════════│  │
│  │            ▲ Centro da Tela                              │              │  │
│  │        (Mantém propósito original)                       │ Ranking:     │  │
│  │                                                           │ ────────────│  │
│  │                                                           │              │  │
│  │                                                           │ [1] VG-001  │  │
│  │                                                           │ ███████████ 🔥 │  │
│  │                                                           │ Uso: 1200x  │  │
│  │                                                           │ ────────────│  │
│  │                                                           │              │  │
│  │                                                           │ [2] VG-002  │  │
│  │                                                           │ ██████████  ⭐ │  │
│  │                                                           │ Uso: 1155x  │  │
│  │                                                           │ ────────────│  │
│  │                                                           │              │  │
│  │                                                           │ [3] VG-003  │  │
│  │                                                           │ █████████   ⭐ │  │
│  │                                                           │ Uso: 1110x  │  │
│  │                                                           │              │  │
│  │                                                           │ ... 19 mais... │  │
│  │                                                           │              │  │
│  │                                                           │ [22] VG-022 │  │
│  │                                                           │ ██          🧊 │  │
│  │                                                           │ Uso: 10x    │  │
│  │                                                           │ ────────────│  │
│  │                                                           │ Atualizado  │  │
│  │                                                           │ agora       │  │
│  │                                                           └──────────────┘  │
│  │        ◄─ DASHBOARD DIREITO (NOVO)                                         │
│  │            (KPIs + Ranking com Heatmap)                                    │
│  │                                                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Detalhes dos Componentes

### 1. KPI Cards (Topo do Dashboard)

```
┌─────────────────────────────────┐
│ OCUPAÇÃO ATUAL                  │
│                                 │
│  │ 75%     [◐◐◐] ◉              │ ← Donut Chart
│  │ 17/22 vagas +2.3% ↗          │   Cores: Verde/Amarelo/Vermelho
│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ENTRADAS HOJE                   │
│                                 │
│ 45 ⬆️                +5.2% ↗   │
│ Média: 6/h                      │
│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ HORÁRIO DE MAIOR USO            │
│                                 │
│ 14:00 - 15:30 🕘                │
│ Ocupação: 92%                   │
│
└─────────────────────────────────┘
```

### 2. Filtro de Período (Dropdown)

```
┌──────────────────────────────┐
│ Hoje ▾                       │  ← Expandir
└──────────────────────────────┘

EXPANDED:
┌──────────────────────────────┐
│ ✓ Hoje                       │  ← Selecionado (verde)
├──────────────────────────────┤
│   Ontem                      │
├──────────────────────────────┤
│   Última Semana              │
├──────────────────────────────┤
│   Último Mês                 │
└──────────────────────────────┘
```

### 3. Ranking Card com Heatmap

**Conceito de Heatmap Visual**:

```
Vaga MÁS usada:  Opacidade 40%  → Fundo bem visível (azul escuro)
┌──────────────────────────────┐
│ [1] VG-001 🔥                │  ← Rank + Spot + Badge
├──────────────────────────────┤
│ ███████████ 100%             │  ← Barra de progresso (vermelho: >80%)
├──────────────────────────────┤
│ Uso: 1200x  Avg: 45.2 min    │
└──────────────────────────────┘


Vaga média:      Opacidade 25%  → Fundo parcialmente visível
┌──────────────────────────────┐
│ [11] VG-011                  │
├──────────────────────────────┤
│ ██████ 60%                   │   ← Barra de progresso (amarelo: 50-80%)
├──────────────────────────────┤
│ Uso: 600x   Avg: 28.1 min    │
└──────────────────────────────┘


Vaga MENOS usada: Opacidade 10% → Fundo quase transparente
┌──────────────────────────────┐
│ [22] VG-022 🧊               │  ← Rank + Spot + Badge ICE
├──────────────────────────────┤
│ ██ 8%                        │   ← Barra de progresso (verde: <50%)
├──────────────────────────────┤
│ Uso: 10x    Avg: 12.3 min    │
└──────────────────────────────┘
```

**Cores das Barras**:
- 🔴 **Vermelho** (>80%): Muito usada, ocupada frequentemente
- 🟡 **Amarelo** (50-80%): Uso médio
- 🟢 **Verde** (<50%): Pouco usada, geralmente livre

**Badges de Frequência**:
- 🔥 **Fogo**: Top 1 (mais utilizada)
- ⭐ **Estrela**: Top 2-3 (muito utilizada)
- 🧊 **Gelo**: Bottom 3 (menos utilizada)
- _(nenhum)_: Resto das vagas

---

## 🔄 Estados de Interação

### Default (Repouso)
```
Dashboard com dados carregados
Ranking scrollável
Cards em tons cinza/zinc
```

### Hover em KPI Card
```
Card eleva-se 2px
Borda ligeiramente mais clara
Efeito de depth
```

### Hover em Spot Ranking Card
```
Card escala 1.02x
Card translada 4px para direita
Borda de zinc-600 (mais clara)
Fundo heatmap permanece dinâmico
```

### Click em Spot Ranking Card
```
Emite: onSpotClick(spotId, spotNumber)
Console mostra: "Spot clicked from dashboard: VG-001 (spot-VG-001)"
Futuramente: Câmera 3D foca nessa vaga
```

### Hover em Filtered Dropdown
```
Dropdown abre com AnimatePresence
Fade + Scale 0.95 → 1.0
Opções listadas verticalmente
Selecionada: bg-emerald-500/20 (fundo verde)
```

---

## 🎨 Paleta de Cores

```
Background:          #18181B (zinc-900)
Border Base:         #27272A (zinc-700) com opacity 40%
Text Primary:        #FFFFFF
Text Secondary:      #A1A1AA (zinc-400)
Text Tertiary:       #71717A (zinc-500)

KPI Card BG:         Gradient: from-#27272A to-#09090B (com blur)
Hover BG:            #09090B (zinc-900) com borders brighter

Accent Colors:
- Emerald:           #10B981 (trends positivos, preto da UI)
- Red:               #EF4444 (ocupação alta >80%)
- Amber/Yellow:      #F59E0B (ocupação média 50-80%)
- Blue:              #3B82F6 (heatmap base)

Badges:
- Ocupada/Alert:     bg-red-500/20, text-red-400
- Livre/Success:     bg-emerald-500/20, text-emerald-400
```

---

## 📐 Dimensões

```
Dashboard Painel (Right Sidebar):
├─ Width:            384px (w-96)
├─ Height:           100vh (viewport completo)
├─ Padding:          16px (p-4)
├─ Gap entre seções: 20px (space-y-5)
└─ Z-index:          20 (acima 3D, abaixo header)

KPI Card:
├─ Padding:          16px
├─ Border Radius:    12px
├─ Min Height:       ~100px
└─ Max Width:        100%

Spot Ranking Card:
├─ Padding:          12px
├─ Border Radius:    8px
├─ Height:           ~90px
└─ Progress Bar:     h-1.5 (6px)

Donut Chart:
├─ Size:             120px
├─ Radius:           52px (120/2 - 8)
└─ Stroke Width:     8px
```

---

## 🚀 Transições e Animações

```
DashboardPanel Entrada:
├─ Type:          Spring (elastic)
├─ Stiffness:     260
├─ Damping:       26
└─ From → To:     x: 400 → x: 0

KPI Card Hover:
├─ whileHover:    { y: -2 }
└─ Duration:      Instant (Framer Motion default)

Spot Card Hover:
├─ whileHover:    { scale: 1.02, x: 4 }
├─ whileTap:      { scale: 0.98 }
└─ Como:          Por touch/click também

Period Filter Dropdown:
├─ Type:          AnimatePresence
├─ Enter:         opacity: 0 → 1, y: -8 → 0
└─ Exit:          opacity: 1 → 0, y: 0 → -8
```

---

## 📊 Exemplo de Dados em JSON

```json
{
  "kpi": {
    "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
    "parkingLotName": "Estacionamento Central",
    "occupancy": {
      "occupancyPercentage": 75.2,
      "occupiedCount": 17,
      "totalSpots": 22,
      "trend": 2.3
    },
    "entries": {
      "totalEntriesCount": 45,
      "trend": 5.2,
      "averageEntriesPerHour": 6,
      "peakHour": "14:00"
    },
    "peakHour": {
      "hourFrom": "14:00",
      "hourTo": "15:30",
      "occupancyPercentage": 92,
      "entriesCount": 18
    },
    "lastUpdated": "2026-04-07T15:57:31Z"
  },
  "ranking": [
    {
      "rank": 1,
      "spotNumber": "001",
      "spotId": "spot-001",
      "useCount": 1200,
      "maxUseCount": 1200,
      "averageDurationMinutes": 45.2,
      "occupancyRate": 100,
      "status": "Ocupada",
      "frequencyBadge": "🔥"
    },
    ...
  ]
}
```

---

## ✅ Checklist de Funcionalidades

- [x] KPI Cards com valores e tendências
- [x] Gráfico Donut em SVG puro (sem dependências)
- [x] Filtro de período (Hoje, Ontem, Semana, Mês)
- [x] Ranking de vagas com 22 spots
- [x] Heatmap visual (opacidade dinâmica)
- [x] Barras de progresso coloridas
- [x] Badges de frequência (🔥 ⭐ 🧊)
- [x] Scroll customizado (scrollbar fina)
- [x] Animações suaves (Framer Motion)
- [x] Dados mocados para demo
- [x] Callback onSpotClick para interatividade
- [x] Type-safe TypeScript
- [x] Responsivo Tailwind CSS
- [x] Sem dependências extras (recharts, chart.js, etc)

