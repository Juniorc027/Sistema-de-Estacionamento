using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ParkingSystem.Application.DTOs.Dashboard;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ParkingSystem.Infrastructure.Services;

/// <summary>
/// Implementação: Dashboard Service
/// Realiza agregações complexas de dados do banco de dados
/// Usa nomes corretos de propriedades de entidades
/// </summary>
public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(AppDbContext context, ILogger<DashboardService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// GetOverviewAsync: Calcula ocupação, pico, giro e ranking em uma única query
    /// </summary>
    public async Task<DashboardOverviewDto> GetOverviewAsync(Guid parkingLotId)
    {
        try
        {
            // Validar parking lot existe
            var parkingLot = await _context.ParkingLots
                .FirstOrDefaultAsync(p => p.Id == parkingLotId);

            if (parkingLot == null)
            {
                _logger.LogWarning("Parking lot not found: {ParkingLotId}", parkingLotId);
                return null;
            }

            _logger.LogInformation("Calculating dashboard overview for: {ParkingLot}", parkingLot.Name);

            // ===== OCUPAÇÃO ATUAL =====
            var totalSpots = await _context.ParkingSpots
                .CountAsync(s => s.ParkingLotId == parkingLotId);

            // Sessões ativas: sem EndTime (ainda em progresso)
            var occupiedSpots = await _context.ParkingSessions
                .CountAsync(s => s.ParkingSpot.ParkingLotId == parkingLotId && s.EndTime == null);

            var occupancyPercentage = totalSpots > 0 
                ? (decimal)occupiedSpots / totalSpots * 100 
                : 0;

            var occupancyStatus = occupancyPercentage switch
            {
                >= 90 => "Alto",
                >= 60 => "Normal",
                _ => "Baixo"
            };

            // ===== GIRO DE VAGAS (ÚLTIMAS 24H) =====
            var last24Hours = DateTime.UtcNow.AddDays(-1);
            var sessions24h = await _context.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId && s.StartTime >= last24Hours)
                .ToListAsync();

            var entries24h = sessions24h.Count(s => s.StartTime >= last24Hours);
            var exits24h = sessions24h.Count(s => s.EndTime.HasValue && s.EndTime >= last24Hours);
            var avgEntriesPerHour = entries24h / 24m;
            var peakEntriesInHour = sessions24h
                .GroupBy(s => s.StartTime.Hour)
                .DefaultIfEmpty()
                .Max(g => g?.Count() ?? 0);

            // ===== HORÁRIO DE PICO (HOJE) =====
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var peakHourGroup = sessions24h
                .Where(s => s.StartTime >= todayStart && s.StartTime < todayEnd)
                .GroupBy(s => s.StartTime.Hour)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault();

            var peakHour = new PeakHourDto
            {
                Hour = peakHourGroup?.Key ?? DateTime.UtcNow.Hour,
                EntriesCount = peakHourGroup?.Count() ?? 0,
                OccupancyPercentage = (peakHourGroup?.Count() ?? 0) * 100m / Math.Max(1, totalSpots)
            };

            // ===== RANKING TOP 5 =====
            var spotStats = await _context.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId)
                .GroupBy(s => s.ParkingSpotId)
                .Select(g => new
                {
                    SpotId = g.Key,
                    EntryCount = g.Count(),
                    Sessions = g.Where(x => x.EndTime.HasValue).ToList()
                })
                .OrderByDescending(x => x.EntryCount)
                .Take(5)
                .ToListAsync();

            var topSpots = new List<SpotRankingItemDto>();
            for (int i = 0; i < spotStats.Count; i++)
            {
                var stat = spotStats[i];
                var spot = await _context.ParkingSpots
                    .FirstOrDefaultAsync(s => s.Id == stat.SpotId);

                if (spot != null)
                {
                    // Calcular duração média em C# (após trazer do banco)
                    var avgDurationMinutes = stat.Sessions.Count > 0
                        ? stat.Sessions.Average(x => (x.EndTime!.Value - x.StartTime).TotalMinutes)
                        : 0;

                    var utilizationRate = avgDurationMinutes > 0 
                        ? (stat.EntryCount * avgDurationMinutes) / (24 * 60) 
                        : 0;

                    string badge = i switch
                    {
                        0 => "🔥",
                        <= 2 => "⭐",
                        _ => ""
                    };

                    topSpots.Add(new SpotRankingItemDto
                    {
                        Rank = i + 1,
                        SpotId = stat.SpotId,
                        SpotNumber = spot.SpotNumber,
                        EntryCount = stat.EntryCount,
                        AverageOccupancyMinutes = (decimal)avgDurationMinutes,
                        UtilizationRate = Math.Min(100, (decimal)utilizationRate),
                        CurrentStatus = FormatSpotStatus(spot.Status),
                        Badge = badge
                    });
                }
            }

            _logger.LogInformation("Dashboard overview calculated successfully");

            return new DashboardOverviewDto
            {
                ParkingLotId = parkingLotId,
                ParkingLotName = parkingLot.Name,
                
                Occupancy = new OccupancyMetricDto
                {
                    OccupancyPercentage = occupancyPercentage,
                    OccupiedSpots = occupiedSpots,
                    TotalSpots = totalSpots,
                    TrendPercentage = 0,
                    OccupancyStatus = occupancyStatus
                },
                
                Throughput = new VehicleThroughputDto
                {
                    EntriesLast24Hours = entries24h,
                    ExitsLast24Hours = exits24h,
                    AverageEntriesPerHour = avgEntriesPerHour,
                    PeakEntriesInOneHour = peakEntriesInHour
                },
                
                PeakHour = peakHour,
                TopSpots = topSpots,
                LastUpdated = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating dashboard overview");
            throw;
        }
    }

    /// <summary>
    /// GetOccupancyTimelineAsync: Retorna ocupação por cada hora do dia (0-23)
    /// </summary>
    public async Task<OccupancyTimelineDto> GetOccupancyTimelineAsync(Guid parkingLotId)
    {
        try
        {
            _logger.LogInformation("Calculating occupancy timeline for parking lot: {ParkingLotId}", parkingLotId);

            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            // Todas as sessões que iniciaram hoje
            var sessions = await _context.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId && 
                           s.StartTime >= todayStart && 
                           s.StartTime < todayEnd)
                .ToListAsync();

            var totalSpots = await _context.ParkingSpots
                .CountAsync(s => s.ParkingLotId == parkingLotId);

            var hourlyData = new List<HourlyOccupancyDto>();

            for (int hour = 0; hour < 24; hour++)
            {
                var hourStart = todayStart.AddHours(hour);
                var hourEnd = hourStart.AddHours(1);

                // Entradas nessa hora
                var entriesInHour = sessions
                    .Count(s => s.StartTime >= hourStart && s.StartTime < hourEnd);

                // Saídas nessa hora
                var exitsInHour = sessions
                    .Count(s => s.EndTime.HasValue && s.EndTime >= hourStart && s.EndTime < hourEnd);

                // Sessões ativas nessa hora (entraram antes e ainda estão ativas ou saíram depois)
                var activeInHour = sessions
                    .Count(s => s.StartTime < hourEnd && (!s.EndTime.HasValue || s.EndTime >= hourStart));

                var averageOccupancy = totalSpots > 0 ? (decimal)activeInHour / totalSpots * 100 : 0;
                var peakOccupancy = totalSpots > 0 ? (decimal)entriesInHour / totalSpots * 100 : 0;

                hourlyData.Add(new HourlyOccupancyDto
                {
                    Hour = hour,
                    AverageOccupancy = averageOccupancy,
                    PeakOccupancy = peakOccupancy,
                    EntriesCount = entriesInHour,
                    ExitsCount = exitsInHour
                });
            }

            _logger.LogInformation("Occupancy timeline calculated for {Hour} hours", hourlyData.Count);

            return new OccupancyTimelineDto
            {
                ParkingLotId = parkingLotId,
                Date = todayStart,
                Hours = hourlyData
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting occupancy timeline for parking lot: {ParkingLotId}", parkingLotId);
            throw;
        }
    }

    /// <summary>
    /// GetSpotStatisticsAsync: Retorna ranking completo de vagas com estatísticas
    /// </summary>
    public async Task<SpotStatisticsDto> GetSpotStatisticsAsync(Guid parkingLotId)
    {
        try
        {
            _logger.LogInformation("Calculating spot statistics for parking lot: {ParkingLotId}", parkingLotId);

            var spots = await _context.ParkingSpots
                .Where(s => s.ParkingLotId == parkingLotId)
                .OrderBy(s => s.SpotNumber)
                .ToListAsync();

            // Estatísticas por vaga (histórico completo)
            var spotStats = await _context.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId)
                .GroupBy(s => s.ParkingSpotId)
                .Select(g => new
                {
                    SpotId = g.Key,
                    EntryCount = g.Count(),
                    Sessions = g.Where(x => x.EndTime.HasValue).ToList()
                })
                .OrderByDescending(x => x.EntryCount)
                .ToListAsync();

            var spotRankings = new List<SpotRankingItemDto>();

            for (int i = 0; i < spots.Count; i++)
            {
                var spot = spots[i];
                var stats = spotStats.FirstOrDefault(s => s.SpotId == spot.Id);

                var entryCount = stats?.EntryCount ?? 0;
                
                // Calcular duração em C# (após trazer do banco)
                var avgDurationMinutes = stats?.Sessions.Count > 0
                    ? stats.Sessions.Average(x => (x.EndTime!.Value - x.StartTime).TotalMinutes)
                    : 0;
                
                var totalDurationMinutes = stats?.Sessions.Count > 0
                    ? stats.Sessions.Sum(x => (x.EndTime!.Value - x.StartTime).TotalMinutes)
                    : 0;
                
                // Taxa de utilização: (horas totais de uso / horas possíveis de operação) * 100
                // Assumindo 365 dias * 24 horas
                var utilizationRate = totalDurationMinutes > 0
                    ? (totalDurationMinutes / (365 * 24 * 60)) * 100
                    : 0;

                // Badges: 🔥 top 1, ⭐ top 2-3, 🧊 bottom 3
                string badge = i switch
                {
                    0 => "🔥",
                    1 or 2 => "⭐",
                    _ when i >= spots.Count - 3 && spots.Count > 3 => "🧊",
                    _ => ""
                };

                spotRankings.Add(new SpotRankingItemDto
                {
                    Rank = i + 1,
                    SpotId = spot.Id,
                    SpotNumber = spot.SpotNumber,
                    EntryCount = entryCount,
                    AverageOccupancyMinutes = (decimal)avgDurationMinutes,
                    UtilizationRate = Math.Min(100, Math.Max(0, (decimal)utilizationRate)),
                    CurrentStatus = FormatSpotStatus(spot.Status),
                    Badge = badge
                });
            }

            // Cálculo de média e desvio padrão
            var averageUtilization = spotRankings.Count > 0 
                ? spotRankings.Average(s => s.UtilizationRate) 
                : 0;
            
            var variance = spotRankings.Count > 0
                ? spotRankings.Sum(s => Math.Pow((double)(s.UtilizationRate - averageUtilization), 2)) / spotRankings.Count
                : 0;
            
            var stdDev = (decimal)Math.Sqrt(variance);

            _logger.LogInformation("Spot statistics calculated for {Count} spots", spotRankings.Count);

            return new SpotStatisticsDto
            {
                ParkingLotId = parkingLotId,
                Spots = spotRankings,
                AverageUtilization = averageUtilization,
                StandardDeviation = stdDev,
                CalculatedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting spot statistics for parking lot: {ParkingLotId}", parkingLotId);
            throw;
        }
    }

    /// <summary>
    /// ExportSessionsAsCsvAsync: Exporta sessões de estacionamento em CSV
    /// Inclui: ID Vaga, Número Vaga, Placa, Entrada, Saída, Duração, Valor
    /// </summary>
    public async Task<byte[]> ExportSessionsAsCsvAsync(Guid parkingLotId, DateTime? from = null, DateTime? to = null)
    {
        try
        {
            from ??= DateTime.UtcNow.AddDays(-30);
            to ??= DateTime.UtcNow;

            _logger.LogInformation("Exporting sessions for parking lot {ParkingLotId} from {From} to {To}", 
                parkingLotId, from, to);

            var sessions = await _context.ParkingSessions
                .Include(s => s.ParkingSpot)
                .Include(s => s.VehicleEntry)
                .Include(s => s.Payment)
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId &&
                           s.StartTime >= from && s.StartTime <= to)
                .OrderByDescending(s => s.StartTime)
                .ToListAsync();

            var csv = new StringBuilder();

            // Headers em português
            csv.AppendLine("VagaID,VagaNumero,Placa,Entrada,Saida,Duracao,Valor");

            // Rows
            foreach (var session in sessions)
            {
                var duration = session.EndTime.HasValue
                    ? (session.EndTime.Value - session.StartTime).ToString(@"hh\:mm\:ss")
                    : "Em progresso";

                var amount = session.Payment?.Amount ?? session.TotalAmount ?? 0;

                csv.AppendLine($"\"{session.ParkingSpotId}\"," +
                               $"\"{session.ParkingSpot?.SpotNumber}\"," +
                               $"\"{session.VehicleEntry?.LicensePlate}\"," +
                               $"\"{session.StartTime:yyyy-MM-dd HH:mm:ss}\"," +
                               $"\"{(session.EndTime?.ToString("yyyy-MM-dd HH:mm:ss") ?? "")}\"," +
                               $"\"{duration}\"," +
                               $"\"{amount:F2}\"");
            }

            _logger.LogInformation("Exported {Count} sessions to CSV", sessions.Count);

            return Encoding.UTF8.GetBytes(csv.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting sessions to CSV for parking lot: {ParkingLotId}", parkingLotId);
            throw;
        }
    }

    /// <summary>
    /// Formatador auxiliar para status de vaga
    /// </summary>
    private static string FormatSpotStatus(ParkingSpotStatus status)
    {
        return status switch
        {
            ParkingSpotStatus.Free => "Livre",
            ParkingSpotStatus.Occupied => "Ocupada",
            ParkingSpotStatus.Reserved => "Reservada",
            ParkingSpotStatus.Maintenance => "Manutenção",
            _ => "Desconhecido"
        };
    }
}
