namespace ParkingSystem.Application.DTOs.Dashboard;

/// <summary>
/// DTO para visão geral do Dashboard
/// Contém: ocupação atual, giro de vagas, horário de pico, ranking top 5
/// </summary>
public class DashboardOverviewDto
{
    public Guid ParkingLotId { get; set; }
    public string ParkingLotName { get; set; }

    /// <summary>Métrica: Taxa de ocupação atual (0-100%)</summary>
    public OccupancyMetricDto Occupancy { get; set; }

    /// <summary>Métrica: Giro de vagas (entradas nas últimas 24h)</summary>
    public VehicleThroughputDto Throughput { get; set; }

    /// <summary>Métrica: Horário de maior pico (hoje)</summary>
    public PeakHourDto PeakHour { get; set; }

    /// <summary>Ranking: Top 5 vagas mais utilizadas</summary>
    public List<SpotRankingItemDto> TopSpots { get; set; }

    /// <summary>Timestamp da última atualização</summary>
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Métrica: Ocupação de Vagas
/// </summary>
public class OccupancyMetricDto
{
    /// <summary>Percentual de ocupação (0.0 - 100.0)</summary>
    public decimal OccupancyPercentage { get; set; }

    /// <summary>Número de vagas ocupadas</summary>
    public int OccupiedSpots { get; set; }

    /// <summary>Total de vagas</summary>
    public int TotalSpots { get; set; }

    /// <summary>Vagas livres</summary>
    public int AvailableSpots => TotalSpots - OccupiedSpots;

    /// <summary>Taxa de mudança desde ontem (%)</summary>
    public decimal TrendPercentage { get; set; }

    /// <summary>Status: "Alto", "Normal", "Baixo"</summary>
    public string OccupancyStatus { get; set; }
}

/// <summary>
/// Métrica: Giro de Vagas (Throughput)
/// </summary>
public class VehicleThroughputDto
{
    /// <summary>Entradas nas últimas 24 horas</summary>
    public int EntriesLast24Hours { get; set; }

    /// <summary>Saídas nas últimas 24 horas</summary>
    public int ExitsLast24Hours { get; set; }

    /// <summary>Média de entradas por hora</summary>
    public decimal AverageEntriesPerHour { get; set; }

    /// <summary>Pico de entradas (qual a maior hora)</summary>
    public int PeakEntriesInOneHour { get; set; }
}

/// <summary>
/// Métrica: Horário de Pico
/// </summary>
public class PeakHourDto
{
    /// <summary>Hora do dia (ex: 14 para 14:00)</summary>
    public int Hour { get; set; }

    /// <summary>Ocupação máxima nessa hora (%)</summary>
    public decimal OccupancyPercentage { get; set; }

    /// <summary>Número de entradas nessa hora</summary>
    public int EntriesCount { get; set; }

    /// <summary>Duração em minutos da hora</summary>
    public string TimeRange => $"{Hour:D2}:00 - {(Hour + 1) % 24:D2}:00";
}

/// <summary>
/// Item de Ranking: Vaga Individual
/// </summary>
public class SpotRankingItemDto
{
    /// <summary>Posição no ranking (1-22)</summary>
    public int Rank { get; set; }

    /// <summary>ID da vaga</summary>
    public Guid SpotId { get; set; }

    /// <summary>Número da vaga (ex: "001", "022")</summary>
    public string SpotNumber { get; set; }

    /// <summary>Número de entradas registradas</summary>
    public int EntryCount { get; set; }

    /// <summary>Tempo médio de ocupação em minutos</summary>
    public decimal AverageOccupancyMinutes { get; set; }

    /// <summary>Taxa de utilização (0-100%)</summary>
    public decimal UtilizationRate { get; set; }

    /// <summary>Status atual: "Ocupada", "Livre", "Manutenção"</summary>
    public string CurrentStatus { get; set; }

    /// <summary>Badge visual para vaga: 🔥 (top 1), ⭐ (top 2-3), 🧊 (bottom 3)</summary>
    public string Badge { get; set; }
}

/// <summary>
/// DTO para Timeline de Ocupação (Ocupação por hora)
/// </summary>
public class OccupancyTimelineDto
{
    public Guid ParkingLotId { get; set; }
    public DateTime Date { get; set; }
    public List<HourlyOccupancyDto> Hours { get; set; }
}

public class HourlyOccupancyDto
{
    /// <summary>Hora do dia (0-23)</summary>
    public int Hour { get; set; }

    /// <summary>Ocupação média nessa hora (%)</summary>
    public decimal AverageOccupancy { get; set; }

    /// <summary>Ocupação máxima nessa hora (%)</summary>
    public decimal PeakOccupancy { get; set; }

    /// <summary>Número de entradas nessa hora</summary>
    public int EntriesCount { get; set; }

    /// <summary>Número de saídas nessa hora</summary>
    public int ExitsCount { get; set; }
}

/// <summary>
/// DTO para Estatísticas de Vagas
/// </summary>
public class SpotStatisticsDto
{
    public Guid ParkingLotId { get; set; }
    public List<SpotRankingItemDto> Spots { get; set; }
    public decimal AverageUtilization { get; set; }
    public decimal StandardDeviation { get; set; }
    public DateTime CalculatedAt { get; set; }
}
