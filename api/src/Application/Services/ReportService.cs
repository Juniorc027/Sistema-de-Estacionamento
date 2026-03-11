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
        var query = sessions.AsQueryable();

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
        var result = sessionList2.Select(s => new SessionReportItemDto(
            s.Id,
            s.VehicleEntry != null ? s.VehicleEntry.LicensePlate : "",
            s.ParkingSpot != null ? s.ParkingSpot.SpotNumber : "",
            s.StartTime, s.EndTime,
            s.Duration.HasValue ? s.Duration.Value.TotalMinutes : (double?)null, s.TotalAmount,
            s.Status.ToString()));

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
}
