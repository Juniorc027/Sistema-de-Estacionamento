using Microsoft.Extensions.Logging;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.VehicleEntry;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

public class VehicleEntryService : IVehicleEntryService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<VehicleEntryService> _logger;

    public VehicleEntryService(IUnitOfWork uow, ILogger<VehicleEntryService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<ApiResponse<VehicleEntryResponseDto>> RegisterEntryAsync(RegisterVehicleEntryDto request)
    {
        var lot = await _uow.ParkingLots.GetByIdAsync(request.ParkingLotId);
        if (lot is null || lot.IsDeleted || !lot.IsActive)
            return ApiResponse<VehicleEntryResponseDto>.NotFound("Estacionamento não encontrado ou inativo.");

        var freeSpots = await _uow.ParkingSpots.CountByStatusAsync(request.ParkingLotId, ParkingSpotStatus.Free);
        if (freeSpots == 0)
            return ApiResponse<VehicleEntryResponseDto>.Fail("Estacionamento lotado. Nenhuma vaga disponível.", 409);

        var entry = new VehicleEntry
        {
            LicensePlate = request.LicensePlate.ToUpperInvariant(),
            ParkingLotId = request.ParkingLotId,
            EntryTime = DateTime.UtcNow,
            Status = VehicleEntryStatus.Pending
        };

        await _uow.VehicleEntries.AddAsync(entry);

        await _uow.SystemLogs.AddAsync(new SystemLog
        {
            Event = "VEHICLE_ENTRY",
            Description = $"Veículo {entry.LicensePlate} registrado pela cancela",
            Source = "VehicleEntryService",
            Payload = System.Text.Json.JsonSerializer.Serialize(new { entry.LicensePlate, entry.ParkingLotId })
        });

        await _uow.CommitAsync();

        _logger.LogInformation("Entrada registrada: Placa {Plate}, Lote {LotId}", entry.LicensePlate, lot.Id);
        return ApiResponse<VehicleEntryResponseDto>.Created(MapToDto(entry, lot.Name));
    }

    public async Task<ApiResponse<IEnumerable<VehicleEntryResponseDto>>> GetPendingAsync(Guid parkingLotId)
    {
        var entries = await _uow.VehicleEntries.GetByStatusAsync(parkingLotId, VehicleEntryStatus.Pending);
        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
        var result = entries.Select(e => MapToDto(e, lot?.Name ?? ""));
        return ApiResponse<IEnumerable<VehicleEntryResponseDto>>.Ok(result);
    }

    public async Task<ApiResponse<IEnumerable<VehicleEntryResponseDto>>> GetAllAsync(Guid parkingLotId)
    {
        var entries = await _uow.VehicleEntries.FindAsync(x => x.ParkingLotId == parkingLotId && !x.IsDeleted);
        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
        var result = entries.Select(e => MapToDto(e, lot?.Name ?? ""));
        return ApiResponse<IEnumerable<VehicleEntryResponseDto>>.Ok(result);
    }

    private static VehicleEntryResponseDto MapToDto(VehicleEntry e, string lotName) => new(
        e.Id, e.LicensePlate, e.EntryTime, e.Status, e.Status.ToString(), e.ParkingLotId, lotName);
}
