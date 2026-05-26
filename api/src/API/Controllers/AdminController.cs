using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingSystem.Application.Common;
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

            // ── "Hoje" no fuso de São Paulo → convertido para UTC para query no banco ──
            var nowBr        = BrazilClock.Now;
            var todayBr      = nowBr.Date;
            var tomorrowBr   = todayBr.AddDays(1);
            var todayUtc     = BrazilClock.ToUtc(todayBr);
            var tomorrowUtc  = BrazilClock.ToUtc(tomorrowBr);

            // ── Faturamento de hoje ────────────────────────────────
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
            var monthStartBr  = new DateTime(nowBr.Year, nowBr.Month, 1);
            var monthStartUtc = BrazilClock.ToUtc(monthStartBr);
            var daysInMonth   = DateTime.DaysInMonth(nowBr.Year, nowBr.Month);
            var daysElapsed   = Math.Max(1, nowBr.Day);

            var monthRevenue = await _db.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId
                         && s.StartTime >= monthStartUtc
                         && s.StartTime < tomorrowUtc
                         && s.Status == SessionStatus.Completed
                         && s.TotalAmount.HasValue)
                .SumAsync(s => s.TotalAmount!.Value);

            var dailyAverage   = Math.Round(monthRevenue / daysElapsed, 2);
            var monthlyEstimate = Math.Round(dailyAverage * daysInMonth, 2);

            // ── Top 5 vagas disputadas (últimos 30 dias) ───────────
            var thirtyDaysAgoUtc = BrazilClock.ToUtc(todayBr.AddDays(-30));

            // Traz para memória antes de calcular TotalMinutes (TimeSpan não é traduzível pelo EF/MySQL)
            var sessionsRaw = await _db.ParkingSessions
                .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId
                         && s.StartTime >= thirtyDaysAgoUtc
                         && s.Status == SessionStatus.Completed)
                .Select(s => new
                {
                    s.ParkingSpotId,
                    s.ParkingSpot.SpotNumber,
                    s.ParkingSpot.Status,
                    DurationTicks = s.Duration.HasValue ? (long?)s.Duration.Value.Ticks : null
                })
                .ToListAsync();

            var topSpots = sessionsRaw
                .GroupBy(s => new { s.ParkingSpotId, s.SpotNumber, s.Status })
                .Select(g => new AdminTopSpotDto(
                    g.Key.SpotNumber,
                    g.Count(),
                    Math.Round(g.Where(x => x.DurationTicks.HasValue)
                                .Select(x => TimeSpan.FromTicks(x.DurationTicks!.Value).TotalMinutes)
                                .DefaultIfEmpty(0)
                                .Average(), 1),
                    g.Key.Status == ParkingSpotStatus.Occupied   ? "Ocupada"    :
                    g.Key.Status == ParkingSpotStatus.Reserved   ? "Reservada"  :
                    g.Key.Status == ParkingSpotStatus.Maintenance ? "Manutenção" : "Livre"
                ))
                .OrderByDescending(x => x.UseCount)
                .Take(5)
                .ToList();

            var result = new AdminOverviewDto(
                ParkingLotId:           parkingLotId,
                ParkingLotName:         lot.Name,
                TotalSpots:             totalSpots,
                OccupiedSpots:          occupiedSpots,
                FreeSpots:              totalSpots - occupiedSpots,
                OccupancyPercentage:    occupancyPct,
                RevenueTodayTotal:      revenueTodayTotal,
                SessionsTodayCount:     sessionsTodayCount,
                AverageTicketToday:     averageTicketToday,
                MonthlyRevenueEstimate: monthlyEstimate,
                MonthlyRevenueSoFar:    monthRevenue,
                DailyAverageRevenue:    dailyAverage,
                DaysElapsedInMonth:     daysElapsed,
                DaysInMonth:            daysInMonth,
                TopSpots:               topSpots,
                GeneratedAt:            nowBr   // exibe horário de SP no campo generatedAt
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
    /// Os timestamps são convertidos para o fuso de São Paulo antes de retornar.
    /// </summary>
    [HttpGet("logs/{parkingLotId:guid}")]
    public async Task<IActionResult> GetLogs(Guid parkingLotId, [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        try
        {
            var query = _db.SystemLogs.OrderByDescending(l => l.OccurredAt);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var raw = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new { l.Id, l.Event, l.Description, l.Source, l.OccurredAt })
                .ToListAsync();

            // Converte OccurredAt (UTC no banco) para horário de SP
            var items = raw.Select(l => new AdminLogDto(
                l.Id,
                l.Event,
                l.Description,
                l.Source,
                BrazilClock.ToLocal(l.OccurredAt)
            )).ToList();

            return Ok(new AdminLogsResultDto(items, totalCount, page, pageSize, totalPages));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Admin] Erro ao buscar logs");
            return StatusCode(500, new { success = false, message = "Erro ao carregar logs." });
        }
    }
}
