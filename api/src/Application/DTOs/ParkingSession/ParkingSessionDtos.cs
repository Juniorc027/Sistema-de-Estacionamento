using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.DTOs.ParkingSession;

public record ParkingSessionResponseDto(
    Guid Id,
    Guid VehicleEntryId,
    string LicensePlate,
    Guid ParkingSpotId,
    string SpotNumber,
    DateTime StartTime,
    DateTime? EndTime,
    double? DurationMinutes,
    decimal? TotalAmount,
    SessionStatus Status,
    string StatusDescription);

public record CloseSessionResponseDto(
    Guid SessionId,
    string LicensePlate,
    string SpotNumber,
    DateTime StartTime,
    DateTime EndTime,
    double DurationMinutes,
    decimal TotalAmount);
