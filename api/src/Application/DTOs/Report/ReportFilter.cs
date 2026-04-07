namespace ParkingSystem.Application.DTOs.Report;

/// <summary>
/// Filtro comum para todos os relatórios
/// </summary>
public record ReportFilter(
    Guid? ParkingLotId,
    DateTime DateFrom,
    DateTime DateTo,
    int Page = 1,
    int PageSize = 50
);
