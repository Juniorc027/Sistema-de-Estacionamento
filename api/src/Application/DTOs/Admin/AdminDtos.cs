namespace ParkingSystem.Application.DTOs.Admin;

public record AdminOverviewDto(
    Guid ParkingLotId,
    string ParkingLotName,
    int TotalSpots,
    int OccupiedSpots,
    int FreeSpots,
    decimal OccupancyPercentage,
    decimal RevenueTodayTotal,
    int SessionsTodayCount,
    decimal AverageTicketToday,
    decimal MonthlyRevenueEstimate,
    decimal MonthlyRevenueSoFar,
    decimal DailyAverageRevenue,
    int DaysElapsedInMonth,
    int DaysInMonth,
    List<AdminTopSpotDto> TopSpots,
    DateTime GeneratedAt
);

public record AdminTopSpotDto(
    string SpotNumber,
    int UseCount,
    double AverageDurationMinutes,
    string CurrentStatus
);

public record AdminLogDto(
    Guid Id,
    string Event,
    string? Description,
    string? Source,
    DateTime OccurredAt
);

public record AdminLogsResultDto(
    List<AdminLogDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
