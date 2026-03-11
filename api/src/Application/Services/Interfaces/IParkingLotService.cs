using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingLot;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IParkingLotService
{
    Task<ApiResponse<IEnumerable<ParkingLotResponseDto>>> GetAllAsync();
    Task<ApiResponse<ParkingLotResponseDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<ParkingLotResponseDto>> CreateAsync(CreateParkingLotDto request);
    Task<ApiResponse<ParkingLotResponseDto>> UpdateAsync(Guid id, UpdateParkingLotDto request);
    Task<ApiResponse<object>> DeleteAsync(Guid id);
}
