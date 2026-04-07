# Guia de Testes e Integração — Dashboard Smart Parking

## 🧪 Testes de Desenvolvimento

### 1. Iniciar Ambiente

```bash
# Terminal 1 - Backend
cd api
dotnet run

# Terminal 2 - Frontend
cd app
npm run dev

# Terminal 3 - Docker Compose (se necessary)
docker compose up -d
```

Acesso: http://localhost:3000

---

## ✅ Testes Funcionais

### Teste 1: Visualizar Dashboard

**Cenário**: Aplicação carrega com sucesso  
**Esperado**: Dashboard aparece no lado direito da tela

```
1. Abrir http://localhost:3000
2. Verificar:
   ✓ Painel direito com "Dashboard" como título
   ✓ 3 KPI Cards visíveis (Ocupação, Entradas, Pico)
   ✓ Filtro "Hoje" no topo
   ✓ Lista de 22 vagas abaixo
3. Console: Nenhum erro
```

### Teste 2: Dados Mockados Carregam

**Cenário**: Componente renderiza com dados  
**Esperado**: Valores aparecem dinamicamente

```
1. Aguardar ~2 segundos (spinner desaparece)
2. Verificar valores:
   ✓ Ocupação Atual: 65-85% (variável por mock)
   ✓ Entradas Hoje: ~45
   ✓ Horário de Pico: "14:00 - 15:30"
   ✓ Ranking #1: VG-001 com 🔥 badge
3. Se dados não aparecerem, checar:
   - Console.log do loadData() no effet
   - Estado loading e error
```

### Teste 3: KPI Cards Interativos

**Cenário**: Hover nos cards  
**Esperado**: Animações suaves

```
1. Mover mouse sobre KPI Card #1
   ✓ Card eleva-se 2px (sutil)
   ✓ Sem flicker ou lag
2. Mover mouse sobre KPI Card #2
   ✓ Mesmo comportamento
3. Se não elevar, verificar:
   - Tailwind build process
   - Framer Motion animation setting
```

### Teste 4: Donut Chart Renderiza

**Cenário**: Gráfico de rosca no Card #1  
**Esperado**: SVG visível com cores corretas

```
1. Observar Card "Ocupação Atual"
   ✓ Gráfico circular (donut) renderizado
   ✓ Cor baseada em % ocupação:
       - Verde (<50%)
       - Amarelo (50-80%)
       - Vermelho (>80%)
2. Se não aparecer:
   - Checar browser console para erros SVG
   - Verificar props passadas ao DonutChart
```

### Teste 5: Filtro de Período Funciona

**Cenário**: Mudar período de tempo  
**Esperado**: Dados recarregam

```
1. Clicar em dropdown "Hoje"
   ✓ Menu abre com 4 opções
   ✓ "Hoje" tem fundo verde (selecionado)
2. Clicar em "Última Semana"
   ✓ Dropdown fecha
   ✓ Loading spinner aparece ~500ms
   ✓ Valores dos KPIs mudam:
       - Entradas: aumentam (287 vs 45)
       - Ocupação pode variar
   ✓ Timestamp "Atualizado em" muda
3. Se erro, verificar:
   - useEffect dependency array ([timePeriod, parkingLotId])
   - generateMockKpiData() está sendo chamado com novo período
```

### Teste 6: Ranking de Vagas Mostra Heatmap

**Cenário**: Validar efeito visual de heatmap  
**Esperado**: Gradação visual de opacidade

```
1. Observar cards das vagas:
   ✓ VG-001 (rank 1): fundo azul escuro, muito opaco
   ✓ VG-011 (rank 11): fundo azul médio, opacidade 25%
   ✓ VG-022 (rank 22): fundo azul muito claro, quase transparente
2. Padrão esperado:
   - Rank 1 = 40% opacity
   - Rank 11 = 25% opacity (aprox)
   - Rank 22 = 10% opacity
3. Se tudo igual, verificar:
   - Cálculo de 'normalizedOpacity' em SpotRankingCard
   - Aplicação do style inline com opacity calculada
```

### Teste 7: Ranking - Barras de Progresso

**Cenário**: Indicadores visuais de uso  
**Esperado**: Barras com tamanhos variáveis

```
1. Observar cada card de vaga:
   ✓ Barra horizontal sob a vaga
   ✓ VG-001: barra 100% cheia (vermelha >80%)
   ✓ VG-011: barra ~60% cheia (amarela 50-80%)
   ✓ VG-022: barra ~8% cheia (verde <50%)
2. Cores esperadas:
   - Vermelha: #EF4444 (occupancyRate > 80%)
   - Amarela: #F59E0B (50-80%)
   - Verde: #10B981 (<50%)
3. Se cores incorretas:
   - Checar lógica de 'barColor' em SpotRankingCard
   - Verificar valores de occupancyRate
```

### Teste 8: Badges de Frequência

**Cenário**: Ícones indicadores no Ranking  
**Esperado**: Badges corretos por posição

```
1. Observar coluna de badges:
   ✓ Vaga 001: 🔥 (fogo)
   ✓ Vagas 002-003: ⭐ (estrela)
   ✓ Vagas 020-022: 🧊 (gelo)
   ✓ Outras: sem badge (espaço vazio)
2. Se badges incorretos, verificar:
   - Lógica em generateMockRankingData() onde badge é atribuído
   - idx < 1 = fogo, idx < 3 = estrela, idx > 19 = gelo
```

### Teste 9: Scroll no Ranking

**Cenário**: Lista com 22 vagas  
**Esperado**: Scroll vertical funciona

```
1. Mover mouse sobre ranking
2. Scroll wheel para baixo → vagas desaparecem do topo
3. Scroll wheel para cima → vagas reaparecem
4. Scrollbar visual:
   ✓ Fina (4px wide)
   ✓ Transparente em repouso
   ✓ Cinza em hover
5. Se não scrollar:
   - Verificar altura do container flex-1 min-h-0
   - Checar overflow-y-auto
6. Se scrollbar não aparecer:
   - Testar em Chrome/Firefox (estilos customizados)
   - Verificar CSS injetado para .ranking-scroll
```

### Teste 10: Click em Vaga do Ranking

**Cenário**: Interatividade com 3D  
**Esperado**: Callback é acionado

```
1. Abrir browser DevTools (F12)
2. Ir para tab "Console"
3. Clicar em um card de vaga (ex: VG-001)
4. Observar console:
   ✓ Log: "[Home] Spot clicked from dashboard: 001 (spot-001)"
5. Clicar em vaga diferente (ex: VG-010)
   ✓ Log: "[Home] Spot clicked from dashboard: 010 (spot-010)"
6. Se não aparecer log:
   - Verificar onClick handler em SpotRankingCard
   - Checar função handleSpotClick em page.tsx
   - Debugar onSpotClick prop drilling
```

---

## 🔗 Integração com API Real (Backend)

### Passo 1: Backend — Criar Endpoints KPI

No backend .NET (API/Controllers/KpiController.cs):

```csharp
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.DTOs;
using ParkingSystem.Application.Services;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class KpiController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly ILogger<KpiController> _logger;

    public KpiController(IReportService reportService, ILogger<KpiController> logger)
    {
        _reportService = reportService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/kpi/overview?parkingLotId=&period=
    /// Retorna KPIs de resumo para o dashboard
    /// </summary>
    [HttpGet("overview")]
    public async Task<ActionResult<ParkingLotOverviewKpiDto>> GetOverview(
        [FromQuery] Guid parkingLotId,
        [FromQuery] string period = "today")
    {
        try
        {
            // Converter string period em DateFrom/DateTo
            var (dateFrom, dateTo) = GetDateRangeFromPeriod(period);

            // Chamar ReportService para dados agregados
            var history = await _reportService.GetHistoryAsync(
                new ReportFilter { ParkingLotId = parkingLotId, DateFrom = dateFrom, DateTo = dateTo }
            );

            var occupancy = await _reportService.GetHourlyOccupancyAsync(parkingLotId, dateFrom, dateTo);

            var duration = await _reportService.GetAverageDurationAsync(parkingLotId, dateFrom, dateTo);

            // Construir response KPI
            var occupancyPercentage = occupancy.Average(x => x.AverageOccupancy);
            var peakHour = occupancy.OrderByDescending(x => x.PeakOccupiedCount).FirstOrDefault();
            var hourFrom = peakHour?.Hour ?? DateTime.UtcNow;
            var hourTo = hourFrom.AddHours(1);

            var response = new ParkingLotOverviewKpiDto
            {
                OccupancyPercentage = occupancyPercentage,
                OccupiedCount = (int?)peakHour?.PeakOccupiedCount ?? 0,
                TotalSpots = peakHour?.TotalSpots ?? 22,
                TotalEntriesCount = history.TotalCount,
                AverageEntriesPerHour = (history.TotalCount / 24),
                PeakHourFrom = hourFrom.ToString("HH:mm"),
                PeakHourTo = hourTo.ToString("HH:mm"),
                PeakHourOccupancyPercentage = peakHour?.AverageOccupancy ?? 0,
                LastUpdated = DateTime.UtcNow
            };

            _logger.LogInformation("[KPI] Overview returned for parkingLot {LotId}, period {Period}", parkingLotId, period);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[KPI] Error retrieving overview");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/kpi/ranking?parkingLotId=&period=
    /// Retorna ranking de vagas com frequência de uso
    /// </summary>
    [HttpGet("ranking")]
    public async Task<ActionResult<List<SpotRankingItemDetailedDto>>> GetRanking(
        [FromQuery] Guid parkingLotId,
        [FromQuery] string period = "today")
    {
        try
        {
            var (dateFrom, dateTo) = GetDateRangeFromPeriod(period);

            // Chamar ReportService para ranking
            var ranking = await _reportService.GetSpotRankingAsync(parkingLotId, dateFrom, dateTo);

            // Mapear para DTOs frontend com badges
            var response = ranking
                .Select((spot, idx) => new SpotRankingItemDetailedDto
                {
                    Rank = idx + 1,
                    SpotNumber = spot.SpotNumber,
                    SpotId = spot.SpotId,
                    UseCount = spot.UseCount,
                    MaxUseCount = ranking.FirstOrDefault()?.UseCount ?? 1,
                    AverageDurationMinutes = spot.AverageDurationMinutes,
                    OccupancyRate = spot.OccupancyRate,
                    Status = "Livre", // TODO: Obter status atual do spot
                    FrequencyBadge = GetBadge(idx, ranking.Count)
                })
                .ToList();

            _logger.LogInformation("[KPI] Ranking returned for parkingLot {LotId}, {Count} spots", parkingLotId, ranking.Count);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[KPI] Error retrieving ranking");
            return BadRequest(new { error = ex.Message });
        }
    }

    private (DateTime dateFrom, DateTime dateTo) GetDateRangeFromPeriod(string period)
    {
        var now = DateTime.UtcNow;
        return period.ToLower() switch
        {
            "today" => (now.Date, now.Date.AddDays(1)),
            "yesterday" => (now.Date.AddDays(-1), now.Date),
            "lastweek" => (now.Date.AddDays(-7), now.Date.AddDays(1)),
            "lastmonth" => (now.Date.AddMonths(-1), now.Date.AddDays(1)),
            _ => (now.Date, now.Date.AddDays(1))
        };
    }

    private string GetBadge(int index, int totalSpots)
    {
        if (index == 0) return "🔥";
        if (index < 3) return "⭐";
        if (index > totalSpots - 4) return "🧊";
        return "";
    }
}
```

### Passo 2: DTOs no Backend

Em Application/DTOs/Report/ (novo arquivo):

```csharp
// ParkingLotOverviewKpiDto.cs
public class ParkingLotOverviewKpiDto
{
    public Guid ParkingLotId { get; set; }
    public string ParkingLotName { get; set; } = "Estacionamento Central";
    public decimal OccupancyPercentage { get; set; }
    public int OccupiedCount { get; set; }
    public int TotalSpots { get; set; }
    public decimal OccupancyTrend { get; set; } // %
    public int TotalEntriesCount { get; set; }
    public decimal EntryTrend { get; set; } // %
    public decimal AverageEntriesPerHour { get; set; }
    public string PeakHour { get; set; } = "14:00";
    public string PeakHourFrom { get; set; } = "14:00";
    public string PeakHourTo { get; set; } = "15:30";
    public decimal PeakHourOccupancyPercentage { get; set; }
    public int PeakHourEntriesCount { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

// SpotRankingItemDetailedDto.cs
public class SpotRankingItemDetailedDto
{
    public int Rank { get; set; }
    public string SpotNumber { get; set; }
    public Guid SpotId { get; set; }
    public int UseCount { get; set; }
    public int MaxUseCount { get; set; }
    public decimal AverageDurationMinutes { get; set; }
    public decimal OccupancyRate { get; set; } // 0-100
    public string Status { get; set; } = "Livre";
    public string FrequencyBadge { get; set; } = ""; // 🔥, ⭐, 🧊, or ""
}
```

### Passo 3: Frontend — Adicionar Métodos ao ApiService

Em app/src/services/api.ts:

```typescript
export class ApiService {
  // ... métodos existentes ...

  static async getKpiOverview(
    parkingLotId: string,
    period: TimePeriod = TimePeriod.Today
  ): Promise<ParkingLotOverviewKpi> {
    const response = await fetch(
      `${this.API_BASE_URL}/kpi/overview?parkingLotId=${parkingLotId}&period=${period}`
    );
    if (!response.ok) throw new Error('Failed to fetch KPI overview');
    return response.json();
  }

  static async getSpotRanking(
    parkingLotId: string,
    period: TimePeriod = TimePeriod.Today
  ): Promise<SpotRankingItemDetailed[]> {
    const response = await fetch(
      `${this.API_BASE_URL}/kpi/ranking?parkingLotId=${parkingLotId}&period=${period}`
    );
    if (!response.ok) throw new Error('Failed to fetch spot ranking');
    return response.json();
  }
}
```

### Passo 4: Frontend — Usar API Real

Em app/src/components/ui/DashboardPanel.tsx:

```typescript
// Substituir as funções generateMock* pelos calls reais:

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Usar API real (comentar os mock data)
      const kpiResponse = await ApiService.getKpiOverview(parkingLotId, timePeriod);
      const rankingResponse = await ApiService.getSpotRanking(parkingLotId, timePeriod);

      setKpiData(kpiResponse);
      setRankingData(rankingResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, [timePeriod, parkingLotId]);
```

---

## 🧪 Testes de Integração

### Teste 11: API Real Retorna Dados

**Cenário**: Dados vêm do backend  
**Esperado**: Dashboard mostra valores reais

```
1. Parar servidor dev:    Ctrl+C em Terminal 2
2. Implementar endpoints: KpiController.cs no backend
3. Compilar backend:      dotnet build
4. Iniciar backend:       dotnet run
5. Iniciar frontend:      npm run dev
6. Abrir http://localhost:3000
7. DevTools Network tab:
   ✓ Requisição GET /api/kpi/overview → 200 OK
   ✓ Response JSON com ParkingLotOverviewKpi
   ✓ Requisição GET /api/kpi/ranking → 200 OK
   ✓ Response JSON com array de SpotRankingItemDetailed []
8. Dashboard mostra dados reais do banco
```

### Teste 12: Mudança de Período Consulta API

**Cenário**: Alterar período recarrega dados  
**Esperado**: Novas requisições à API

```
1. DevTools Network tab aberta
2. Dashboard carregado com período "Hoje"
3. Mudar para "Última Semana"
4. Network tab:
   ✓ Requisição GET /api/kpi/overview?...&period=lastweek
   ✓ Requisição GET /api/kpi/ranking?...&period=lastweek
   ✓ Ambas retornam 200 OK
5. Dashboard atualiza com novos valores
```

### Teste 13: Tratamento de Erro

**Cenário**: API retorna erro  
**Esperado**: Mensagem amigável

```
1. Simular erro:
   - Parar backend temporariamente
   - Ou modificar endpoint para retornar 500
2. Recarregar dashboard
3. Verificar:
   ✓ Loading spinner aparece
   ✓ Spinner desaparece após timeout
   ✓ Mensagem de erro aparece (vermelhinha)
   ✓ Texto: "Erro ao carregar dados" ou específico da API
4. Iniciar backend novamente e recarregar
   ✓ Dashboard funciona novamente
```

---

## 📝 Checklist de Implementação

### Frontend
- [ ] DashboardPanel.tsx criado
- [ ] Types atualizados (TimePeriod, KpiOccupancy, etc)
- [ ] page.tsx integra DashboardPanel
- [ ] npm run build passa sem erros
- [ ] npm run dev funciona

### Backend (para integração real)
- [ ] KpiController criado
- [ ] DTOs criados (ParkingLotOverviewKpiDto, SpotRankingItemDetailedDto)
- [ ] Endpoints mapeados no program.cs
- [ ] ReportService métodos funcionam
- [ ] Endpoints retornam JSON correto
- [ ] dotnet build passa
- [ ] dotnet run sem erros

### Integração
- [ ] ApiService tem getKpiOverview() e getSpotRanking()
- [ ] DashboardPanel chama ApiService.getKpi*() em useEffect
- [ ] Dados reais aparecem no dashboard
- [ ] Mudanças de período consultam API
- [ ] Erros são tratados graciosamente

### Testes
- [ ] Teste 1-10: Tudo verde com dados mockados
- [ ] Teste 11-13: Tudo verde com dados reais

---

## 🚀 Próximas Melhorias

1. **Real-time Updates via SignalR**
   ```typescript
   useSignalR((event) => {
     if (event.type === 'OccupancyUpdated') {
       setKpiData(prev => ({
         ...prev,
         occupancy: event.data
       }));
     }
   });
   ```

2. **Cache com SWR ou React Query**
   ```typescript
   const { data: kpiData } = useSWR(
     [parkingLotId, timePeriod],
     () => ApiService.getKpiOverview(parkingLotId, timePeriod),
     { refreshInterval: 30000 } // Refresh a cada 30s
   );
   ```

3. **Exportar Relatório em PDF**
   ```
   <button onClick={exportToPdf}>
     Baixar Relatório PDF
   </button>
   ```

4. **Comparação de Períodos**
   ```
   Ocupação (hoje):      75%
   Ocupação (ontem):     72%
   Diferença:            +3% ↗
   ```

5. **Focar câmera 3D em vaga selecionada**
   ```typescript
   onSpotClick={(spotId, spotNumber) => {
     spotCamera.focus(spotId); // Câmera 3D anima para vaga
   }}
   ```

