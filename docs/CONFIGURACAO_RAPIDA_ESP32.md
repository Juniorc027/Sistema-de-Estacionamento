# ⚡ Configuração Rápida — Smart Parking ESP32 IoT

## 🎯 Em 5 Minutos

### 1️⃣ **Instalar Arduino IDE** (se não tiver)
```
https://www.arduino.cc/en/software
```

### 2️⃣ **Instalar Suporte ESP32**

No Arduino IDE:
```
File → Preferences → Additional Board Manager URLs

Cole:
https://dl.espressif.com/dl/package_esp32_index.json
```

Depois:
```
Tools → Board Manager
Procure: esp32
Clique: "Install by Espressif Systems"
```

### 3️⃣ **Instalar 5 Bibliotecas**

```
Sketch → Include Library → Manage Libraries
```

Procure e clique "Install" em cada uma:

1. **PubSubClient** (by Nick O'Leary)
2. **Adafruit_MCP23X17** (by Adafruit)
3. **ESP32Servo** (by John K. Bennett)
4. **ArduinoJson** (by Benoit Blanchon)
5. **WiFi** (embutida, não precisa instalar)

### 4️⃣ **Abrir o Código**

```
File → Open
↓
Navegue para:
iot/esp32/SmartParking_ESP32_IoT.ino
↓
Clique "Open"
```

### 5️⃣ **Configurar Upload**

```
Tools → Board → ESP32 → "ESP32 Dev Module"
Tools → Port → COMx (onde x é o número da porta)
Tools → Upload Speed → 921600
```

### 6️⃣ **Upload**

```
Sketch → Upload  (ou Ctrl+U)

Aguarde até aparecer:
✅ "Hard resetting via RTS pin..."
```

---

## 📺 Monitorar Serial

```
Tools → Serial Monitor
↓
Baud Rate: 115200
↓
Aguarde mensagens do sistema
```

**Esperado ver:**
```
╔══════════════════════════════════════════════════════════════╗
║           SMART PARKING ESP32 - INICIANDO SISTEMA             ║
╚══════════════════════════════════════════════════════════════╝

[I2C] Inicializando barramento I2C (SDA=21, SCL=22)...
[MCP1] Inicializando em endereço 0x20... OK
[MCP2] Inicializando em endereço 0x21... OK
[SERVO] Inicializando servos...
[WiFi] Conectando...
✅ WiFi Conectado: 192.168.x.x
[MQTT] Conectando...
✅ MQTT Conectado
✅ SISTEMA PRONTO - Monitorando vagas...
```

---

## 🔧 Configurações Importantes

### WiFi
```cpp
Linha 42-43:
#define WIFI_SSID "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD "03012006Ju"
```

### MQTT Broker
```cpp
Linha 47-50:
#define MQTT_BROKER "192.168.15.177"
#define MQTT_PORT 1884
#define MQTT_USER "parking_iot"
#define MQTT_PASSWORD "ParkingIot@2026"
```

### Hardware (não mude se seguiu o esquema!)
```cpp
Linha 66-77:
I2C_SDA = 21
I2C_SCL = 22
MCP1 (Vagas 1-16) = 0x20
MCP2 (Vagas 17-20 + Sensores) = 0x21
SERVO_ENTRADA = GPIO 13
SERVO_SAIDA = GPIO 12
```

---

## ✅ Checklist Pre-Upload

- [ ] Arduino IDE aberta
- [ ] 5 Bibliotecas instaladas
- [ ] Arquivo .ino aberto
- [ ] ESP32 Dev Module selecionado
- [ ] Porta COM correta
- [ ] Upload Speed = 921600
- [ ] WiFi e MQTT configurados

---

## 🚨 Troubleshooting

### "Board not found"
```
1. Conecte ESP32 com cabo USB
2. Verifique drivers (CH340)
3. Tente outra porta USB
```

### "MCP1/MCP2 não respondendo"
```
1. Verifique fiação I2C (SDA/SCL)
2. Verifique alimentação (+5V/GND)
3. Verifique endereços I2C (0x20, 0x21)
```

### "MQTT não conecta"
```
1. Verifique IP do broker
2. Verifique credenciais
3. Teste conexão WiFi primeiro
```

### "Servo não funciona"
```
1. Verifique alimentação separada
2. Verifique GPIO 13 e 12
3. Teste com código de servo simples
```

---

## 📡 Testar Após Upload

### Via Serial Monitor

Você verá eventos como:
```
[EVENTO] Carro detectado na ENTRADA
[SERVO ENTRADA] Abrindo (vagas livres: 20)
[VAGA] 1 -> OCUPADA
[EVENTO] Carro detectado na SAÍDA
[SERVO SAÍDA] Abrindo
```

### Via MQTT (com MQTT Explorer)

**Tópicos a monitorar:**

1. `parking/spots` — Status das 20 vagas
2. `parking/events` — Eventos entrada/saída
3. `parking/config` — Recebe vagas livres

---

## 📋 Estrutura do Código

```
SEÇÃO 1: INCLUDES E DEFINIÇÕES
   └─ Bibliotecas, WiFi, MQTT, Hardware

SEÇÃO 2: VARIÁVEIS GLOBAIS
   └─ Objetos, arrays de estado, contadores

SEÇÃO 3: SETUP
   └─ I2C, MCP23017, Servos, WiFi, MQTT

SEÇÃO 4: LOOP PRINCIPAL
   └─ Reconexão, Leitura de Sensores, Processamento

SEÇÃO 5: FUNÇÕES DE CONEXÃO
   └─ WiFi e MQTT com retry automático

SEÇÃO 6: CALLBACK MQTT
   └─ Recebe vagasLivres do Backend

SEÇÃO 7: LEITURA DE SENSORES (VAGAS)
   └─ 20 vagas com debounce

SEÇÃO 8: PROCESSAMENTO DE SENSORES (ENTRADA/SAÍDA)
   └─ IR Entrada/Saída com debounce

SEÇÃO 9: PROCESSAMENTO DE SERVOS
   └─ Controle de abertura/fechamento

SEÇÃO 10: PUBLICAÇÃO DE DADOS MQTT
   └─ Status das vagas e eventos
```

---

## 🎁 Características Implementadas

✅ **20 Sensores de Vagas**
   - Debounce implementado
   - Detecção de mudanças
   - Publicação automática

✅ **2 Servos Inteligentes**
   - Entrada: Abre se vagasLivres > 0
   - Saída: Sempre abre
   - Auto-fecha após 3 segundos

✅ **Comunicação Bidirecional MQTT**
   - Publica: parking/spots, parking/events
   - Assina: parking/config

✅ **Reconexão Automática**
   - WiFi: a cada 10 segundos
   - MQTT: a cada 5 segundos

✅ **I2C com 2 MCP23017**
   - MCP1 (0x20): Vagas 1-16
   - MCP2 (0x21): Vagas 17-20 + Sensores

✅ **Logs Detalhados**
   - Serial Monitor para debugging
   - Mensagens em português
   - Sem código morto

---

## 🎯 Próximos Passos

1. Upload bem-sucedido ✅
2. Serial Monitor mostra "SISTEMA PRONTO" ✅
3. WiFi conecta automaticamente ✅
4. MQTT conecta ao broker ✅
5. Sensores respondem ao movimento ✅
6. Servos se movem conforme vagas ✅
7. Eventos publicados em MQTT ✅
8. Integração com Backend ✅

---

## 📞 Suporte

**Dúvidas?** Consulte:
- `ESP32_PINAGEM.md` — Diagrama de pinagem
- `ESP32_SETUP_GUIDE.md` — Guia completo
- Serial Monitor — Logs do sistema

---

**Data:** 11/05/2026  
**Versão:** 1.0  
**Status:** ✅ Pronto para Uso  

🚀 Aproveite!
