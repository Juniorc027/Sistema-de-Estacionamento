using ParkingSystem.Application.DTOs.Dashboard;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ParkingSystem.Application.Services.Interfaces;

/// <summary>
/// Interface para serviço de Dashboard
/// Fornece agregações de dados em tempo real
/// </summary>
public interface IDashboardService
{
    /// <summary>
    /// GetOverviewAsync: Retorna visão geral com ocupação, pico, giro e ranking
    /// </summary>
    Task<DashboardOverviewDto> GetOverviewAsync(Guid parkingLotId);

    /// <summary>
    /// GetOccupancyTimelineAsync: Retorna ocupação por hora
    /// </summary>
    Task<OccupancyTimelineDto> GetOccupancyTimelineAsync(Guid parkingLotId);

    /// <summary>
    /// GetSpotStatisticsAsync: Retorna ranking detalhado de vagas
    /// </summary>
    Task<SpotStatisticsDto> GetSpotStatisticsAsync(Guid parkingLotId);

    /// <summary>
    /// ExportSessionsAsCsvAsync: Exporta sessões em CSV
    /// </summary>
    Task<byte[]> ExportSessionsAsCsvAsync(Guid parkingLotId, DateTime? from = null, DateTime? to = null);

    /// <summary>
    /// RecomputeOverviewForRealTimeUpdateAsync: Recomputa overview para atualização real-time via SignalR
    /// Chamado após mudanças via MQTT (entrada/saída de veículo)
    /// </summary>
    Task<DashboardOverviewDto> RecomputeOverviewForRealTimeUpdateAsync(Guid parkingLotId);
}
