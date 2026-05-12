# ⚡ ESP32 MQTT v3.0 - QUICK START (1 página)

## 🔴 O PROBLEMA

```
v2.0: TOTAL_VAGAS = 22 ❌
Publicava: parking/spots/1 ... parking/spots/22
Problema: Vagas 21-22 NÃO EXISTEM! São sensores de portão!
```

## ✅ A SOLUÇÃO (v3.0)

```
v3.0: TOTAL_VAGAS = 20 ✅
MCP1 (0x20): Vagas 1-16 (16 pinos)
MCP2 (0x21): 
  ├─ Pinos 0-3: Vagas 17-20 (4 pinos)
  ├─ Pino 4: Sensor Entrada → Servo Entrada (novo!)
  ├─ Pino 5: Sensor Saída → Servo Saída (novo!)
  └─ Pinos 6-8: LEDs
```

---

## 🎯 O QUE VOCÊ TEM AGORA

### 1. Firmware Novo
**Arquivo:** `iot/esp32/SmartParking_ESP32_IoT_MQTT_v3.ino`

**Principais Changes:**
```cpp
#define TOTAL_VAGAS 20                    // Era 22
#define GATE_ENTRY_SENSOR_PIN 4           // Novo
#define GATE_EXIT_SENSOR_PIN 5            // Novo
#define SERVO_OPEN_TIME_MS 2000           // Timeout automático
```

**Funções Novas:**
- `lerSensoresPortao()` - Lê sensores de portão
- `acionarServoEntrada()` / `fecharServoEntrada()`
- `acionarServoSaida()` / `fecharServoSaida()`
- `publicarEntrada()` - MQTT: `parking/entry`
- `publicarSaida()` - MQTT: `parking/exit`

### 2. Documentação (5 Guias)
1. **INDEX** → Visão geral de tudo
2. **QUICK_REFERENCE** → Diagrama visual + tabelas
3. **COMPARISON** → v2.0 vs v3.0 (lado-a-lado)
4. **ARCHITECTURE** → Backend integration
5. **UPLOAD_DEPLOY** → Passo-a-passo

---

## 📡 TÓPICOS MQTT

| Tópico | Exemplo | Quando |
|--------|---------|--------|
| `parking/spots/1..20` | `{"vagaId":7,"status":"ocupada",...}` | Mudança de vaga |
| `parking/entry` | `{"evento":"entrada",...}` | Sensor entrada acionado |
| `parking/exit` | `{"evento":"saida",...}` | Sensor saída acionado |
| `parking/device/.../status` | `{"status":"online",...}` | A cada 60s (heartbeat) |

---

## ⚙️ CONFIGURAÇÕES (CRÍTICO!)

Editar no firmware:
```cpp
#define WIFI_SSID "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD "E9D8VIVO"
#define MQTT_BROKER "192.168.15.177"
#define MQTT_PORT 1883
#define MQTT_USER "parking_iot"
#define MQTT_PASSWORD "ParkingIot@2026"
```

---

## 🚀 PRÓXIMOS PASSOS (Quick Checklist)

### FASE 1: Upload Firmware (30 min)
- [ ] Install Arduino IDE + ESP32 board support
- [ ] Install libraries: PubSubClient, Adafruit MCP23017, ArduinoJson, ESP32Servo
- [ ] Open `SmartParking_ESP32_IoT_MQTT_v3.ino`
- [ ] Verify compilation: `Sketch → Verify/Compile`
- [ ] Connect ESP32 via USB
- [ ] Upload: `Sketch → Upload`
- [ ] Open Serial Monitor (115200 baud)
- [ ] Verify boot message: "Smart Parking ESP32 IoT v3.0"

### FASE 2: Testar MQTT (10 min)
```bash
# Monitor all MQTT messages
docker exec parking-mosquitto mosquitto_sub \
  -h localhost -p 1883 \
  -u parking_iot -P 'ParkingIot@2026' \
  -t 'parking/#' -v
```
✓ Deve ver: `parking/spots/1` até `parking/spots/20`
✓ Nunca ver: `parking/spots/21` ou `parking/spots/22`
✓ Status device a cada 60s

### FASE 3: Testar Portões (10 min)
```bash
# Terminal 1: Subscribe portões
docker exec parking-mosquitto mosquitto_sub \
  -h localhost -p 1883 \
  -u parking_iot -P 'ParkingIot@2026' \
  -t 'parking/entry' -t 'parking/exit' -v
```
✓ Acionar sensor entrada → `parking/entry` aparece
✓ Servo abre e fecha automaticamente (2.5s total)
✓ Mesmo com sensor saída

### FASE 4: Backend Integration (1-2 horas)
Criar handlers em backend:
```csharp
// MqttToSignalRHandler.cs

if (topic.Contains("parking/entry"))
    await HandleGateEntryAsync(payload);
else if (topic.Contains("parking/exit"))
    await HandleGateExitAsync(payload);

private async Task HandleGateEntryAsync(string payload)
{
    // 1. Parse GateEventDto
    // 2. Create ParkingSession(status: waiting_spot)
    // 3. Publish SignalR message
}

private async Task HandleGateExitAsync(string payload)
{
    // 1. Find active session
    // 2. Set ExitTime, status=completed
    // 3. Calculate fee
    // 4. Publish SignalR message
}
```

---

## 🔍 VALIDAÇÃO ESPERADA

**Serial Monitor (ESP32):**
```
[MCP1] OK em 0x20 - Vagas 1-16
[MCP2] OK em 0x21 - Vagas 17-20 + Gates + LEDs
[MQTT] OK - ClientID: esp32-parking-01
[MQTT] MQTT conectado com sucesso.
```

**MQTT (docker):**
```
parking/spots/1 {"vagaId":1,"status":"livre",...}
parking/spots/2 {"vagaId":2,"status":"ocupada",...}
...
parking/spots/20 {"vagaId":20,"status":"livre",...}
parking/device/esp32-parking-01/status {"device_id":"esp32-parking-01",...}
```

**Sensor Entrada/Saída:**
```
Serial: [SENSOR ENTRADA] Acionado!
Serial: [SERVO ENTRADA] Abrindo portao entrada...
MQTT:   parking/entry {"evento":"entrada",...}
(esperar 2.5s)
Serial: [SERVO ENTRADA] Fechando portao entrada...
```

---

## 📚 POR ONDE COMEÇAR?

1. **Nunca viu antes?** → Ler `ESP32_MQTT_V3_QUICK_REFERENCE.md`
2. **Quer entender mudanças?** → Ler `FIRMWARE_V2_VS_V3_COMPARISON.md`
3. **Pronto para upload?** → Ler `ESP32_MQTT_V3_UPLOAD_DEPLOY.md`
4. **Backend dev?** → Ler `ESP32_MQTT_V3_ARCHITECTURE.md`
5. **Precisa de detalhes?** → Ler `ESP32_MQTT_V3_INDEX.md`

---

## ❓ FAQ 30 SEGUNDOS

**P: Por que v3.0?**
R: v2.0 publicava vagas 21-22 que não existem. v3.0 publica apenas 1-20.

**P: Quantas vagas?**
R: **20 vagas reais**. Ponto final.

**P: E os sensores de portão?**
R: Integrados em MCP2[4-5], publicam em `parking/entry` e `parking/exit`.

**P: Servos abrem sozinhos?**
R: Sim! Detectam sensor, abrem em <100ms, fecham em 2.5s.

**P: Backend precisa fazer algo?**
R: Sim. Criar handlers para `parking/entry` e `parking/exit` (veja `ARCHITECTURE.md`).

**P: Como é o billing?**
R: Session com entry_time e exit_time → `fee = duration * rate`.

**P: Posso voltar para v2.0?**
R: Não recomendo. v2.0 está incorreto.

---

## 🎯 TL;DR

```
O QUÊ:   Firmware corrigido (20 vagas, 2 portões automáticos)
ONDE:    iot/esp32/SmartParking_ESP32_IoT_MQTT_v3.ino
COMO:    Arduino IDE → Upload
MQTT:    parking/spots/1..20, parking/entry, parking/exit
BACKEND: Criar handlers para entry/exit (criar/finalizar sessions)
DOCS:    5 guias completos (veja INDEX.md)
```

---

**Versão:** 3.0  
**Data:** 12 maio 2026  
**Status:** ✅ Pronto para usar  
**Tempo Deploy:** ~2 horas (upload + backend integration)  
**Risco:** Baixo (backward incompatível com v2.0 mas isso é BOM)

🚀 **Comece pelo `ESP32_MQTT_V3_UPLOAD_DEPLOY.md` - Segue passo-a-passo!**
