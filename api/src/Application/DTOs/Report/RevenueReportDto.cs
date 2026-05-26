namespace ParkingSystem.Application.DTOs.Report;

public record RevenueReportDto(
    Guid ParkingLotId,
    string ParkingLotName,
    decimal TotalRevenue,
    int SessionsCount,
    decimal AverageTicket,
    decimal RatePerMinute,
    DateTime From,
    DateTime To,
    List<RevenueDayDto> PerDay,
    List<RevenueSpotDto> PerSpot
);

public record RevenueDayDto(
    DateTime Date,
    int SessionsCount,
    decimal Revenue,
    double AverageDurationMinutes
);

public record RevenueSpotDto(
    string SpotNumber,
    int SessionsCount,
    decimal Revenue,
    double AverageDurationMinutes
);
