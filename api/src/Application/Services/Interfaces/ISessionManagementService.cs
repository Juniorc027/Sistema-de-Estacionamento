using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.Services.Interfaces;

/// <summary>
/// Serviço para gerenciar ciclo de vida de ParkingSessions
/// Detecta transições de status e cria/fecha sessões automaticamente
/// </summary>
public interface ISessionManagementService
{
    /// <summary>
    /// Processa mudança de status e gerencia sessões
    /// - Free → Occupied: cria nova ParkingSession + VehicleEntry
    /// - Occupied → Free: fecha sessão atual
    /// </summary>
    Task HandleSpotStatusChangeAsync(
        Guid spotId,
        Guid parkingLotId,
        string spotNumber,
        ParkingSpotStatus oldStatus,
        ParkingSpotStatus newStatus
    );
}
