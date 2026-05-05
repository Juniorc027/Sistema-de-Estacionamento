# Smart Gate Control — ESP32 Smart Parking

## 📋 Resumo da Implementação

Código **C++ completo** para controlar **2 cancelas inteligentes** em um sistema de estacionamento com:

✅ **Controle de Entrada**: Abre SOMENTE se houver vagas disponíveis  
✅ **Controle de Saída**: Abre automaticamente ao detectar carro  
✅ **Sincronização MQTT**: Recebe estado de vagas do Dashboard/Backend  
✅ **Sensores IR**: Detectam presença de carros  
✅ **Servo Motors (PWM)**: Controlam posição das cancelas  
✅ **Máquinas de Estado**: Lógica robusta e previsível  
✅ **Reconexão Automática**: WiFi/MQTT resilientes

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│                  ESP32                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  WiFi    │  │  MQTT    │  │  GPIO   │     │
│  │ Manager  │──│ Client   │──│ Control │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│        ↓              ↓              ↓          │
│  [WiFi Network]  [MQTT Broker] [I2C/PWM]      │
│                      ↓                          │
│              Dashboard/Backend                  │
│                      ↓                          │
│              Vagas Snapshot                     │
│              (topic: parking/spots/snapshot)    │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │        I2C Bus (MCP23017)               │  │
│  ├──────────────────────────────────────────┤  │
│  │  [0x20] MCP0: 16 sensores de vagas     │  │
│  │  [0x21] MCP1: 4 vagas + 2 IR gates     │  │
│  │         └─ Pino 6: IR Entrada          │  │
│  │         └─ Pino 7: IR Saída            │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │        GPIO PWM (Servo Motors)          │  │
│  ├──────────────────────────────────────────┤  │
│  │  GPIO 18: Servo Entrada (90° = fechado) │  │
│  │  GPIO 19: Servo Saída   (90° = fechado) │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Fluxo de Lógica

### 1️⃣ Cancela de Entrada (Inteligente com Verificação)

```
┌─────────┐
│  IDLE   │
└────┬────┘
     │
     ├─→ [IR Detecta Carro]
     │
     ├─→ Verifica: vagasLivres > 0 ?
     │
     ├─ SIM: ┌──────────────┐
     │       │ OPENING      │ → Escreve 0° no servo
     │       │ (500ms)      │
     │       ├──────────────┤
     │       │ OPEN         │ → Aguarda carro passar
     │       │              │
     │       ├──────────────┤
     │       │ WAIT_PASS    │ → Delay 2s após carro sair
     │       │ (2000ms)     │
     │       ├──────────────┤
     │       │ CLOSING      │ → Escreve 90° no servo
     │       │ (500ms)      │
     │       ├──────────────┤
     │       │ CLOSED       │ → Aguarda 1s
     │       │              │
     │       └──→ IDLE ──────────────────→ Publica "entry"
     │
     ├─ NÃO: ┌──────────────┐
             │ BLOCKED      │ → Mantém 90° (fechado)
             │ (10s timeout)│
             └──→ IDLE ─────→ Tenta novamente
```

### 2️⃣ Cancela de Saída (Fluxo Livre)

```
┌─────────┐
│  IDLE   │
└────┬────┘
     │
     ├─→ [IR Detecta Carro]
     │
     ├─→ ┌──────────────┐
     │   │ OPENING      │ → Escreve 0° no servo
     │   │ (500ms)      │
     │   ├──────────────┤
     │   │ OPEN         │ → Aguarda carro passar
     │   │              │
     │   ├──────────────┤
     │   │ WAIT_PASS    │ → Delay 2s após carro sair
     │   │ (2000ms)     │
     │   ├──────────────┤
     │   │ CLOSING      │ → Escreve 90° no servo
     │   │ (500ms)      │
     │   ├──────────────┤
     │   │ CLOSED       │ → Aguarda 1s
     │   │              │
     │   └──→ IDLE ───────────→ Publica "exit"
```

---

## 📡 Tópicos MQTT

### 📥 Subscriptions (ESP32 Recebe)

| Tópico | Payload | Descrição |
|--------|---------|-----------|
| `parking/spots/snapshot` | JSON | **Sincronização de Vagas**<br>`{"totalSpots":20, "occupiedSpots":15, "availableSpots":5}` |

**Exemplo de Integração Backend:**
```csharp
// Backend publica snapshot a cada 30s ou quando muda
await _mqttPublisher.PublishAsync("parking/spots/snapshot", json);
```

### 📤 Publications (ESP32 Envia)

| Tópico | Payload | Quando |
|--------|---------|--------|
| `parking/entry` | JSON Event | Após carro passar na entrada e cancela fechar |
| `parking/exit` | JSON Event | Após carro passar na saída e cancela fechar |
| `parking/device/status` | JSON Status | A cada 15s (heartbeat) |

**Exemplo de Payload - Entry:**
```json
{
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "eventType": "entry",
  "timestamp": 1234567890
}
```

**Exemplo de Payload - Status:**
```json
{
  "deviceId": "esp32-parking-22",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "status": "online",
  "uptime_s": 3600,
  "wifiSignal_dbm": -45,
  "entryGateState": 6,
  "exitGateState": 0,
  "vagasLivres": 5,
  "vagasOcupadas": 15,
  "timestamp": 1234567890
}
```

---

## 🔌 Hardware: Pinagem

### Servo Motors (PWM)
```
GPIO 18 → SERVO_ENTRADA_PIN (Cancela Entrada)
GPIO 19 → SERVO_SAIDA_PIN   (Cancela Saída)

Posições:
  0°  = Aberta
  90° = Fechada
```

### Sensores IR (via MCP23017 #1 / 0x21)
```
MCP1 Pino 6 → IR_ENTRADA (ativo-baixo, pull-up)
MCP1 Pino 7 → IR_SAIDA   (ativo-baixo, pull-up)

Lógica:
  - Pino em LOW (0V)  = Carro Detectado (obstáculo bloqueia sensor)
  - Pino em HIGH (3.3V) = Sem Carro (caminho livre)
```

### I2C Bus
```
SDA: GPIO 21 (MCP23017 #0 e #1)
SCL: GPIO 22 (MCP23017 #0 e #1)

MCP0 (0x20): 16 sensores de vagas
MCP1 (0x21): 4 vagas + 2 IR gates (pinos 6-7)
```

---

## 🚀 Como Usar

### 1. Upload para ESP32

```bash
cd /home/junior/Documentos/coder/parking-iot-system/iot/esp32/parking_controller_platformio

# Usando PlatformIO CLI
pio run --target upload

# OU usando Arduino IDE
# Abrir: parking_controller_platformio/src/main.cpp
# Selecionar: Board: ESP32 Dev Module
# Upload
```

### 2. Monitorar Serial

```bash
pio device monitor --baud 115200
```

**Saída Esperada:**
```
════════════════════════════════════════════════
   Parking System — Smart Gate Control
   ESP32 + 2 Servo Gates + IR Sensors
════════════════════════════════════════════════

[WiFi] Conectando a: VIVOFIBRA-WIFI6-E9D8
.........................
[WiFi] ✅ Conectado!
[WiFi] IP: 192.168.0.50

[I2C] Inicializando...
[MCP23017 #0] ✅ Detectado em 0x20
[MCP23017 #1] ✅ Detectado em 0x21
[Sensores IR] ✅ Configurados (MCP2: pinos 6 e 7)
[Servo Motors] ✅ Configurados e fechados

[MQTT] Tentativa #1
[MQTT] Broker: 192.168.0.10
[MQTT] ✅ Conectado!
[MQTT] Inscrito em: parking/spots/snapshot

[Sistema] ✅ Pronto! Aguardando carros...
```

### 3. Testar Manualmente

**Via MQTT (Terminal/Node-RED):**

```bash
# Terminal 1: Monitorar todos os tópicos
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v

# Terminal 2: Simular snapshot de vagas (com 5 vagas livres)
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" -m \
  '{"totalSpots":20,"occupiedSpots":15,"availableSpots":5}'

# Terminal 3: Verificar se entrada aceita carros
# [Ativa sensor IR entrada por 3 segundos]
# Esperado: Servo abre (0°) → Carro passa → Servo fecha (90°)
#          Publica em: parking/entry
```

---

## 🔌 Integração com Backend .NET

### Subscribe no Backend

```csharp
// Services/MqttService.cs
public class MqttService
{
    private readonly IClient _mqttClient;
    
    public async Task HandleParkingEventAsync(string topic, string payload)
    {
        var json = JsonDocument.Parse(payload);
        var root = json.RootElement;
        
        if (topic == "parking/entry")
        {
            // Diminui contador de vagas
            var parkingLotId = root.GetProperty("parkingLotId").GetString();
            await _parkingRepository.DecrementAvailableSpotsAsync(parkingLotId);
            
            // Broadcast para Dashboard via SignalR
            await _hubContext.Clients.All.SendAsync("EntryDetected", new { });
        }
        else if (topic == "parking/exit")
        {
            // Aumenta contador de vagas
            var parkingLotId = root.GetProperty("parkingLotId").GetString();
            await _parkingRepository.IncrementAvailableSpotsAsync(parkingLotId);
            
            // Broadcast para Dashboard
            await _hubContext.Clients.All.SendAsync("ExitDetected", new { });
        }
        else if (topic == "parking/device/status")
        {
            // Atualiza status da ESP32
            var deviceId = root.GetProperty("deviceId").GetString();
            await _deviceRepository.UpdateStatusAsync(deviceId, payload);
        }
    }
}
```

### Publish Snapshot para ESP32

```csharp
// Services/ParkingSnapshotService.cs
public class ParkingSnapshotService
{
    private readonly IMqttPublisher _mqttPublisher;
    private readonly IParkingRepository _parkingRepository;
    
    // Executar a cada 30s ou quando houver mudança
    public async Task PublishSnapshotAsync(string parkingLotId)
    {
        var snapshot = await _parkingRepository.GetSnapshotAsync(parkingLotId);
        
        var payload = JsonSerializer.Serialize(new
        {
            totalSpots = snapshot.TotalSpots,
            occupiedSpots = snapshot.OccupiedSpots,
            availableSpots = snapshot.AvailableSpots,
            timestamp = DateTime.UtcNow
        });
        
        await _mqttPublisher.PublishAsync("parking/spots/snapshot", payload);
    }
}
```

---

## 🐛 Troubleshooting

### ❌ ESP32 não conecta em WiFi

**Log:**
```
[WiFi] Conectando a: VIVOFIBRA-WIFI6-E9D8
...............................
[WiFi] ❌ Não conseguiu conectar. Reiniciando...
```

**Solução:**
1. Verificar SSID e senha em `Config.h`
2. Verificar se 2.4GHz está habilitado no roteador
3. Verificar força do sinal (deve ter pelo menos -70 dBm)

```cpp
// Config.h
static const char* WIFI_SSID = "SEU_SSID";
static const char* WIFI_PASSWORD = "SUA_SENHA";
```

### ❌ ESP32 não conecta em MQTT

**Log:**
```
[MQTT] Tentativa #1
[MQTT] Broker: 192.168.0.10
[MQTT] ❌ Falhou. rc=2
```

**Solução:**
1. Testar conexão ao broker: `mosquitto_sub -h 192.168.0.10 -t "#"`
2. Verificar IP do broker em `Config.h`
3. Verificar firewall (porta 1883 aberta)
4. Verificar credenciais MQTT

```cpp
// Config.h
static const char* MQTT_BROKER = "192.168.0.10";
static const int MQTT_PORT = 1883;
```

### ❌ Servo não se move

**Log:**
```
[SERVO] Entrada → 0° (ABERTA)
[SERVO] Entrada → 90° (FECHADA)
```

**Mas servo não responde:**
1. Verificar alimentação (5V, 2A recomendado)
2. Verificar conexão PWM (GPIO 18/19)
3. Testar com código simples:

```cpp
Servo test;
void setup() {
  test.attach(18, 1000, 2000);
  test.write(90);
}
void loop() {
  test.write(0);
  delay(1000);
  test.write(90);
  delay(1000);
}
```

### ❌ Sensores IR não detectam carro

**Log:**
```
[ENTRADA] Carro detectado no sensor! (nunca aparece)
```

**Solução:**
1. Verificar I2C: `i2cdetect -y 1`
2. Verificar pinos MCP (6 e 7 devem estar em HIGH quando sem carro)
3. Testar com código de diagnóstico:

```cpp
void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  mcp1.begin_I2C(0x21);
  mcp1.pinMode(6, INPUT_PULLUP);
  mcp1.pinMode(7, INPUT_PULLUP);
}

void loop() {
  bool ir_entrada = mcp1.digitalRead(6);
  bool ir_saida = mcp1.digitalRead(7);
  Serial.print("Entrada: ");
  Serial.print(ir_entrada ? "HIGH" : "LOW");
  Serial.print("  Saída: ");
  Serial.println(ir_saida ? "HIGH" : "LOW");
  delay(500);
}
```

---

## 📊 Estados da Máquina (Debug)

Quando visualizar `entryGateState` ou `exitGateState` no status MQTT:

| Valor | Estado | Significado |
|-------|--------|-------------|
| 0 | GATE_IDLE | Aguardando carro |
| 1 | GATE_CAR_DETECTED | Carro detectado |
| 2 | GATE_OPENING | Abrindo servo |
| 3 | GATE_OPEN | Servo aberto |
| 4 | GATE_WAITING_CAR_PASS | Esperando carro passar |
| 5 | GATE_CLOSING | Fechando servo |
| 6 | GATE_CLOSED | Servo fechado |
| 7 | GATE_BLOCKED | Entrada lotada (somente Entrada) |

---

## ✨ Features Extras (Opcional)

### Adicionar LED Status

```cpp
const int LED_PIN = 5; // GPIO 5

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  // Piscar verde se conectado, vermelho se desconectado
  if (mqtt.connected()) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(900);
  } else {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}
```

### Adicionar Buzzer para Alertas

```cpp
const int BUZZER_PIN = 12;

void alerta(uint8_t beeps = 3) {
  for (int i = 0; i < beeps; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

// Chamar quando estacionamento lotado
if (vagasState.vagasLivres == 0) {
  alerta(5); // 5 beeps
}
```

---

## 📝 Licença

MIT

## 👨‍💻 Desenvolvido Por

Copilot - Smart Parking System
Data: Maio de 2026
