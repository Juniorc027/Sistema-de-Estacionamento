using Microsoft.AspNetCore.SignalR;
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.API.Hubs;

/// <summary>
/// Hub SignalR para comunicação em tempo real com o frontend
/// </summary>
public class ParkingHub : Hub
{
    public static string BuildParkingLotGroup(Guid parkingLotId) => $"parking-lot:{parkingLotId}";

    public async Task JoinParkingLot(Guid parkingLotId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, BuildParkingLotGroup(parkingLotId));
    }

    public async Task LeaveParkingLot(Guid parkingLotId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, BuildParkingLotGroup(parkingLotId));
    }

    /// <summary>
    /// Envia notificação para todos os clientes quando uma vaga é atualizada
    /// Chamado pelo backend quando o MQTT ou API REST atualiza uma vaga
    /// </summary>
    public async Task NotifySpotUpdated(SpotUpdatedDto spotUpdate)
    {
        await Clients.Group(BuildParkingLotGroup(spotUpdate.ParkingLotId)).SendAsync("SpotUpdated", spotUpdate);
    }

    /// <summary>
    /// Evento quando cliente se conecta
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
        Console.WriteLine($"[SignalR] Client connected: {Context.ConnectionId}");
    }

    /// <summary>
    /// Evento quando cliente se desconecta
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
        Console.WriteLine($"[SignalR] Client disconnected: {Context.ConnectionId}");
    }
}

/// <summary>
/// DTO para evento SpotUpdated enviado via SignalR
/// </summary>
public record SpotUpdatedDto(
    Guid ParkingLotId,
    Guid SpotId,
    string SpotNumber,
    ParkingSpotStatus Status,
    DateTime Timestamp
);
