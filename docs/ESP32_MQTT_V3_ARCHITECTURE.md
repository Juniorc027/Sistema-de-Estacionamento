# ESP32 MQTT v3.0 - ARQUITETURA CORRIGIDA & INTEGRAÇÃO BACKEND

## 📋 Resumo das Mudanças - Firmware v3.0

### Arquitetura Corrigida
```
TOTAL_VAGAS: 20 (não 22)
├─ MCP1 (0x20): Vagas 1-16 (16 pinos inputs)
└─ MCP2 (0x21): Vagas 17-20 (4 pinos) + SENSORES PORTÃO (2 pinos) + LEDs (3 pinos)

Sensores de Portão:
├─ Pino 4 (MCP2): Sensor Entrada → Servo Entrada
└─ Pino 5 (MCP2): Sensor Saída → Servo Saída
```

### Mudanças Principais no Firmware

| Antes | Depois | Motivo |
|-------|--------|--------|
| `TOTAL_VAGAS = 22` | `TOTAL_VAGAS = 20` | Remover sensores fake |
| Vagas 21-22 no MQTT | Removidas | Não são vagas reais |
| Sensores portão como pinos soltos | Integrados em MCP2 pinos 4-5 | Organização I2C |
| Servo logic no loop principal | Funções separadas `acionarServoEntrada()` / `acionarServoSaida()` | Clareza |
| Sem timeout de servo | Timeout de 2s para abrir + 500ms para fechar | Automação segura |
| Event MQTT genérico | Tópicos separados `parking/entry` e `parking/exit` | Semântica clara |

### Nova Estrutura de Pinos MCP2
```cpp
Pino 0-3: Vagas 17-20 (sensores ocupação)
Pino 4:   Sensor Entrada (gate entry detection)
Pino 5:   Sensor Saída (gate exit detection)
Pino 6:   LED Disponível (status)
Pino 7:   LED Ocupado (status)
Pino 8:   LED Erro (status)
```

---

## 🔌 Tópicos MQTT Publicados

### Vagas (1-20)
**Tópico:** `parking/spots/{vagaId}`
```json
{
  "vagaId": 7,
  "status": "ocupada|livre",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "device": "esp32-parking-01",
  "uptime_s": 1234,
  "timestamp": 1715570000
}
```

### Sensor Entrada (quando acionado)
**Tópico:** `parking/entry`
```json
{
  "evento": "entrada",
  "device": "esp32-parking-01",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "timestamp": 1715570000
}
```

### Sensor Saída (quando acionado)
**Tópico:** `parking/exit`
```json
{
  "evento": "saida",
  "device": "esp32-parking-01",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "timestamp": 1715570000
}
```

### Status do Dispositivo (heartbeat a cada 60s)
**Tópico:** `parking/device/esp32-parking-01/status`
```json
{
  "device_id": "esp32-parking-01",
  "status": "online",
  "uptime_s": 3600,
  "free_heap": 150000,
  "wifi_signal": -45
}
```

---

## 🎯 Integração Backend - Próximos Passos

### 1. **Criar Handler para Tópicos de Portão**

Você já tem `MqttToSignalRHandler.cs` processando vagas. Agora precisa estender para:

```csharp
// No MqttToSignalRHandler.HandleAsync()
if (topic.Contains("parking/entry"))
{
    // Processar evento de entrada
    await HandleGateEntryAsync(payload);
}
else if (topic.Contains("parking/exit"))
{
    // Processar evento de saída
    await HandleGateExitAsync(payload);
}
```

### 2. **Tratamento de Entrada (Entry Event)**

Quando sensor de ENTRADA é acionado:
```csharp
private async Task HandleGateEntryAsync(string payload)
{
    var data = JsonConvert.DeserializeObject<GateEventDto>(payload);
    
    // 1. Log do evento
    _logger.LogInformation($"[GATE ENTRY] Vehicle detected at entry gate");
    
    // 2. Abrir servo já foi feito pela ESP32 automaticamente
    //    (ela não espera comando do backend)
    
    // 3. Criar ParkingSession temporária (status: "waiting_spot")
    var session = new ParkingSession
    {
        Id = Guid.NewGuid(),
        ParkingLotId = data.ParkingLotId,
        EntryTime = DateTime.UtcNow,
        Status = "waiting_spot",  // Aguardando vaga
        VehicleId = null,         // Será definido quando ocupar uma vaga
        ExitTime = null,
        Fee = 0
    };
    
    // 4. Salvar no banco
    await _sessionService.CreateSessionAsync(session);
    
    // 5. Broadcast para frontend (3D dashboard)
    await _hubContext.Clients.All.SendAsync("GateEntryDetected", new
    {
        timestamp = DateTime.UtcNow,
        message = "Vehicle entering parking lot"
    });
}
```

### 3. **Tratamento de Saída (Exit Event)**

Quando sensor de SAÍDA é acionado:
```csharp
private async Task HandleGateExitAsync(string payload)
{
    var data = JsonConvert.DeserializeObject<GateEventDto>(payload);
    
    // 1. Log do evento
    _logger.LogInformation($"[GATE EXIT] Vehicle detected at exit gate");
    
    // 2. Servo já foi acionado pela ESP32
    
    // 3. Procurar ParkingSession ativa (não finalizada)
    var session = await _context.ParkingSessions
        .Where(s => s.ParkingLotId == data.ParkingLotId && 
                    s.ExitTime == null &&
                    s.Status != "waiting_spot")
        .OrderByDescending(s => s.EntryTime)
        .FirstOrDefaultAsync();
    
    if (session != null)
    {
        // 4. Finalizar sessão
        session.ExitTime = DateTime.UtcNow;
        session.Status = "completed";
        // session.Fee = CalculateFee(session.EntryTime, session.ExitTime);
        
        await _context.SaveChangesAsync();
        
        // 5. Broadcast para frontend
        await _hubContext.Clients.All.SendAsync("GateExitDetected", new
        {
            timestamp = DateTime.UtcNow,
            sessionDuration = (session.ExitTime - session.EntryTime).TotalMinutes,
            fee = session.Fee
        });
    }
    else
    {
        _logger.LogWarning("Exit event received but no active session found");
    }
}
```

### 4. **Transição de Estados da Session**

```
waiting_spot
    ↓ (quando vaga é ocupada)
occupied
    ↓ (quando vaga é liberada)
vacated
    ↓ (quando veículo detectado no exit sensor)
completed
```

### 5. **DTOs para Portões**

Adicione ao seu projeto:

```csharp
// Domain/DTOs/GateEventDto.cs
public class GateEventDto
{
    [JsonProperty("evento")]
    public string Event { get; set; }  // "entrada" ou "saida"
    
    [JsonProperty("device")]
    public string Device { get; set; }
    
    [JsonProperty("parkingLotId")]
    public Guid ParkingLotId { get; set; }
    
    [JsonProperty("timestamp")]
    public long Timestamp { get; set; }
}
```

---

## 🔍 Logging e Debugging

### Verificar Sensor de Entrada/Saída via MQTT

```bash
# Terminal 1: Subscribe aos eventos
docker exec parking-mosquitto mosquitto_sub \
  -h localhost -p 1883 -u parking_iot -P 'ParkingIot@2026' \
  -t "parking/entry" -t "parking/exit" -v

# Terminal 2: Simular acionamento do sensor (quando ESP32 publicar automaticamente)
# Não precisa publicar manualmente - a ESP32 faz isso quando sensor é acionado
```

### Verificar Logs da ESP32

```bash
# Conectar via Serial (9600 baud)
picocom /dev/ttyUSB0 -b 115200

# Saída esperada quando sensor de entrada é acionado:
# [SENSOR ENTRADA] Acionado!
# [SERVO ENTRADA] Abrindo portao entrada...
# [ENTRY] Evento publicado - servo acionado
# [SERVO ENTRADA] Fechando portao entrada...
```

---

## 📊 Fluxo Completo (Vehicle Entry → Exit)

```
ESTADO 1: Vehicle chega ao parking
├─ Sensor ENTRADA detecta (HIGH)
├─ ESP32 publica "parking/entry"
├─ Backend cria ParkingSession (status: waiting_spot)
└─ Frontend notifica "Vehicle entering"

ESTADO 2: Vehicle procurando vaga
├─ Backend aguarda evento de "parking/spots/{id}" = ocupada
├─ ParkingSession.VehicleId = spot.Id
├─ ParkingSession.Status = occupied
└─ Dashboard atualiza contadores

ESTADO 3: Vehicle sai da vaga
├─ Sensor de ocupação da vaga muda para "livre"
├─ Backend atualiza ParkingSession.Status = vacated
└─ Dashboard libera a vaga

ESTADO 4: Vehicle sai do parking
├─ Sensor SAÍDA detecta (HIGH)
├─ ESP32 publica "parking/exit"
├─ Backend finaliza ParkingSession (Status: completed, ExitTime set)
├─ Calcula fee e duração
└─ Dashboard notifica "Vehicle exited"
```

---

## 🛠️ Ajustes Futuros

### 1. **Debounce de Sensores**
Atual: 2-3 leituras (200-300ms) → Se precisar mais rigoroso, aumentar para 5-6 leituras

### 2. **Timeout de Servo**
Atual: 2s aberto + 500ms para fechar
```cpp
#define SERVO_OPEN_TIME_MS 2000
#define SERVO_CLOSE_DELAY_MS 500
```

### 3. **Validação de Vehicle**
Backend deveria:
- Recusar entrada se parking está cheio
- Publicar comando "CLOSE_GATE" se necessário
- Requer novo tópico: `parking/device/esp32-parking-01/commands`

### 4. **Billing Integration**
- Cálculo de taxa por duração
- Métodos de pagamento
- Integração com sistema de portaria

---

## ✅ Checklist de Implementação

- [ ] Carregar novo firmware v3.0 na ESP32
- [ ] Testar leitura de sensores de portão via Serial Monitor
- [ ] Criar `GateEventDto` no backend
- [ ] Implementar `HandleGateEntryAsync()` e `HandleGateExitAsync()`
- [ ] Testar fluxo completo: entry → ocupar vaga → sair → exit
- [ ] Implementar criação automática de ParkingSession
- [ ] Validar timestamps e logs do backend
- [ ] Testar dashboard real-time updates
- [ ] Implementar billing/fee calculation
- [ ] Deployar em produção

---

## 📝 Notas Importantes

1. **ESP32 Automática**: Os servos são acionados AUTOMATICAMENTE quando sensores são detectados. O backend NÃO precisa enviar comando para abrir.

2. **MQTT Robustez**: Last Will, Heartbeat, e Reconnect já estão implementados no firmware.

3. **Vagas 1-20**: NUNCA publicar vagas 21 ou 22. Se isso acontecer, há bug no firmware.

4. **Pino Layout**: Se mudança necessária, atualizar defines em `// MCP2 Pino Layout` no firmware.

5. **Timezone**: Timestamps vêm do ESP32 em Unix epoch. Converter para local timezone no backend.
