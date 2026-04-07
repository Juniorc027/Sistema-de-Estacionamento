using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.DTOs.Dashboard;
using ParkingSystem.Application.Services.Interfaces;
using System;
using System.Threading.Tasks;

namespace ParkingSystem.API.Controllers;

/// <summary>
/// Dashboard Controller — Dados agregados em tempo real
/// Fornece métricas de ocupação, giro de vagas, horário de pico e ranking
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(IDashboardService dashboardService, ILogger<DashboardController> logger)
    {
        _dashboardService = dashboardService;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/dashboard/overview
    /// Retorna visão geral do Dashboard com métricas em tempo real
    /// </summary>
    /// <param name="parkingLotId">ID do estacionamento (GUID)</param>
    /// <returns>DashboardOverviewDto com ocupação, giro, pico e ranking</returns>
    [HttpGet("overview/{parkingLotId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(DashboardOverviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetOverview(Guid parkingLotId)
    {
        try
        {
            _logger.LogInformation("📊 Dashboard overview requested for parkingLotId: {ParkingLotId}", parkingLotId);

            var overview = await _dashboardService.GetOverviewAsync(parkingLotId);

            if (overview == null)
            {
                _logger.LogWarning("⚠️ Parking lot not found: {ParkingLotId}", parkingLotId);
                return NotFound(new { success = false, message = "Parking lot not found" });
            }

            _logger.LogInformation("✅ Dashboard overview retrieved successfully for {ParkingLotId}", parkingLotId);

            return Ok(overview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error getting dashboard overview for parkingLotId: {ParkingLotId}", parkingLotId);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { success = false, message = "Error retrieving dashboard data" });
        }
    }

    /// <summary>
    /// GET /api/dashboard/occupancy-timeline
    /// Retorna ocupação por hora do dia
    /// </summary>
    [HttpGet("occupancy-timeline/{parkingLotId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetOccupancyTimeline(Guid parkingLotId)
    {
        try
        {
            var timeline = await _dashboardService.GetOccupancyTimelineAsync(parkingLotId);
            return Ok(timeline);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting occupancy timeline");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { success = false, message = "Error retrieving timeline data" });
        }
    }

    /// <summary>
    /// GET /api/dashboard/spot-statistics
    /// Retorna estatísticas agrupadas por vaga (ranking de uso)
    /// </summary>
    [HttpGet("spot-statistics/{parkingLotId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSpotStatistics(Guid parkingLotId)
    {
        try
        {
            var stats = await _dashboardService.GetSpotStatisticsAsync(parkingLotId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting spot statistics");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { success = false, message = "Error retrieving statistics" });
        }
    }
}
