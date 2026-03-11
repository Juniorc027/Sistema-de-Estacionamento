namespace ParkingSystem.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IParkingLotRepository ParkingLots { get; }
    IParkingSpotRepository ParkingSpots { get; }
    IVehicleEntryRepository VehicleEntries { get; }
    IParkingSessionRepository ParkingSessions { get; }
    IPaymentRepository Payments { get; }
    IUserRepository Users { get; }
    ISystemLogRepository SystemLogs { get; }

    Task<int> CommitAsync();
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}
