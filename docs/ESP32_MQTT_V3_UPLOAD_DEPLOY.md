# ESP32 MQTT v3.0 - GUIA DE UPLOAD E DEPLOY

## 📥 PARTE 1: PREPARAR AMBIENTE ARDUINO IDE

### 1.1 Instalar Arduino IDE
```bash
# Ubuntu/Debian
sudo apt install arduino

# Ou baixar de https://www.arduino.cc/en/software
```

### 1.2 Instalar ESP32 Board Support
1. Abrir Arduino IDE
2. **File** → **Preferences**
3. Em "Additional Board Manager URLs", adicionar:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. **Tools** → **Board** → **Board Manager**
5. Procurar "ESP32" → Instalar "esp32 by Espressif Systems" (versão ≥2.0.0)

### 1.3 Instalar Bibliotecas Necessárias
```
Tools → Manage Libraries
Procurar e instalar:
  ✓ PubSubClient (by Nick O'Leary)
  ✓ Adafruit MCP23017 (by Adafruit)
  ✓ Adafruit MCP230xx library (by Adafruit)
  ✓ ArduinoJson (by Benoit Blanchon)
  ✓ ESP32Servo (by Kevin Harrington)
```

### 1.4 Configurar Board
```
Tools → Board → ESP32 → "ESP32 Dev Module"
Tools → Port → /dev/ttyUSB0  (ou COM3 no Windows)
Tools → Upload Speed → 921600
Tools → CPU Frequency → 240 MHz
Tools → Flash Frequency → 80 MHz
```

---

## 📝 PARTE 2: PREPARAR CÓDIGO

### 2.1 Abrir Firmware v3.0
```
File → Open → SmartParking_ESP32_IoT_MQTT_v3.ino
```

### 2.2 Verificar Configurações (CRÍTICO!)
Editar defines no topo do arquivo:

```cpp
// Sua rede WiFi
#define WIFI_SSID "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD "E9D8VIVO"

// MQTT
#define MQTT_BROKER "192.168.15.177"
#define MQTT_PORT 1883
#define MQTT_USER "parking_iot"
#define MQTT_PASSWORD "ParkingIot@2026"

// Pinos (verifique seu hardware!)
#define SERVO_GATE_ENTRY_PIN 16
#define SERVO_GATE_EXIT_PIN 17
```

### 2.3 Salvar Arquivo
```
File → Save (ou Ctrl+S)
```

---

## 🔧 PARTE 3: VERIFICAR COMPILAÇÃO

### 3.1 Verificar Sintaxe
```
Sketch → Verify/Compile (Ctrl+R)
```

Esperar mensagem:
```
Compiling core...
Linking everything together...

Done compiling.
```

**Se houver erro:**
- Verificar bibliotecas instaladas
- Verificar sintaxe do código
- Verificar delimitadores (chaves, parênteses)

---

## 🔌 PARTE 4: CONECTAR HARDWARE

### 4.1 Conectar USB
1. Conectar ESP32 ao computador via cabo USB
2. Aguardar 2 segundos
3. Verificar em `Tools → Port` se apareceu `/dev/ttyUSB0` ou similar

### 4.2 Conectar I2C (Se não estiver conectado)
```
ESP32                MCP23017
GPIO21 (SDA)   ← → SDA
GPIO22 (SCL)   ← → GND do MCP
GND            ← → GND
3.3V           ← → VDD
```

### 4.3 Conectar Servos (Se não estiver conectado)
```
ESP32               Servo Entrada      Servo Saída
GPIO16         ← → Signal             -
GPIO17         ← → -                  Signal
5V             ← → Power              Power
GND            ← → GND                GND
```

---

## ⬆️ PARTE 5: FAZER UPLOAD

### 5.1 Upload
```
Sketch → Upload (Ctrl+U)
```

Ou clicar no botão "→" (Upload) na barra de ferramentas.

Esperar a mensagem:
```
Writing at 0x00010000... (100%)
Wrote 442416 bytes (253024 compressed) at 0x00010000 in 3.9 seconds

Hash of data verified.
Hard resetting via RTS pin...
```

### 5.2 Problemas Comuns

**Erro: "Failed to connect to ESP32"**
- Verificar USB conectado
- Tentar apertar "Boot" no ESP32 durante upload
- Tentar velocidade menor: Tools → Upload Speed → 115200

**Erro: "Biblioteca não encontrada"**
- Tools → Manage Libraries
- Procurar e instalar a biblioteca faltante

---

## 🖥️ PARTE 6: VERIFICAR VIA SERIAL MONITOR

### 6.1 Abrir Serial Monitor
```
Tools → Serial Monitor (Ctrl+Shift+M)
Baud: 115200
```

### 6.2 Aguardar Boot

Você deve ver após alguns segundos:

```
╔════════════════════════════════════════════════════════════╗
║    Smart Parking ESP32 IoT v3.0 - ARCHITECTURE FIXED     ║
║    20 Vagas + Gate Entry/Exit + MQTT Robust              ║
╚════════════════════════════════════════════════════════════╝

[I2C] Inicializando...
[I2C] Verificando endereços...
  0x20 (MCP1)
  0x21 (MCP2)
[I2C] Total: 2 endereços

[MCP1] OK em 0x20 - Vagas 1-16
[MCP2] OK em 0x21 - Vagas 17-20 + Gates + LEDs

[I2C] Estado inicial das vagas...
[I2C] Vagas: 3/20 ocupadas

[SERVO] Inicializando...
[SERVO] OK - Entrada (pino 16), Saida (pino 17)
[SERVO] Posicionados em FECHADO

[INIT] Inicializando WiFi...
[WiFi] Conectando a 'VIVOFIBRA-WIFI6-E9D8'...
[WiFi] OK - IP: 192.168.15.XXX

[INIT] Sistema pronto!
═══════════════════════════════════════════════════════════
Status: WiFi=OK
        MQTT=AWAIT
        I2C=OK  SERVO=OK
═══════════════════════════════════════════════════════════
```

Se vir isso, o firmware está funcionando! ✅

### 6.3 Aguardar Conexão MQTT

Após alguns segundos, você deve ver:

```
[MQTT] Conectando a 192.168.15.177...
[MQTT] OK - ClientID: esp32-parking-01
[MQTT] Inscrito em: parking/config
[HEARTBEAT] Status: online
[MQTT Service] 🎉 SUBSCRIPTION COMPLETE: 6/6 topics subscribed successfully
[MQTT] MQTT conectado com sucesso.
```

---

## 📡 PARTE 7: VALIDAR VIA MQTT

### 7.1 Terminal 1: Monitor MQTT
```bash
cd /home/junior/Documentos/coder/parking-iot-system

docker exec parking-mosquitto mosquitto_sub \
  -h localhost -p 1883 \
  -u parking_iot -P 'ParkingIot@2026' \
  -t 'parking/#' -v
```

Você deve ver (a cada segundo aproximadamente):

```
parking/spots/1 {"vagaId":1,"status":"livre",...}
parking/spots/2 {"vagaId":2,"status":"ocupada",...}
...
parking/spots/20 {"vagaId":20,"status":"livre",...}
parking/device/esp32-parking-01/status {"device_id":"esp32-parking-01","status":"online",...}
```

**Verificar:**
- ✓ Mensagens apenas para vagas 1-20
- ✓ Nenhuma vaga 21 ou 22
- ✓ Status device a cada 60 segundos

### 7.2 Terminal 2: Simular Sensor de Vaga

```bash
# Desligar/ligar um sensor de vaga no hardware
# Ou simular via MCP:

# Publicar evento (para teste):
docker exec parking-mosquitto mosquitto_pub \
  -h localhost -p 1883 \
  -u parking_iot -P 'ParkingIot@2026' \
  -t 'parking/spots/5' \
  -m '{"vagaId":5,"status":"ocupada",...}'
```

**No Terminal 1, deve aparecer:**
```
parking/spots/5 {"vagaId":5,"status":"ocupada",...}
```

### 7.3 Testar Sensor Entrada

```bash
# Desligar/ligar sensor de entrada (pino GP4 do MCP2)

# Esperar ~500ms para debounce

# Serial Monitor deve mostrar:
# [SENSOR ENTRADA] Acionado!
# [SERVO ENTRADA] Abrindo portao entrada...

# Terminal 1 MQTT deve mostrar:
# parking/entry {"evento":"entrada",...}

# Aguardar 2.5 segundos...

# Serial Monitor deve mostrar:
# [SERVO ENTRADA] Fechando portao entrada...
```

### 7.4 Testar Sensor Saída

```bash
# Mesmo procedimento que sensor entrada
# Mas com sensor de saída (pino GP5 do MCP2)

# Esperado:
# [SENSOR SAIDA] Acionado!
# [SERVO SAIDA] Abrindo portao saida...
# parking/exit {"evento":"saida",...}
# [SERVO SAIDA] Fechando portao saida...
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Arduino IDE instalado com ESP32 board support
- [ ] Todas as bibliotecas instaladas
- [ ] Código compilado sem erros
- [ ] Hardware conectado (I2C, servos)
- [ ] USB conectado e reconhecido
- [ ] Upload concluído com sucesso
- [ ] Serial Monitor mostra boot message
- [ ] WiFi conecta com sucesso
- [ ] MQTT conecta e subscreve
- [ ] Vagas 1-20 aparecem no MQTT
- [ ] Nenhuma vaga 21 ou 22 aparece
- [ ] Sensor entrada publica em `parking/entry`
- [ ] Sensor saída publica em `parking/exit`
- [ ] Servos abrem e fecham automaticamente
- [ ] Timeout de servo funciona (2.5s)

---

## 🎯 PRÓXIMOS PASSOS

### Após Upload Bem-Sucedido:

1. **Verificar Backend**
   ```bash
   docker logs parking-backend | grep -E "MQTT|VAGA"
   ```
   Deve mostrar backend recebendo eventos MQTT

2. **Testar Dashboard**
   - Abrir http://localhost:3000 no navegador
   - Deve mostrar 3D parking visualization
   - Clicar em vagas deve atualizar em tempo real

3. **Validar ParkingSession**
   ```bash
   docker exec parking-mysql mysql -u parking -p'iot_admin_2026' parking_system \
     -e "SELECT * FROM parking_sessions ORDER BY entry_time DESC LIMIT 5;"
   ```

4. **Monitorar Logs**
   ```bash
   # Backend
   docker logs -f parking-backend

   # MQTT
   docker logs -f parking-mosquitto

   # Frontend
   docker logs -f parking-frontend
   ```

---

## 🔄 ATUALIZAR FIRMWARE (Se precisar fazer mudanças)

1. Editar código em `SmartParking_ESP32_IoT_MQTT_v3.ino`
2. `Sketch → Verify/Compile` (Ctrl+R)
3. `Sketch → Upload` (Ctrl+U)
4. Aguardar "Hard resetting via RTS pin..."
5. Serial Monitor mostrará novo boot

Não precisa desligar/religar ESP32. Arduino IDE faz reset automaticamente.

---

## 📞 SUPORTE

Se algo não funcionar:

**Problema: "Can't find ESP32 at /dev/ttyUSB0"**
- Executar: `ls /dev/tty*`
- Usar a porta correta em Tools → Port

**Problema: "COM port not found"** (Windows)
- Instalar driver CH340: https://bit.ly/ch340-driver

**Problema: "Compilation error"**
- Verificar se todas as bibliotecas estão instaladas
- Deletar `build` folder: `rm -rf ~/Arduino/build`

**Problema: "MQTT não conecta"**
- Verificar IP em #define MQTT_BROKER
- Verificar MQTT running: `docker ps | grep mosquitto`
- Verificar credenciais: `parking_iot` / `ParkingIot@2026`

---

## 📚 REFERÊNCIAS

- Documentação Arduino IDE: https://www.arduino.cc
- ESP32 Datasheet: https://www.espressif.com/en/products/socs/esp32
- MCP23017: https://ww1.microchip.com/en-US/product/mcp23017
- PubSubClient: https://github.com/knolleary/pubsub_client
- Adafruit MCP23017 Library: https://github.com/adafruit/Adafruit-MCP23017-Arduino-Library
