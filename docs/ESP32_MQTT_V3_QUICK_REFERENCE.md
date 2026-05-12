# ESP32 MQTT v3.0 - GUIA RÁPIDO VISUAL

## 🔌 DIAGRAMA DE PINOS - HARDWARE

```
┌─────────────────────────────────────────────────────────────────┐
│                         ESP32 Dev Module                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  I2C (Wire Library):                                             │
│    SDA = GPIO 21  ──→ Conectar ao pino SDA do MCP23017          │
│    SCL = GPIO 22  ──→ Conectar ao pino SCL do MCP23017          │
│                                                                   │
│  Servos:                                                         │
│    GPIO 16 (SERVO_GATE_ENTRY_PIN)   ──→ Servo Portão Entrada    │
│    GPIO 17 (SERVO_GATE_EXIT_PIN)    ──→ Servo Portão Saída      │
│                                                                   │
│  WiFi:                                                           │
│    WiFi integrado (802.11 b/g/n)                                │
│    SSID: "VIVOFIBRA-WIFI6-E9D8"                                │
│    Password: "E9D8VIVO"                                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓ I2C BUS (SDA=GPIO21, SCL=GPIO22)
    ┌────────┴────────┐
    │                 │
┌───┴──────┐    ┌─────┴────┐
│ MCP23017 │    │ MCP23017 │
│ Addr:0x20│    │ Addr:0x21│
│  (MCP1)  │    │  (MCP2)  │
└──────────┘    └──────────┘
```

---

## 📍 MCP23017 PINO LAYOUT

### MCP1 (Endereço 0x20) - Vagas 1-16
```
Pino GP0  → Vaga 1  (sensor ocupação)
Pino GP1  → Vaga 2  (sensor ocupação)
Pino GP2  → Vaga 3  (sensor ocupação)
Pino GP3  → Vaga 4  (sensor ocupação)
Pino GP4  → Vaga 5  (sensor ocupação)
Pino GP5  → Vaga 6  (sensor ocupação)
Pino GP6  → Vaga 7  (sensor ocupação)
Pino GP7  → Vaga 8  (sensor ocupação)
Pino GP8  → Vaga 9  (sensor ocupação)
Pino GP9  → Vaga 10 (sensor ocupação)
Pino GP10 → Vaga 11 (sensor ocupação)
Pino GP11 → Vaga 12 (sensor ocupação)
Pino GP12 → Vaga 13 (sensor ocupação)
Pino GP13 → Vaga 14 (sensor ocupação)
Pino GP14 → Vaga 15 (sensor ocupação)
Pino GP15 → Vaga 16 (sensor ocupação)

TOTAL: 16 pinos (todos INPUTS)
```

### MCP2 (Endereço 0x21) - Vagas 17-20 + Portões + LEDs
```
Pino GP0  → Vaga 17 (sensor ocupação)   [INPUT]
Pino GP1  → Vaga 18 (sensor ocupação)   [INPUT]
Pino GP2  → Vaga 19 (sensor ocupação)   [INPUT]
Pino GP3  → Vaga 20 (sensor ocupação)   [INPUT]
Pino GP4  → Sensor ENTRADA (gate entry) [INPUT]  ← Detecta veículo entrando
Pino GP5  → Sensor SAÍDA (gate exit)    [INPUT]  ← Detecta veículo saindo
Pino GP6  → LED Disponível (verde)      [OUTPUT] ← Estacionamento tem vaga
Pino GP7  → LED Ocupado (vermelho)      [OUTPUT] ← Estacionamento cheio
Pino GP8  → LED Erro                    [OUTPUT] ← Sistema erro/falha

TOTAL: 9 pinos (4 inputs vagas + 2 inputs portões + 3 outputs LEDs)
```

---

## 📊 TABELA DE SENSORES

| Tipo | Quantidade | Local | Pino MCP | Evento |
|------|-----------|-------|---------|--------|
| **Sensores Vagas** | 20 | Estacionamento | MCP1[0-15], MCP2[0-3] | `parking/spots/{1-20}` |
| **Sensor Entrada** | 1 | Portão entrada | MCP2[4] | `parking/entry` |
| **Sensor Saída** | 1 | Portão saída | MCP2[5] | `parking/exit` |
| **LED Verde** | 1 | Painel | MCP2[6] | Disponível |
| **LED Vermelho** | 1 | Painel | MCP2[7] | Ocupado |
| **LED Erro** | 1 | Painel | MCP2[8] | Erro/Falha |

---

## 🔄 FLUXO DE LEITURA E PUBLICAÇÃO

```
LOOP PRINCIPAL (repetir a cada 10ms)
│
├─→ conectarWiFi()           [5s retry]
├─→ conectarMQTT()           [5s retry]
├─→ mqttClient.loop()        [processo MQTT interno]
│
├─→ lerSensoresVagas()       [a cada 500ms]
│   │
│   ├─ MCP1.digitalRead(0-15)
│   ├─ MCP2.digitalRead(0-3)
│   │  
│   └─ SE mudança detectada (debounce 3x):
│       └─ publicarVaga(vagaId, ocupada)
│           └─ MQTT: parking/spots/{1-20}
│
├─→ lerSensoresPortao()      [a cada 100ms]
│   │
│   ├─ SENSOR ENTRADA (MCP2[4])
│   │   │
│   │   ├─ SE HIGH (acionado):
│   │   │   ├─ acionarServoEntrada()
│   │   │   │   ├─ Servo escrita: 90°
│   │   │   │   └─ publicarEntrada()
│   │   │   │       └─ MQTT: parking/entry
│   │   │   │
│   │   │   └─ SE timeout (2s + 500ms):
│   │   │       └─ fecharServoEntrada()
│   │   │           └─ Servo escrita: 0°
│   │   │
│   │   └─ DEBOUNCE: 2 leituras (200ms)
│   │
│   └─ SENSOR SAÍDA (MCP2[5]) [MESMA LÓGICA]
│
├─→ publicarHeartbeat()      [a cada 60s]
│   └─ MQTT: parking/device/esp32-parking-01/status
│
└─ delay(10ms) [evitar watchdog]
```

---

## 📡 FLUXO MQTT

```
ESP32
  │
  ├─→ CONECTAR
  │   └─ mqtt.connect(MQTT_CLIENT_ID, user, pass)
  │       └─ LastWill: parking/device/.../status = "offline"
  │
  ├─→ SUBSCREVER
  │   └─ mqtt.subscribe("parking/config")
  │
  └─→ PUBLICAR
      │
      ├─ Vagas (heartbeat 500ms):
      │  └─ parking/spots/{1-20}
      │
      ├─ Portões (quando detectado):
      │  ├─ parking/entry
      │  └─ parking/exit
      │
      └─ Status (heartbeat 60s):
         └─ parking/device/esp32-parking-01/status
```

---

## 🔧 COMPORTAMENTO DOS SERVOS

```
ESTADO: Repouso
┌─────────────────────────────┐
│ Servo = 0°                  │
│ Porta: FECHADA              │
│ Status: Normal              │
└─────────────────────────────┘
             ↓
        [Sensor detecta]
             ↓
AÇÃO: Abertura
┌─────────────────────────────┐
│ Servo = 90°                 │
│ Porta: ABERTA               │
│ Duração: 2000ms             │
│ MQTT: parking/entry|exit    │
└─────────────────────────────┘
             ↓ [+500ms]
AÇÃO: Fechamento
┌─────────────────────────────┐
│ Servo = 0°                  │
│ Porta: FECHANDO...          │
│ Duração: 500ms              │
└─────────────────────────────┘
             ↓
Volta ao REPOUSO
```

---

## 🔍 PROTOCOLO MQTT - PAYLOAD EXAMPLES

### Vaga 1-20: `parking/spots/{id}`
```json
{
  "vagaId": 7,
  "status": "ocupada",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "device": "esp32-parking-01",
  "uptime_s": 1234,
  "timestamp": 1715570000
}
```

### Sensor Entrada: `parking/entry`
```json
{
  "evento": "entrada",
  "device": "esp32-parking-01",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "timestamp": 1715570000
}
```

### Sensor Saída: `parking/exit`
```json
{
  "evento": "saida",
  "device": "esp32-parking-01",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "timestamp": 1715570000
}
```

### Status: `parking/device/esp32-parking-01/status`
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

## ⚙️ CONFIGURAÇÕES CRÍTICAS

| Parâmetro | Valor | Local |
|-----------|-------|-------|
| **WiFi SSID** | "VIVOFIBRA-WIFI6-E9D8" | #define WIFI_SSID |
| **WiFi Pass** | "E9D8VIVO" | #define WIFI_PASSWORD |
| **MQTT Broker** | 192.168.15.177 | #define MQTT_BROKER |
| **MQTT Port** | 1883 | #define MQTT_PORT |
| **MQTT User** | "parking_iot" | #define MQTT_USER |
| **MQTT Pass** | "ParkingIot@2026" | #define MQTT_PASSWORD |
| **Client ID** | "esp32-parking-01" | #define MQTT_CLIENT_ID |
| **Total Vagas** | 20 | #define TOTAL_VAGAS |
| **Servo Open Angle** | 90° | #define SERVO_OPEN_ANGLE |
| **Servo Closed Angle** | 0° | #define SERVO_CLOSED_ANGLE |
| **Servo Open Time** | 2000ms | #define SERVO_OPEN_TIME_MS |
| **Servo Close Delay** | 500ms | #define SERVO_CLOSE_DELAY_MS |

---

## 🧪 TESTES RÁPIDOS

### Teste 1: Verificar WiFi e MQTT
```bash
# Serial Monitor: 9600 baud
# Procure por:
# [WiFi] ✅ Conectado!
# [MQTT] ✅ Conectado com sucesso!
```

### Teste 2: Verificar Vagas (1-20)
```bash
docker exec parking-mosquitto mosquitto_sub \
  -h localhost -p 1883 -u parking_iot -P 'ParkingIot@2026' \
  -t 'parking/spots/#' -v

# Saída esperada:
# parking/spots/1 {"vagaId":1,"status":"livre",...}
# parking/spots/2 {"vagaId":2,"status":"ocupada",...}
# ... até parking/spots/20
```

### Teste 3: Simular Sensor Entrada
```bash
# Desligar/ligar sensor de entrada (pino GP4 do MCP2)
# Procurar no Serial Monitor:
# [SENSOR ENTRADA] Acionado!
# [SERVO ENTRADA] Abrindo portao entrada...

# E no MQTT:
docker exec parking-mosquitto mosquitto_sub \
  -h localhost -p 1883 -u parking_iot -P 'ParkingIot@2026' \
  -t 'parking/entry' -v

# Saída:
# parking/entry {"evento":"entrada",...}
```

### Teste 4: Timeout de Servo
```bash
# Acionar sensor entrada
# Serial: [SERVO ENTRADA] Abrindo portao entrada...
# Aguardar 2.5 segundos
# Serial: [SERVO ENTRADA] Fechando portao entrada...
# ✅ Servo fecha automaticamente
```

---

## ✅ CHECKLIST PRÉ-DEPLOY

- [ ] Firmware v3.0 compilado sem erros
- [ ] I2C escaneia e encontra MCP1@0x20 e MCP2@0x21
- [ ] Todos os 20 sensores de vaga estão conectados
- [ ] Sensor entrada conectado em MCP2[4]
- [ ] Sensor saída conectado em MCP2[5]
- [ ] Servo entrada conectado em GPIO 16
- [ ] Servo saída conectado em GPIO 17
- [ ] WiFi se conecta a "VIVOFIBRA-WIFI6-E9D8"
- [ ] MQTT se conecta com credenciais corretas
- [ ] Serial Monitor mostra todas as 20 vagas
- [ ] MQTT publica apenas `parking/spots/1` até `parking/spots/20`
- [ ] Sensor entrada aciona servo e publica em `parking/entry`
- [ ] Sensor saída aciona servo e publica em `parking/exit`
- [ ] Servo fecha automaticamente após 2.5s

---

## 🆘 TROUBLESHOOTING

| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| MCP não encontrado (0x20/0x21) | Cabo I2C desconectado | Verificar SDA (GPIO21) e SCL (GPIO22) |
| WiFi não conecta | SSID/senha errado | Atualizar #define WIFI_SSID/PASSWORD |
| MQTT não conecta | Broker indisponível | Verificar 192.168.15.177:1883 |
| Publica vaga 21-22 | Firmware v2.0 carregado | Carregar v3.0 corrigido |
| Servo não abre | GPIO 16/17 desconectado | Verificar pinos do servo |
| Sensor portão não detecta | Sensor desconectado | Verificar MCP2[4] ou MCP2[5] |
| Timeout de servo muito curto | SERVO_OPEN_TIME_MS pequeno | Aumentar para 3000ms |

---

## 📚 REFERÊNCIAS

- Arquivo firmware: `SmartParking_ESP32_IoT_MQTT_v3.ino`
- Integração backend: `ESP32_MQTT_V3_ARCHITECTURE.md`
- Mudanças da v2.0: `FIRMWARE_V2_VS_V3_COMPARISON.md`
- MQTT Mosquitto: `infra/mqtt/mosquitto.conf`
- ACL: `infra/mqtt/aclfile`

