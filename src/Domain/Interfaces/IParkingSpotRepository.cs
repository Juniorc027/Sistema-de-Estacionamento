using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Domain.Interfaces;

public interface IParkingSpotRepository : IRepository<ParkingSpot>
{
    Task<ParkingSpot?> GetFirstFreeSpotAsync(Guid parkingLotId);
    Task<IEnumerable<ParkingSpot>> GetByStatusAsync(Guid parkingLotId, ParkingSpotStatus status);
    Task<int> CountByStatusAsync(Guid parkingLotId, ParkingSpotStatus status);
}
