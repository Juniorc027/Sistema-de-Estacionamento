using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Report;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

public class ReportService : IReportService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ReportService> _logger;

    public ReportService(IUnitOfWork uow, ILogger<ReportService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<ApiResponse<DailyReportDto>> GetDailyReportAsync(Guid parkingLotId, DateTime date)
    {
        var from = date.Date;
        var to = date.Date.AddDays(1).AddTicks(-1);

        var sessions = await _uow.ParkingSessions.GetByPeriodAsync(parkingLotId, from, to);
        var sessionList = sessions.ToList();

        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
        var totalSpots = lot?.TotalSpots ?? 1;
        var completed = sessionList.Count(s => s.Status == SessionStatus.Completed);
        var revenue = sessionList.Where(s => s.TotalAmount.HasValue).Sum(s => s.TotalAmount!.Value);
        var avgDuration = sessionList.Where(s => s.Duration.HasValue).Select(s => s.Duration!.Value.TotalMinutes)
            .DefaultIfEmpty(0).Average();
        var occupancyRate = totalSpots > 0 ? (double)sessionList.Count / (totalSpots * 24) * 100 : 0;

        var report = new DailyReportDto(date, sessionList.Count, completed, revenue, avgDuration, occupancyRate);
        return ApiResponse<DailyReportDto>.Ok(report);
    }

    public async Task<ApiResponse<MonthlyReportDto>> GetMonthlyReportAsync(Guid parkingLotId, int year, int month)
    {
        var from = new DateTime(year, month, 1);
        var to = from.AddMonths(1).AddTicks(-1);

        var sessions = await _uow.ParkingSessions.GetByPeriodAsync(parkingLotId, from, to);
        var sessionList = sessions.ToList();

        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
        var totalSpots = lot?.TotalSpots ?? 1;
        var completed = sessionList.Count(s => s.Status == SessionStatus.Completed);
        var revenue = sessionList.Where(s => s.TotalAmount.HasValue).Sum(s => s.TotalAmount!.Value);
        var avgDuration = sessionList.Where(s => s.Duration.HasValue).Select(s => s.Duration!.Value.TotalMinutes)
            .DefaultIfEmpty(0).Average();
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var occupancyRate = totalSpots > 0 ? (double)sessionList.Count / (totalSpots * 24 * daysInMonth) * 100 : 0;

        var dailyBreakdown = new List<DailyReportDto>();
        for (int d = 1; d <= daysInMonth; d++)
        {
            var day = new DateTime(year, month, d);
            var daySessions = sessionList.Where(s => s.StartTime.Date == day).ToList();
            var dayRevenue = daySessions.Where(s => s.TotalAmount.HasValue).Sum(s => s.TotalAmount!.Value);
            var dayAvg = daySessions.Where(s => s.Duration.HasValue).Select(s => s.Duration!.Value.TotalMinutes)
                .DefaultIfEmpty(0).Average();
            var dayOccupancy = totalSpots > 0 ? (double)daySessions.Count / (totalSpots * 24) * 100 : 0;

            dailyBreakdown.Add(new DailyReportDto(day, daySessions.Count,
                daySessions.Count(s => s.Status == SessionStatus.Completed), dayRevenue, dayAvg, dayOccupancy));
        }

        var report = new MonthlyReportDto(year, month,
            new DateTime(year, month, 1).ToString("MMMM"), sessionList.Count, completed,
            revenue, avgDuration, occupancyRate, dailyBreakdown);

        return ApiResponse<MonthlyReportDto>.Ok(report);
    }

    public async Task<ApiResponse<FinancialSummaryDto>> GetFinancialSummaryAsync(ReportFilterDto filter)
    {
        var revenue = await _uow.ParkingSessions.GetTotalRevenueAsync(filter.ParkingLotId, filter.From, filter.To);
        var payments = await _uow.Payments.GetByPeriodAsync(filter.From, filter.To);
        var paymentList = payments.ToList();
        var avgTicket = paymentList.Count > 0 ? paymentList.Average(p => p.Amount) : 0;

        var summary = new FinancialSummaryDto(revenue, paymentList.Count, avgTicket, filter.From, filter.To);
        return ApiResponse<FinancialSummaryDto>.Ok(summary);
    }

    public async Task<ApiResponse<IEnumerable<SessionReportItemDto>>> GetSessionsReportAsync(ReportFilterDto filter)
    {
        var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId, filter.From, filter.To);
        var query = sessions.ToList().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<SessionStatus>(filter.Status, out var status))
            query = query.Where(s => s.Status == status);

        if (filter.MinDurationMinutes.HasValue)
        {
            var min = filter.MinDurationMinutes.Value;
            query = query.Where(s => s.Duration.HasValue && s.Duration.Value.TotalMinutes >= min);
        }

        if (filter.MaxDurationMinutes.HasValue)
        {
            var max = filter.MaxDurationMinutes.Value;
            query = query.Where(s => s.Duration.HasValue && s.Duration.Value.TotalMinutes <= max);
        }

        var sessionList2 = query.ToList();
        var spotId = sessionList2.FirstOrDefault()?.ParkingSpotId ?? Guid.Empty;
        var result = sessionList2.Select(s => new SessionReportItemDto(
            s.Id,
            s.VehicleEntry != null ? s.VehicleEntry.LicensePlate : "",
            s.ParkingSpot != null ? s.ParkingSpot.SpotNumber : "",
            s.StartTime, s.EndTime,
            s.Duration.HasValue ? s.Duration.Value.TotalMinutes : (double?)null, s.TotalAmount,
            s.Status.ToString())).ToList();

        return ApiResponse<IEnumerable<SessionReportItemDto>>.Ok(result);
    }

    public async Task<byte[]> GenerateDailyReportPdfAsync(Guid parkingLotId, DateTime date)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var reportResult = await GetDailyReportAsync(parkingLotId, date);
        var report = reportResult.Data!;
        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Header().Column(col =>
                {
                    col.Item().Text($"Relatório Diário - {lot?.Name ?? "Estacionamento"}")
                        .FontSize(18).Bold().AlignCenter();
                    col.Item().Text($"Data: {date:dd/MM/yyyy}")
                        .FontSize(12).AlignCenter();
                });

                page.Content().PaddingTop(20).Column(col =>
                {
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                        });

                        void AddRow(string label, string value)
                        {
                            table.Cell().Padding(5).Text(label).Bold();
                            table.Cell().Padding(5).Text(value);
                        }

                        AddRow("Total de Entradas:", report.TotalEntries.ToString());
                        AddRow("Sessões Concluídas:", report.TotalSessionsCompleted.ToString());
                        AddRow("Receita Total:", $"R$ {report.TotalRevenue:F2}");
                        AddRow("Duração Média:", $"{report.AverageDurationMinutes:F1} min");
                        AddRow("Taxa de Ocupação:", $"{report.OccupancyRate:F1}%");
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Gerado em: ").FontSize(8);
                    text.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm")).FontSize(8);
                });
            });
        }).GeneratePdf();
    }

    public async Task<byte[]> GenerateMonthlyReportPdfAsync(Guid parkingLotId, int year, int month)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var reportResult = await GetMonthlyReportAsync(parkingLotId, year, month);
        var report = reportResult.Data!;
        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text($"Relatório Mensal - {lot?.Name ?? "Estacionamento"}")
                        .FontSize(18).Bold().AlignCenter();
                    col.Item().Text($"{report.MonthName} / {year}")
                        .FontSize(12).AlignCenter();
                });

                page.Content().PaddingTop(20).Column(col =>
                {
                    col.Item().Text("Resumo do Mês").FontSize(14).Bold();
                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                        });

                        void AddRow(string label, string value)
                        {
                            table.Cell().Padding(5).Text(label).Bold();
                            table.Cell().Padding(5).Text(value);
                        }

                        AddRow("Total de Entradas:", report.TotalEntries.ToString());
                        AddRow("Sessões Concluídas:", report.TotalSessionsCompleted.ToString());
                        AddRow("Receita Total:", $"R$ {report.TotalRevenue:F2}");
                        AddRow("Duração Média:", $"{report.AverageDurationMinutes:F1} min");
                        AddRow("Taxa de Ocupação:", $"{report.OccupancyRate:F1}%");
                    });

                    col.Item().PaddingTop(20).Text("Detalhe por Dia").FontSize(14).Bold();
                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(80);
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                        });

                        table.Header(header =>
                        {
                            header.Cell().Padding(4).Text("Data").Bold();
                            header.Cell().Padding(4).Text("Entradas").Bold();
                            header.Cell().Padding(4).Text("Receita").Bold();
                            header.Cell().Padding(4).Text("Ocupação").Bold();
                        });

                        foreach (var day in report.DailyBreakdown)
                        {
                            table.Cell().Padding(3).Text(day.Date.ToString("dd/MM"));
                            table.Cell().Padding(3).Text(day.TotalEntries.ToString());
                            table.Cell().Padding(3).Text($"R$ {day.TotalRevenue:F2}");
                            table.Cell().Padding(3).Text($"{day.OccupancyRate:F1}%");
                        }
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Gerado em: ").FontSize(8);
                    text.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm")).FontSize(8);
                });
            });
        }).GeneratePdf();
    }

    // ===== NOVOS MÉTODOS PARA DASHBOARD =====

    public async Task<PagedResult<HistoryReportDto>> GetHistoryAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] GetHistory: parkingLotId={LotId}, from={From}, to={To}, page={Page}, pageSize={PageSize}",
                filter.ParkingLotId, filter.DateFrom, filter.DateTo, filter.Page, filter.PageSize);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] GetHistory: parkingLotId is null");
                return new PagedResult<HistoryReportDto> { Items = new(), TotalCount = 0, CurrentPage = filter.Page, PageSize = filter.PageSize, TotalPages = 0 };
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            
            _logger.LogInformation("[Reports] GetHistory: Found {Count} sessions (Active + Completed)", allSessions.Count);
            foreach (var s in allSessions.Take(5))
                _logger.LogInformation("[Reports]   - Session: id={SessionId}, spot={Spot}, status={Status}, start={Start}, end={End}",
                    s.Id, s.ParkingSpot?.SpotNumber ?? "?", s.Status, s.StartTime, s.EndTime);

            var totalCount = allSessions.Count;

            var skip = (filter.Page - 1) * filter.PageSize;
            var pagedSessions = allSessions
                .OrderByDescending(s => s.StartTime)
                .Skip(skip)
                .Take(filter.PageSize)
                .ToList();

            var items = pagedSessions.Select(s => new HistoryReportDto(
                SessionId: s.Id,
                SpotId: s.ParkingSpotId,
                SpotNumber: s.ParkingSpot?.SpotNumber ?? "N/A",
                LicensePlate: s.VehicleEntry?.LicensePlate ?? "UNKNOWN",
                EntryTime: s.StartTime,
                ExitTime: s.EndTime,
                Duration: s.Duration,
                Amount: s.TotalAmount ?? 0m,
                ParkingLotName: s.ParkingSpot?.ParkingLot?.Name ?? "Unknown"
            )).ToList();

            var result = new PagedResult<HistoryReportDto>
            {
                Items = items,
                TotalCount = totalCount,
                CurrentPage = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };

            _logger.LogInformation("[Reports] GetHistory: Returning {ItemCount}/{TotalCount} items (page {Page}/{TotalPages})",
                items.Count, totalCount, filter.Page, result.TotalPages);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter histórico de relatórios");
            return new PagedResult<HistoryReportDto> 
            { 
                Items = new(), 
                TotalCount = 0, 
                CurrentPage = filter.Page, 
                PageSize = filter.PageSize,
                TotalPages = 0 
            };
        }
    }

    public async Task<List<HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] GetHourlyOccupancy: parkingLotId={LotId}, from={From}, to={To}",
                filter.ParkingLotId, filter.DateFrom, filter.DateTo);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] GetHourlyOccupancy: parkingLotId is null");
                return new List<HourlyOccupancyDto>();
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            _logger.LogInformation("[Reports] GetHourlyOccupancy: Found {Count} sessions", allSessions.Count);

            var lot = await _uow.ParkingLots.GetByIdAsync(filter.ParkingLotId.Value);
            var totalSpots = lot?.TotalSpots ?? 1;

            var result = new List<HourlyOccupancyDto>();

            for (int hour = 0; hour < 24; hour++)
            {
                var sessionsInHour = allSessions.Where(s =>
                    s.StartTime.Hour <= hour && 
                    (s.EndTime == null || s.EndTime.Value.Hour >= hour)
                ).ToList();

                var peakOccupied = sessionsInHour.Count;
                var occupancyRate = totalSpots > 0 ? ((decimal)peakOccupied / totalSpots) * 100 : 0;

                result.Add(new HourlyOccupancyDto(
                    Hour: filter.DateFrom.AddHours(hour),
                    AverageOccupancy: occupancyRate,
                    PeakOccupiedCount: peakOccupied,
                    TotalSpots: totalSpots
                ));
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter ocupação por hora");
            return new List<HourlyOccupancyDto>();
        }
    }

    public async Task<AverageDurationReportDto> GetAverageDurationAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] GetAverageDuration: parkingLotId={LotId}, from={From}, to={To}",
                filter.ParkingLotId, filter.DateFrom, filter.DateTo);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] GetAverageDuration: parkingLotId is null");
                return new AverageDurationReportDto(0, TimeSpan.Zero, TimeSpan.Zero, TimeSpan.Zero, 0, 0, 0);
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            _logger.LogInformation("[Reports] GetAverageDuration: Found {AllCount} total sessions", allSessions.Count);
            
            var completedSessions = allSessions.Where(s => s.Duration.HasValue).ToList();
            _logger.LogInformation("[Reports] GetAverageDuration: {CompletedCount} sessions with Duration (Completed)", completedSessions.Count);

            var totalSessions = completedSessions.Count;

            if (totalSessions == 0)
            {
                return new AverageDurationReportDto(
                    TotalSessions: 0,
                    AverageDuration: TimeSpan.Zero,
                    MinimumDuration: TimeSpan.Zero,
                    MaximumDuration: TimeSpan.Zero,
                    SessionsToday: 0,
                    SessionsThisWeek: 0,
                    SessionsThisMonth: 0
                );
            }

            var durations = completedSessions.Select(s => s.Duration.Value).ToList();
            var totalMilliseconds = durations.Sum(d => (long)d.TotalMilliseconds);
            var avgMilliseconds = totalMilliseconds / (long)durations.Count;
            var avgTimestamp = new TimeSpan(avgMilliseconds * 10000);
            var minDuration = durations.Min();
            var maxDuration = durations.Max();

            var today = DateTime.Now.Date;
            var sessionsToday = allSessions.Count(s => s.StartTime.Date == today);

            var weekStart = today.AddDays(-(int)today.DayOfWeek);
            var sessionsWeek = allSessions.Count(s => 
                s.StartTime >= weekStart && s.StartTime < weekStart.AddDays(7)
            );

            var monthStart = new DateTime(today.Year, today.Month, 1);
            var sessionsMonth = allSessions.Count(s =>
                s.StartTime >= monthStart && s.StartTime < monthStart.AddMonths(1)
            );

            return new AverageDurationReportDto(
                TotalSessions: totalSessions,
                AverageDuration: avgTimestamp,
                MinimumDuration: minDuration,
                MaximumDuration: maxDuration,
                SessionsToday: sessionsToday,
                SessionsThisWeek: sessionsWeek,
                SessionsThisMonth: sessionsMonth
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter duração média");
            return new AverageDurationReportDto(0, TimeSpan.Zero, TimeSpan.Zero, TimeSpan.Zero, 0, 0, 0);
        }
    }

    public async Task<List<SpotRankingDto>> GetSpotRankingAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] GetSpotRanking: parkingLotId={LotId}, from={From}, to={To}",
                filter.ParkingLotId, filter.DateFrom, filter.DateTo);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] GetSpotRanking: parkingLotId is null");
                return new List<SpotRankingDto>();
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            _logger.LogInformation("[Reports] GetSpotRanking: Found {Count} sessions (all spots combined)", allSessions.Count);

            var allSpots = await _uow.ParkingSpots.GetAllAsync();
            var spotsInLot = allSpots.Where(s => s.ParkingLotId == filter.ParkingLotId.Value).ToList();

            var lot = await _uow.ParkingLots.GetByIdAsync(filter.ParkingLotId.Value);
            var totalSpots = lot?.TotalSpots ?? spotsInLot.Count;

            var result = new List<SpotRankingDto>();

            foreach (var spot in spotsInLot.OrderBy(s => s.SpotNumber))
            {
                var spotSessions = allSessions.Where(s => s.ParkingSpotId == spot.Id).ToList();
                var useCount = spotSessions.Count;
                
                if (useCount > 0)
                    _logger.LogInformation("[Reports]   Spot {Spot}: {UseCount} sessions", spot.SpotNumber, useCount);

                decimal avgDurationMinutes = 0;
                var withDuration = spotSessions.Where(s => s.Duration.HasValue).ToList();
                if (withDuration.Any())
                {
                    var durations = withDuration.Select(s => s.Duration.Value.TotalMinutes).ToList();
                    avgDurationMinutes = (decimal)durations.Average();
                }

                var totalDuration = withDuration.Sum(s => s.Duration.Value.TotalHours);

                var occupancyRate = totalSpots > 0 
                    ? (decimal)(totalDuration / ((to - from).TotalHours * totalSpots)) * 100 
                    : 0;

                result.Add(new SpotRankingDto(
                    SpotNumber: spot.SpotNumber,
                    UseCount: useCount,
                    AverageDurationMinutes: avgDurationMinutes,
                    OccupancyRate: occupancyRate,
                    Status: spot.Status.ToString()
                ));
            }

            var ordered = result.OrderByDescending(r => r.UseCount).ToList();
            _logger.LogInformation("[Reports] GetSpotRanking: Returning {Count} spots (top 3: {Top3})",
                ordered.Count, string.Join(", ", ordered.Take(3).Select(r => $"{r.SpotNumber}({r.UseCount}x)")));
            return ordered;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter ranking de vagas");
            return new List<SpotRankingDto>();
        }
    }
}
