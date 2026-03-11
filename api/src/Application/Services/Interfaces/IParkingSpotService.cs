using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingSpot;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IParkingSpotService
{
    Task<ApiResponse<IEnumerable<ParkingSpotResponseDto>>> GetByParkingLotAsync(Guid parkingLotId);
    Task<ApiResponse<ParkingSpotResponseDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<ParkingSpotResponseDto>> CreateAsync(CreateParkingSpotDto request);
    Task<ApiResponse<object>> DeleteAsync(Guid id);
}
