using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Report;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IReportService
{
    Task<ApiResponse<DailyReportDto>> GetDailyReportAsync(Guid parkingLotId, DateTime date);
    Task<ApiResponse<MonthlyReportDto>> GetMonthlyReportAsync(Guid parkingLotId, int year, int month);
    Task<ApiResponse<FinancialSummaryDto>> GetFinancialSummaryAsync(ReportFilterDto filter);
    Task<ApiResponse<IEnumerable<SessionReportItemDto>>> GetSessionsReportAsync(ReportFilterDto filter);
    Task<byte[]> GenerateDailyReportPdfAsync(Guid parkingLotId, DateTime date);
    Task<byte[]> GenerateMonthlyReportPdfAsync(Guid parkingLotId, int year, int month);
}
