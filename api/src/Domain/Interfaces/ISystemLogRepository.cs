using ParkingSystem.Domain.Entities;

namespace ParkingSystem.Domain.Interfaces;

public interface ISystemLogRepository : IRepository<SystemLog>
{
    Task<IEnumerable<SystemLog>> GetByPeriodAsync(DateTime from, DateTime to);
}
