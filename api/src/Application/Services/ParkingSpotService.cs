using Microsoft.Extensions.Logging;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingSpot;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

public class ParkingSpotService : IParkingSpotService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ParkingSpotService> _logger;

    public ParkingSpotService(IUnitOfWork uow, ILogger<ParkingSpotService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<ApiResponse<IEnumerable<ParkingSpotResponseDto>>> GetByParkingLotAsync(Guid parkingLotId)
    {
        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
        var lotName = lot?.Name ?? "";
        var spots = await _uow.ParkingSpots.FindAsync(x => x.ParkingLotId == parkingLotId && !x.IsDeleted);
        var result = spots.Select(s => MapToDto(s, lotName));
        return ApiResponse<IEnumerable<ParkingSpotResponseDto>>.Ok(result);
    }

    public async Task<ApiResponse<ParkingSpotResponseDto>> GetByIdAsync(Guid id)
    {
        var spot = await _uow.ParkingSpots.GetByIdAsync(id);
        if (spot is null || spot.IsDeleted)
            return ApiResponse<ParkingSpotResponseDto>.NotFound("Vaga não encontrada.");

        var lot = await _uow.ParkingLots.GetByIdAsync(spot.ParkingLotId);
        return ApiResponse<ParkingSpotResponseDto>.Ok(MapToDto(spot, lot?.Name ?? ""));
    }

    public async Task<ApiResponse<ParkingSpotResponseDto>> GetByLotAndSpotNumberAsync(Guid parkingLotId, string spotNumber)
    {
        var normalizedSpotNumber = spotNumber.Trim().PadLeft(3, '0');

        var spot = await _uow.ParkingSpots
            .FindAsync(x => x.ParkingLotId == parkingLotId && x.SpotNumber == normalizedSpotNumber && !x.IsDeleted);

        var target = spot.FirstOrDefault();
        if (target is null)
            return ApiResponse<ParkingSpotResponseDto>.NotFound("Vaga não encontrada.");

        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
        return ApiResponse<ParkingSpotResponseDto>.Ok(MapToDto(target, lot?.Name ?? ""));
    }

    public async Task<ApiResponse<ParkingSpotResponseDto>> UpdateStatusAsync(Guid parkingLotId, string spotNumber, ParkingSpotStatus status)
    {
        var normalizedSpotNumber = spotNumber.Trim().PadLeft(3, '0');

        var spot = await _uow.ParkingSpots
            .FindAsync(x => x.ParkingLotId == parkingLotId && x.SpotNumber == normalizedSpotNumber && !x.IsDeleted);

        var target = spot.FirstOrDefault();
        if (target is null)
            return ApiResponse<ParkingSpotResponseDto>.NotFound("Vaga não encontrada.");

        if (target.Status != status)
        {
            target.Status = status;
            target.UpdatedAt = DateTime.UtcNow;
            _uow.ParkingSpots.Update(target);
            await _uow.CommitAsync();

            _logger.LogInformation("Status da vaga {SpotNumber} atualizado para {Status}", normalizedSpotNumber, status);
        }

        var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
        return ApiResponse<ParkingSpotResponseDto>.Ok(MapToDto(target, lot?.Name ?? ""));
    }

    public async Task<ApiResponse<ParkingSpotResponseDto>> CreateAsync(CreateParkingSpotDto request)
    {
        var lot = await _uow.ParkingLots.GetByIdAsync(request.ParkingLotId);
        if (lot is null || lot.IsDeleted)
            return ApiResponse<ParkingSpotResponseDto>.NotFound("Estacionamento não encontrado.");

        var spot = new ParkingSpot
        {
            SpotNumber = request.SpotNumber,
            ParkingLotId = request.ParkingLotId
        };

        await _uow.ParkingSpots.AddAsync(spot);
        await _uow.CommitAsync();

        _logger.LogInformation("Vaga {SpotNumber} criada no estacionamento {LotId}", spot.SpotNumber, lot.Id);
        return ApiResponse<ParkingSpotResponseDto>.Created(MapToDto(spot, lot.Name));
    }

    public async Task<ApiResponse<object>> DeleteAsync(Guid id)
    {
        var spot = await _uow.ParkingSpots.GetByIdAsync(id);
        if (spot is null || spot.IsDeleted)
            return ApiResponse<object>.NotFound("Vaga não encontrada.");

        spot.IsDeleted = true;
        spot.UpdatedAt = DateTime.UtcNow;
        _uow.ParkingSpots.Update(spot);
        await _uow.CommitAsync();

        return ApiResponse<object>.Ok("Vaga removida com sucesso.");
    }

    private static ParkingSpotResponseDto MapToDto(ParkingSpot s, string lotName) => new(
        s.Id, s.SpotNumber, s.Status, s.Status.ToString(), s.ParkingLotId, lotName, s.CreatedAt);
}
