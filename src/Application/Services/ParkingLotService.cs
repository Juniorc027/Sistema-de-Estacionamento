using Microsoft.Extensions.Logging;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingLot;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

public class ParkingLotService : IParkingLotService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ParkingLotService> _logger;

    public ParkingLotService(IUnitOfWork uow, ILogger<ParkingLotService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<ApiResponse<IEnumerable<ParkingLotResponseDto>>> GetAllAsync()
    {
        var lots = await _uow.ParkingLots.FindAsync(x => !x.IsDeleted);
        var result = new List<ParkingLotResponseDto>();

        foreach (var lot in lots)
        {
            var available = await _uow.ParkingLots.GetAvailableSpotsCountAsync(lot.Id);
            result.Add(MapToDto(lot, available));
        }

        return ApiResponse<IEnumerable<ParkingLotResponseDto>>.Ok(result);
    }

    public async Task<ApiResponse<ParkingLotResponseDto>> GetByIdAsync(Guid id)
    {
        var lot = await _uow.ParkingLots.GetByIdAsync(id);
        if (lot is null || lot.IsDeleted)
            return ApiResponse<ParkingLotResponseDto>.NotFound("Estacionamento não encontrado.");

        var available = await _uow.ParkingLots.GetAvailableSpotsCountAsync(lot.Id);
        return ApiResponse<ParkingLotResponseDto>.Ok(MapToDto(lot, available));
    }

    public async Task<ApiResponse<ParkingLotResponseDto>> CreateAsync(CreateParkingLotDto request)
    {
        var lot = new ParkingLot
        {
            Name = request.Name,
            Address = request.Address,
            TotalSpots = request.TotalSpots,
            HourlyRate = request.HourlyRate
        };

        // Auto-create spots
        for (int i = 1; i <= request.TotalSpots; i++)
        {
            lot.ParkingSpots.Add(new ParkingSpot
            {
                SpotNumber = i.ToString("D3"),
                ParkingLotId = lot.Id
            });
        }

        await _uow.ParkingLots.AddAsync(lot);
        await _uow.CommitAsync();

        _logger.LogInformation("Estacionamento criado: {Name} com {Total} vagas", lot.Name, lot.TotalSpots);
        return ApiResponse<ParkingLotResponseDto>.Created(MapToDto(lot, request.TotalSpots));
    }

    public async Task<ApiResponse<ParkingLotResponseDto>> UpdateAsync(Guid id, UpdateParkingLotDto request)
    {
        var lot = await _uow.ParkingLots.GetByIdAsync(id);
        if (lot is null || lot.IsDeleted)
            return ApiResponse<ParkingLotResponseDto>.NotFound("Estacionamento não encontrado.");

        lot.Name = request.Name;
        lot.Address = request.Address;
        lot.HourlyRate = request.HourlyRate;
        lot.IsActive = request.IsActive;
        lot.UpdatedAt = DateTime.UtcNow;

        _uow.ParkingLots.Update(lot);
        await _uow.CommitAsync();

        var available = await _uow.ParkingLots.GetAvailableSpotsCountAsync(lot.Id);
        return ApiResponse<ParkingLotResponseDto>.Ok(MapToDto(lot, available));
    }

    public async Task<ApiResponse<object>> DeleteAsync(Guid id)
    {
        var lot = await _uow.ParkingLots.GetByIdAsync(id);
        if (lot is null || lot.IsDeleted)
            return ApiResponse<object>.NotFound("Estacionamento não encontrado.");

        lot.IsDeleted = true;
        lot.UpdatedAt = DateTime.UtcNow;
        _uow.ParkingLots.Update(lot);
        await _uow.CommitAsync();

        return ApiResponse<object>.Ok("Estacionamento removido com sucesso.");
    }

    private static ParkingLotResponseDto MapToDto(ParkingLot lot, int available) => new(
        lot.Id, lot.Name, lot.Address, lot.TotalSpots, available,
        lot.HourlyRate, lot.IsActive, lot.CreatedAt);
}
