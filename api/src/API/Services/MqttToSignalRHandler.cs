using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using ParkingSystem.API.Hubs;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.API.Services;

public class MqttToSignalRHandler : IMqttMessageHandler
{
    private static readonly Regex SpotTopicRegex = new("^parking/spots/(?<id>\\d+)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private readonly IServiceProvider _services;
    private readonly ILogger<MqttToSignalRHandler> _logger;

    public MqttToSignalRHandler(IServiceProvider services, ILogger<MqttToSignalRHandler> logger)
    {
        _services = services;
        _logger = logger;
    }

    /// <summary>
    /// Processa mensagem MQTT, atualiza status da vaga no BD e gerencia sessões
    /// </summary>

    public async Task HandleAsync(string topic, string payload)
    {
        try
        {
            _logger.LogInformation("[MQTT] ========== Processing: {Topic} ==========", topic);
            _logger.LogInformation("[MQTT] Payload: {Payload}", payload);

            using var scope = _services.CreateScope();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ParkingHub>>();
            var spotService = scope.ServiceProvider.GetRequiredService<IParkingSpotService>();
            var sessionService = scope.ServiceProvider.GetRequiredService<ISessionManagementService>();
            var dashboardService = scope.ServiceProvider.GetRequiredService<IDashboardService>();

            var mqttMessage = JsonSerializer.Deserialize<MqttSpotMessage>(payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

            if (mqttMessage == null)
            {
                _logger.LogWarning("[MqttHandler] Invalid payload (null after deserialize)");
                return;
            }

            var parkingLotId = mqttMessage.ParkingLotId;
            if (parkingLotId == Guid.Empty)
            {
                _logger.LogWarning("[MqttHandler] Missing parkingLotId in payload. Topic: {Topic}", topic);
                return;
            }

            var vagaId = ResolveVagaId(topic, mqttMessage);
            if (vagaId is null or <= 0)
            {
                _logger.LogWarning("[MqttHandler] Could not resolve vagaId. Topic: {Topic}, Payload: {Payload}", topic, payload);
                return;
            }

            var newStatus = ResolveStatus(topic, mqttMessage);
            var spotNumber = vagaId.Value.ToString("D3");

            // Busca status anterior
            var getResult = await spotService.GetByLotAndSpotNumberAsync(parkingLotId, spotNumber);
            var oldStatus = getResult.Success && getResult.Data != null
                ? getResult.Data.Status
                : ParkingSpotStatus.Free;

            // Atualiza status no BD
            var updateResult = await spotService.UpdateStatusAsync(parkingLotId, spotNumber, newStatus);
            if (!updateResult.Success || updateResult.Data is null)
            {
                _logger.LogWarning("[MqttHandler] Spot update failed for lot {Lot} spot {Spot}: {Message}", parkingLotId, spotNumber, updateResult.Message);
                return;
            }

            var updatedSpot = updateResult.Data;

            // Gerencia sessões (detecta transições Free ↔ Occupied)
            _logger.LogInformation("[MQTT] Status transition for spot {Spot}: {OldStatus} → {NewStatus}", spotNumber, oldStatus, newStatus);
            await sessionService.HandleSpotStatusChangeAsync(
                updatedSpot.Id,
                parkingLotId,
                spotNumber,
                oldStatus,
                newStatus
            );
            _logger.LogInformation("[MQTT] Session management completed for spot {Spot}", spotNumber);

            // Broadcast SpotUpdated (para o mapa 2D)
            var spotUpdated = new SpotUpdatedDto(
                ParkingLotId: updatedSpot.ParkingLotId,
                SpotId: updatedSpot.Id,
                SpotNumber: updatedSpot.SpotNumber,
                Status: updatedSpot.Status,
                Timestamp: DateTime.UtcNow
            );

            await hubContext.Clients
                .Group(ParkingHub.BuildParkingLotGroup(updatedSpot.ParkingLotId))
                .SendAsync("SpotUpdated", spotUpdated);

            _logger.LogInformation("[MqttHandler] Spot updated and broadcasted: lot {Lot} spot {Spot} -> {Status} (from {OldStatus})",
                updatedSpot.ParkingLotId,
                updatedSpot.SpotNumber,
                updatedSpot.Status,
                oldStatus);

            // ========== NOVO: Atualizar Dashboard em TEMPO REAL ==========
            // Só dispara o broadcast se houve mudança real (entry/exit)
            if (oldStatus != newStatus)
            {
                try
                {
                    _logger.LogInformation("[Dashboard RT] Real-time update triggered for lot {Lot} (entry/exit event)", parkingLotId);

                    // Recomputa o overview com os dados atualizados
                    var updatedOverview = await dashboardService.RecomputeOverviewForRealTimeUpdateAsync(parkingLotId);

                    if (updatedOverview != null)
                    {
                        // Envia para todos os clientes do grupo
                        await hubContext.Clients
                            .Group(ParkingHub.BuildParkingLotGroup(parkingLotId))
                            .SendAsync("UpdateDashboardStats", updatedOverview);

                        _logger.LogInformation("[Dashboard RT] Broadcast sent: Occupancy={Occupancy}% ({Occupied}/{Total})",
                            updatedOverview.Occupancy.OccupancyPercentage.ToString("F1"),
                            updatedOverview.Occupancy.OccupiedSpots,
                            updatedOverview.Occupancy.TotalSpots);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Dashboard RT] Error broadcasting dashboard update");
                    // Não falha o handler se o dashboard broadcast falhar
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MqttHandler] Error processing MQTT message");
        }
    }

    private static int? ResolveVagaId(string topic, MqttSpotMessage message)
    {
        var topicMatch = SpotTopicRegex.Match(topic);
        if (topicMatch.Success && int.TryParse(topicMatch.Groups["id"].Value, out var spotIdFromTopic))
        {
            return spotIdFromTopic;
        }

        if (message.VagaId > 0)
        {
            return message.VagaId;
        }

        return null;
    }

    private static ParkingSpotStatus ResolveStatus(string topic, MqttSpotMessage message)
    {
        if (topic.Equals("parking/entry", StringComparison.OrdinalIgnoreCase))
        {
            return ParkingSpotStatus.Occupied;
        }

        if (topic.Equals("parking/exit", StringComparison.OrdinalIgnoreCase))
        {
            return ParkingSpotStatus.Free;
        }

        var normalized = (message.Status ?? string.Empty).Trim().ToLowerInvariant();
        return normalized switch
        {
            "ocupada" => ParkingSpotStatus.Occupied,
            "occupied" => ParkingSpotStatus.Occupied,
            "livre" => ParkingSpotStatus.Free,
            "free" => ParkingSpotStatus.Free,
            _ => ParkingSpotStatus.Free,
        };
    }
}

public sealed class MqttSpotMessage
{
    public int VagaId { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid ParkingLotId { get; set; }
    public string Device { get; set; } = string.Empty;
    public int Uptime_s { get; set; }
}
