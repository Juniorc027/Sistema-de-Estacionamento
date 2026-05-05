# Smart Gate Control — Integração com Backend .NET 8

## 📋 Resumo

Este documento explica como integrar os eventos de entrada/saída das cancelas inteligentes no seu **Backend .NET 8**.

---

## 📡 Fluxo de Dados

```
ESP32 (Evento)
    ↓
    └─→ MQTT Broker
            ↓
            └─→ .NET 8 (MqttService)
                    ↓
                    ├─ Processa "entry"
                    ├─ Processa "exit"
                    ├─ Atualiza DB
                    └─ Broadcast SignalR
                            ↓
                            └─→ Next.js Dashboard (Real-time)
```

---

## 🔧 Implementação no Backend

### 1. Atualizar Modelo de Domínio

```csharp
// Domain/Entities/ParkingEvent.cs
public class ParkingEvent : BaseEntity
{
    public Guid ParkingLotId { get; set; }
    public string EventType { get; set; } // "entry" ou "exit"
    public DateTime Timestamp { get; set; }
    public string DeviceId { get; set; } // "esp32-parking-22"
}
```

### 2. Criar Handler para Eventos MQTT

```csharp
// Application/Services/MqttEventHandler.cs
using System.Text.Json;
using MediatR;

public class MqttEventHandler
{
    private readonly IMediator _mediator;
    private readonly ILogger<MqttEventHandler> _logger;

    public MqttEventHandler(IMediator mediator, ILogger<MqttEventHandler> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Processa eventos MQTT de entrada/saída
    /// </summary>
    public async Task HandleParkingEventAsync(string topic, string payload)
    {
        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;

            var parkingLotId = root.GetProperty("parkingLotId").GetString();
            var eventType = root.GetProperty("eventType").GetString();
            var timestamp = DateTime.Parse(
                root.GetProperty("timestamp").GetInt64().ToString()
            );

            _logger.LogInformation(
                "[MQTT] Evento {EventType} recebido de {ParkingLotId}",
                eventType, parkingLotId);

            if (eventType == "entry")
            {
                await HandleEntryEventAsync(parkingLotId);
            }
            else if (eventType == "exit")
            {
                await HandleExitEventAsync(parkingLotId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MQTT] Erro ao processar evento");
        }
    }

    private async Task HandleEntryEventAsync(string parkingLotId)
    {
        // Criar comando de entrada
        var command = new RecordParkingEntryCommand
        {
            ParkingLotId = Guid.Parse(parkingLotId)
        };

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            _logger.LogInformation("✅ Entrada registrada");
        }
        else
        {
            _logger.LogWarning("❌ Falha ao registrar entrada: {Error}", result.Error);
        }
    }

    private async Task HandleExitEventAsync(string parkingLotId)
    {
        // Criar comando de saída
        var command = new RecordParkingExitCommand
        {
            ParkingLotId = Guid.Parse(parkingLotId)
        };

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            _logger.LogInformation("✅ Saída registrada");
        }
        else
        {
            _logger.LogWarning("❌ Falha ao registrar saída: {Error}", result.Error);
        }
    }
}
```

### 3. Integrar com MqttService Existente

```csharp
// Application/Services/MqttService.cs
public class MqttService : IMqttService
{
    private readonly IMqttClient _client;
    private readonly MqttEventHandler _eventHandler;
    private readonly ILogger<MqttService> _logger;

    public MqttService(
        IMqttClient client,
        MqttEventHandler eventHandler,
        ILogger<MqttService> logger)
    {
        _client = client;
        _eventHandler = eventHandler;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        // ... código existente de conexão ...

        // Subscribe aos tópicos de gates
        await _client.SubscribeAsync(new TopicFilterBuilder()
            .WithTopic("parking/entry")
            .WithAtLeastOnceQoS()
            .Build());

        await _client.SubscribeAsync(new TopicFilterBuilder()
            .WithTopic("parking/exit")
            .WithAtLeastOnceQoS()
            .Build());

        // Subscribe ao snapshot de vagas (sincronização)
        await _client.SubscribeAsync(new TopicFilterBuilder()
            .WithTopic("parking/spots/snapshot")
            .WithAtLeastOnceQoS()
            .Build());

        _client.ApplicationMessageReceivedAsync += async e =>
        {
            var topic = e.ApplicationMessage.Topic;
            var payload = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);

            _logger.LogInformation("[MQTT] Mensagem recebida em {Topic}", topic);

            if (topic == "parking/entry" || topic == "parking/exit")
            {
                await _eventHandler.HandleParkingEventAsync(topic, payload);
            }
            else if (topic == "parking/spots/snapshot")
            {
                await HandleSpotSnapshotAsync(payload);
            }

            await Task.CompletedTask;
        };
    }

    private async Task HandleSpotSnapshotAsync(string payload)
    {
        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;

            var totalSpots = root.GetProperty("totalSpots").GetInt32();
            var occupiedSpots = root.GetProperty("occupiedSpots").GetInt32();
            var availableSpots = root.GetProperty("availableSpots").GetInt32();

            _logger.LogInformation(
                "[Snapshot] Total: {Total} | Ocupadas: {Occupied} | Livres: {Available}",
                totalSpots, occupiedSpots, availableSpots);

            // Atualizar cache em memória se necessário
            // await _cache.SetAsync("parking-snapshot", payload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Snapshot] Erro ao processar");
        }
    }

    /// <summary>
    /// Publica snapshot de vagas para ESP32 (a cada 30s)
    /// </summary>
    public async Task PublishSpotSnapshotAsync(string parkingLotId)
    {
        try
        {
            // Obter dados atuais do DB
            var parkingLot = await _parkingRepository.GetByIdAsync(parkingLotId);

            var payload = JsonSerializer.Serialize(new
            {
                totalSpots = parkingLot.TotalSpots,
                occupiedSpots = parkingLot.OccupiedSpots,
                availableSpots = parkingLot.AvailableSpots,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            });

            await _client.PublishAsync(new MqttApplicationMessageBuilder()
                .WithTopic("parking/spots/snapshot")
                .WithPayload(payload)
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .WithRetainFlag(true)
                .Build());

            _logger.LogInformation("[Snapshot] Publicado para ESP32");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Snapshot] Erro ao publicar");
        }
    }
}
```

### 4. Criar Handler de Comando para Entrada

```csharp
// Application/Features/Parking/Commands/RecordParkingEntry/
RecordParkingEntryCommand.cs
public record RecordParkingEntryCommand(Guid ParkingLotId) : IRequest<Result<ParkingEventDto>>;

// RecordParkingEntryHandler.cs
public class RecordParkingEntryHandler : IRequestHandler<RecordParkingEntryCommand, Result<ParkingEventDto>>
{
    private readonly IParkingRepository _parkingRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHubContext<ParkingHub> _hubContext;

    public async Task<Result<ParkingEventDto>> Handle(
        RecordParkingEntryCommand request,
        CancellationToken cancellationToken)
    {
        var parkingLot = await _parkingRepository.GetByIdAsync(request.ParkingLotId);

        if (parkingLot == null)
            return Result.Failure<ParkingEventDto>("Estacionamento não encontrado");

        if (parkingLot.AvailableSpots <= 0)
            return Result.Failure<ParkingEventDto>("Sem vagas disponíveis");

        // Diminui vagas
        parkingLot.OccupiedSpots++;

        // Registra evento
        var @event = new ParkingEvent
        {
            ParkingLotId = request.ParkingLotId,
            EventType = "entry",
            Timestamp = DateTime.UtcNow,
            DeviceId = "esp32-parking-22"
        };

        _parkingRepository.Update(parkingLot);
        await _parkingRepository.AddEventAsync(@event);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notifica clientes conectados via SignalR
        await _hubContext.Clients.All.SendAsync(
            "ParkingEntryDetected",
            new { parkingLotId = parkingLot.Id, availableSpots = parkingLot.AvailableSpots },
            cancellationToken: cancellationToken);

        return Result.Success(MapToParkingEventDto(@event));
    }
}
```

### 5. Criar Handler de Comando para Saída

```csharp
// Application/Features/Parking/Commands/RecordParkingExit/
RecordParkingExitCommand.cs
public record RecordParkingExitCommand(Guid ParkingLotId) : IRequest<Result<ParkingEventDto>>;

// RecordParkingExitHandler.cs
public class RecordParkingExitHandler : IRequestHandler<RecordParkingExitCommand, Result<ParkingEventDto>>
{
    private readonly IParkingRepository _parkingRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHubContext<ParkingHub> _hubContext;

    public async Task<Result<ParkingEventDto>> Handle(
        RecordParkingExitCommand request,
        CancellationToken cancellationToken)
    {
        var parkingLot = await _parkingRepository.GetByIdAsync(request.ParkingLotId);

        if (parkingLot == null)
            return Result.Failure<ParkingEventDto>("Estacionamento não encontrado");

        if (parkingLot.OccupiedSpots <= 0)
            return Result.Failure<ParkingEventDto>("Nenhum carro para sair");

        // Aumenta vagas
        parkingLot.OccupiedSpots--;

        // Registra evento
        var @event = new ParkingEvent
        {
            ParkingLotId = request.ParkingLotId,
            EventType = "exit",
            Timestamp = DateTime.UtcNow,
            DeviceId = "esp32-parking-22"
        };

        _parkingRepository.Update(parkingLot);
        await _parkingRepository.AddEventAsync(@event);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notifica clientes conectados
        await _hubContext.Clients.All.SendAsync(
            "ParkingExitDetected",
            new { parkingLotId = parkingLot.Id, availableSpots = parkingLot.AvailableSpots },
            cancellationToken: cancellationToken);

        return Result.Success(MapToParkingEventDto(@event));
    }
}
```

### 6. Registrar no Dependency Injection

```csharp
// Program.cs (Startup)
services.AddTransient<MqttEventHandler>();
services.AddScoped<IMqttService, MqttService>();

// Registrar handlers CQRS
services.AddMediatR(config =>
{
    config.RegisterServicesFromAssemblyContaining<RecordParkingEntryCommand>();
});
```

### 7. Scheduled Job para Publicar Snapshot

```csharp
// Application/Services/SnapshotPublisherService.cs
public class SnapshotPublisherService : IHostedService
{
    private readonly IMqttService _mqttService;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SnapshotPublisherService> _logger;
    private Timer _timer;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Iniciando SnapshotPublisher...");

        // Publica a cada 30 segundos
        _timer = new Timer(
            callback: async _ => await PublishSnapshotAsync(),
            state: null,
            dueTime: TimeSpan.Zero,
            period: TimeSpan.FromSeconds(30));

        await Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _timer?.Change(Timeout.Infinite, 0);
        _timer?.Dispose();
        await Task.CompletedTask;
    }

    private async Task PublishSnapshotAsync()
    {
        try
        {
            var parkingLotId = "45fc18f2-bdd8-4b11-b964-f8face1147f0"; // De config

            await _mqttService.PublishSpotSnapshotAsync(parkingLotId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao publicar snapshot");
        }
    }
}

// Program.cs
services.AddHostedService<SnapshotPublisherService>();
```

---

## 📊 Endpoints da API

### Listar Eventos de Parking

```http
GET /api/v1/parking/{parkingLotId}/events
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventType": "entry",
      "timestamp": "2026-05-05T10:15:30Z",
      "deviceId": "esp32-parking-22"
    },
    {
      "id": "uuid",
      "eventType": "exit",
      "timestamp": "2026-05-05T10:16:45Z",
      "deviceId": "esp32-parking-22"
    }
  ]
}
```

### Obter Status Atual

```http
GET /api/v1/parking/{parkingLotId}/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "parkingLotId": "uuid",
    "totalSpots": 20,
    "occupiedSpots": 15,
    "availableSpots": 5,
    "lastUpdate": "2026-05-05T10:20:00Z"
  }
}
```

---

## 🔌 SignalR Hub

```csharp
// API/Hubs/ParkingHub.cs
public class ParkingHub : Hub
{
    /// <summary>
    /// Enviado para todos os clientes quando carro entra
    /// </summary>
    public async Task ParkingEntryDetected(object data)
    {
        await Clients.All.SendAsync("EntryDetected", data);
    }

    /// <summary>
    /// Enviado para todos os clientes quando carro sai
    /// </summary>
    public async Task ParkingExitDetected(object data)
    {
        await Clients.All.SendAsync("ExitDetected", data);
    }
}
```

### Consumir no Frontend (Next.js)

```typescript
// app/services/parkingHub.ts
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5167/parking-hub")
  .withAutomaticReconnect()
  .build();

connection.on("EntryDetected", (data) => {
  console.log("🚗 Carro entrou:", data);
  // Atualizar UI, som, etc.
});

connection.on("ExitDetected", (data) => {
  console.log("🚗 Carro saiu:", data);
});

await connection.start();
```

---

## 🧪 Teste de Integração

### 1. Iniciar o Backend

```bash
cd api
dotnet run
```

### 2. Simular Evento MQTT

```bash
# Publicar evento de entrada
mosquitto_pub -h 192.168.0.10 -t "parking/entry" -m \
  '{"parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","eventType":"entry","timestamp":1714900530}'
```

### 3. Verificar Logs do Backend

```
[MQTT] Evento entry recebido de 45fc18f2-bdd8-4b11-b964-f8face1147f0
✅ Entrada registrada
[SignalR] Broadcasting EntryDetected aos clientes
```

### 4. Verificar no Dashboard

Dashboard deve atualizar com:
- Contador de vagas livres diminuído
- Animação/notificação de entrada
- Timestamp do evento

---

## ✅ Checklist de Integração

- [ ] Modelos de domínio criados
- [ ] MqttEventHandler implementado
- [ ] Handlers CQRS criados
- [ ] DI configurado
- [ ] MQTT subscriptions ativas
- [ ] SignalR hub funcionando
- [ ] Endpoints da API testados
- [ ] Dashboard recebendo eventos em real-time
- [ ] Snapshot publicado a cada 30s
- [ ] Logs aparecendo corretamente

---

## 📝 Estrutura de Pastas Recomendada

```
api/src/
├── API/
│   ├── Controllers/
│   │   └── ParkingController.cs
│   ├── Hubs/
│   │   └── ParkingHub.cs
│   └── Program.cs
├── Application/
│   ├── Features/
│   │   └── Parking/
│   │       ├── Commands/
│   │       │   ├── RecordParkingEntry/
│   │       │   └── RecordParkingExit/
│   │       └── DTOs/
│   │           └── ParkingEventDto.cs
│   └── Services/
│       ├── MqttService.cs
│       ├── MqttEventHandler.cs
│       └── SnapshotPublisherService.cs
└── Domain/
    └── Entities/
        └── ParkingEvent.cs
```

---

## 🐛 Troubleshooting

### Eventos não chegam ao Backend

1. Verificar se ESP32 está publicando:
```bash
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v
```

2. Verificar logs do Backend
3. Verificar firewall MQTT (porta 1883)

### Dashboard não atualiza em real-time

1. Verificar SignalR conectado:
```bash
# Browser console
connection.state // Must be: HubConnectionState.Connected
```

2. Verificar evento sendo broadcastado no Backend
3. Verificar handler recebendo dados

---

## 📞 Referências

- [MQTTnet Documentation](https://github.com/dotnet/MQTTnet)
- [SignalR Documentation](https://learn.microsoft.com/en-us/aspnet/core/signalr/)
- [MediatR Documentation](https://github.com/jbogard/MediatR)

---

**Data:** Maio de 2026  
**Versão:** 1.0
