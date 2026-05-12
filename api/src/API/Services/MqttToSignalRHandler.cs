using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using ParkingSystem.API.Hubs;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;
using ParkingSystem.Domain.Entities;

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
    /// ✅ FLUXO ESPERADO DA ESP32:
    ///   1. ESP32 publica em "parking/spots/{id}" (ex: "parking/spots/1")
    ///   2. HandleAsync recebe topic="parking/spots/1", payload={json}
    ///   3. HandleAsync extrai vagaId do tópico ou do payload
    ///   4. UpdateStatusAsync é chamado
    ///   5. SessionManagementService detecta transição (entry/exit)
    ///   6. SignalR broadcast (SpotUpdated + UpdateDashboardStats)
    ///   7. Frontend 3D atualiza + relatórios atualizam
    /// </summary>
    public async Task HandleAsync(string topic, string payload)
    {
        try
        {
            _logger.LogInformation("\n\n[MQTT] MQTT MESSAGE RECEIVED - PROCESSING START");
            _logger.LogInformation("[MQTT] ════════════════════════════════════════════════════════════");
            _logger.LogInformation("[MQTT] Topic:   {Topic}", topic);
            _logger.LogInformation("[MQTT] Payload: {Payload}", payload);
            _logger.LogInformation("[MQTT] Timestamp: {TS:yyyy-MM-dd HH:mm:ss.fff}", DateTime.UtcNow);
            _logger.LogInformation("[MQTT] ════════════════════════════════════════════════════════════");

            using var scope = _services.CreateScope();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ParkingHub>>();
            var spotService = scope.ServiceProvider.GetRequiredService<IParkingSpotService>();
            var sessionService = scope.ServiceProvider.GetRequiredService<ISessionManagementService>();
            var dashboardService = scope.ServiceProvider.GetRequiredService<IDashboardService>();

            // ✅ Tratamento específico para SNAPSHOT de vagas (parking/spots)
            if (topic.Equals("parking/spots", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("[MQTT] ➤ Matched: parking/spots (SNAPSHOT) - Delegating to HandleSpotSnapshotAsync");
                await HandleSpotSnapshotAsync(scope, payload);
                return;
            }

            // ✅ Tratamento específico para eventos de ENTRADA/SAÍDA (parking/events)
            if (topic.Equals("parking/events", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("[MQTT] ➤ Matched: parking/events - Delegating to HandleEventSnapshotAsync");
                await HandleEventSnapshotAsync(scope, payload);
                return;
            }

            // ✅ Tratamento específico para eventos de ENTRADA/SAÍDA (compatibilidade legada)
            if (topic.Equals("parking/entry", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("[MQTT] ➤ Matched: parking/entry - Delegating to HandleGateEventAsync");
                await HandleGateEventAsync(scope, payload, isEntry: true);
                return;
            }

            if (topic.Equals("parking/exit", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("[MQTT] ➤ Matched: parking/exit - Delegating to HandleGateEventAsync");
                await HandleGateEventAsync(scope, payload, isEntry: false);
                return;
            }

            // ✅ Tratamento para individual spot updates (parking/spots/{id})
            // Este é o fluxo PRINCIPAL da ESP32!
            _logger.LogInformation("[MQTT] ➤ Processing as individual spot update (parking/spots/{{id}} pattern)");

            // Step 1: Deserialize JSON
            _logger.LogInformation("[MQTT] [Step 1/7] Deserializing JSON payload...");
            MqttSpotMessage mqttMessage;
            try
            {
                mqttMessage = JsonSerializer.Deserialize<MqttSpotMessage>(payload, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                });
                _logger.LogInformation("[MQTT]   OK JSON deserialized successfully");
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "[MQTT]   ERROR JSON DESERIALIZATION FAILED: {Message}", ex.Message);
                return;
            }

            if (mqttMessage == null)
            {
                _logger.LogError("[MQTT]   ERROR mqttMessage is null after deserialize");
                return;
            }
            _logger.LogInformation("[MQTT]   VagaId={VagaId}, Status={Status}, ParkingLotId={ParkingLotId}",
                mqttMessage.VagaId, mqttMessage.Status, mqttMessage.ParkingLotId);

            // Step 2: Validate parkingLotId
            _logger.LogInformation("[MQTT] [Step 2/7] Validating parkingLotId...");
            var parkingLotId = mqttMessage.ParkingLotId;
            if (parkingLotId == Guid.Empty)
            {
                _logger.LogError("[MQTT]   ERROR: INVALID parkingLotId is Guid.Empty");
                _logger.LogError("[MQTT]   Topic: {Topic}", topic);
                _logger.LogError("[MQTT]   Payload: {Payload}", payload);
                return;
            }
            _logger.LogInformation("[MQTT]   OK ParkingLotId valid: {ParkingLotId}", parkingLotId);

            // Step 3: Resolve vagaId
            _logger.LogInformation("[MQTT] [Step 3/7] Resolving vagaId from topic and payload...");
            var vagaId = ResolveVagaId(topic, mqttMessage);
            if (vagaId is null or <= 0)
            {
                _logger.LogError("[MQTT]   ERROR: INVALID Could not resolve vagaId");
                _logger.LogError("[MQTT]   Topic: {Topic}", topic);
                _logger.LogError("[MQTT]   Payload: {Payload}", payload);
                return;
            }
            _logger.LogInformation("[MQTT]   OK VagaId resolved: {VagaId}", vagaId);

            // Step 4: Resolve status
            _logger.LogInformation("[MQTT] [Step 4/7] Resolving spot status from topic and payload...");
            var newStatus = ResolveStatus(topic, mqttMessage);
            var spotNumber = vagaId.Value.ToString("D3");
            _logger.LogInformation("[MQTT]   OK Status resolved: {Status} (SpotNumber={SpotNumber})", newStatus, spotNumber);

            // Step 5: Get current spot status from database
            _logger.LogInformation("[MQTT] [Step 5/7] Querying database for current spot status...");
            var getResult = await spotService.GetByLotAndSpotNumberAsync(parkingLotId, spotNumber);
            var oldStatus = getResult.Success && getResult.Data != null
                ? getResult.Data.Status
                : ParkingSpotStatus.Free;
            if (!getResult.Success)
            {
                _logger.LogWarning("[MQTT]   WARNING GetByLotAndSpotNumberAsync returned !Success. Using default Free status.");
            }
            _logger.LogInformation("[MQTT]   OK Current status: {OldStatus}", oldStatus);

            // Step 6: Update status in database
            _logger.LogInformation("[MQTT] [Step 6/7] Updating spot status in database ({OldStatus} -> {NewStatus})...", oldStatus, newStatus);
            var updateResult = await spotService.UpdateStatusAsync(parkingLotId, spotNumber, newStatus);
            if (!updateResult.Success || updateResult.Data is null)
            {
                _logger.LogError("[MQTT]   ERROR: UPDATE FAILED: {Message}", updateResult.Message);
                _logger.LogError("[MQTT]   LotId: {LotId}, SpotNumber: {SpotNumber}, NewStatus: {NewStatus}",
                    parkingLotId, spotNumber, newStatus);
                return;
            }
            _logger.LogInformation("[MQTT]   OK Spot updated successfully in database");

            var updatedSpot = updateResult.Data;

            // Step 7: Handle session management (entry/exit transitions)
            _logger.LogInformation("[MQTT] [Step 7/7] Session management - Detecting entry/exit transitions...");
            if (oldStatus != newStatus)
            {
                _logger.LogInformation("[MQTT]   VEHICLE TRANSITION DETECTED: {OldStatus} -> {NewStatus} (Entry/Exit event)", oldStatus, newStatus);
                _logger.LogInformation("[MQTT] [SessionMgmt] CreateSession START for spot {Spot}", spotNumber);

                await sessionService.HandleSpotStatusChangeAsync(
                    updatedSpot.Id,
                    parkingLotId,
                    spotNumber,
                    oldStatus,
                    newStatus
                );

                _logger.LogInformation("[MQTT] [SessionMgmt] SUCCESS CreateSession for spot {Spot}", spotNumber);
            }
            else
            {
                _logger.LogInformation("[MQTT]   NO TRANSITION: Same status ({Status}) - No session event", oldStatus);
            }

            // SignalR broadcasts
            _logger.LogInformation("[MQTT] ========================================");

            // Broadcast #1: SpotUpdated (for 2D map + real-time indicator)
            var spotUpdated = new SpotUpdatedDto(
                ParkingLotId: updatedSpot.ParkingLotId,
                SpotId: updatedSpot.Id,
                SpotNumber: updatedSpot.SpotNumber,
                Status: updatedSpot.Status,
                Timestamp: DateTime.UtcNow
            );

            _logger.LogInformation("[MqttHandler] Sending Broadcast 1: SpotUpdated (2D Map Update)");
            _logger.LogInformation("[MqttHandler]    SpotNumber={SpotNumber}, Status={Status}, ParkingLotId={ParkingLotId}",
                spotUpdated.SpotNumber, spotUpdated.Status, spotUpdated.ParkingLotId);

            try
            {
                await hubContext.Clients
                    .Group(ParkingHub.BuildParkingLotGroup(updatedSpot.ParkingLotId))
                    .SendAsync("SpotUpdated", spotUpdated);
                _logger.LogInformation("[MqttHandler] OK Broadcast 1 sent successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MqttHandler] ERROR broadcasting SpotUpdated");
                throw;
            }

            // Broadcast #2: Dashboard stats (only on entry/exit transitions)
            if (oldStatus != newStatus)
            {
                _logger.LogInformation("[MQTT] ========================================");
                _logger.LogInformation("[Dashboard RT] Sending Broadcast 2: UpdateDashboardStats (3D Occupancy Update)");
                _logger.LogInformation("[Dashboard RT]    Transition: {OldStatus} -> {NewStatus} (Entry/Exit)", oldStatus, newStatus);

                try
                {
                    // Recompute occupancy stats
                    var updatedOverview = await dashboardService.RecomputeOverviewForRealTimeUpdateAsync(parkingLotId);

                    if (updatedOverview != null)
                    {
                        await hubContext.Clients
                            .Group(ParkingHub.BuildParkingLotGroup(parkingLotId))
                            .SendAsync("UpdateDashboardStats", updatedOverview);

                        _logger.LogInformation("[Dashboard RT] OK Broadcast 2 sent successfully");
                        _logger.LogInformation("[Dashboard RT]    Occupancy: {Occupancy}% ({Occupied}/{Total})",
                            updatedOverview.Occupancy.OccupancyPercentage.ToString("F1"),
                            updatedOverview.Occupancy.OccupiedSpots,
                            updatedOverview.Occupancy.TotalSpots);
                    }
                    else
                    {
                        _logger.LogWarning("[Dashboard RT] WARNING: updatedOverview is null");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Dashboard RT] ❌ Error broadcasting dashboard update");
                    // Don't fail the handler if dashboard broadcast fails
                }
            }

            _logger.LogInformation("[MQTT] ╔════════════════════════════════════════════════════════════╗");
            _logger.LogInformation("[MQTT] ║  MQTT MESSAGE PROCESSED SUCCESSFULLY ✅                    ║");
            _logger.LogInformation("[MQTT] ════════════════════════════════════════════════════════════");
            _logger.LogInformation("[MQTT] MQTT MESSAGE PROCESSED SUCCESSFULLY");
            _logger.LogInformation("[MQTT] Spot {Spot}: {OldStatus} -> {NewStatus}", spotNumber, oldStatus, newStatus);
            _logger.LogInformation("[MQTT] Backend -> SignalR -> Frontend (3D) -> Complete!");
            _logger.LogInformation("[MQTT] ════════════════════════════════════════════════════════════\n");
        }
        catch (Exception ex)
        {
            _logger.LogError("\n\n[MQTT] ERROR PROCESSING MQTT MESSAGE");
            _logger.LogError("[MQTT] Exception: {ExceptionType}: {Message}", ex.GetType().Name, ex.Message);
            _logger.LogError("[MQTT] StackTrace: {StackTrace}", ex.StackTrace);
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

    /// <summary>
    /// ✅ NOVO: Processa SNAPSHOT de vagas (parking/spots)
    /// JSON da ESP32: {"spots": [{"id": 1, "occupied": true}, ...]}
    /// </summary>
    private async Task HandleSpotSnapshotAsync(IServiceScope scope, string payload)
    {
        try
        {
            _logger.LogInformation("[SpotSnapshot] Processing parking spots snapshot");

            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;

            if (!root.TryGetProperty("spots", out var spotsArray))
            {
                _logger.LogWarning("[SpotSnapshot] No 'spots' array found in payload");
                return;
            }

            var spotService = scope.ServiceProvider.GetRequiredService<IParkingSpotService>();
            var dashboardService = scope.ServiceProvider.GetRequiredService<IDashboardService>();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ParkingHub>>();

            // TODO: Você precisa descobrir o ParkingLotId da sua configração
            // Por enquanto, vou usar um placeholder
            var parkingLotId = Guid.Empty; // ← CONFIGURAR COM VALOR REAL

            // Processa cada vaga
            foreach (var spotElement in spotsArray.EnumerateArray())
            {
                if (!spotElement.TryGetProperty("id", out var idElement) ||
                    !spotElement.TryGetProperty("occupied", out var occupiedElement))
                {
                    continue;
                }

                var spotNumber = idElement.GetInt32().ToString("D3");
                var isOccupied = occupiedElement.GetBoolean();
                var newStatus = isOccupied ? ParkingSpotStatus.Occupied : ParkingSpotStatus.Free;

                try
                {
                    // Busca status anterior
                    var getResult = await spotService.GetByLotAndSpotNumberAsync(parkingLotId, spotNumber);
                    var oldStatus = getResult.Success && getResult.Data != null
                        ? getResult.Data.Status
                        : ParkingSpotStatus.Free;

                    if (oldStatus == newStatus)
                    {
                        continue; // Sem mudança
                    }

                    // Atualiza no BD
                    var updateResult = await spotService.UpdateStatusAsync(parkingLotId, spotNumber, newStatus);
                    if (!updateResult.Success || updateResult.Data is null)
                    {
                        _logger.LogWarning("[SpotSnapshot] Failed to update spot {Spot}", spotNumber);
                        continue;
                    }

                    var updatedSpot = updateResult.Data;

                    // Broadcast via SignalR
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

                    _logger.LogInformation("[SpotSnapshot] Spot {Spot} updated: {OldStatus} → {NewStatus}",
                        spotNumber, oldStatus, newStatus);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[SpotSnapshot] Error processing spot {Spot}", spotNumber);
                }
            }

            // Atualiza dashboard após processar todas as vagas
            try
            {
                var updatedOverview = await dashboardService.RecomputeOverviewForRealTimeUpdateAsync(parkingLotId);
                if (updatedOverview != null)
                {
                    await hubContext.Clients
                        .Group(ParkingHub.BuildParkingLotGroup(parkingLotId))
                        .SendAsync("UpdateDashboardStats", updatedOverview);

                    _logger.LogInformation("[SpotSnapshot] Dashboard updated: {Occupied}/{Total} spots occupied",
                        updatedOverview.Occupancy.OccupiedSpots,
                        updatedOverview.Occupancy.TotalSpots);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SpotSnapshot] Error updating dashboard");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SpotSnapshot] Error processing spot snapshot");
        }
    }

    /// <summary>
    /// ✅ NOVO: Processa EVENTOS de entrada/saída (parking/events)
    /// JSON da ESP32: {"event": "entry|exit", "timestamp": 12345, "vagasDisponiveis": 15}
    /// </summary>
    private async Task HandleEventSnapshotAsync(IServiceScope scope, string payload)
    {
        try
        {
            _logger.LogInformation("[EventSnapshot] Processing parking event snapshot");

            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;

            if (!root.TryGetProperty("event", out var eventElement))
            {
                _logger.LogWarning("[EventSnapshot] No 'event' found in payload");
                return;
            }

            var eventType = eventElement.GetString();
            var isEntry = eventType?.Equals("entry", StringComparison.OrdinalIgnoreCase) ?? false;

            if (!isEntry && !eventType?.Equals("exit", StringComparison.OrdinalIgnoreCase) == true)
            {
                _logger.LogWarning("[EventSnapshot] Unknown event type: {EventType}", eventType);
                return;
            }

            // Cria mensagem de gate event
            var gateMessage = new GateEventMessage
            {
                Event = eventType ?? string.Empty,
                Timestamp = root.TryGetProperty("timestamp", out var ts) ? ts.GetInt64() : 0,
                ParkingLotId = Guid.Empty, // ← CONFIGURAR COM VALOR REAL
                Device = "ESP32_SmartParking"
            };

            await HandleGateEventAsync(scope, JsonSerializer.Serialize(gateMessage), isEntry);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EventSnapshot] Error processing event snapshot");
        }
    }

    /// <summary>
    /// Processa eventos de portão (entrada/saída) e dispara broadcasts de alerta
    /// </summary>
    private async Task HandleGateEventAsync(IServiceScope scope, string payload, bool isEntry)
    {
        try
        {
            var gateMessage = JsonSerializer.Deserialize<GateEventMessage>(payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

            if (gateMessage?.ParkingLotId == Guid.Empty)
            {
                _logger.LogWarning("[GateHandler] Missing parkingLotId in gate event. Payload: {Payload}", payload);
                return;
            }

            var eventType = isEntry ? "VEHICLE_ENTRY" : "VEHICLE_EXIT";
            var eventDescription = isEntry ? "🚗 Carro detectado NA ENTRADA (cancela)" : "🚗 Carro detectado NA SAÍDA (cancela)";

            _logger.LogInformation("[GateHandler] {EventType} detected at parking lot {LotId}. Device: {Device}, Timestamp: {TS}",
                eventType,
                gateMessage.ParkingLotId,
                gateMessage.Device,
                gateMessage.Timestamp);

            // Registra no log de sistema
            var systemLogService = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var systemLog = new SystemLog
            {
                Event = eventType,
                Description = eventDescription,
                Source = "GateEventHandler",
                Payload = payload,
                OccurredAt = DateTime.UtcNow
            };

            await systemLogService.SystemLogs.AddAsync(systemLog);
            await systemLogService.CommitAsync();

            _logger.LogInformation("[GateHandler] ✅ SystemLog registered for {EventType}", eventType);

            // Broadcast do evento para o frontend (para alertas visuais em tempo real)
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ParkingHub>>();
            var gateEvent = new GateEventDto(
                ParkingLotId: gateMessage.ParkingLotId,
                EventType: isEntry ? "entry" : "exit",
                Timestamp: DateTime.UtcNow,
                Device: gateMessage.Device
            );

            await hubContext.Clients
                .Group(ParkingHub.BuildParkingLotGroup(gateMessage.ParkingLotId))
                .SendAsync("GateEvent", gateEvent);

            _logger.LogInformation("[GateHandler] ✅ Broadcast sent to parking lot {LotId}: {EventType}", gateMessage.ParkingLotId, gateEvent.EventType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GateHandler] Error processing gate event");
        }
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

/// <summary>
/// ✅ NOVO: Mensagem de evento de gate (entrada/saída)
/// </summary>
public sealed class GateEventMessage
{
    public string Event { get; set; } = string.Empty;
    public long Timestamp { get; set; }
    public Guid ParkingLotId { get; set; }
    public string Device { get; set; } = string.Empty;
}

/// <summary>
/// ✅ NOVO: DTO para broadcast de evento de gate via SignalR
/// </summary>
public record GateEventDto(
    Guid ParkingLotId,
    string EventType,
    DateTime Timestamp,
    string Device
);
