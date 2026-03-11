using Microsoft.EntityFrameworkCore.Storage;
using ParkingSystem.Domain.Interfaces;
using ParkingSystem.Infrastructure.Data;
using ParkingSystem.Infrastructure.Repositories;

namespace ParkingSystem.Infrastructure;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _transaction;

    public IParkingLotRepository ParkingLots { get; }
    public IParkingSpotRepository ParkingSpots { get; }
    public IVehicleEntryRepository VehicleEntries { get; }
    public IParkingSessionRepository ParkingSessions { get; }
    public IPaymentRepository Payments { get; }
    public IUserRepository Users { get; }
    public ISystemLogRepository SystemLogs { get; }

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        ParkingLots = new ParkingLotRepository(context);
        ParkingSpots = new ParkingSpotRepository(context);
        VehicleEntries = new VehicleEntryRepository(context);
        ParkingSessions = new ParkingSessionRepository(context);
        Payments = new PaymentRepository(context);
        Users = new UserRepository(context);
        SystemLogs = new SystemLogRepository(context);
    }

    public async Task<int> CommitAsync() => await _context.SaveChangesAsync();

    public async Task BeginTransactionAsync() =>
        _transaction = await _context.Database.BeginTransactionAsync();

    public async Task CommitTransactionAsync()
    {
        if (_transaction is not null)
        {
            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction is not null)
        {
            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
