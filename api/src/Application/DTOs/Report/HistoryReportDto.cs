namespace ParkingSystem.Application.DTOs.Report;

/// <summary>
/// Item do relatório histórico (cada entrada/saída registrada)
/// </summary>
public record HistoryReportDto(
    Guid SessionId,
    Guid SpotId,
    string SpotNumber,
    string LicensePlate,
    DateTime EntryTime,
    DateTime? ExitTime,
    TimeSpan? Duration,
    decimal Amount,
    string ParkingLotName
);

/// <summary>
/// Resultado paginado para Histórico
/// </summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
}
