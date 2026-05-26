using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingSystem.Application.DTOs.Admin;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Infrastructure.Data;

namespace ParkingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminController> _logger;

    public AdminController(AppDbContext db, ILogger<AdminController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/admin/overview/{parkingLotId}
    /// Retorna todos os dados do painel admin em uma única chamada.
    /// </summary>
    [HttpGet("overview/{parkingLotId:guid}")]
    public async Task<IActionResult> GetOverview(Guid parkingLotId)
    {
        try
        {
            var lot = await _db.ParkingLots.FirstOrDefaultAsync(l => l.Id == parkingLotId);
            if (lot is null)
                return NotFound(new { success = false, message = "Estacionamento não encontrado." });

            // ── Vagas ──────────────────────────────────────────────
            var totalSpots = await _db.ParkingSpots.CountAsync(s => s.ParkingLotId == parkingLotId);
            var occupiedSpots = await _db.ParkingSpots.CountAsync(
                s => s.ParkingLotId == parkingLotId && s.Status == ParkingSpotStatus.Occupied);

            var occupancyPct = totalSpots > 0
                ? Math.Round((decimal)occupiedSpots / totalSpots * 100, 1)
                : 0m;

            // ── Faturamento de hoje ────────────────────────────────
            var todayUtc = DateTime.UtcNow.Date;
            var tomorrowUtc = todayUtc.AddDays(1);

            var todaySessions = await _db.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId
                         && s.StartTime >= todayUtc
                         && s.StartTime < tomorrowUtc
                         && s.Status == SessionStatus.Completed
                         && s.TotalAmount.HasValue)
                .Select(s => s.TotalAmount!.Value)
                .ToListAsync();

            var revenueTodayTotal = todaySessions.Sum();
            var sessionsTodayCount = todaySessions.Count;
            var averageTicketToday = sessionsTodayCount > 0
                ? Math.Round(revenueTodayTotal / sessionsTodayCount, 2)
                : 0m;

            // ── Estimativa mensal ──────────────────────────────────
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var daysInMonth = DateTime.DaysInMonth(DateTime.UtcNow.Year, DateTime.UtcNow.Month);
            var daysElapsed = Math.Max(1, DateTime.UtcNow.Day);

            var monthRevenue = await _db.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId
                         && s.StartTime >= monthStart
                         && s.StartTime < tomorrowUtc
                         && s.Status == SessionStatus.Completed
                         && s.TotalAmount.HasValue)
                .SumAsync(s => s.TotalAmount!.Value);

            var dailyAverage = Math.Round(monthRevenue / daysElapsed, 2);
            var monthlyEstimate = Math.Round(dailyAverage * daysInMonth, 2);

            // ── Top 5 vagas disputadas (últimos 30 dias) ───────────
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            var topRaw = await _db.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId
                         && s.StartTime >= thirtyDaysAgo
                         && s.Status == SessionStatus.Completed)
                .GroupBy(s => new { s.ParkingSpotId, s.ParkingSpot.SpotNumber, s.ParkingSpot.Status })
                .Select(g => new
                {
                    g.Key.SpotNumber,
                    g.Key.Status,
                    UseCount = g.Count(),
                    AvgDuration = g.Where(x => x.Duration.HasValue)
                                   .Average(x => (double?)x.Duration!.Value.TotalMinutes) ?? 0
                })
                .OrderByDescending(x => x.UseCount)
                .Take(5)
                .ToListAsync();

            var topSpots = topRaw.Select(x => new AdminTopSpotDto(
                x.SpotNumber,
                x.UseCount,
                Math.Round(x.AvgDuration, 1),
                x.Status == ParkingSpotStatus.Occupied ? "Ocupada" :
                x.Status == ParkingSpotStatus.Reserved ? "Reservada" :
                x.Status == ParkingSpotStatus.Maintenance ? "Manutenção" : "Livre"
            )).ToList();

            var result = new AdminOverviewDto(
                ParkingLotId: parkingLotId,
                ParkingLotName: lot.Name,
                TotalSpots: totalSpots,
                OccupiedSpots: occupiedSpots,
                FreeSpots: totalSpots - occupiedSpots,
                OccupancyPercentage: occupancyPct,
                RevenueTodayTotal: revenueTodayTotal,
                SessionsTodayCount: sessionsTodayCount,
                AverageTicketToday: averageTicketToday,
                MonthlyRevenueEstimate: monthlyEstimate,
                MonthlyRevenueSoFar: monthRevenue,
                DailyAverageRevenue: dailyAverage,
                DaysElapsedInMonth: daysElapsed,
                DaysInMonth: daysInMonth,
                TopSpots: topSpots,
                GeneratedAt: DateTime.UtcNow
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Admin] Erro ao calcular overview para lot {LotId}", parkingLotId);
            return StatusCode(500, new { success = false, message = "Erro interno ao carregar dados do admin." });
        }
    }

    /// <summary>
    /// GET /api/admin/logs/{parkingLotId}?page=1&pageSize=30
    /// Retorna logs do sistema paginados, mais recentes primeiro.
    /// </summary>
    [HttpGet("logs/{parkingLotId:guid}")]
    public async Task<IActionResult> GetLogs(Guid parkingLotId, [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        try
        {
            var query = _db.SystemLogs.OrderByDescending(l => l.OccurredAt);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new AdminLogDto(l.Id, l.Event, l.Description, l.Source, l.OccurredAt))
                .ToListAsync();

            return Ok(new AdminLogsResultDto(items, totalCount, page, pageSize, totalPages));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Admin] Erro ao buscar logs");
            return StatusCode(500, new { success = false, message = "Erro ao carregar logs." });
        }
    }
}
