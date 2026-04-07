namespace ParkingSystem.Application.DTOs.Report;

/// <summary>
/// Vaga rankeada por frequência de uso
/// </summary>
public record SpotRankingDto(
    string SpotNumber,
    int UseCount,                   // Quantas vezes foi usada
    decimal AverageDurationMinutes, // Tempo médio em minutos
    decimal OccupancyRate,          // Percentual de tempo ocupada
    string Status                    // Livre, Ocupada, etc
);
