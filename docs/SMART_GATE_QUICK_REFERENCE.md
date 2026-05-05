# 🚪 Smart Gate Control — Quick Reference Card

Imprima este arquivo e coloque ao lado da sua mesa durante o desenvolvimento! 📌

---

## 🔌 PINAGEM

```
┌─────────────────────────────────────┐
│          ESP32 Dev Board            │
├─────────────────────────────────────┤
│  GPIO 21 ─ SDA ─ I2C Bus            │
│  GPIO 22 ─ SCL ─ I2C Bus            │
│  GPIO 18 ─ PWM ─ Servo Entrada      │
│  GPIO 19 ─ PWM ─ Servo Saída        │
│                                     │
│  GND ─ Massa (Servo + Sensores)     │
│  5V  ─ Servo Motors (2A mín)        │
│  3.3V ─ MCP23017                    │
└─────────────────────────────────────┘

I2C Devices:
  0x20 = MCP0 (16 sensores vagas)
  0x21 = MCP1 (4 vagas + IR gates)
        └─ Pino 6 = IR Entrada
        └─ Pino 7 = IR Saída
```

---

## 📡 MQTT TOPICS

### 📥 Subscrições (ESP32 Recebe)
```
parking/spots/snapshot
├─ Payload: {"totalSpots":20,"occupiedSpots":15,"availableSpots":5}
└─ Frequência: A cada 30s (do Backend)
```

### 📤 Publicações (ESP32 Envia)
```
parking/entry              → Evento: Carro entrou
parking/exit               → Evento: Carro saiu
parking/device/status      → Heartbeat (a cada 15s)
```

---

## 🚗 FLUXO DE ENTRADA

```
┌─────────────────────────┐
│ IR Detecta Carro        │
└────────────┬────────────┘
             │
    ┌────────▼────────┐
    │ Vagas Livres?   │
    └────────┬────────┘
             │
    ┌────────────────────────┐
    │                        │
  SIM                       NÃO
    │                        │
    ▼                        ▼
┌────────────┐          ┌──────────┐
│ Abre 0°    │          │Mantém 90°│
│ (500ms)    │          │(bloqueio)│
└────────────┘          └──────────┘
    │
    ▼
┌────────────┐
│ Aguarda    │
│Carro sair  │
└────────────┘
    │
    ▼
┌────────────┐
│ Espera 2s  │
└────────────┘
    │
    ▼
┌────────────┐
│ Fecha 90°  │
│ (500ms)    │
└────────────┘
    │
    ▼
┌────────────┐
│ Publica    │
│ "entry"    │
└────────────┘
```

---

## 🚪 FLUXO DE SAÍDA

```
┌─────────────────────────┐
│ IR Detecta Carro        │
└────────────┬────────────┘
             │
             ▼
        ┌────────────┐
        │ Abre 0°    │
        │ (500ms)    │
        └────────────┘
             │
             ▼
        ┌────────────┐
        │ Aguarda    │
        │Carro sair  │
        └────────────┘
             │
             ▼
        ┌────────────┐
        │ Espera 2s  │
        └────────────┘
             │
             ▼
        ┌────────────┐
        │ Fecha 90°  │
        │ (500ms)    │
        └────────────┘
             │
             ▼
        ┌────────────┐
        │ Publica    │
        │ "exit"     │
        └────────────┘
```

---

## ⚡ COMANDOS ESSENCIAIS

### Upload & Monitor
```bash
# Terminal na pasta do projeto
cd parking_controller_platformio

# Upload (compila + envia)
pio run --target upload

# Monitor serial (115200 baud)
pio device monitor --baud 115200

# Ambos juntos
pio run --target upload && pio device monitor --baud 115200
```

### MQTT Testing
```bash
# Monitor todos os tópicos
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v

# Publicar snapshot com vagas
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" \
  -m '{"totalSpots":20,"occupiedSpots":15,"availableSpots":5}'

# Publicar snapshot SEM vagas
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" \
  -m '{"totalSpots":20,"occupiedSpots":20,"availableSpots":0}'
```

### Hardware Testing
```bash
# Scan I2C
i2cdetect -y 1

# Verificar portas seriais
ls -l /dev/ttyUSB* /dev/ttyACM*

# Testar conectividade MQTT
telnet 192.168.0.10 1883
```

---

## 🧪 CHECKLIST DE TESTE

### ✅ Startup
```
□ Serial mostra "Pronto!"
□ WiFi: ✅ Conectado
□ I2C: ✅ MCP0 (0x20) detectado
□ I2C: ✅ MCP1 (0x21) detectado
□ MQTT: ✅ Conectado
```

### ✅ Hardware
```
□ IR Entrada responde (coloque objeto)
□ IR Saída responde (coloque objeto)
□ Servo Entrada se move (0° → 90°)
□ Servo Saída se move (0° → 90°)
```

### ✅ Fluxo (Com Vagas)
```
□ Ativar IR entrada
□ Servo abre (0°)
□ Remover objeto
□ Servo fecha (90°) após 2s
□ MQTT publica "entry"
```

### ✅ Fluxo (Sem Vagas)
```
□ Publicar snapshot com 0 vagas
□ Ativar IR entrada
□ Servo NÃO abre (permanece 90°)
□ Serial: "Estacionamento LOTADO"
```

### ✅ Fluxo Saída
```
□ Ativar IR saída
□ Servo abre (0°)
□ Remover objeto
□ Servo fecha (90°) após 2s
□ MQTT publica "exit"
```

---

## 🔴 CÓDIGOS DE ERRO MQTT

```
-4 = Timeout de conexão
-3 = Conexão perdida
-2 = Falha de rede
-1 = Cliente desconectado
 1 = Protocolo MQTT inválido
 2 = Client ID rejeitado
 3 = Servidor indisponível
 4 = Usuário/Senha INCORRETOS ⚠️
 5 = Não autorizado (ACL)
```

---

## 📊 ESTADOS DA MÁQUINA

```
ENTRADA & SAÍDA:
0 = IDLE              (Aguardando)
1 = CAR_DETECTED      (Carro detectado)
2 = OPENING           (Abrindo)
3 = OPEN              (Aberto)
4 = WAITING_CAR_PASS  (Passando)
5 = CLOSING           (Fechando)
6 = CLOSED            (Fechado)
7 = BLOCKED           (Lotado - somente entrada)
```

---

## ⚙️ CONFIGURAÇÃO RÁPIDA

### Config.h
```cpp
// WiFi
const char* WIFI_SSID = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";

// MQTT Broker (seu IP local)
const char* MQTT_BROKER = "192.168.0.10";
const int MQTT_PORT = 1883;

// Parking Lot
const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";
```

### ParkingConfig.h
```cpp
// Servo (PWM)
const int SERVO_ENTRY_PIN = 18;
const int SERVO_EXIT_PIN = 19;
const int SERVO_OPEN_ANGLE = 0;    // Aberta
const int SERVO_CLOSED_ANGLE = 90; // Fechada

// I2C (MCP23017)
const uint8_t MCP1_ADDR = 0x21;
const uint8_t ENTRY_GATE_PIN = 6;
const uint8_t EXIT_GATE_PIN = 7;
```

---

## 🐛 TROUBLESHOOTING RÁPIDO

| Problema | Verificar |
|----------|-----------|
| ESP32 não liga | Alimentação USB (5V) |
| WiFi não conecta | SSID/Senha corretos em Config.h |
| MQTT não conecta | IP correto, porta 1883 aberta |
| I2C não detecta | Pinos SDA/SCL (21/22), pull-ups |
| Servo não se move | Alimentação 5V/2A, GPIO 18/19 |
| IR não detecta | MCP23017 funcionando, pino correto |
| Serial mostra lixo | Baud rate = 115200 |

---

## 📋 SERIAL OUTPUT ESPERADO

### Boot OK
```
════════════════════════════════════════════════
   Parking System — Smart Gate Control
════════════════════════════════════════════════

[WiFi] ✅ Conectado! IP: 192.168.0.50
[MCP23017 #0] ✅ Detectado em 0x20
[MCP23017 #1] ✅ Detectado em 0x21
[Sensores IR] ✅ Configurados
[Servo Motors] ✅ Configurados e fechados
[MQTT] ✅ Conectado!
[Sistema] ✅ Pronto! Aguardando carros...
```

### Carro na Entrada (Com Vagas)
```
[ENTRADA] 🚗 Carro detectado no sensor!
[ENTRADA] ✅ Vagas disponíveis. Abrindo...
[SERVO] Entrada → 0° (ABERTA)
[ENTRADA] ✅ Carro passou. Esperando 2s...
[ENTRADA] 🔒 Fechando...
[SERVO] Entrada → 90° (FECHADA)
[MQTT TX] parking/entry
```

### Carro na Entrada (Sem Vagas)
```
[ENTRADA] 🚗 Carro detectado no sensor!
[ENTRADA] ❌ Estacionamento LOTADO!
```

---

## 📱 MONITORAR EM TEMPO REAL

### Terminal 1: Serial
```bash
pio device monitor --baud 115200
```

### Terminal 2: MQTT
```bash
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v
```

### Terminal 3: Backend Logs (opcional)
```bash
docker compose logs -f api
```

---

## 🔧 RESETAR / REINICIAR

### Hard Reset (Física)
1. Desconectar USB
2. Aguardar 5 segundos
3. Reconectar USB

### Soft Reset (Código)
```cpp
ESP.restart();
```

### Reset MQTT Connection
```cpp
mqtt.disconnect();
// Será reconectado automaticamente no loop
```

---

## 📦 DEPENDÊNCIAS IMPORTANTES

```
platformio.ini deve ter:
- PubSubClient @ ^2.8       ✅ MQTT
- ArduinoJson @ ^7.0.4      ✅ JSON
- Adafruit MCP23017 @ ^2.3.2 ✅ I2C Expander
- ESP32Servo @ ^3.0.5       ✅ Servo PWM
```

---

## 🎯 PRÓXIMO PASSO

```
1️⃣ Ler: SMART_GATE_CONTROL_GUIDE.md
2️⃣ Upload: main.cpp
3️⃣ Monitorar: Serial + MQTT
4️⃣ Testar: 10 fases em SMART_GATE_TEST_VALIDATION.md
5️⃣ Integrar: Backend .NET em SMART_GATE_BACKEND_INTEGRATION.md
```

---

**Imprima e coloque ao lado! 📌**  
**Boa sorte! 🚗🚪**

---

*Data: Maio de 2026*  
*Versão: 1.0*
