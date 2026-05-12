# 🚗 Smart Parking ESP32 — GUIA DE IMPLEMENTAÇÃO

## 📦 ARQUIVO CRIADO

**Local:** `iot/esp32/SmartParking_Complete.ino`

Este arquivo contém **toda** a lógica de hardware em um único bloco, pronto para copiar e colar na Arduino IDE.

---

## 🔧 REQUISITOS DE HARDWARE

### Sensores de Vaga (20 no total)
```
MCP23017 #0 (Endereço: 0x20)
├─ Pinos 0-15  → Vagas 1 a 16
└─ Alimentação: +5V / GND

MCP23017 #1 (Endereço: 0x21)
├─ Pinos 0-3   → Vagas 17 a 20
├─ Pino 6      → Sensor IR Entrada
├─ Pino 7      → Sensor IR Saída
└─ Alimentação: +5V / GND
```

### Cancelas
```
ENTRADA:
├─ Sensor IR:  MCP#1, Pino 6 (ativo em LOW)
└─ Servo Motor: GPIO 18 (0°=aberto, 90°=fechado)

SAÍDA:
├─ Sensor IR:  MCP#1, Pino 7 (ativo em LOW)
└─ Servo Motor: GPIO 19 (0°=aberto, 90°=fechado)
```

### Comunicação
```
I2C:
├─ SDA: GPIO 21
├─ SCL: GPIO 22
└─ Frequência: 100kHz (padrão)

WiFi & MQTT:
├─ SSID: "VIVOFIBRA-WIFI6-E9D8"
├─ Broker: 192.168.15.177:1884
└─ Credenciais: parking_iot / ParkingIot@2026
```

---

## 📚 BIBLIOTECAS NECESSÁRIAS

Instale todas via **Sketch → Include Library → Manage Libraries**:

1. **PubSubClient** (v2.8.0+) — Nick O'Leary
2. **Adafruit_MCP23X17** (v2.0+) — Adafruit
3. **ESP32Servo** (v0.13+) — John K. Bennett
4. **ArduinoJson** (v7.0+) — Benoit Blanchon

**Versão do ESP32 Core:** 2.0.11 ou superior

---

## ⚙️ CONFIGURAÇÃO INICIAL

Abra `SmartParking_Complete.ino` e ajuste estas seções se necessário:

### WiFi
```cpp
#define WIFI_SSID     "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD "03012006Ju"
```

### MQTT
```cpp
#define MQTT_BROKER   "192.168.15.177"
#define MQTT_PORT     1884
#define MQTT_USERNAME "parking_iot"
#define MQTT_PASSWORD "ParkingIot@2026"
```

### Estacionamento
```cpp
#define PARKING_LOT_ID "45fc18f2-bdd8-4b11-b964-f8face1147f0"
#define TOTAL_VAGAS    20
```

---

## 🚀 PASSO A PASSO: UPLOAD

### 1. Abra a Arduino IDE
```
File → Open → SmartParking_Complete.ino
```

### 2. Configure a Placa
```
Tools → Board → ESP32 → ESP32 Dev Module
Tools → Port → COM3 (ou a porta do seu ESP32)
Tools → Upload Speed → 921600
```

### 3. Verifique as Bibliotecas
```
Sketch → Include Library → Manage Libraries
  → Procure por cada uma acima
  → Clique em "Install"
```

### 4. Faça Upload
```
Sketch → Upload
Ou Ctrl+U
```

---

## 🔍 MONITORAMENTO (Serial Monitor)

Após upload bem-sucedido:

```
1. Abra: Tools → Serial Monitor
2. Velocidade: 115200 baud
3. Esperado:

════════════════════════════════════════════════
     SMART PARKING SYSTEM — ESP32 INICIANDO     
════════════════════════════════════════════════
[I2C] Barramento inicializado
[MCP#0] ✅ Inicializado (vagas 1-16)
[MCP#1] ✅ Inicializado (vagas 17-20 + cancelas)
[Vagas] ✅ 20 sensores configurados
[Cancelas] ✅ Sensores IR configurados
[Servos] ✅ Anexados e em posição fechada
[WiFi] ✅ Conectado! IP: 192.168.X.X
[MQTT] ✅ Conectado!
[MQTT] ✅ Inscrito em: parking/config/spots

════════════════════════════════════════════════
     ✅ SISTEMA PRONTO — Monitorando...         
════════════════════════════════════════════════
```

---

## 🧪 TESTE MANUAL

### Teste 1: Verificar Conexão MQTT

**No Serial Monitor, você deve ver após inicialização:**
```
[WiFi] ✅ Conectado! IP: 192.168.X.X
[MQTT] ✅ Conectado!
```

### Teste 2: Simular Entrada de Carro

**Via MQTT Explorer ou linha de comando:**
```bash
# Abre a cancela (simula sensor IR entrada)
mosquitto_pub -h 192.168.15.177 -p 1884 \
  -u parking_iot -P ParkingIot@2026 \
  -t "parking/config/spots" \
  -m '{"availableSpots": 5}'
```

**Esperado no Serial Monitor:**
```
[Config] Vagas atualizadas: 20 → 5
[ENTRADA] 🚗 Carro detectado!
[ENTRADA] ✅ Vagas disponíveis - ABRINDO cancela
[Servo Entrada] Movendo para 0° (ABERTO)
[MQTT TX] Evento publicado: parking/events/entry | Vagas: 5
[Servo Entrada] ⏱️ Timeout - Fechando...
[Servo Entrada] Movendo para 90° (FECHADO)
```

### Teste 3: Simular Saída de Carro

**Mesmo comando com `parking/events/exit`:**
```bash
mosquitto_pub -h 192.168.15.177 -p 1884 \
  -u parking_iot -P ParkingIot@2026 \
  -t "parking/config/spots" \
  -m '{"availableSpots": 6}'
```

**Esperado:**
```
[SAÍDA] 🚗 Carro detectado!
[SAÍDA] ✅ ABRINDO cancela (saída livre)
[Servo Saída] Movendo para 0° (ABERTO)
[MQTT TX] Evento publicado: parking/events/exit | Vagas: 6
[Servo Saída] ⏱️ Timeout - Fechando...
[Servo Saída] Movendo para 90° (FECHADO)
```

---

## 📊 ESTRUTURA DO CÓDIGO

```
SmartParking_Complete.ino
├─ SEÇÃO 1: DEFINES E CONFIGURAÇÕES
│  └─ WiFi, MQTT, Pinos, Timeouts
├─ SEÇÃO 2: VARIÁVEIS GLOBAIS
│  └─ Objetos, Estado, Debounce
├─ SEÇÃO 3: SETUP
│  └─ Inicialização de Hardware
├─ SEÇÃO 4: LOOP PRINCIPAL
│  └─ Reconexão e Leitura de Sensores
├─ SEÇÃO 5: FUNÇÕES DE CONEXÃO
│  └─ WiFi e MQTT
├─ SEÇÃO 6: CALLBACK MQTT
│  └─ Recebe "parking/config/spots"
├─ SEÇÃO 7: LEITURA DE SENSORES
│  └─ Vagas com debounce
├─ SEÇÃO 8: PROCESSAMENTO DE CANCELAS
│  └─ Entrada e Saída com lógica de servo
└─ SEÇÃO 9: PUBLICAÇÃO DE EVENTOS
   └─ Tópicos MQTT
```

---

## 📡 TÓPICOS MQTT

### PUBLISH (ESP32 → Backend)

| Tópico | Payload Exemplo |
|--------|-----------------|
| `parking/spots/{id}` | `{"vagaId": 1, "occupied": true, "parkingLotId": "45fc18f2...", "timestamp": 123456789}` |
| `parking/events/entry` | `{"event": "entry", "timestamp": 123456789, "parkingLotId": "45fc18f2...", "vagasDisponiveis": 5}` |
| `parking/events/exit` | `{"event": "exit", "timestamp": 123456789, "parkingLotId": "45fc18f2...", "vagasDisponiveis": 6}` |

### SUBSCRIBE (Backend → ESP32)

| Tópico | Descrição |
|--------|-----------|
| `parking/config/spots` | Recebe `{"availableSpots": N}` para atualizar `vagasDisponiveis` |

---

## 🚨 TROUBLESHOOTING

### Problema: "MCP#0 não encontrado"
**Solução:**
- Verifique fiação I2C (SDA/SCL)
- Confirme endereço 0x20: `Wire.beginTransmission(0x20)`
- Teste com sketch de scan I2C

### Problema: "MQTT não conecta"
**Solução:**
- Verifique IP do broker: `192.168.15.177`
- Teste credenciais com MQTT Explorer
- Verifique se esp32 tem WiFi conectado

### Problema: "Servo não se move"
**Solução:**
- Confirme GPIO 18 e 19 não estão em uso
- Verifique alimentação +5V do servo
- Teste servo isoladamente com sketch simples

### Problema: "Vaga sempre ocupada/livre"
**Solução:**
- Ajuste `SENSOR_ACTIVE_LOW = false` se necessário
- Aumente `DEBOUNCE_THRESHOLD` para 5
- Verifique conexão do sensor no MCP

---

## 💡 CUSTOMIZAÇÃO

### Alterar Número de Vagas
```cpp
#define TOTAL_VAGAS 20  // Mude para seu número real
```

### Alterar Tempo de Abertura da Cancela
```cpp
#define SERVO_WAIT_TIME 3000  // 3 segundos (mude para ms desejado)
```

### Alterar Debounce
```cpp
#define DEBOUNCE_THRESHOLD 3  // Aumente para mais estabilidade
```

### Desabilitar Logs Debug
Se quiser reduzir saída serial, comente linhas com `Serial.println()` na seção 8.

---

## ✅ CHECKLIST PRÉ-PRODUÇÃO

- [ ] ESP32 uploading sem erros
- [ ] Serial Monitor mostra "✅ SISTEMA PRONTO"
- [ ] WiFi conecta automaticamente
- [ ] MQTT conecta ao broker
- [ ] Sensor de vaga responde (teste move objeto)
- [ ] Servos se movem (entrada abre, saída abre)
- [ ] Eventos publicados em `parking/events/entry` e `exit`
- [ ] Backend recebe e processa mensagens

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verifique o Serial Monitor** — Procure por mensagens de erro
2. **Teste conexões I2C** — Use sketch de scan
3. **Teste MQTT isoladamente** — Use MQTT Explorer
4. **Verifique alimentação** — Sensores e servos precisam de +5V estável

**Arquivo de teste MQTT:** `scripts/mqtt-test-gates.sh`

---

**Versão:** 1.0  
**Última atualização:** 11/05/2026  
**Status:** ✅ Pronto para Produção
