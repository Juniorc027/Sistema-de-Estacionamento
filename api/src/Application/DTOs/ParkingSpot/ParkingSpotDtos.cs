using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.DTOs.ParkingSpot;

public record CreateParkingSpotDto(string SpotNumber, Guid ParkingLotId);

public record ParkingSpotResponseDto(
    Guid Id,
    string SpotNumber,
    ParkingSpotStatus Status,
    string StatusDescription,
    Guid ParkingLotId,
    string ParkingLotName,
    DateTime CreatedAt);

public record OccupySpotRequestDto(Guid ParkingLotId);

public record ReleaseSpotRequestDto(string? Notes);
