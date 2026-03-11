using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MQTTnet;
using MQTTnet.Client;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.Infrastructure.Services;

public class MqttService : IMqttService, IDisposable
{
    private readonly IMqttClient _mqttClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MqttService> _logger;
    private readonly IServiceProvider _services;

    public MqttService(
        IConfiguration configuration,
        ILogger<MqttService> logger,
        IServiceProvider services)
    {
        _configuration = configuration;
        _logger = logger;
        _services = services;
        var factory = new MqttFactory();
        _mqttClient = factory.CreateMqttClient();
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        var broker = _configuration["Mqtt:Broker"] ?? "localhost";
        var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");
        var clientId = _configuration["Mqtt:ClientId"] ?? $"parking-backend-{Guid.NewGuid()}";

        var options = new MqttClientOptionsBuilder()
            .WithClientId(clientId)
            .WithTcpServer(broker, port)
            .WithCleanSession()
            .Build();

        _mqttClient.ApplicationMessageReceivedAsync += HandleMessageAsync;

        try
        {
            await _mqttClient.ConnectAsync(options, cancellationToken);
            _logger.LogInformation("MQTT conectado ao broker {Broker}:{Port}", broker, port);

            // Subscribe to ESP32 topics
            await _mqttClient.SubscribeAsync(new MqttTopicFilterBuilder()
                .WithTopic("parking/entry")
                .Build(), cancellationToken);

            await _mqttClient.SubscribeAsync(new MqttTopicFilterBuilder()
                .WithTopic("parking/exit")
                .Build(), cancellationToken);

            _logger.LogInformation("MQTT subscribed to parking/entry and parking/exit topics");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MQTT não pôde conectar. O serviço continuará sem MQTT.");
        }
    }

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        if (_mqttClient.IsConnected)
        {
            await _mqttClient.DisconnectAsync(cancellationToken: cancellationToken);
            _logger.LogInformation("MQTT desconectado.");
        }
    }

    public async Task PublishAsync(string topic, string payload)
    {
        if (!_mqttClient.IsConnected)
        {
            _logger.LogWarning("MQTT não está conectado. Mensagem não publicada: {Topic}", topic);
            return;
        }

        var message = new MqttApplicationMessageBuilder()
            .WithTopic(topic)
            .WithPayload(Encoding.UTF8.GetBytes(payload))
            .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
            .Build();

        await _mqttClient.PublishAsync(message);
        _logger.LogDebug("MQTT mensagem publicada: {Topic} -> {Payload}", topic, payload);
    }

    private async Task HandleMessageAsync(MqttApplicationMessageReceivedEventArgs args)
    {
        var topic = args.ApplicationMessage.Topic;
        var payload = Encoding.UTF8.GetString(args.ApplicationMessage.PayloadSegment);

        _logger.LogInformation("MQTT mensagem recebida: {Topic} -> {Payload}", topic, payload);

        // Delega processamento para o handler (se registrado)
        using var scope = _services.CreateScope();
        var handler = scope.ServiceProvider.GetService<IMqttMessageHandler>();
        if (handler != null)
        {
            await handler.HandleAsync(topic, payload);
        }
    }

    public void Dispose()
    {
        _mqttClient?.Dispose();
    }
}
