using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingSpot;
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IParkingSpotService
{
    Task<ApiResponse<IEnumerable<ParkingSpotResponseDto>>> GetByParkingLotAsync(Guid parkingLotId);
    Task<ApiResponse<ParkingSpotResponseDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<ParkingSpotResponseDto>> GetByLotAndSpotNumberAsync(Guid parkingLotId, string spotNumber);
    Task<ApiResponse<ParkingSpotResponseDto>> UpdateStatusAsync(Guid parkingLotId, string spotNumber, ParkingSpotStatus status);
    Task<ApiResponse<ParkingSpotResponseDto>> CreateAsync(CreateParkingSpotDto request);
    Task<ApiResponse<object>> DeleteAsync(Guid id);
}
