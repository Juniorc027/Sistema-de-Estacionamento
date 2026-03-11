using Microsoft.AspNetCore.SignalR;
using ParkingSystem.API.Hubs;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Enums;
using System.Text.Json;

namespace ParkingSystem.API.Services;

/// <summary>
/// Handler que processa mensagens MQTT e dispara eventos SignalR
/// </summary>
public class MqttToSignalRHandler : IMqttMessageHandler
{
    private readonly IServiceProvider _services;
    private readonly ILogger<MqttToSignalRHandler> _logger;

    public MqttToSignalRHandler(IServiceProvider services, ILogger<MqttToSignalRHandler> logger)
    {
        _services = services;
        _logger = logger;
    }

    /// <summary>
    /// Processa mensagem MQTT e atualiza banco + SignalR
    /// </summary>
    public async Task HandleAsync(string topic, string payload)
    {
        try
        {
            _logger.LogInformation("[MqttHandler] Processing: {Topic} -> {Payload}", topic, payload);

            // Cria scope para acessar serviços scoped (DbContext)
            using var scope = _services.CreateScope();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ParkingHub>>();
            var spotService = scope.ServiceProvider.GetRequiredService<IParkingSpotService>();

            // Parse do JSON do ESP32
            var mqttMessage = JsonSerializer.Deserialize<MqttSpotMessage>(payload);
            if (mqttMessage == null) return;

            // Determina status baseado no tópico
            var newStatus = topic switch
            {
                "parking/entry" => ParkingSpotStatus.Occupied,
                "parking/exit" => ParkingSpotStatus.Free,
                _ => ParkingSpotStatus.Free
            };

            // Busca a vaga pelo número (spotNumber do ESP32 corresponde ao banco)
            var spots = await spotService.GetByParkingLotAsync(mqttMessage.ParkingLotId);
            var spot = spots.Data?.FirstOrDefault(s => s.SpotNumber == mqttMessage.VagaId.ToString("D3"));

            if (spot == null)
            {
                _logger.LogWarning("[MqttHandler] Spot not found: {SpotNumber}", mqttMessage.VagaId);
                return;
            }

            // TODO: Atualizar status da vaga no banco via service
            // (Requer criar método UpdateStatusAsync no IParkingSpotService)

            // Envia evento SignalR para todos os clientes
            await hubContext.Clients.All.SendAsync("SpotUpdated", new SpotUpdatedDto(
                SpotId: Guid.Parse(spot.Id.ToString()),
                SpotNumber: spot.SpotNumber,
                Status: newStatus,
                Timestamp: DateTime.UtcNow
            ));

            _logger.LogInformation("[MqttHandler] SignalR event sent for spot {Spot}", spot.SpotNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MqttHandler] Error processing MQTT message");
        }
    }
}

/// <summary>
/// Estrutura da mensagem JSON enviada pelo ESP32
/// </summary>
public class MqttSpotMessage
{
    public int VagaId { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid ParkingLotId { get; set; }
    public string Device { get; set; } = string.Empty;
    public int Uptime_s { get; set; }
}
