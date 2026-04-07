# 🚀 Frontend Integration Guide — Dados Reais + Dashboard + Relatórios

## 📋 Visão Geral Completa

Implementamos as 4 alterações solicitadas no frontend Next.js:

1. ✅ **Integração Real** — Dashboard agora busca dados reais do backend
2. ✅ **Exportação CSV** — Botão para baixar relatórios em CSV
3. ✅ **Refatoração Sidebar** — Simplificada com Dashboard + Relatórios Detalhados
4. ✅ **Loading States** — Skeleton screens enquanto carrega

**Status**: 🎉 Build passa (0 errors, fully type-checked)

---

## 🎯 Alterações no Frontend

### 1️⃣ Integração Real do Dashboard

#### Arquivo: `app/src/components/ui/DashboardPanel.tsx`

**Mudanças Principais**:

- ❌ Removidas: Funções `generateMockKpiData()` e `generateMockRankingData()`
- ✅ Adicionado: Importação `ApiService` 
- ✅ Adicionado: Skeleton screen components para loading
- ✅ Modificado: `useEffect` agora chama APIs reais

**Antes (Mock)**:
```typescript
const mockKpi = generateMockKpiData(timePeriod);
const mockRanking = generateMockRankingData();
setKpiData(mockKpi);
setRankingData(mockRanking);
```

**Depois (Real)**:
```typescript
const [kpi, ranking] = await Promise.all([
  ApiService.getKpiOverview(parkingLotId, timePeriod),
  ApiService.getKpiRanking(parkingLotId, timePeriod),
]);
```

**Loading UX**: Enquanto carrega, mostra skeleton animados (pulsing boxes) em vez de spinner simples.

---

### 2️⃣ Exportação CSV

#### Arquivo: `app/src/components/ui/ReportPanel.tsx`

**Adições**:

- ✅ Novo ícone: `Download` da biblioteca lucide-react
- ✅ Nova função: `handleExportCsv()` que:
  - Chama `ApiService.exportReportToCsv()`
  - Faz download automaticamente no browser
  - Nome do arquivo: `relatorio-{reportId}-{DATA}.csv`
- ✅ Novo botão no header com ícone Download (azul)

**Uso**:
```typescript
<button onClick={() => activeTab && handleExportCsv(activeTab, parkingLotId)}>
  <Download className="w-4 h-4" />
  Exportar
</button>
```

---

### 3️⃣ Refatoração Sidebar

#### Arquivo: `app/src/components/ui/Sidebar.tsx`

**Mudanças Estruturais**:

| Item | Antes | Depois |
|------|-------|--------|
| Itens Menu | 5 (Dashboard + 4 reports) | 2 (Dashboard + Relatórios Detalhados) |
| Clique em Relatórios | Abria modal modal específico | Abre modo relatórios com 4 tabs internos |
| Visão Expandida | Mostrava todos 5 itens | Dashboard + Relatórios (simples) + Info aba |

**Visual**:
```
┌─────────────────────────┐
│  🏠 Dashboard          │  ← Premium (h-12, green gradient)
├─────────────────────────┤
│                         │  ← Divider
│  📊 Relatórios Detalhados │  ← Secundário (h-11)
│                         │
│  ┌─ Aba Selecionada ──┐ │  ← Info box se em modo relatórios
│  │ 📋 Histórico       │ │
│  └────────────────────┘ │
└─────────────────────────┘
```

**Lógica**:
- Clique em "Dashboard" → `onSelectPanel('dashboard')`
- Clique em "Relatórios Detalhados" → `onSelectPanel('history')` (abre primeiro relatório)
- Dentro do ReportPanel, 4 tabs permitem navegar entre relatórios sem refazer o fetch inicial

---

### 4️⃣ Loading States (Skeleton Screens)

#### Arquivo: `app/src/components/ui/DashboardPanel.tsx`

**Componentes Novo**:

```typescript
function KpiCardSkeleton({ count = 3 }: KpiCardSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="rounded-xl border border-zinc-700 bg-gradient-to-br from-zinc-800/60 to-zinc-900/40 p-4 h-32"
        />
      ))}
    </div>
  );
}

function RankingSkeletonItem() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="rounded-lg border border-zinc-700/40 p-3 h-20 bg-gradient-to-r from-blue-600/20 to-transparent"
    />
  );
}
```

**Visual**: Boxes pulsando (opacity animada) até dados chegarem, sem spinner chato.

---

## 🌐 Novos Métodos na API Service

#### Arquivo: `app/src/services/api.ts`

### Método 1: KPI Overview (Dashboard Cards)

```typescript
static async getKpiOverview(
  parkingLotId: string,
  timePeriod: TimePeriod = TimePeriod.Today
): Promise<ParkingLotOverviewKpi> {
  const params = new URLSearchParams({
    parkingLotId,
    timePeriod,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/kpi/overview?${params}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch KPI overview: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.success && result.data) {
    return result.data;
  }

  if (result.parkingLotId) {
    return result; // Direct response
  }

  throw new Error(result.message || 'Failed to load KPI overview');
}
```

### Método 2: KPI Ranking (Dashboard Cards)

```typescript
static async getKpiRanking(
  parkingLotId: string,
  timePeriod: TimePeriod = TimePeriod.Today
): Promise<SpotRankingItemDetailed[]> {
  const params = new URLSearchParams({
    parkingLotId,
    timePeriod,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/kpi/ranking?${params}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch KPI ranking: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }

  if (Array.isArray(result)) {
    return result;
  }

  throw new Error(result.message || 'Failed to load KPI ranking');
}
```

### Método 3: Exportação CSV

```typescript
static async exportReportToCsv(
  reportId: string,
  parkingLotId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<Blob> {
  const params = new URLSearchParams({
    reportId,
    parkingLotId,
  });

  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  const response = await fetch(
    `${API_BASE_URL}/api/reports/export-csv?${params}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to export CSV: ${response.statusText}`);
  }

  return await response.blob();
}
```

---

## 🔧 Backend Requirements — Endpoints Necessários

Seu backend .NET 8 precisa implementar **3 novos endpoints**:

### Endpoint 1: GET `/api/kpi/overview`

**Descrição**: Retorna dados de KPI para o Dashboard (ocupação, entradas, horário de pico)

**Query Parameters**:
```
GET /api/kpi/overview?parkingLotId=abc123&timePeriod=today
```

- `parkingLotId` (string, required) — ID do estacionamento
- `timePeriod` (string, required) — "today", "yesterday", "lastWeek", "lastMonth"

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "parkingLotId": "abc123",
    "parkingLotName": "Estacionamento Central",
    "occupancy": {
      "occupancyPercentage": 75.5,
      "occupiedCount": 15,
      "totalSpots": 22,
      "trend": 2.3
    },
    "entries": {
      "totalEntriesCount": 45,
      "trend": 5.1,
      "averageEntriesPerHour": 6,
      "peakHour": "14:00"
    },
    "peakHour": {
      "hourFrom": "14:00",
      "hourTo": "15:30",
      "occupancyPercentage": 92.0,
      "entriesCount": 18
    },
    "lastUpdated": "2026-04-07T15:30:00Z"
  },
  "message": "KPI overview retrieved successfully",
  "statusCode": 200
}
```

**Tipo TypeScript (Frontend)**:
```typescript
interface ParkingLotOverviewKpi {
  parkingLotId: string;
  parkingLotName: string;
  occupancy: KpiOccupancy;
  entries: KpiEntries;
  peakHour: KpiPeakHour;
  lastUpdated: string;
}

interface KpiOccupancy {
  occupancyPercentage: number;
  occupiedCount: number;
  totalSpots: number;
  trend: number;
}

interface KpiEntries {
  totalEntriesCount: number;
  trend: number;
  averageEntriesPerHour: number;
  peakHour: string;
}

interface KpiPeakHour {
  hourFrom: string;
  hourTo: string;
  occupancyPercentage: number;
  entriesCount: number;
}
```

---

### Endpoint 2: GET `/api/kpi/ranking`

**Descrição**: Retorna ranking de vagas mais usadas (top 22 com badges 🔥⭐🧊)

**Query Parameters**:
```
GET /api/kpi/ranking?parkingLotId=abc123&timePeriod=today
```

- `parkingLotId` (string, required)
- `timePeriod` (string, required)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "spotNumber": "001",
      "spotId": "spot-001",
      "useCount": 1200,
      "maxUseCount": 1200,
      "averageDurationMinutes": 45.5,
      "occupancyRate": 92.0,
      "status": "Ocupada",
      "frequencyBadge": "🔥"
    },
    {
      "rank": 2,
      "spotNumber": "002",
      "spotId": "spot-002",
      "useCount": 1180,
      "maxUseCount": 1200,
      "averageDurationMinutes": 42.3,
      "occupancyRate": 88.5,
      "status": "Livre",
      "frequencyBadge": "⭐"
    }
    // ... 20 mais itens
  ],
  "message": "Ranking retrieved successfully",
  "statusCode": 200
}
```

**Tipo TypeScript (Frontend)**:
```typescript
interface SpotRankingItemDetailed {
  rank: number;
  spotNumber: string;
  spotId: string;
  useCount: number;
  maxUseCount: number;
  averageDurationMinutes: number;
  occupancyRate: number;
  status: string;
  frequencyBadge: "🔥" | "⭐" | "🧊" | "";
}
```

---

### Endpoint 3: GET `/api/reports/export-csv`

**Descrição**: Exporta relatório em formato CSV para download

**Query Parameters**:
```
GET /api/reports/export-csv?reportId=history&parkingLotId=abc123&dateFrom=2026-04-01&dateTo=2026-04-07
```

- `reportId` (string, required) — "history", "occupancy", "duration", "ranking"
- `parkingLotId` (string, required)
- `dateFrom` (string, optional) — ISO 8601 format
- `dateTo` (string, optional) — ISO 8601 format

**Response** (200 OK):
```
Content-Type: text/csv
Content-Disposition: attachment; filename="relatorio-history-2026-04-07.csv"

spotNumber,licensePlate,entryTime,exitTime,duration,amount
001,ABC-1234,2026-04-07T10:30:00,2026-04-07T12:15:00,1:45:00,15.50
002,XYZ-5678,2026-04-07T11:00:00,2026-04-07T14:30:00,3:30:00,28.75
...
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Invalid reportId. Must be: history, occupancy, duration, ranking",
  "statusCode": 400
}
```

---

## 📚 Implementation Checklist — Backend

### Para `GET /api/kpi/overview`

- [ ] Criar Controller: `KpiController` ou adicionar método no controller existente
- [ ] Criar Dto: `KpiOverviewResponseDto` com campos conforme spec acima
- [ ] Implementar Service: `IKpiService.GetOverviewAsync(parkingLotId, timePeriod)`
- [ ] **Lógica**:
  ```
  1. Buscar todas as sessões do dia (por timePeriod)
  2. Calcular occupancyPercentage = (spotOcupadas / totalSpots) * 100
  3. Calcular trend = (occupancyHoje - occupancyOntem) percentualmente
  4. Contar entradas = COUNT(sessionsMod WHERE entryTime BETWEEN X and Y)
  5. Calcular peakHour = hora com mais entradas
  6. Retornar wrapped em ApiResponse<KpiOverviewResponseDto>
  ```
- [ ] Adicionar logging para debug
- [ ] Testar com Postman/curl

### Para `GET /api/kpi/ranking`

- [ ] Criar Dto: `SpotRankingDetailedResponseDto`
- [ ] Implementar Service: `IKpiService.GetRankingAsync(parkingLotId, timePeriod)`
- [ ] **Lógica**:
  ```
  1. Buscar todas as sessões do período
  2. Agrupar por spotId
  3. Calcular para cada spot:
     - useCount = COUNT(sessions)
     - averageDurationMinutes = AVG(duration)
     - occupancyRate = (sum(duration) / totalMinutesInPeriod) * 100
  4. Ordenar por useCount DESC
  5. Adicionar badges:
     - Rank 1: 🔥
     - Rank 2-3: ⭐
     - Últimas 3: 🧊
     - Outras: (vazio)
  6. Retornar array com todos os spots + rankings
  ```
- [ ] Validar typos dos campos conforme Dto
- [ ] Adicionar paginação se necessário (max 22 spots)

### Para `GET /api/reports/export-csv`

- [ ] Criar Service: `IReportExportService.ExportToCsvAsync(reportId, parkingLotId, dateRange)`
- [ ] **Lógica** (por reportId):
  ```
  
  **history**:
  - Headers: spotNumber,licensePlate,entryTime,exitTime,duration,amount
  - Linhas: Uma por sessão
  
  **occupancy**:
  - Headers: hour,averageOccupancy,peakOccupiedCount,totalSpots
  - Linhas: Uma por hora do dia
  
  **duration**:
  - Headers: totalSessions,averageDuration,minimumDuration,maximumDuration,sessionsToday
  - Linhas: Uma única linha com agregados
  
  **ranking**:
  - Headers: rank,spotNumber,useCount,averageDurationMinutes,occupancyRate
  - Linhas: Uma por vaga (todas as 22)
  ```
- [ ] Usar biblioteca CSV (CsvHelper or CsvDataReader)
- [ ] Retornar `FileStreamResult` com `Content-Type: text/csv`
- [ ] Adicionar content-disposition header com filename

---

## 🧪 Testing Frontend

### 1. Testar Dashboard com Dados Reais

```bash
cd app
npm run dev
# Abrir http://localhost:3000
```

**Checklist**:
- [ ] Dashboard carrega com Skeleton screens por 1-2 segundos
- [ ] Após load, mostra KPI cards com dados reais (não mais mock)
- [ ] Mostra Ranking abaixo
- [ ] Filtro de período funciona (Hoje, Ontem, Última Semana, Último Mês)
- [ ] Cada período refaz o fetch (vê loading novamente)
- [ ] Console não tem erros (F12)

### 2. Testar Exportação CSV

- [ ] Clicar em "Relatórios Detalhados" no Sidebar
- [ ] Dentro de ReportPanel, clicar em "Exportar" (botão azul)
- [ ] Arquivo `relatorio-history-YYYY-MM-DD.csv` baixa automaticamente
- [ ] Abrir CSV no Excel/Sheets e verificar dados
- [ ] Testar para cada aba: Histórico, Ocupação, Duração, Ranking
- [ ] Testar com e sem filtros de data

### 3. Testar Refatoração Sidebar

- [ ] Sidebar tem apenas 2 itens: Dashboard + Relatórios Detalhados
- [ ] Clique em Dashboard → Dashboard painel abre
- [ ] Clique em Relatórios Detalhados → ReportPanel abre em modo Histórico
- [ ] Dentro do ReportPanel, 4 tabs (Histórico, Ocupação, Duração, Ranking)
- [ ] Navegar entre tabs sem fechar o painel
- [ ] Info box mostra aba selecionada quando Sidebar expandido

### 4. Testar Loading States

- [ ] Se API lenta (network throttling), vê skeleton screens pulsando
- [ ] Esqueletos desaparecem quando dados chegam
- [ ] Sem flicker ou layout shift

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Dashboard em branco após carregar | Dashboard só passa `parkingLotId` — verificar se é válido |
| "Failed to fetch KPI overview" no console | Backend endpoint `/api/kpi/overview` não existe ou está retornando erro 404/500 |
| CSV não baixa | Verificar se endpoint `/api/reports/export-csv` existe e retorna `Content-Type: text/csv` |
| Sidebar não simplificado | Limpar browser cache (Ctrl+Shift+Delete) e recarregar |
| Skeleton screens não animam | Verificar se Framer Motion está instalado (`npm ls framer-motion`) |

---

## 📝 Próximas Etapas

### A Curto Prazo (Esta Sprint)
1. ✅ Frontend: 4 alterações implementadas e compiladas
2. ⏳ Backend: Implementar os 3 endpoints (KPI overview, KPI ranking, export CSV)
3. ⏳ Testes: Validar frontend com backend rodando

### A Médio Prazo
- [ ] Cache na API (Redis) para KPI queries (expensive)
- [ ] WebSocket updates em tempo real para ocupação
- [ ] Refresh automático de KPIs a cada 60s
- [ ] Gráficos customizáveis no Dashboard

### A Longo Prazo
- [ ] Mobile app nativa com mesmo Dashboard
- [ ] Alertas push para picos de ocupação
- [ ] Analytics avançados (previsão via ML)

---

## 🎓 Arquitetura Atualizada

```
Frontend (Next.js)
├─ DashboardPanel.tsx
│  ├─ ApiService.getKpiOverview() ──→ GET /api/kpi/overview
│  ├─ ApiService.getKpiRanking() ──→ GET /api/kpi/ranking
│  └─ Loading: KpiCardSkeleton, RankingSkeletonItem
│
├─ ReportPanel.tsx
│  ├─ 4 Tabs: History, Occupancy, Duration, Ranking
│  ├─ Botão Exportar → ApiService.exportReportToCsv()
│  └─ GET /api/reports/export-csv?reportId=...&parkingLotId=...
│
└─ Sidebar.tsx
   ├─ Dashboard (h-12, green gradient)
   └─ Relatórios Detalhados (h-11, normal)
```

---

## 📌 Importante

- **CORS**: Configure CORS no backend para permitir requisições do frontend (localhost:3000)
- **Errors**: Sempre retorne `{ success: false, message: "...", statusCode: XXX }`
- **Types**: Garanta que tipos do backend coincidem exatamente com os do frontend
- **Performance**: KPI queries podem ser lentas com grandes datasets — adicione índices no BD

