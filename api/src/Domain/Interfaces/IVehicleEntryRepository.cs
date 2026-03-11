using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Domain.Interfaces;

public interface IVehicleEntryRepository : IRepository<VehicleEntry>
{
    Task<VehicleEntry?> GetOldestPendingAsync(Guid parkingLotId);
    Task<IEnumerable<VehicleEntry>> GetByStatusAsync(Guid parkingLotId, VehicleEntryStatus status);
    Task<int> CountPendingAsync(Guid parkingLotId);
}
