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

    public ReportsController(IReportService service)
    {
        _service = service;
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
}
