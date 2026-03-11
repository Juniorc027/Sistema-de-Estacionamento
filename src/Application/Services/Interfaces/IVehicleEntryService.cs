using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.VehicleEntry;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IVehicleEntryService
{
    Task<ApiResponse<VehicleEntryResponseDto>> RegisterEntryAsync(RegisterVehicleEntryDto request);
    Task<ApiResponse<IEnumerable<VehicleEntryResponseDto>>> GetPendingAsync(Guid parkingLotId);
    Task<ApiResponse<IEnumerable<VehicleEntryResponseDto>>> GetAllAsync(Guid parkingLotId);
}
