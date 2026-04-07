using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Report;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IReportService
{
    // Antigos métodos (mantendo compatibilidade)
    Task<ApiResponse<DailyReportDto>> GetDailyReportAsync(Guid parkingLotId, DateTime date);
    Task<ApiResponse<MonthlyReportDto>> GetMonthlyReportAsync(Guid parkingLotId, int year, int month);
    Task<ApiResponse<FinancialSummaryDto>> GetFinancialSummaryAsync(ReportFilterDto filter);
    Task<ApiResponse<IEnumerable<SessionReportItemDto>>> GetSessionsReportAsync(ReportFilterDto filter);
    Task<byte[]> GenerateDailyReportPdfAsync(Guid parkingLotId, DateTime date);
    Task<byte[]> GenerateMonthlyReportPdfAsync(Guid parkingLotId, int year, int month);

    // Novos métodos para dashboard real
    /// <summary>
    /// Histórico completo de entradas/saídas com paginação
    /// </summary>
    Task<PagedResult<HistoryReportDto>> GetHistoryAsync(ReportFilter filter);

    /// <summary>
    /// Ocupação agregada por hora
    /// </summary>
    Task<List<HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter);

    /// <summary>
    /// Estatísticas de tempo médio de permanência
    /// </summary>
    Task<AverageDurationReportDto> GetAverageDurationAsync(ReportFilter filter);

    /// <summary>
    /// Vagas rankeadas por frequência de uso
    /// </summary>
    Task<List<SpotRankingDto>> GetSpotRankingAsync(ReportFilter filter);
}
