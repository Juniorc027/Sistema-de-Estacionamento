using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.DTOs.Report;
using ParkingSystem.Application.Services.Interfaces;

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

    /// <summary>Exporta relatório de sessões em CSV</summary>
    [HttpGet("export")]
    [AllowAnonymous]
    public async Task<IActionResult> ExportSessions(
        [FromQuery] Guid parkingLotId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        try
        {
            var csvBytes = await _dashboardService.ExportSessionsAsCsvAsync(parkingLotId, from, to);
            
            var fileName = $"relatorio-sessoes-{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.csv";
            return File(csvBytes, "text/csv", fileName);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Erro ao exportar relatório.", error = ex.Message });
        }
    }
}
