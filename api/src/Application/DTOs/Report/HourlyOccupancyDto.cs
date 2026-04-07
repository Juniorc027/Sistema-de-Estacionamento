namespace ParkingSystem.Application.DTOs.Report;

/// <summary>
/// Ocupação agregada por hora (quantas vagas estavam ocupadas em cada hora)
/// </summary>
public record HourlyOccupancyDto(
    DateTime Hour,              // Ex: 2026-04-07 10:00:00
    decimal AverageOccupancy,   // Percentual (0-100)
    int PeakOccupiedCount,      // Máximo de vagas ocupadas
    int TotalSpots              // Total de vagas disponíveis
);
