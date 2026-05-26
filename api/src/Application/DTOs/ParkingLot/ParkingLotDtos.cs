namespace ParkingSystem.Application.DTOs.ParkingLot;

public record CreateParkingLotDto(
    string Name,
    string Address,
    int TotalSpots,
    decimal RatePerMinute);

public record UpdateParkingLotDto(
    string Name,
    string Address,
    decimal RatePerMinute,
    bool IsActive);

public record ParkingLotResponseDto(
    Guid Id,
    string Name,
    string Address,
    int TotalSpots,
    int AvailableSpots,
    decimal RatePerMinute,
    bool IsActive,
    DateTime CreatedAt);
