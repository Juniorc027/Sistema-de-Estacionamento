using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.DTOs.VehicleEntry;

public record RegisterVehicleEntryDto(string LicensePlate, Guid ParkingLotId);

public record VehicleEntryResponseDto(
    Guid Id,
    string LicensePlate,
    DateTime EntryTime,
    VehicleEntryStatus Status,
    string StatusDescription,
    Guid ParkingLotId,
    string ParkingLotName);
