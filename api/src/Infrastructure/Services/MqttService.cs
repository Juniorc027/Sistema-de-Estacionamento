using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Protocol;
using ParkingSystem.Application.Services.Interfaces;

namespace ParkingSystem.Infrastructure.Services;

public class MqttService : IMqttService, IDisposable
{
    private static readonly string[] SubscribedTopics =
    {
        "parking/spots/+", // padrão oficial
        "parking/entry",   // compatibilidade legada
        "parking/exit"     // compatibilidade legada
    };

    private readonly IMqttClient _mqttClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MqttService> _logger;
    private readonly IServiceProvider _services;
    private readonly SemaphoreSlim _reconnectLock = new(1, 1);

    private MqttClientOptions? _options;
    private bool _started;
    private bool _disposed;
    private CancellationTokenSource? _lifetimeCts;

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

        _mqttClient.ApplicationMessageReceivedAsync += HandleMessageAsync;
        _mqttClient.ConnectedAsync += OnConnectedAsync;
        _mqttClient.DisconnectedAsync += OnDisconnectedAsync;
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_started)
        {
            return;
        }

        _started = true;
        _lifetimeCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        _options = BuildOptions();
        await EnsureConnectedAsync(_lifetimeCts.Token);
    }

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        _started = false;

        if (_lifetimeCts is not null && !_lifetimeCts.IsCancellationRequested)
        {
            _lifetimeCts.Cancel();
        }

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
            .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
            .Build();

        await _mqttClient.PublishAsync(message);
        _logger.LogDebug("MQTT mensagem publicada: {Topic} -> {Payload}", topic, payload);
    }

    private MqttClientOptions BuildOptions()
    {
        var broker = _configuration["Mqtt:Broker"] ?? "localhost";
        var port = int.Parse(_configuration["Mqtt:Port"] ?? "1883");
        var clientId = _configuration["Mqtt:ClientId"] ?? $"parking-backend-{Guid.NewGuid()}";
        var username = _configuration["Mqtt:Username"];
        var password = _configuration["Mqtt:Password"];
        var useTls = bool.TryParse(_configuration["Mqtt:UseTls"], out var tlsEnabled) && tlsEnabled;

        var optionsBuilder = new MqttClientOptionsBuilder()
            .WithClientId(clientId)
            .WithTcpServer(broker, port)
            .WithCleanSession()
            .WithKeepAlivePeriod(TimeSpan.FromSeconds(20))
            .WithTimeout(TimeSpan.FromSeconds(10));

        if (!string.IsNullOrWhiteSpace(username))
        {
            optionsBuilder.WithCredentials(username, password);
        }

        if (useTls)
        {
            optionsBuilder.WithTlsOptions(new MqttClientTlsOptions
            {
                UseTls = true,
                IgnoreCertificateChainErrors = false,
                IgnoreCertificateRevocationErrors = false,
                AllowUntrustedCertificates = false,
            });
        }

        return optionsBuilder.Build();
    }

    private async Task EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        if (_options is null)
        {
            _options = BuildOptions();
        }

        await _reconnectLock.WaitAsync(cancellationToken);
        try
        {
            while (_started && !_mqttClient.IsConnected && !cancellationToken.IsCancellationRequested)
            {
                try
                {
                    await _mqttClient.ConnectAsync(_options, cancellationToken);
                    _logger.LogInformation("MQTT conectado com sucesso.");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao conectar no MQTT. Nova tentativa em 3s.");
                    await Task.Delay(TimeSpan.FromSeconds(3), cancellationToken);
                }
            }
        }
        finally
        {
            _reconnectLock.Release();
        }
    }

    private async Task OnConnectedAsync(MqttClientConnectedEventArgs args)
    {
        await SubscribeTopicsAsync();
    }

    private async Task OnDisconnectedAsync(MqttClientDisconnectedEventArgs args)
    {
        if (!_started || _disposed)
        {
            return;
        }

        _logger.LogWarning("MQTT desconectado. Reason: {Reason}", args.Reason);

        if (_lifetimeCts is null)
        {
            return;
        }

        try
        {
            await EnsureConnectedAsync(_lifetimeCts.Token);
        }
        catch (OperationCanceledException)
        {
        }
    }

    private async Task SubscribeTopicsAsync()
    {
        foreach (var topic in SubscribedTopics)
        {
            var filter = new MqttTopicFilterBuilder()
                .WithTopic(topic)
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _mqttClient.SubscribeAsync(filter);
        }

        _logger.LogInformation("MQTT subscribed to: {Topics}", string.Join(", ", SubscribedTopics));
    }

    private async Task HandleMessageAsync(MqttApplicationMessageReceivedEventArgs args)
    {
        var topic = args.ApplicationMessage.Topic;
        var payload = Encoding.UTF8.GetString(args.ApplicationMessage.PayloadSegment);

        _logger.LogInformation("MQTT mensagem recebida: {Topic} -> {Payload}", topic, payload);

        using var scope = _services.CreateScope();
        var handler = scope.ServiceProvider.GetService<IMqttMessageHandler>();
        if (handler != null)
        {
            await handler.HandleAsync(topic, payload);
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _lifetimeCts?.Cancel();
        _lifetimeCts?.Dispose();
        _reconnectLock.Dispose();
        _mqttClient.Dispose();
    }
}
