# 🔧 Backend Implementation Guide — .NET 8 KPI & Export APIs

## ⚡ TL;DR — Implementação Rápida

Seu frontend precisa que você implemente **3 endpoints**. Tempo estimado: **2-3 horas**.

---

## 📋 Endpoints Necessários

### 1. `GET /api/kpi/overview` 

**Retorna**: KPI cards do Dashboard (ocupação, entradas, horário de pico)

**Parâmetros**:
```
parkingLotId: string (GUID)
timePeriod: string ("today" | "yesterday" | "lastWeek" | "lastMonth")
```

**Response**:
```json
{
  "success": true,
  "data": {
    "parkingLotId": "123e4567-e89b-12d3-a456-426614174000",
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
  "statusCode": 200,
  "message": "KPI overview retrieved successfully"
}
```

---

### 2. `GET /api/kpi/ranking`

**Retorna**: Top 22 vagas por frequência de uso (com badges 🔥⭐🧊)

**Parâmetros**:
```
parkingLotId: string (GUID)
timePeriod: string ("today" | "yesterday" | "lastWeek" | "lastMonth")
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "spotNumber": "001",
      "spotId": "abc123...",
      "useCount": 1200,
      "maxUseCount": 1200,
      "averageDurationMinutes": 45.5,
      "occupancyRate": 92.0,
      "status": "Ocupada",
      "frequencyBadge": "🔥"
    },
    {...},
    {...}
  ],
  "statusCode": 200,
  "message": "Ranking retrieved successfully"
}
```

---

### 3. `GET /api/reports/export-csv`

**Retorna**: CSV file para download

**Parâmetros**:
```
reportId: string ("history" | "occupancy" | "duration" | "ranking")
parkingLotId: string (GUID)
dateFrom: string (optional, ISO 8601)
dateTo: string (optional, ISO 8601)
```

**Response** (200 OK):
```
Content-Type: text/csv
Content-Disposition: attachment; filename="relatorio-history-2026-04-07.csv"

spotNumber,licensePlate,entryTime,exitTime,duration,amount
001,ABC-1234,2026-04-07T10:30:00,2026-04-07T12:15:00,1:45:00,15.50
002,XYZ-5678,2026-04-07T11:00:00,2026-04-07T14:30:00,3:30:00,28.75
```

---

## 🛠️ Implementação .NET 8 — Passo a Passo

### Passo 1: Criar DTOs

**Arquivo**: `src/Application/DTOs/Kpi/KpiOverviewResponseDto.cs`

```csharp
namespace ParkingSystem.Application.DTOs.Kpi;

public class KpiOverviewResponseDto
{
    public string ParkingLotId { get; set; }
    public string ParkingLotName { get; set; }
    
    public KpiOccupancyDto Occupancy { get; set; }
    public KpiEntriesDto Entries { get; set; }
    public KpiPeakHourDto PeakHour { get; set; }
    
    public DateTime LastUpdated { get; set; }
}

public class KpiOccupancyDto
{
    public decimal OccupancyPercentage { get; set; }
    public int OccupiedCount { get; set; }
    public int TotalSpots { get; set; }
    public decimal Trend { get; set; } // e.g., +2.3, -1.5
}

public class KpiEntriesDto
{
    public int TotalEntriesCount { get; set; }
    public decimal Trend { get; set; }
    public int AverageEntriesPerHour { get; set; }
    public string PeakHour { get; set; } // "14:00" format
}

public class KpiPeakHourDto
{
    public string HourFrom { get; set; } // "14:00"
    public string HourTo { get; set; }   // "15:30"
    public decimal OccupancyPercentage { get; set; }
    public int EntriesCount { get; set; }
}
```

**Arquivo**: `src/Application/DTOs/Kpi/SpotRankingDetailedDto.cs`

```csharp
namespace ParkingSystem.Application.DTOs.Kpi;

public class SpotRankingDetailedDto
{
    public int Rank { get; set; }
    public string SpotNumber { get; set; }
    public string SpotId { get; set; }
    
    public int UseCount { get; set; }
    public int MaxUseCount { get; set; }
    
    public decimal AverageDurationMinutes { get; set; }
    public decimal OccupancyRate { get; set; } // 0-100
    
    public string Status { get; set; } // "Ocupada", "Livre", etc
    public string FrequencyBadge { get; set; } // "🔥", "⭐", "🧊", ""
}
```

---

### Passo 2: Criar Service Interface

**Arquivo**: `src/Application/Interfaces/IKpiService.cs`

```csharp
namespace ParkingSystem.Application.Interfaces;

using DTOs.Kpi;

public interface IKpiService
{
    Task<KpiOverviewResponseDto> GetOverviewAsync(
        string parkingLotId, 
        string timePeriod);
    
    Task<List<SpotRankingDetailedDto>> GetRankingAsync(
        string parkingLotId, 
        string timePeriod);
}
```

---

### Passo 3: Implementar Service

**Arquivo**: `src/Application/Services/KpiService.cs`

```csharp
namespace ParkingSystem.Application.Services;

using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Infrastructure.Persistence;
using Interfaces;
using DTOs.Kpi;

public class KpiService : IKpiService
{
    private readonly ParkingSystemContext _context;

    public KpiService(ParkingSystemContext context)
    {
        _context = context;
    }

    public async Task<KpiOverviewResponseDto> GetOverviewAsync(string parkingLotId, string timePeriod)
    {
        try
        {
            // Validar parkingLotId
            var parkingLot = await _context.ParkingLots
                .FirstOrDefaultAsync(p => p.Id.ToString() == parkingLotId);
            
            if (parkingLot == null)
                throw new InvalidOperationException("ParkingLot not found");

            // Getdata window based on timePeriod
            var (dateFrom, dateTo) = GetDateRange(timePeriod);

            // ===== OCUPANCY =====
            var today = DateTime.UtcNow.Date;
            var totalSpots = await _context.ParkingSpots
                .CountAsync(s => s.ParkingLotId.ToString() == parkingLotId);

            var occupiedSpots = await _context.ParkingSessions
                .Where(s => s.ParkingLotId.ToString() == parkingLotId && s.ExitTime == null)
                .Select(s => s.SpotId)
                .Distinct()
                .CountAsync();

            var occupancyPercentage = totalSpots > 0 
                ? (decimal)occupiedSpots / totalSpots * 100 
                : 0;

            // Get previous period data for trend
            var (prevDateFrom, prevDateTo) = GetDateRange(GetPreviousPeriod(timePeriod));
            var prevOccupancy = await CalculateAverageOccupancy(parkingLotId, prevDateFrom, prevDateTo);
            var occupancyTrend = prevOccupancy > 0 
                ? ((occupancyPercentage - prevOccupancy) / prevOccupancy) * 100 
                : 0;

            // ===== ENTRIES =====
            var entries = await _context.ParkingSessions
                .Where(s => s.ParkingLotId.ToString() == parkingLotId && 
                            s.EntryTime >= dateFrom && 
                            s.EntryTime <= dateTo)
                .ToListAsync();

            var totalEntriesCount = entries.Count;
            
            var prevEntries = await _context.ParkingSessions
                .CountAsync(s => s.ParkingLotId.ToString() == parkingLotId && 
                                 s.EntryTime >= prevDateFrom && 
                                 s.EntryTime <= prevDateTo);

            var entriesTrend = prevEntries > 0 
                ? ((decimal)totalEntriesCount - prevEntries) / prevEntries * 100 
                : 0;

            var hoursInPeriod = (int)(dateTo - dateFrom).TotalHours;
            var avgEntriesPerHour = hoursInPeriod > 0 ? totalEntriesCount / hoursInPeriod : 0;

            // Peak hour
            var peakHourGroup = entries
                .GroupBy(e => e.EntryTime.Hour)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault();

            var peakHour = peakHourGroup != null 
                ? $"{peakHourGroup.Key:D2}:00" 
                : DateTime.UtcNow.Hour.ToString("D2") + ":00";

            // ===== PEAK HOUR =====
            var peakHourFrom = $"{int.Parse(peakHour.Split(':')[0]):D2}:00";
            var peakHourTo = $"{(int.Parse(peakHour.Split(':')[0]) + 1) % 24:D2}:30";

            var peakHourEntries = entries
                .Where(e => e.EntryTime.Hour == int.Parse(peakHour.Split(':')[0]))
                .Count();

            var peakHourOccupancy = entries
                .Where(e => e.EntryTime.Hour == int.Parse(peakHour.Split(':')[0]))
                .Select(e => e.SpotId)
                .Distinct()
                .Count();

            var peakOccupancyPercentage = totalSpots > 0 
                ? (decimal)peakHourOccupancy / totalSpots * 100 
                : 0;

            return new KpiOverviewResponseDto
            {
                ParkingLotId = parkingLotId,
                ParkingLotName = parkingLot.Name,
                
                Occupancy = new KpiOccupancyDto
                {
                    OccupancyPercentage = occupancyPercentage,
                    OccupiedCount = occupiedSpots,
                    TotalSpots = totalSpots,
                    Trend = (decimal)occupancyTrend
                },
                
                Entries = new KpiEntriesDto
                {
                    TotalEntriesCount = totalEntriesCount,
                    Trend = (decimal)entriesTrend,
                    AverageEntriesPerHour = avgEntriesPerHour,
                    PeakHour = peakHour
                },
                
                PeakHour = new KpiPeakHourDto
                {
                    HourFrom = peakHourFrom,
                    HourTo = peakHourTo,
                    OccupancyPercentage = peakOccupancyPercentage,
                    EntriesCount = peakHourEntries
                },
                
                LastUpdated = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            throw new ApplicationException("Error calculating KPI overview", ex);
        }
    }

    public async Task<List<SpotRankingDetailedDto>> GetRankingAsync(string parkingLotId, string timePeriod)
    {
        var (dateFrom, dateTo) = GetDateRange(timePeriod);

        var spots = await _context.ParkingSpots
            .Where(s => s.ParkingLotId.ToString() == parkingLotId)
            .ToListAsync();

        var sessions = await _context.ParkingSessions
            .Where(s => s.ParkingLotId.ToString() == parkingLotId && 
                        s.EntryTime >= dateFrom && 
                        s.EntryTime <= dateTo)
            .ToListAsync();

        var totalSpots = spots.Count;
        var periodMinutes = (int)(dateTo - dateFrom).TotalMinutes;

        var ranking = spots.Select((spot, idx) => 
        {
            var spotSessions = sessions.Where(s => s.SpotId.ToString() == spot.Id.ToString()).ToList();
            
            var useCount = spotSessions.Count;
            var totalDurationMinutes = spotSessions
                .Where(s => s.ExitTime.HasValue)
                .Sum(s => (int?)(s.ExitTime.Value - s.EntryTime).TotalMinutes) ?? 0;
            
            var avgDurationMinutes = useCount > 0 
                ? (decimal)totalDurationMinutes / useCount 
                : 0;

            var occupancyRate = periodMinutes > 0 
                ? (decimal)totalDurationMinutes / periodMinutes * 100 
                : 0;

            var maxUseCount = sessions.GroupBy(s => s.SpotId).Max(g => g.Count());

            // Badge logic
            var badge = "";
            if (idx == 0) badge = "🔥";
            else if (idx < 3) badge = "⭐";
            else if (idx >= totalSpots - 3) badge = "🧊";

            return new SpotRankingDetailedDto
            {
                Rank = idx + 1,
                SpotNumber = spot.SpotNumber,
                SpotId = spot.Id.ToString(),
                
                UseCount = useCount,
                MaxUseCount = maxUseCount,
                
                AverageDurationMinutes = avgDurationMinutes,
                OccupancyRate = Math.Min(100, occupancyRate),
                
                Status = spot.Status.ToString(),
                FrequencyBadge = badge
            };
        })
        .OrderByDescending(r => r.UseCount)
        .ToList()
        .Select((r, idx) => 
        {
            r.Rank = idx + 1;
            return r;
        })
        .ToList();

        return ranking;
    }

    // ===== HELPERS =====

    private (DateTime, DateTime) GetDateRange(string timePeriod)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        return timePeriod switch
        {
            "today" => (today, now),
            "yesterday" => (today.AddDays(-1), today),
            "lastWeek" => (today.AddDays(-7), now),
            "lastMonth" => (today.AddMonths(-1), now),
            _ => (today, now)
        };
    }

    private string GetPreviousPeriod(string timePeriod) => timePeriod switch
    {
        "today" => "yesterday",
        "yesterday" => "today", // Use today as comparison
        "lastWeek" => "lastWeek", // Need to adjust logic here
        "lastMonth" => "lastMonth",
        _ => "today"
    };

    private async Task<decimal> CalculateAverageOccupancy(string parkingLotId, DateTime from, DateTime to)
    {
        var totalSpots = await _context.ParkingSpots
            .CountAsync(s => s.ParkingLotId.ToString() == parkingLotId);

        if (totalSpots == 0) return 0;

        var occupiedSpots = await _context.ParkingSessions
            .Where(s => s.ParkingLotId.ToString() == parkingLotId && 
                       s.EntryTime >= from && 
                       s.EntryTime <= to)
            .Select(s => s.SpotId)
            .Distinct()
            .CountAsync();

        return (decimal)occupiedSpots / totalSpots * 100;
    }
}
```

---

### Passo 4: Registrar Service no DI

**Arquivo**: `src/Application/DependencyInjection.cs`

```csharp
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IKpiService, KpiService>();
        // ... outros services
        return services;
    }
}
```

---

### Passo 5: Criar Controller

**Arquivo**: `src/API/Controllers/KpiController.cs`

```csharp
namespace ParkingSystem.API.Controllers;

using Microsoft.AspNetCore.Mvc;
using Application.Interfaces;
using Application.DTOs.Kpi;
using Application.Common;

[ApiController]
[Route("api/[controller]")]
public class KpiController : ControllerBase
{
    private readonly IKpiService _kpiService;
    private readonly ILogger<KpiController> _logger;

    public KpiController(IKpiService kpiService, ILogger<KpiController> logger)
    {
        _kpiService = kpiService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/kpi/overview
    /// Retorna KPI overview do dashboard (ocupação, entradas, horário de pico)
    /// </summary>
    /// <param name="parkingLotId">ID do estacionamento</param>
    /// <param name="timePeriod">Período: today, yesterday, lastWeek, lastMonth</param>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(ApiResponse<KpiOverviewResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<KpiOverviewResponseDto>>> GetOverview(
        [FromQuery] string parkingLotId,
        [FromQuery] string timePeriod = "today")
    {
        try
        {
            var data = await _kpiService.GetOverviewAsync(parkingLotId, timePeriod);
            
            return Ok(new ApiResponse<KpiOverviewResponseDto>
            {
                Success = true,
                Data = data,
                Message = "KPI overview retrieved successfully",
                StatusCode = StatusCodes.Status200OK
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting KPI overview");
            
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error retrieving KPI overview",
                    StatusCode = StatusCodes.Status500InternalServerError
                });
        }
    }

    /// <summary>
    /// GET /api/kpi/ranking
    /// Retorna ranking de vagas por frequência de uso
    /// </summary>
    /// <param name="parkingLotId">ID do estacionamento</param>
    /// <param name="timePeriod">Período: today, yesterday, lastWeek, lastMonth</param>
    [HttpGet("ranking")]
    [ProducesResponseType(typeof(ApiResponse<List<SpotRankingDetailedDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<SpotRankingDetailedDto>>>> GetRanking(
        [FromQuery] string parkingLotId,
        [FromQuery] string timePeriod = "today")
    {
        try
        {
            var data = await _kpiService.GetRankingAsync(parkingLotId, timePeriod);
            
            return Ok(new ApiResponse<List<SpotRankingDetailedDto>>
            {
                Success = true,
                Data = data,
                Message = "Ranking retrieved successfully",
                StatusCode = StatusCodes.Status200OK
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ranking");
            
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new ApiResponse<object>
                {
                    Success = false,
                    Message = "Error retrieving ranking",
                    StatusCode = StatusCodes.Status500InternalServerError
                });
        }
    }
}
```

---

### Passo 6: CSV Export (Adicionar ao ReportsController existente)

**Arquivo**: `src/API/Controllers/ReportsController.cs` (Adicionar método)

```csharp
/// <summary>
/// GET /api/reports/export-csv
/// Exporta relatório em formato CSV
/// </summary>
[HttpGet("export-csv")]
[ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
public async Task<ActionResult> ExportToCsv(
    [FromQuery] string reportId,
    [FromQuery] string parkingLotId,
    [FromQuery] string dateFrom,
    [FromQuery] string dateTo)
{
    try
    {
        var (start, end) = ParseDateRange(dateFrom, dateTo);

        var csvContent = reportId switch
        {
            "history" => await GenerateHistoryCsv(parkingLotId, start, end),
            "occupancy" => await GenerateOccupancyCsv(parkingLotId, start, end),
            "duration" => await GenerateDurationCsv(parkingLotId, start, end),
            "ranking" => await GenerateRankingCsv(parkingLotId, start, end),
            _ => throw new ArgumentException("Invalid reportId")
        };

        var fileName = $"relatorio-{reportId}-{DateTime.Now:yyyy-MM-dd}.csv";
        
        return File(
            Encoding.UTF8.GetBytes(csvContent),
            "text/csv",
            fileName);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error exporting CSV");
        
        return StatusCode(StatusCodes.Status500InternalServerError, 
            new { success = false, message = "Error exporting CSV" });
    }
}

// Helpers para gerar CSV
private async Task<string> GenerateHistoryCsv(string parkingLotId, DateTime from, DateTime to)
{
    var sessions = await _context.ParkingSessions
        .Where(s => s.ParkingLotId.ToString() == parkingLotId && 
                    s.EntryTime >= from && s.EntryTime <= to)
        .OrderByDescending(s => s.EntryTime)
        .ToListAsync();

    var sb = new StringBuilder();
    sb.AppendLine("spotNumber,licensePlate,entryTime,exitTime,duration,amount");
    
    foreach (var session in sessions)
    {
        sb.AppendLine($"\"{session.Spot.SpotNumber}\",\"{session.Vehicle.LicensePlate}\"," +
                     $"\"{session.EntryTime:yyyy-MM-ddTHH:mm:ss}\"," +
                     $"\"{session.ExitTime?.ToString("yyyy-MM-ddTHH:mm:ss") ?? ""}\"," +
                     $"\"{(session.ExitTime - session.EntryTime) ?? TimeSpan.Zero}\"," +
                     $"\"{session.Payment?.Amount ?? 0:F2}\"");
    }

    return sb.ToString();
}

// ... GenerateOccupancyCsv, GenerateDurationCsv, GenerateRankingCsv ...
```

---

## ✅ Checklist de Implementação

- [ ] Criar DTOs (KpiOverviewResponseDto, SpotRankingDetailedDto)
- [ ] Criar interface: IKpiService
- [ ] Implementar KpiService
- [ ] Registrar service no DI container
- [ ] Criar KpiController com endpoints /overview e /ranking
- [ ] Adicionar método ExportToCsv ao ReportsController
- [ ] Testar endpoints com Postman
- [ ] Verificar CORS no Program.cs (permitir localhost:3000)
- [ ] Deploy no Docker
- [ ] Testar com frontend

---

## 📊 SQL Queries de Suporte (se precisar)

### Calcular ocupação atual
```sql
SELECT 
    COUNT(DISTINCT ps.Id) as OccupiedSpots,
    COUNT(DISTINCT p.Id) as TotalSpots,
    (COUNT(DISTINCT ps.Id) * 100.0 / COUNT(DISTINCT p.Id)) as OccupancyPercentage
FROM ParkingLots pl
LEFT JOIN ParkingSpots p ON pl.Id = p.ParkingLotId
LEFT JOIN ParkingSessions ps ON p.Id = ps.SpotId AND ps.ExitTime IS NULL
WHERE pl.Id = @parkingLotId;
```

### Top 5 vagas mais usadas
```sql
SELECT TOP 5
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as Rank,
    p.SpotNumber,
    p.Id as SpotId,
    COUNT(*) as UseCount,
    AVG(DATEDIFF(MINUTE, ps.EntryTime, ps.ExitTime)) as AvgDurationMinutes
FROM ParkingSpots p
INNER JOIN ParkingSessions ps ON p.Id = ps.SpotId
WHERE p.ParkingLotId = @parkingLotId
    AND ps.EntryTime >= @dateFrom
    AND ps.EntryTime <= @dateTo
GROUP BY p.SpotNumber, p.Id
ORDER BY UseCount DESC;
```

---

## 🚀 Próximas Etapas

1. Implementar os endpoints conforme guia
2. Testar com Postman/curl
3. Fazer testes de integração com frontend
4. Publicar no Docker
5. Monitorar performance em produção (com logs)

