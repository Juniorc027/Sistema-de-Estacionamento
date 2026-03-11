namespace ParkingSystem.Application.DTOs.Report;

public record ReportFilterDto(
    Guid ParkingLotId,
    DateTime From,
    DateTime To,
    string? Status = null,
    double? MinDurationMinutes = null,
    double? MaxDurationMinutes = null);

public record DailyReportDto(
    DateTime Date,
    int TotalEntries,
    int TotalSessionsCompleted,
    decimal TotalRevenue,
    double AverageDurationMinutes,
    double OccupancyRate);

public record MonthlyReportDto(
    int Year,
    int Month,
    string MonthName,
    int TotalEntries,
    int TotalSessionsCompleted,
    decimal TotalRevenue,
    double AverageDurationMinutes,
    double OccupancyRate,
    List<DailyReportDto> DailyBreakdown);

public record SessionReportItemDto(
    Guid SessionId,
    string LicensePlate,
    string SpotNumber,
    DateTime StartTime,
    DateTime? EndTime,
    double? DurationMinutes,
    decimal? Amount,
    string Status);

public record FinancialSummaryDto(
    decimal TotalRevenue,
    int TotalPayments,
    decimal AverageTicket,
    DateTime PeriodFrom,
    DateTime PeriodTo);
