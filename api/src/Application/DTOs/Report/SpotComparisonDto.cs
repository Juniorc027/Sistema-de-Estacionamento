namespace ParkingSystem.Application.DTOs.Report;

public record SpotComparisonDto(
    Guid ParkingLotId,
    string ParkingLotName,
    double AverageUseCount,
    double StandardDeviation,
    DateTime From,
    DateTime To,
    List<SpotComparisonItemDto> TopSpots,
    List<SpotComparisonItemDto> BottomSpots,
    List<SpotComparisonItemDto> AllSpots
);

public record SpotComparisonItemDto(
    string SpotNumber,
    int UseCount,
    double AverageDurationMinutes,
    decimal OccupancyRate,
    string CurrentStatus,
    string CompetitivenessLabel
);
