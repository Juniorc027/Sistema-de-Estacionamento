namespace ParkingSystem.Application.DTOs.ParkingLot;

public record CreateParkingLotDto(
    string Name,
    string Address,
    int TotalSpots,
    decimal HourlyRate);

public record UpdateParkingLotDto(
    string Name,
    string Address,
    decimal HourlyRate,
    bool IsActive);

public record ParkingLotResponseDto(
    Guid Id,
    string Name,
    string Address,
    int TotalSpots,
    int AvailableSpots,
    decimal HourlyRate,
    bool IsActive,
    DateTime CreatedAt);
