using ParkingSystem.Domain.Entities;

namespace ParkingSystem.Domain.Interfaces;

public interface IParkingSessionRepository : IRepository<ParkingSession>
{
    Task<ParkingSession?> GetActiveBySpotAsync(Guid parkingSpotId);
    Task<int> CountActiveSessionsAsync(Guid parkingLotId);
    Task<IEnumerable<ParkingSession>> GetActiveSessionsWithDetailsAsync(Guid parkingLotId);
    Task<IEnumerable<ParkingSession>> GetByPeriodAsync(Guid parkingLotId, DateTime from, DateTime to);
    Task<double> GetAverageDurationAsync(Guid parkingLotId, DateTime from, DateTime to);
    Task<decimal> GetTotalRevenueAsync(Guid parkingLotId, DateTime from, DateTime to);
    Task<ParkingSession?> GetWithDetailsAsync(Guid sessionId);
}
