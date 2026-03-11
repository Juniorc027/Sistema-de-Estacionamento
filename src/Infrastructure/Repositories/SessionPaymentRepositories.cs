using Microsoft.EntityFrameworkCore;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;
using ParkingSystem.Infrastructure.Data;

namespace ParkingSystem.Infrastructure.Repositories;

public class ParkingSessionRepository : Repository<ParkingSession>, IParkingSessionRepository
{
    public ParkingSessionRepository(AppDbContext context) : base(context) { }

    public async Task<ParkingSession?> GetActiveBySpotAsync(Guid parkingSpotId) =>
        await _dbSet.Include(s => s.VehicleEntry)
                    .Include(s => s.ParkingSpot)
                    .FirstOrDefaultAsync(s =>
                        s.ParkingSpotId == parkingSpotId &&
                        s.Status == SessionStatus.Active &&
                        !s.IsDeleted);

    public async Task<int> CountActiveSessionsAsync(Guid parkingLotId) =>
        await _dbSet.CountAsync(s =>
            s.ParkingSpot.ParkingLotId == parkingLotId &&
            s.Status == SessionStatus.Active &&
            !s.IsDeleted);

    public async Task<IEnumerable<ParkingSession>> GetActiveSessionsWithDetailsAsync(Guid parkingLotId) =>
        await _dbSet
            .Include(s => s.VehicleEntry)
            .Include(s => s.ParkingSpot)
            .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId &&
                        s.Status == SessionStatus.Active &&
                        !s.IsDeleted)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

    public async Task<IEnumerable<ParkingSession>> GetByPeriodAsync(Guid parkingLotId, DateTime from, DateTime to) =>
        await _dbSet.Include(s => s.VehicleEntry)
                    .Include(s => s.ParkingSpot)
                    .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId &&
                                s.StartTime >= from && s.StartTime <= to &&
                                !s.IsDeleted)
                    .OrderByDescending(s => s.StartTime)
                    .ToListAsync();

    public async Task<double> GetAverageDurationAsync(Guid parkingLotId, DateTime from, DateTime to)
    {
        var sessions = await _dbSet
            .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId &&
                        s.StartTime >= from && s.StartTime <= to &&
                        s.Duration.HasValue && !s.IsDeleted)
            .Select(s => s.Duration)
            .ToListAsync();

        if (!sessions.Any()) return 0;
        return sessions.Average(d => d!.Value.TotalMinutes);
    }

    public async Task<decimal> GetTotalRevenueAsync(Guid parkingLotId, DateTime from, DateTime to)
    {
        var amounts = await _dbSet
            .Where(s => s.ParkingSpot.ParkingLotId == parkingLotId &&
                        s.StartTime >= from && s.StartTime <= to &&
                        s.TotalAmount.HasValue && !s.IsDeleted)
            .Select(s => s.TotalAmount)
            .ToListAsync();

        return amounts.Sum(a => a ?? 0);
    }

    public async Task<ParkingSession?> GetWithDetailsAsync(Guid sessionId) =>
        await _dbSet.Include(s => s.VehicleEntry)
                    .Include(s => s.ParkingSpot)
                        .ThenInclude(sp => sp.ParkingLot)
                    .Include(s => s.Payment)
                    .FirstOrDefaultAsync(s => s.Id == sessionId);
}

public class PaymentRepository : Repository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Payment>> GetByPeriodAsync(DateTime from, DateTime to) =>
        await _dbSet.Include(p => p.ParkingSession)
                        .ThenInclude(s => s.VehicleEntry)
                    .Where(p => p.PaidAt >= from && p.PaidAt <= to && !p.IsDeleted)
                    .OrderByDescending(p => p.PaidAt)
                    .ToListAsync();

    public async Task<decimal> GetTotalByPeriodAsync(DateTime from, DateTime to)
    {
        var amounts = await _dbSet
            .Where(p => p.PaidAt >= from && p.PaidAt <= to && !p.IsDeleted)
            .Select(p => p.Amount)
            .ToListAsync();
        return amounts.Sum();
    }

    public async Task<Payment?> GetBySessionIdAsync(Guid sessionId) =>
        await _dbSet.Include(p => p.ParkingSession)
                        .ThenInclude(s => s.VehicleEntry)
                    .FirstOrDefaultAsync(p => p.ParkingSessionId == sessionId);
}
