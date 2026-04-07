namespace ParkingSystem.Application.DTOs.Report;

/// <summary>
/// DTO para ocupação agregada por hora (Report)
/// </summary>
public record HourlyOccupancyDto(
    DateTime Hour,
    decimal AverageOccupancy,
    int PeakOccupiedCount,
    int TotalSpots);
