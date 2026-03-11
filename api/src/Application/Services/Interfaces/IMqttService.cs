namespace ParkingSystem.Application.Services.Interfaces;

public interface IMqttService
{
    Task StartAsync(CancellationToken cancellationToken = default);
    Task StopAsync(CancellationToken cancellationToken = default);
    Task PublishAsync(string topic, string payload);
}
