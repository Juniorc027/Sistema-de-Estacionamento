using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingSession;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IParkingSessionService
{
    Task<ApiResponse<ParkingSessionResponseDto>> OccupySpotAsync(Guid parkingLotId);
    Task<ApiResponse<CloseSessionResponseDto>> ReleaseSpotAsync(Guid spotId);
    Task<ApiResponse<IEnumerable<ParkingSessionResponseDto>>> GetActiveSessionsAsync(Guid parkingLotId);
    Task<ApiResponse<ParkingSessionResponseDto>> GetByIdAsync(Guid id);
}
