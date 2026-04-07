# Dashboard Profissional de Relatórios — Smart Parking IoT

## 📋 Visão Geral

O Dashboard foi completamente refatorado para oferecer uma interface profissional e intuitiva com **KPIs de resumo**, **heatmap de vagas** e **filtros de período**. O painel fica fixo no lado direito da tela, mantendo a visão 3D central intacta.

---

## 🎨 Arquitetura do Componente

```
DashboardPanel.tsx (Componente Principal)
├── Header com Filtro de Período
├── KPI Section (3 Cards)
│   ├── KpiCard #1: Ocupação Atual (com gráfico Donut)
│   ├── KpiCard #2: Entradas Hoje
│   └── KpiCard #3: Horário de Pico
├── Divider
├── Ranking Section (com scroll)
│   └── SpotRankingCard (22x com Heatmap)
└── Footer com Timestamp
```

---

## 🚀 Componentes Criados

### 1. **DashboardPanel.tsx** (Componente Principal)
- **Localização**: `/app/src/components/ui/DashboardPanel.tsx`
- **Responsabilidades**:
  - Gerenciar estado do período de tempo selecionado
  - Carregar dados (atualmente mockados, preparado para API real)
  - Renderizar KPIs e Ranking dinamicamente
  - Expor callback `onSpotClick` para interatividade com 3D

**Props**:
```typescript
interface DashboardPanelProps {
  parkingLotId: string;
  onSpotClick?: (spotId: string, spotNumber: string) => void;
}
```

### 2. **Componentes Auxiliares**

#### `KpiCard`
- Card minimalista com ícone, valor, unidade e tendência
- Suporta conteúdo customizado (ex: gráfico donut)
- Animação hover (eleva-se ao passar mouse)

#### `SpotRankingCard`
- Card individual para cada vaga com:
  - **Heatmap Visual**: Fundo com gradiente de transparência (10-40% opacity) baseado em frequência de uso
  - **Barra de Progresso**: Horizontal fina que indica % de uso relativo
  - **Badges de Frequência**: 🔥 (top 1), ⭐ (top 3), 🧊 (bottom 3)
  - **Status Badge**: Red/Emerald chip mostrando "Ocupada" ou "Livre"
  - **Estatísticas**: Uso total e duração média
  - **Interatividade**: Click para chamar `onSpotClick()`

#### `DonutChart`
- Gráfico de rosca SVG puro (sem dependências)
- Cores dinâmicas: Vermelho (>80%), Amarelo (50-80%), Verde (<50%)
- Animação: Transição suave ao atualizar dados

#### `PeriodFilter`
- Dropdown com 4 presets: Hoje, Ontem, Última Semana, Último Mês
- Estado local com AnimatePresence (Framer Motion)
- Atualiza KPIs ao selecionar período

---

## 📊 Dados Mocados (Stubs)

### `generateMockKpiData(period: TimePeriod)`
Gera dados KPI com variações baseadas no período selecionado:

```typescript
{
  occupancyPercentage: 75 ± 10,      // Entre 65% e 85%
  occupiedCount: ~17,
  totalSpots: 22,
  trend: -10 a +10,                   // Percentual de mudança
  totalEntriesCount: 45 (hoje) / 42 (ontem) / 287 (semana) / 1050 (mês),
  averageEntriesPerHour: 6,
  peakHour: "14:00",
  peakHourRange: "14:00 - 15:30",
  peakOccupancyPercentage: 92,
  peakEntriesCount: 18
}
```

### `generateMockRankingData()`
Gera 22 vagas com dados realistas:

```typescript
[
  {
    rank: 1,
    spotNumber: "001",
    useCount: 1200,                   // Mais usada
    occupancyRate: 100%,
    frequencyBadge: "🔥",             // Fire para #1
    status: "Ocupada" | "Livre",
    averageDurationMinutes: 45.5
  },
  // ... 21 mais vagas com useCount decrescente
  {
    rank: 22,
    spotNumber: "022",
    useCount: 10,                     // Menos usada
    occupancyRate: 8%,
    frequencyBadge: "🧊",             // Ice para bottom 3
    status: "Livre",
    averageDurationMinutes: 12.3
  }
]
```

---

## 🎯 Interfaces TypeScript

Adicionadas em `/app/src/types/parking.ts`:

```typescript
// Enum para períodos de tempo
export enum TimePeriod {
  Today = "today",
  Yesterday = "yesterday",
  LastWeek = "lastWeek",
  LastMonth = "lastMonth",
}

// KPI de Ocupação
export interface KpiOccupancy {
  occupancyPercentage: number;     // 0-100
  occupiedCount: number;
  totalSpots: number;
  trend: number;                    // Percentual de mudança
}

// KPI de Entradas
export interface KpiEntries {
  totalEntriesCount: number;
  trend: number;
  averageEntriesPerHour: number;
  peakHour: string;                 // "14:00"
}

// KPI de Horário de Pico
export interface KpiPeakHour {
  hourFrom: string;                 // "14:00"
  hourTo: string;                   // "15:30"
  occupancyPercentage: number;
  entriesCount: number;
}

// Container principal de KPI
export interface ParkingLotOverviewKpi {
  parkingLotId: string;
  parkingLotName: string;
  occupancy: KpiOccupancy;
  entries: KpiEntries;
  peakHour: KpiPeakHour;
  lastUpdated: string;              // ISO timestamp
}

// Vaga com dados para ranking
export interface SpotRankingItemDetailed {
  rank: number;
  spotNumber: string;
  spotId: string;
  useCount: number;
  maxUseCount: number;              // Para normalizar heatmap
  averageDurationMinutes: number;
  occupancyRate: number;            // 0-100
  status: string;
  frequencyBadge: "🔥" | "⭐" | "🧊" | "";
}

// Agregação dos dados
export interface DashboardData {
  kpi: ParkingLotOverviewKpi;
  ranking: SpotRankingItemDetailed[];
}
```

---

## 🎨 Design e Estilo

### Cores e Temas
- **Fundo**: `bg-zinc-900` com `backdrop-blur-lg` para efeito de vidro
- **Borders**: Gradientes de `zinc-700` com opacidade reduzida
- **KPI Cards**: Gradiente `from-zinc-800 to-zinc-900` com `backdrop-blur-sm`
- **Heatmap Vagas**: Gradiente azul com opacidade dinâmica

### Animações
- **Entrada do Painel**: Spring animation (elastic bounce)
- **KPI Cards**: Hover eleva-se 2px
- **Ranking Cards**: Hover escala 1.02x e translada 4px para direita
- **Dropdown Período**: AnimatePresence com fade + scale
- **Scroll Customizado**: Scrollbar fina (4px) em zinc/transparent

### Responsividade
- **Largura**: Fixed 384px (w-96)
- **Altura**: Viewport completo com overflow-y-auto
- **Layout Interior**: Flex coluna com gap-5 para espaçamento
- **Z-index**: 20 (acima da visão 3D, abaixo do center status bar)

---

## 🔌 Integração com Aplicação

### 1. **page.tsx** - Modificações
```tsx
// Novo import
import { DashboardPanel } from '../components/ui/DashboardPanel';

// Novo JSX no return
<div className="absolute inset-y-0 right-0 z-20">
  <DashboardPanel 
    parkingLotId={PARKING_LOT_ID}
    onSpotClick={(spotId, spotNumber) => {
      console.log(`Spot clicked: ${spotNumber}`);
      // TODO: Focar câmera 3D aqui
    }}
  />
</div>
```

### 2. **Substituição de Dados Mocados por API Real**

Quando a API backend estiver pronta:

```typescript
// Em DashboardPanel.tsx, substituir generateMockKpiData() por:
const kpiResponse = await ApiService.getKpiOverview(parkingLotId, timePeriod);
const rankingResponse = await ApiService.getSpotRanking(parkingLotId, timePeriod);
```

Métodos necessários no ApiService:
```typescript
// Em services/api.ts
static async getKpiOverview(
  parkingLotId: string, 
  period: TimePeriod
): Promise<ParkingLotOverviewKpi> { ... }

static async getSpotRanking(
  parkingLotId: string, 
  period: TimePeriod
): Promise<SpotRankingItemDetailed[]> { ... }
```

---

## 📈 Fluxo de Dados

```
DashboardPanel (Component State)
    │
    ├─ timePeriod (TimePeriod) ────────────────┐
    │                                           │
    └─ useEffect([timePeriod, parkingLotId])   │
         │                                      │
         └─ Chama loadData()                   │
              │                                 │
              ├─ kpiData (ParkingLotOverviewKpi) 
              │  (atualmente mockado)          │
              │                                │
              ├─ rankingData (SpotRankingItemDetailed[])
              │  (atualmente mockado)          │
              │                                │
              └─ Renderiza componentes ◄───────┘
```

---

## 🧪 Testes / Validação Manual

### ✅ Verificar KPI Cards
1. Abrir aplicação: `npm run dev`
2. Dashboard deve aparecer no lado direito com 3 cards
3. Valores dos cards devem ser preenchidos com dados mockados
4. Hover no card deve elevar-se 2px

### ✅ Verificar Gráfico Donut
1. O donut no Card #1 (Ocupação) deve ter cor dinâmica:
   - Verde: <50%
   - Amarelo: 50-80%
   - Vermelho: >80%

### ✅ Verificar Filtro de Período
1. Clicar no dropdown "Hoje" deve abrir menu
2. Selecionar "Última Semana" deve:
   - Fechar dropdown
   - Recarregar dados (loading spinner)
   - KPIs devem mostrar novos valores (mais entradas, etc)

### ✅ Verificar Ranking Heatmap
1. Vaga #1 deve ter fundo azul opaco (40% opacity)
2. Vaga #22 deve ter fundo quase transparente (10% opacity)
3. Barras de progresso devem variar de tamanho
4. Top 1 deve ter 🔥, top 3 com ⭐, bottom 3 com 🧊

### ✅ Verificar Scroll
1. Ranking pode ter ~22 cartas
2. Deve ser scrollável verticalmente
3. Scrollbar deve ser fina e discreta

### ✅ Verificar Interatividade
1. Clicar em um card de vaga no ranking
2. Console deve mostrar: `Spot clicked from dashboard: 001 (spot-001)`
3. No futuro: Câmera 3D deve focar nessa vaga

---

## 📁 Estrutura de Arquivos

```
app/src/
├── types/
│   └── parking.ts                    // ✨ Atualizado com novos tipos
├── components/
│   └── ui/
│       ├── DashboardPanel.tsx        // ✨ NOVO (380 linhas completas)
│       ├── ReportPanel.tsx           // Existente (modal de relatórios)
│       └── Sidebar.tsx               // Existente (menu lateral esquerda)
├── services/
│   └── api.ts                        // Pronto para adicionar getKpiOverview, getSpotRanking
└── app/
    └── page.tsx                      // ✨ Atualizado para incluir DashboardPanel
```

---

## 🔮 Próximas Etapas

### 1. **Backend - Implementar Endpoints de KPI**
- `GET /api/kpi/overview?parkingLotId=&period=` → ParkingLotOverviewKpi
- `GET /api/ranking/spots?parkingLotId=&period=` → SpotRankingItemDetailed[]

### 2. **Integração Real com API**
- Remover `generateMockKpiData()` e `generateMockRankingData()`
- Chamar ApiService methods em `useEffect`

### 3. **Focar Câmera 3D em Vaga**
- Implementar `onSpotClick` callback em `page.tsx`
- Usar Three.js camera controls para focar spot selecionado

### 4. **Atualização em Tempo Real (SignalR)**
- Subscrever `/hub/KpiUpdated` para receber atualizações live
- Atualizar KPIs sem recarregar página

### 5. **Exportar Dados / Relatórios**
- Botão para download de PDF com dados do período selecionado
- Integração com biblioteca como jsPDF + html2canvas

###  **Modo Dark/Light (Opcional)**
- Context provider para tema
- Implementar toggle no header do dashboard

---

## ✨ Destaques da Implementação

✅ **Sem Dependências Extras**: Gráfico Donut é SVG puro, sem recharts  
✅ **Type-Safe**: Toda a tipagem em TypeScript  
✅ **Totalmente Mockado**: Pronto para swapping com API real  
✅ **Animações Profissionais**: Framer Motion para transições suaves  
✅ **Responsivo**: Tailwind CSS com layout flexível  
✅ **Acessível**: Semântica HTML correta, labels descritivos  
✅ **Performance**: Memoization onde apropriado, callback refs otimizados  

---

## 📞 Suporte

Para integrar com sua API real ou adicionar novas features:

1. Definir DTOs no backend .NET correspondentes aos tipos TypeScript
2. Criar endpoints REST que retornem esses DTOs
3. Adicionar métodos no `ApiService` frontend
4. Substituir calls aos `generateMock*()` pelos calls reais
5. Testar com dados reais do banco MySQL

