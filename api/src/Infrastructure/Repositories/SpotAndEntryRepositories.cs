using Microsoft.EntityFrameworkCore;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;
using ParkingSystem.Infrastructure.Data;

namespace ParkingSystem.Infrastructure.Repositories;

public class ParkingSpotRepository : Repository<ParkingSpot>, IParkingSpotRepository
{
    public ParkingSpotRepository(AppDbContext context) : base(context) { }

    public async Task<ParkingSpot?> GetFirstFreeSpotAsync(Guid parkingLotId) =>
        await _dbSet.FirstOrDefaultAsync(s =>
            s.ParkingLotId == parkingLotId &&
            s.Status == ParkingSpotStatus.Free &&
            !s.IsDeleted);

    public async Task<IEnumerable<ParkingSpot>> GetByStatusAsync(Guid parkingLotId, ParkingSpotStatus status) =>
        await _dbSet.Where(s => s.ParkingLotId == parkingLotId && s.Status == status && !s.IsDeleted)
                    .ToListAsync();

    public async Task<int> CountByStatusAsync(Guid parkingLotId, ParkingSpotStatus status) =>
        await _dbSet.CountAsync(s => s.ParkingLotId == parkingLotId && s.Status == status && !s.IsDeleted);
}

public class VehicleEntryRepository : Repository<VehicleEntry>, IVehicleEntryRepository
{
    public VehicleEntryRepository(AppDbContext context) : base(context) { }

    public async Task<VehicleEntry?> GetOldestPendingAsync(Guid parkingLotId) =>
        await _dbSet.Where(e => e.ParkingLotId == parkingLotId &&
                                e.Status == VehicleEntryStatus.Pending &&
                                !e.IsDeleted)
                    .OrderBy(e => e.EntryTime)
                    .FirstOrDefaultAsync();

    public async Task<IEnumerable<VehicleEntry>> GetByStatusAsync(Guid parkingLotId, VehicleEntryStatus status) =>
        await _dbSet.Where(e => e.ParkingLotId == parkingLotId && e.Status == status && !e.IsDeleted)
                    .OrderBy(e => e.EntryTime)
                    .ToListAsync();

    public async Task<int> CountPendingAsync(Guid parkingLotId) =>
        await _dbSet.CountAsync(e => e.ParkingLotId == parkingLotId &&
                                     e.Status == VehicleEntryStatus.Pending &&
                                     !e.IsDeleted);
}
