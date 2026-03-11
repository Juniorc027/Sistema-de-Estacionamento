namespace ParkingSystem.Application.Services.Interfaces;

/// <summary>
/// Handler para processar mensagens MQTT recebidas
/// </summary>
public interface IMqttMessageHandler
{
    Task HandleAsync(string topic, string payload);
}
