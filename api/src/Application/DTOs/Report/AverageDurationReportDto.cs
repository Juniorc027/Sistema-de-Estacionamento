namespace ParkingSystem.Application.DTOs.Report;

/// <summary>
/// Relatório agregado de tempo médio de permanência
/// </summary>
public record AverageDurationReportDto(
    int TotalSessions,                  // Total de sessões fechadas
    TimeSpan AverageDuration,           // Tempo médio
    TimeSpan MinimumDuration,           // Menor permanência
    TimeSpan MaximumDuration,           // Maior permanência
    int SessionsToday,                  // Sessões de hoje
    int SessionsThisWeek,               // Sessões desta semana
    int SessionsThisMonth                // Sessões deste mês
);
