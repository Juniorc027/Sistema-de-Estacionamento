# ⚡ Quick Reference — Dashboard Smart Parking

## 🎯 Em 30 Segundos

Novo **Dashboard no painel direito** com:
- 3 KPI Cards (Ocupação, Entradas, Pico)
- Gráfico Donut em SVG
- Ranking de 22 vagas com Heatmap
- Filtro de período (Hoje/Semana/Mês)
- Totalmente mockado, pronto para API real

---

## 📁 Arquivos Principais

```
app/src/
├── components/ui/DashboardPanel.tsx      ← NOVO (400 linhas)
├── types/parking.ts                       ← ATUALIZADO (+100 tipos)
└── app/page.tsx                           ← ATUALIZADO (integração)
```

---

## 🚀 Usar Agora (Mockado)

```bash
cd app
npm run dev
# Abrir http://localhost:3000
# Dashboard aparece no lado direito ✅
```

---

## 🔗 Integrar com API Real (3 Passos)

### Passo 1: Backend .NET — Endpoints
```csharp
[ApiController]
[Route("api/[controller]")]
public class KpiController : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<ParkingLotOverviewKpiDto>> GetOverview(
        [FromQuery] Guid parkingLotId,
        [FromQuery] string period = "today")
    {
        // Chamar ReportService, retornar KPIs agregados
    }

    [HttpGet("ranking")]
    public async Task<ActionResult<List<SpotRankingItemDetailedDto>>> GetRanking(
        [FromQuery] Guid parkingLotId,
        [FromQuery] string period = "today")
    {
        // Chamar ReportService, retornar ranking de vagas
    }
}
```

### Passo 2: Frontend — ApiService
```typescript
// app/src/services/api.ts
export class ApiService {
  static async getKpiOverview(
    parkingLotId: string,
    period: TimePeriod
  ): Promise<ParkingLotOverviewKpi> {
    const response = await fetch(
      `${this.API_BASE_URL}/kpi/overview?parkingLotId=${parkingLotId}&period=${period}`
    );
    return response.json();
  }

  static async getSpotRanking(
    parkingLotId: string,
    period: TimePeriod
  ): Promise<SpotRankingItemDetailed[]> {
    const response = await fetch(
      `${this.API_BASE_URL}/kpi/ranking?parkingLotId=${parkingLotId}&period=${period}`
    );
    return response.json();
  }
}
```

### Passo 3: DashboardPanel — Usar API
```typescript
// Em DashboardPanel.tsx, substituir generateMock*():
useEffect(() => {
  const loadData = async () => {
    const kpiResponse = await ApiService.getKpiOverview(parkingLotId, timePeriod);
    const rankingResponse = await ApiService.getSpotRanking(parkingLotId, timePeriod);
    setKpiData(kpiResponse);
    setRankingData(rankingResponse);
  };
  loadData();
}, [timePeriod, parkingLotId]);
```

---

## 📊 Dados Mockados (Exemplo)

```typescript
// KPI
{
  occupancyPercentage: 75.2,
  occupiedCount: 17,
  totalSpots: 22,
  trend: +2.3,
  totalEntriesCount: 45,
  peakHour: "14:00",
  lastUpdated: "2026-04-07T15:57:31Z"
}

// Ranking Item
{
  rank: 1,
  spotNumber: "001",
  useCount: 1200,
  occupancyRate: 100,
  frequencyBadge: "🔥",
  status: "Ocupada"
}
```

---

## 🎨 Componentes Principais

### DashboardPanel
```typescript
<DashboardPanel 
  parkingLotId={PARKING_LOT_ID}
  onSpotClick={(spotId, spotNumber) => {
    console.log(`Spot: ${spotNumber}`);
    // Futuramente: focar câmera 3D
  }}
/>
```

### KpiCard (Reutilizável)
```tsx
<KpiCard
  title="Ocupação Atual"
  value={75}
  unit="%"
  icon={Users}
  trend={+2.3}
  chart={<DonutChart percentage={75} />}
/>
```

### SpotRankingCard (Com Heatmap)
```tsx
<SpotRankingCard
  spot={{
    rank: 1,
    spotNumber: "001",
    useCount: 1200,
    occupancyRate: 100,
    frequencyBadge: "🔥"
  }}
  onClick={() => handleSpotClick(spotId, spotNumber)}
/>
```

### PeriodFilter (Dropdown)
```tsx
<PeriodFilter 
  selected={TimePeriod.Today}
  onChange={(period) => setTimePeriod(period)}
/>
```

---

## 🎯 Props e Interfaces

### TimePeriod
```typescript
enum TimePeriod {
  Today = "today",
  Yesterday = "yesterday",
  LastWeek = "lastWeek",
  LastMonth = "lastMonth"
}
```

### DashboardPanel Props
```typescript
interface DashboardPanelProps {
  parkingLotId: string;
  onSpotClick?: (spotId: string, spotNumber: string) => void;
}
```

### ParkingLotOverviewKpi
```typescript
interface ParkingLotOverviewKpi {
  parkingLotId: string;
  parkingLotName: string;
  occupancy: KpiOccupancy;
  entries: KpiEntries;
  peakHour: KpiPeakHour;
  lastUpdated: string;
}
```

### SpotRankingItemDetailed
```typescript
interface SpotRankingItemDetailed {
  rank: number;
  spotNumber: string;
  spotId: string;
  useCount: number;
  maxUseCount: number;
  averageDurationMinutes: number;
  occupancyRate: number; // 0-100
  status: string;
  frequencyBadge: "🔥" | "⭐" | "🧊" | "";
}
```

---

## 🎨 Cores e Estilos

```css
/* Background */
bg-zinc-900      /* #18181B */
bg-zinc-800      /* #27272A */
bg-zinc-700      /* #3F3F46 */

/* Text */
text-white       /* #FFFFFF */
text-zinc-400    /* #A1A1AA */
text-zinc-500    /* #71717A */

/* Status */
🔴 red-500       /* >80% ocupação */
🟡 amber-500     /* 50-80% ocupação */
🟢 emerald-500   /* <50% ocupação */

/* Cards */
from-zinc-800 to-zinc-900
backdrop-blur-lg
border border-zinc-700/40
```

---

## 🧪 Teste Rápido

```bash
# Terminal 1
cd app && npm run dev

# Abrir http://localhost:3000 no navegador
# F12 (DevTools) → Console

# Clicar em uma vaga do ranking
# ✅ Esperado: Log "[Home] Spot clicked from dashboard: VG-001 (spot-VG-001)"

# Clicar no filtro "Última Semana"
# ✅ Esperado: Dashboard recarrega (spinner breve), valores mudam
```

---

## 📱 Layout

```
┌─────────────────────────────────────────────┐
│ Sidebar (esq)  │     3D View      │ Dashboard │
│  • Histórico   │                  │ • Filtro  │
│  • Ocupação    │   (verde/vermelho)│ • 3 KPIs  │
│  • Tempo       │      vagas        │ • Ranking │
│  • Ranking     │      em tempo     │ • Heatmap │
│                │      real         │           │
│                │                  │           │
└─────────────────────────────────────────────┘
```

---

## ⚙️ Personalizações Comuns

### Mudar cor do Donut
```typescript
// Em DonutChart props
color={occupancyPercentage > 90 ? '#8b5cf6' : '#10b981'}
```

### Mudar presets de período
```typescript
// Em PeriodFilter menuItems
const periods = [
  { value: TimePeriod.Today, label: "Últimas 24h" },
  { value: TimePeriod.LastWeek, label: "Últimos 7 dias" },
  // ... adicionar mais
]
```

### Adicionar nova métrica ao KPI
```typescript
// 1. types/parking.ts
export interface ParkingLotOverviewKpi {
  // ... campos existentes
  revenueTotal: number;  // ← NOVO
}

// 2. DashboardPanel.tsx
<KpiCard
  title="Receita Total"
  value={kpiData?.revenue}
  unit="R$"
/>
```

### Habilitar Real-time Updates
```typescript
// Em DashboardPanel.tsx useEffect
const { on } = useSignalR();

on('KpiUpdated', (newKpi) => {
  setKpiData(newKpi);  // Atualiza sem recarregar página
});
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Dashboard não aparece | Verificar `z-20`, `absolute inset-y-0 right-0` position |
| Dados don't load | F12 → Network, verificar chamada a `generateMockKpiData()` |
| Heatmap não varia | Verificar cálculo de `normalizedOpacity` em SpotRankingCard |
| Scroll não funciona | Verificar `flex-1 min-h-0 overflow-y-auto` container |
| Animações lentas | Aumentar `stiffness` em Framer Motion springs |
| Badges 🔥⭐🧊 não aparecem | Verificar lógica em `generateMockRankingData()` |

---

## 📚 Documentação Detalhada

- **[DASHBOARD_REFACTOR.md](./DASHBOARD_REFACTOR.md)** — Tudo sobre arquitetura e componentes
- **[DASHBOARD_LAYOUT_VISUAL.md](./DASHBOARD_LAYOUT_VISUAL.md)** — ASCII mockups e cores
- **[DASHBOARD_INTEGRATION_GUIDE.md](./DASHBOARD_INTEGRATION_GUIDE.md)** — Testes e integração API
- **[DASHBOARD_SUMMARY.md](./DASHBOARD_SUMMARY.md)** — Resumo executivo completo

---

## ✅ Checklist Rápido

- [ ] `npm run dev` roda sem erros
- [ ] Dashboard aparece no lado direito
- [ ] 3 KPI Cards visíveis
- [ ] Donut Chart renderizado
- [ ] Filtro de período funciona
- [ ] Ranking de 22 vagas visível
- [ ] Heatmap com gradação visual
- [ ] Barras de progresso coloridas
- [ ] Badges 🔥⭐🧊 aparecem
- [ ] Click em vaga emite console log
- [ ] Scrollbar funciona no ranking
- [ ] Build: `npm run build` ✅

---

## 🚀 Próxima Ação

1. **Testar mockado** — `npm run dev` (5 min)
2. **Implementar endpoints** — Backend KpiController (30 min)
3. **Integrar API** — Remover mock, usar ApiService (15 min)
4. **Validar** — Dados reais no dashboard (10 min)

**Total: ~1 hora para integração completa** ⏱️

