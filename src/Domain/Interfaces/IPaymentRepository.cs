using ParkingSystem.Domain.Entities;

namespace ParkingSystem.Domain.Interfaces;

public interface IPaymentRepository : IRepository<Payment>
{
    Task<IEnumerable<Payment>> GetByPeriodAsync(DateTime from, DateTime to);
    Task<decimal> GetTotalByPeriodAsync(DateTime from, DateTime to);
    Task<Payment?> GetBySessionIdAsync(Guid sessionId);
}
