using Microsoft.EntityFrameworkCore;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Interfaces;
using ParkingSystem.Infrastructure.Data;

namespace ParkingSystem.Infrastructure.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email) =>
        await _dbSet.FirstOrDefaultAsync(u => u.Email == email);

    public async Task<bool> ExistsAsync(string email) =>
        await _dbSet.AnyAsync(u => u.Email == email);
}

public class ParkingLotRepository : Repository<ParkingLot>, IParkingLotRepository
{
    public ParkingLotRepository(AppDbContext context) : base(context) { }

    public async Task<ParkingLot?> GetWithSpotsAsync(Guid id) =>
        await _dbSet.Include(l => l.ParkingSpots).FirstOrDefaultAsync(l => l.Id == id);

    public async Task<int> GetAvailableSpotsCountAsync(Guid parkingLotId)
    {
        return await _context.ParkingSpots
            .CountAsync(s => s.ParkingLotId == parkingLotId &&
                             s.Status == Domain.Enums.ParkingSpotStatus.Free &&
                             !s.IsDeleted);
    }
}

public class SystemLogRepository : Repository<SystemLog>, ISystemLogRepository
{
    public SystemLogRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<SystemLog>> GetByPeriodAsync(DateTime from, DateTime to) =>
        await _dbSet.Where(l => l.OccurredAt >= from && l.OccurredAt <= to)
                    .OrderByDescending(l => l.OccurredAt)
                    .ToListAsync();
}
