using ParkingSystem.Domain.Entities;

namespace ParkingSystem.Domain.Interfaces;

public interface IParkingLotRepository : IRepository<ParkingLot>
{
    Task<ParkingLot?> GetWithSpotsAsync(Guid id);
    Task<int> GetAvailableSpotsCountAsync(Guid parkingLotId);
}
