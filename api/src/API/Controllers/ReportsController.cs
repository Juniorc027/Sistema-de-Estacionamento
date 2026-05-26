using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.DTOs.Report;
using ParkingSystem.Application.Services.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ParkingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;
    private readonly IDashboardService _dashboardService;

    public ReportsController(IReportService service, IDashboardService dashboardService)
    {
        _service = service;
        _dashboardService = dashboardService;
    }

    /// <summary>Relatório diário (JSON)</summary>
    [HttpGet("daily/{parkingLotId:guid}")]
    public async Task<IActionResult> GetDaily(Guid parkingLotId, [FromQuery] DateTime date)
    {
        var result = await _service.GetDailyReportAsync(parkingLotId, date);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Relatório mensal (JSON)</summary>
    [HttpGet("monthly/{parkingLotId:guid}")]
    public async Task<IActionResult> GetMonthly(Guid parkingLotId, [FromQuery] int year, [FromQuery] int month)
    {
        var result = await _service.GetMonthlyReportAsync(parkingLotId, year, month);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Resumo financeiro por período</summary>
    [HttpGet("financial/{parkingLotId:guid}")]
    public async Task<IActionResult> GetFinancial(Guid parkingLotId, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        var filter = new ReportFilterDto(parkingLotId, from, to);
        var result = await _service.GetFinancialSummaryAsync(filter);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Relatório de sessões com filtros</summary>
    [HttpGet("sessions/{parkingLotId:guid}")]
    public async Task<IActionResult> GetSessions(Guid parkingLotId,
        [FromQuery] DateTime from, [FromQuery] DateTime to,
        [FromQuery] string? status = null,
        [FromQuery] double? minDuration = null,
        [FromQuery] double? maxDuration = null)
    {
        var filter = new ReportFilterDto(parkingLotId, from, to, status, minDuration, maxDuration);
        var result = await _service.GetSessionsReportAsync(filter);
        return StatusCode(result.StatusCode, result);
    }

    /// <summary>Gera e baixa relatório diário em PDF</summary>
    [HttpGet("daily/{parkingLotId:guid}/pdf")]
    public async Task<IActionResult> GetDailyPdf(Guid parkingLotId, [FromQuery] DateTime date)
    {
        var pdfBytes = await _service.GenerateDailyReportPdfAsync(parkingLotId, date);
        return File(pdfBytes, "application/pdf", $"relatorio-diario-{date:yyyy-MM-dd}.pdf");
    }

    /// <summary>Gera e baixa relatório mensal em PDF</summary>
    [HttpGet("monthly/{parkingLotId:guid}/pdf")]
    public async Task<IActionResult> GetMonthlyPdf(Guid parkingLotId, [FromQuery] int year, [FromQuery] int month)
    {
        var pdfBytes = await _service.GenerateMonthlyReportPdfAsync(parkingLotId, year, month);
        return File(pdfBytes, "application/pdf", $"relatorio-mensal-{year}-{month:D2}.pdf");
    }

    // ===== NOVOS ENDPOINTS PARA DASHBOARD =====

    /// <summary>Histórico de entradas/saídas com paginação</summary>
    [HttpGet("history")]
    [AllowAnonymous]
    public async Task<IActionResult> GetHistory(
        [FromQuery] Guid parkingLotId,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var filter = new ReportFilter(
            ParkingLotId: parkingLotId,
            DateFrom: dateFrom ?? DateTime.Now.AddDays(-7),
            DateTo: dateTo ?? DateTime.Now,
            Page: page,
            PageSize: pageSize
        );

        var result = await _service.GetHistoryAsync(filter);
        return Ok(result);
    }

    /// <summary>Ocupação agregada por hora</summary>
    [HttpGet("hourly-occupancy")]
    [AllowAnonymous]
    public async Task<IActionResult> GetHourlyOccupancy(
        [FromQuery] Guid parkingLotId,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        var filter = new ReportFilter(
            ParkingLotId: parkingLotId,
            DateFrom: dateFrom ?? DateTime.Now.Date,
            DateTo: dateTo ?? DateTime.Now,
            Page: 1,
            PageSize: 1000
        );

        var result = await _service.GetHourlyOccupancyAsync(filter);
        return Ok(result);
    }

    /// <summary>Estatísticas de duração média</summary>
    [HttpGet("average-duration")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAverageDuration(
        [FromQuery] Guid parkingLotId,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        var filter = new ReportFilter(
            ParkingLotId: parkingLotId,
            DateFrom: dateFrom ?? DateTime.Now.AddDays(-30),
            DateTo: dateTo ?? DateTime.Now,
            Page: 1,
            PageSize: 1000
        );

        var result = await _service.GetAverageDurationAsync(filter);
        return Ok(result);
    }

    /// <summary>Ranking de vagas por usando</summary>
    [HttpGet("spot-ranking")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSpotRanking(
        [FromQuery] Guid parkingLotId,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        var filter = new ReportFilter(
            ParkingLotId: parkingLotId,
            DateFrom: dateFrom ?? DateTime.Now.AddDays(-30),
            DateTo: dateTo ?? DateTime.Now,
            Page: 1,
            PageSize: 1000
        );

        var result = await _service.GetSpotRankingAsync(filter);
        return Ok(result);
    }

    /// <summary>Relatório de faturamento por período (breakdown por dia e por vaga)</summary>
    [HttpGet("revenue")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRevenue(
        [FromQuery] Guid parkingLotId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var result = await _service.GetRevenueReportAsync(
            parkingLotId,
            from ?? DateTime.Now.AddDays(-30),
            to ?? DateTime.Now);
        return Ok(result);
    }

    /// <summary>Comparativo de vagas mais e menos disputadas (com média e desvio padrão)</summary>
    [HttpGet("spot-comparison")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSpotComparison(
        [FromQuery] Guid parkingLotId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var result = await _service.GetSpotComparisonAsync(
            parkingLotId,
            from ?? DateTime.Now.AddDays(-30),
            to ?? DateTime.Now);
        return Ok(result);
    }

    /// <summary>Exporta relatório em CSV ou PDF. reportType: history|hourly|revenue|comparison|sessions</summary>
    [HttpGet("export")]
    [AllowAnonymous]
    public async Task<IActionResult> ExportReport(
        [FromQuery] Guid parkingLotId,
        [FromQuery] string reportType = "sessions",
        [FromQuery] string format = "csv",
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        try
        {
            var dateFrom = from ?? DateTime.Now.AddDays(-30);
            var dateTo = to ?? DateTime.Now;
            var isPdf = format.Equals("pdf", StringComparison.OrdinalIgnoreCase);

            switch (reportType.ToLower())
            {
                case "revenue":
                {
                    var data = await _service.GetRevenueReportAsync(parkingLotId, dateFrom, dateTo);
                    if (isPdf)
                    {
                        var pdf = GenerateRevenuePdf(data);
                        return File(pdf, "application/pdf", $"faturamento-{DateTime.Now:yyyy-MM-dd}.pdf");
                    }
                    var csv = BuildRevenueCsv(data);
                    return File(csv, "text/csv", $"faturamento-{DateTime.Now:yyyy-MM-dd}.csv");
                }
                case "comparison":
                {
                    var data = await _service.GetSpotComparisonAsync(parkingLotId, dateFrom, dateTo);
                    if (isPdf)
                    {
                        var pdf = GenerateComparisonPdf(data);
                        return File(pdf, "application/pdf", $"vagas-comparativo-{DateTime.Now:yyyy-MM-dd}.pdf");
                    }
                    var csv = BuildComparisonCsv(data);
                    return File(csv, "text/csv", $"vagas-comparativo-{DateTime.Now:yyyy-MM-dd}.csv");
                }
                case "history":
                {
                    var filter = new ReportFilter(parkingLotId, dateFrom, dateTo, 1, 10000);
                    var data = await _service.GetHistoryAsync(filter);
                    if (isPdf)
                    {
                        var pdf = GenerateHistoryPdf(data.Items, data.TotalCount);
                        return File(pdf, "application/pdf", $"historico-{DateTime.Now:yyyy-MM-dd}.pdf");
                    }
                    var csv = BuildHistoryCsv(data.Items);
                    return File(csv, "text/csv", $"historico-{DateTime.Now:yyyy-MM-dd}.csv");
                }
                default:
                {
                    var csvBytes = await _dashboardService.ExportSessionsAsCsvAsync(parkingLotId, from, to);
                    return File(csvBytes, "text/csv", $"sessoes-{DateTime.Now:yyyy-MM-dd}.csv");
                }
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Erro ao exportar relatório.", error = ex.Message });
        }
    }

    // ===== HELPERS DE GERAÇÃO DE ARQUIVO =====

    private static byte[] BuildRevenueCsv(Application.DTOs.Report.RevenueReportDto data)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Relatório de Faturamento - {data.ParkingLotName}");
        sb.AppendLine($"Período: {data.From:dd/MM/yyyy} a {data.To:dd/MM/yyyy}");
        sb.AppendLine($"Tarifa: R$ {data.RatePerMinute:F2}/min");
        sb.AppendLine($"Total: R$ {data.TotalRevenue:F2} | Sessões: {data.SessionsCount} | Ticket Médio: R$ {data.AverageTicket:F2}");
        sb.AppendLine();
        sb.AppendLine("Data,Sessões,Faturamento,Duração Média (min)");
        foreach (var d in data.PerDay)
            sb.AppendLine($"{d.Date:dd/MM/yyyy},{d.SessionsCount},R$ {d.Revenue:F2},{d.AverageDurationMinutes:F1}");
        sb.AppendLine();
        sb.AppendLine("Vaga,Sessões,Faturamento,Duração Média (min)");
        foreach (var s in data.PerSpot)
            sb.AppendLine($"{s.SpotNumber},{s.SessionsCount},R$ {s.Revenue:F2},{s.AverageDurationMinutes:F1}");
        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static byte[] BuildComparisonCsv(Application.DTOs.Report.SpotComparisonDto data)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Comparativo de Vagas - {data.ParkingLotName}");
        sb.AppendLine($"Período: {data.From:dd/MM/yyyy} a {data.To:dd/MM/yyyy}");
        sb.AppendLine($"Média de Uso: {data.AverageUseCount:F1} | Desvio Padrão: {data.StandardDeviation:F1}");
        sb.AppendLine();
        sb.AppendLine("Vaga,Usos,Duração Média (min),Taxa Ocupação (%),Status,Nível de Disputa");
        foreach (var s in data.AllSpots)
            sb.AppendLine($"{s.SpotNumber},{s.UseCount},{s.AverageDurationMinutes:F1},{s.OccupancyRate:F2},{s.CurrentStatus},{s.CompetitivenessLabel}");
        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static byte[] BuildHistoryCsv(IEnumerable<Application.DTOs.Report.HistoryReportDto> items)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Vaga,Placa,Entrada,Saída,Duração (min),Valor");
        foreach (var h in items)
        {
            var dur = h.Duration.HasValue ? h.Duration.Value.TotalMinutes.ToString("F1") : "-";
            sb.AppendLine($"{h.SpotNumber},{h.LicensePlate},{h.EntryTime:dd/MM/yyyy HH:mm},{h.ExitTime?.ToString("dd/MM/yyyy HH:mm") ?? "-"},{dur},R$ {h.Amount:F2}");
        }
        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static byte[] GenerateRevenuePdf(Application.DTOs.Report.RevenueReportDto data)
    {
        return QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(QuestPDF.Helpers.PageSizes.A4);
                page.Margin(2, QuestPDF.Infrastructure.Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10));
                page.Header().Column(col =>
                {
                    col.Item().Text($"Faturamento — {data.ParkingLotName}").FontSize(16).Bold().AlignCenter();
                    col.Item().Text($"{data.From:dd/MM/yyyy} a {data.To:dd/MM/yyyy}  |  Tarifa: R$ {data.RatePerMinute:F2}/min").FontSize(10).AlignCenter();
                });
                page.Content().PaddingTop(15).Column(col =>
                {
                    col.Item().Text($"Total: R$ {data.TotalRevenue:F2}  |  Sessões: {data.SessionsCount}  |  Ticket Médio: R$ {data.AverageTicket:F2}").Bold();
                    col.Item().PaddingTop(10).Text("Por Dia").FontSize(12).Bold();
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); });
                        table.Header(h => { h.Cell().Text("Data").Bold(); h.Cell().Text("Sessões").Bold(); h.Cell().Text("Faturamento").Bold(); h.Cell().Text("Duração Média").Bold(); });
                        foreach (var d in data.PerDay)
                        {
                            table.Cell().Padding(3).Text(d.Date.ToString("dd/MM/yyyy"));
                            table.Cell().Padding(3).Text(d.SessionsCount.ToString());
                            table.Cell().Padding(3).Text($"R$ {d.Revenue:F2}");
                            table.Cell().Padding(3).Text($"{d.AverageDurationMinutes:F1} min");
                        }
                    });
                    col.Item().PaddingTop(10).Text("Por Vaga").FontSize(12).Bold();
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); });
                        table.Header(h => { h.Cell().Text("Vaga").Bold(); h.Cell().Text("Sessões").Bold(); h.Cell().Text("Faturamento").Bold(); h.Cell().Text("Duração Média").Bold(); });
                        foreach (var s in data.PerSpot)
                        {
                            table.Cell().Padding(3).Text(s.SpotNumber);
                            table.Cell().Padding(3).Text(s.SessionsCount.ToString());
                            table.Cell().Padding(3).Text($"R$ {s.Revenue:F2}");
                            table.Cell().Padding(3).Text($"{s.AverageDurationMinutes:F1} min");
                        }
                    });
                });
                page.Footer().AlignCenter().Text($"Gerado em {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(8);
            });
        }).GeneratePdf();
    }

    private static byte[] GenerateComparisonPdf(Application.DTOs.Report.SpotComparisonDto data)
    {
        return QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(QuestPDF.Helpers.PageSizes.A4);
                page.Margin(2, QuestPDF.Infrastructure.Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10));
                page.Header().Column(col =>
                {
                    col.Item().Text($"Comparativo de Vagas — {data.ParkingLotName}").FontSize(16).Bold().AlignCenter();
                    col.Item().Text($"{data.From:dd/MM/yyyy} a {data.To:dd/MM/yyyy}  |  Média: {data.AverageUseCount:F1} usos  |  Desvio: {data.StandardDeviation:F1}").FontSize(10).AlignCenter();
                });
                page.Content().PaddingTop(15).Column(col =>
                {
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); });
                        table.Header(h =>
                        {
                            h.Cell().Text("Vaga").Bold(); h.Cell().Text("Usos").Bold();
                            h.Cell().Text("Dur. Média (min)").Bold(); h.Cell().Text("Ocupação (%)").Bold();
                            h.Cell().Text("Nível Disputa").Bold();
                        });
                        foreach (var s in data.AllSpots)
                        {
                            table.Cell().Padding(3).Text(s.SpotNumber);
                            table.Cell().Padding(3).Text(s.UseCount.ToString());
                            table.Cell().Padding(3).Text($"{s.AverageDurationMinutes:F1}");
                            table.Cell().Padding(3).Text($"{s.OccupancyRate:F2}%");
                            table.Cell().Padding(3).Text(s.CompetitivenessLabel);
                        }
                    });
                });
                page.Footer().AlignCenter().Text($"Gerado em {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(8);
            });
        }).GeneratePdf();
    }

    private static byte[] GenerateHistoryPdf(IEnumerable<Application.DTOs.Report.HistoryReportDto> items, int total)
    {
        return QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(QuestPDF.Helpers.PageSizes.A4);
                page.Margin(2, QuestPDF.Infrastructure.Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(9));
                page.Header().Column(col =>
                {
                    col.Item().Text("Histórico de Ocupação").FontSize(16).Bold().AlignCenter();
                    col.Item().Text($"Total de registros: {total}").FontSize(10).AlignCenter();
                });
                page.Content().PaddingTop(15).Table(table =>
                {
                    table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn(); });
                    table.Header(h =>
                    {
                        h.Cell().Text("Vaga").Bold(); h.Cell().Text("Placa").Bold();
                        h.Cell().Text("Entrada").Bold(); h.Cell().Text("Saída").Bold();
                        h.Cell().Text("Duração (min)").Bold(); h.Cell().Text("Valor").Bold();
                    });
                    foreach (var r in items)
                    {
                        var dur = r.Duration.HasValue ? r.Duration.Value.TotalMinutes.ToString("F1") : "-";
                        table.Cell().Padding(2).Text(r.SpotNumber);
                        table.Cell().Padding(2).Text(r.LicensePlate);
                        table.Cell().Padding(2).Text(r.EntryTime.ToString("dd/MM HH:mm"));
                        table.Cell().Padding(2).Text(r.ExitTime?.ToString("dd/MM HH:mm") ?? "-");
                        table.Cell().Padding(2).Text(dur);
                        table.Cell().Padding(2).Text($"R$ {r.Amount:F2}");
                    }
                });
                page.Footer().AlignCenter().Text($"Gerado em {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(8);
            });
        }).GeneratePdf();
    }
}
