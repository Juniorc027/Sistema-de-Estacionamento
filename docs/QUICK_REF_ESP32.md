# ⚡ QUICK REFERENCE — Smart Parking ESP32

## 📄 ARQUIVO PRINCIPAL
**Localização:** `iot/esp32/SmartParking_Complete.ino`

---

## 🚀 INSTALAÇÃO RÁPIDA (5 MINUTOS)

### 1. Arduino IDE
```
Tools → Board → ESP32 → ESP32 Dev Module
Tools → Port → COM3 (ajuste conforme sua porta)
```

### 2. Bibliotecas (instale via Library Manager)
```
- PubSubClient
- Adafruit_MCP23X17
- ESP32Servo
- ArduinoJson
```

### 3. Upload
```
Sketch → Upload (ou Ctrl+U)
```

### 4. Serial Monitor
```
115200 baud
Esperado: "✅ SISTEMA PRONTO — Monitorando..."
```

---

## 🔧 CONFIGURAÇÃO (AJUSTE ANTES DO UPLOAD)

Abra `SmartParking_Complete.ino` e localize:

```cpp
#define WIFI_SSID       "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD   "03012006Ju"
#define MQTT_BROKER     "192.168.15.177"
#define MQTT_PORT       1884
#define MQTT_USERNAME   "parking_iot"
#define MQTT_PASSWORD   "ParkingIot@2026"
```

---

## 📌 PINOS (NÃO ALTERE)

```
I2C:
├─ SDA: GPIO 21
└─ SCL: GPIO 22

SERVOS:
├─ Entrada: GPIO 18
└─ Saída: GPIO 19

MCPs (via I2C):
├─ MCP#0: 0x20 (Vagas 1-16)
├─ MCP#1: 0x21 (Vagas 17-20 + Sensores)
├─ Sensor IR Entrada: MCP#1, Pino 6
└─ Sensor IR Saída: MCP#1, Pino 7
```

---

## 🧪 TESTES RÁPIDOS

### Teste Conexão MQTT
```bash
chmod +x scripts/esp32-quick-test.sh
./scripts/esp32-quick-test.sh
# Menu: opção 1
```

### Teste Entrada de Carro
```bash
./scripts/esp32-quick-test.sh
# Menu: opção 5
# Esperado: [ENTRADA] 🚗 Carro detectado!
```

### Teste Saída de Carro
```bash
./scripts/esp32-quick-test.sh
# Menu: opção 6
# Esperado: [SAÍDA] 🚗 Carro detectado!
```

---

## 📊 FLUXO DE DADOS

```
ESP32 Hardware:
  ├─ Sensores IR (MCP)
  │  └─ Publicar: parking/spots/{id}
  ├─ Servo Entrada
  │  └─ Publicar: parking/events/entry
  └─ Servo Saída
     └─ Publicar: parking/events/exit

Backend (MQTT):
  ├─ Subscribe: parking/config/spots
  │  └─ Recebe: {"availableSpots": N}
  └─ Atualiza variável: vagasDisponiveis
```

---

## 🚨 ERROS COMUNS & SOLUÇÕES

| Erro | Solução |
|------|---------|
| `MCP#0 não encontrado` | Verifique I2C (SDA/SCL/VCC/GND) |
| `MQTT não conecta` | Verifique IP broker + credenciais |
| `Servo não se move` | Confirme GPIO 18/19 + alimentação +5V |
| `Vaga sempre ocupada` | Mude `SENSOR_ACTIVE_LOW = false` |
| `Serial Monitor vazio` | Altere baudrate para 115200 |

---

## 📡 TÓPICOS MQTT

| Direção | Tópico | Estrutura |
|---------|--------|-----------|
| ESP32 → Backend | `parking/spots/{id}` | `{"vagaId": 1, "occupied": true, ...}` |
| ESP32 → Backend | `parking/events/entry` | `{"event": "entry", ...}` |
| ESP32 → Backend | `parking/events/exit` | `{"event": "exit", ...}` |
| Backend → ESP32 | `parking/config/spots` | `{"availableSpots": 10}` |

---

## ✅ CHECKLIST PRÉ-PRODUÇÃO

- [ ] Arquivo `SmartParking_Complete.ino` compilando sem erros
- [ ] Serial Monitor mostra "✅ SISTEMA PRONTO"
- [ ] WiFi conecta automaticamente
- [ ] MQTT conecta ao broker
- [ ] Sensores de vaga respondem ao movimento
- [ ] Servos se movem (entrada abre, saída abre)
- [ ] Eventos publicados em MQTT (teste com `esp32-quick-test.sh`)
- [ ] Backend recebe e processa mensagens

---

## 📖 DOCUMENTAÇÃO COMPLETA

- [ESP32_SETUP_GUIDE.md](ESP32_SETUP_GUIDE.md) — Guia detalhado
- [ESP32_PINAGEM.md](ESP32_PINAGEM.md) — Diagrama de pinos
- [SmartParking_Complete.ino](../iot/esp32/SmartParking_Complete.ino) — Código fonte

---

## 🆘 SUPORTE RÁPIDO

### Nenhum log no Serial Monitor?
```
1. Verifique: Tools → Port (selecione a porta USB)
2. Verifique: Tools → Board (ESP32 Dev Module)
3. Verifique: Baud rate = 115200
4. Resete a placa (botão RESET)
```

### WiFi conecta mas MQTT não?
```
1. Teste ping do broker: ping 192.168.15.177
2. Teste credenciais com MQTT Explorer
3. Verifique firewall da máquina
```

### Servo tremendo?
```
1. Use fonte +5V dedicada (não USB)
2. Adicione capacitor 100µF entre +5V e GND
3. Verifique comprimento dos fios servo
```

---

## 🔗 LINKS ÚTEIS

- [Documentação PubSubClient](https://pubsubclient.knolleary.net/)
- [Datasheet MCP23017](https://ww1.microchip.com/en-US/product/MCP23017)
- [ESP32 GPIO Reference](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/)
- [MQTT Explorer](http://mqtt-explorer.com/) — Ferramenta teste visual

---

## 💡 DICAS IMPORTANTES

1. **Sempre verifique alimentação** — Servos precisam de +5V estável
2. **Use pull-ups I2C** — MCPs têm pull-ups, mas sensores podem precisar
3. **Debounce é crítico** — Sensores IR oscilam, por isso `DEBOUNCE_THRESHOLD = 3`
4. **Servo timeout = 3s** — Tempo máximo que servo fica aberto
5. **MQTT QoS = 1** — At Least Once (garante entrega)

---

## 📞 CONTATO

Se encontrar problemas:
1. Verifique [ESP32_SETUP_GUIDE.md](ESP32_SETUP_GUIDE.md) — Troubleshooting completo
2. Execute `scripts/esp32-quick-test.sh` — Teste cada componente
3. Monitore logs do backend — Verifique se mensagens chegam

---

**Versão:** 1.0  
**Data:** 11/05/2026  
**Status:** ✅ Pronto para Uso
