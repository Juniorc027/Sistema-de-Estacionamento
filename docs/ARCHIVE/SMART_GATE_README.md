# 🚪 Smart Gate Control — Controle Inteligente de Cancelas ESP32

## ✨ O que foi Entregue

**Código completo em C++ para ESP32** que controla **2 cancelas inteligentes** em seu sistema de estacionamento com:

✅ **Cancela de Entrada**: Abre SOMENTE se houver vagas disponíveis (sincroniza com DB)  
✅ **Cancela de Saída**: Abre automaticamente ao detectar carro  
✅ **Sensores IR**: Detectam presença de carros (via MCP23017)  
✅ **Servo Motors**: Controlam posição das cancelas (PWM nos pinos GPIO 18/19)  
✅ **MQTT**: Sincronização com Dashboard/Backend em tempo real  
✅ **Máquinas de Estado**: Lógica robusta e previsível  
✅ **Resilência**: Reconexão automática WiFi/MQTT  

---

## 📂 Arquivos Criados

### 📱 Código Principal

| Arquivo | Descrição |
|---------|-----------|
| **`iot/esp32/parking_controller_platformio/src/main.cpp`** | ⭐ **CÓDIGO PRINCIPAL** - Implemente este arquivo na ESP32 |

### 📚 Documentação

| Arquivo | Conteúdo |
|---------|----------|
| **`docs/SMART_GATE_CONTROL_GUIDE.md`** | 📖 **GUIA COMPLETO** - Arquitetura, fluxo de lógica, pinagem, como usar |
| **`docs/SMART_GATE_TEST_VALIDATION.md`** | 🧪 **TESTE E VALIDAÇÃO** - 10 fases de teste passo-a-passo |
| **`docs/SMART_GATE_BACKEND_INTEGRATION.md`** | 🔧 **INTEGRAÇÃO COM .NET 8** - Como conectar ao backend |
| **`iot/esp32/SMART_GATE_TESTS.ino`** | 🔬 **TESTES ISOLADOS** - 10 sketches para debugar componentes |

---

## 🚀 Quick Start (3 Passos)

### Passo 1️⃣ - Upload para ESP32

```bash
cd /home/junior/Documentos/coder/parking-iot-system/iot/esp32/parking_controller_platformio

# Upload
pio run --target upload

# Monitor
pio device monitor --baud 115200
```

### Passo 2️⃣ - Verificar Conexão

Esperado no Serial:
```
[WiFi] ✅ Conectado!
[MCP23017 #0] ✅ Detectado em 0x20
[MCP23017 #1] ✅ Detectado em 0x21
[MQTT] ✅ Conectado!
[Sistema] ✅ Pronto! Aguardando carros...
```

### Passo 3️⃣ - Testar Fluxo

```bash
# Terminal 1: Monitor MQTT
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v

# Terminal 2: Simular vagas
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" -m \
  '{"totalSpots":20,"occupiedSpots":15,"availableSpots":5}'

# Terminal 3: Ativar sensor IR entrada
# [Coloque objeto em frente ao sensor por 3 segundos]
# Esperado:
#   - Servo abre (0°)
#   - Aguarda carro passar
#   - Servo fecha (90°)
#   - Publica "entry" no MQTT
```

---

## 🔌 Pinagem de Hardware

### Servo Motors
```
GPIO 18 → Servo Entrada (90°=fechado, 0°=aberto)
GPIO 19 → Servo Saída   (90°=fechado, 0°=aberto)
```

### Sensores IR
```
MCP1 Pino 6 → IR Entrada (LOW=carro, HIGH=livre)
MCP1 Pino 7 → IR Saída   (LOW=carro, HIGH=livre)
```

### I2C
```
SDA: GPIO 21
SCL: GPIO 22

MCP0 (0x20): 16 sensores de vagas
MCP1 (0x21): 4 vagas + 2 IR gates
```

---

## 📡 Tópicos MQTT

### 📥 Entrada (ESP32 Recebe)

```
parking/spots/snapshot

Payload:
{
  "totalSpots": 20,
  "occupiedSpots": 15,
  "availableSpots": 5
}
```

### 📤 Saída (ESP32 Publica)

```
parking/entry      → Quando carro passa na entrada
parking/exit       → Quando carro passa na saída
parking/device/status → Heartbeat a cada 15s
```

---

## 🧪 Como Testar

### Fase 1: Teste de Hardware
```bash
# Use os sketches isolados em: iot/esp32/SMART_GATE_TESTS.ino
# Descomente um teste de cada vez
# Valide I2C, Sensores IR, Servo Motors, WiFi, MQTT
```

### Fase 2: Teste de Integração
```bash
# Siga o guia: docs/SMART_GATE_TEST_VALIDATION.md
# 10 fases completas com checklist
```

### Fase 3: Integração com Backend
```bash
# Siga o guia: docs/SMART_GATE_BACKEND_INTEGRATION.md
# Implemente handlers CQRS e SignalR
```

---

## 🔄 Fluxo de Lógica

### Entrada (Com Verificação Inteligente)

```
IR Detecta Carro
    ↓
Verifica: vagasLivres > 0?
    ├─ SIM: Abre cancela (0°)
    │       Aguarda carro passar
    │       Fecha cancela (90°) após 2s
    │       Publica evento "entry"
    │
    └─ NÃO: Mantém fechada (90°)
            Serial: "Estacionamento Lotado"
```

### Saída (Fluxo Livre)

```
IR Detecta Carro
    ↓
Abre cancela (0°) imediatamente
    ↓
Aguarda carro passar
    ↓
Fecha cancela (90°) após 2s
    ↓
Publica evento "exit"
```

---

## 📊 Estados da Máquina

| Valor | Estado | Significado |
|-------|--------|-------------|
| 0 | IDLE | Aguardando carro |
| 1 | CAR_DETECTED | Carro detectado |
| 2 | OPENING | Abrindo servo (500ms) |
| 3 | OPEN | Servo aberto |
| 4 | WAITING_CAR_PASS | Esperando carro passar |
| 5 | CLOSING | Fechando servo (500ms) |
| 6 | CLOSED | Servo fechado |
| 7 | BLOCKED | Entrada lotada (somente Entrada) |

---

## 📖 Documentação em Detalhes

### Para Implementar

👉 **Comece aqui:** `docs/SMART_GATE_CONTROL_GUIDE.md`
- Explicação completa da arquitetura
- Fluxos de lógica passo-a-passo
- Pinagem de hardware
- MQTT topics
- Como fazer upload e monitorar

### Para Testar

👉 **Leia:** `docs/SMART_GATE_TEST_VALIDATION.md`
- 10 fases de teste
- Como validar cada componente
- Matriz de teste resumida
- Critérios de sucesso
- Comandos úteis para debug

### Para Integrar com Backend

👉 **Implemente:** `docs/SMART_GATE_BACKEND_INTEGRATION.md`
- Integração .NET 8
- MQTT handlers
- CQRS commands
- SignalR hub
- Endpoints da API

### Para Debugar Componentes

👉 **Use:** `iot/esp32/SMART_GATE_TESTS.ino`
- 10 sketches isolados
- Teste cada módulo separadamente
- Diagnóstico de problemas

---

## ⚙️ Configuração

### WiFi

```cpp
// include/Config.h
static const char* WIFI_SSID = "SEU_SSID";
static const char* WIFI_PASSWORD = "SUA_SENHA";
```

### MQTT

```cpp
static const char* MQTT_BROKER = "192.168.0.10";  // IP do seu broker
static const int MQTT_PORT = 1883;
```

### Parking Lot ID

```cpp
static const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";
```

---

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| ESP32 não conecta WiFi | Verificar SSID/senha em `Config.h` |
| MQTT não conecta | Verificar IP broker e porta 1883 aberta |
| Servo não se move | Verificar alimentação (5V, 2A) e GPIO 18/19 |
| Sensores IR não detectam | Testar com sketch isolado, verificar I2C |
| Sem eventos no MQTT | Monitorar com `mosquitto_sub`, verificar lógica |

**Mais detalhes em:** `docs/SMART_GATE_CONTROL_GUIDE.md` → Troubleshooting

---

## 📋 Checklist de Implementação

### Pré-requisitos
- [ ] ESP32 Dev Board
- [ ] 2x Servo Motors (SG90 ou similar)
- [ ] 2x Sensores IR (ativo-baixo)
- [ ] 2x MCP23017 I2C Expander
- [ ] Mosquitto MQTT Broker
- [ ] Backend .NET 8

### Implementação
- [ ] Upload `main.cpp` para ESP32
- [ ] Verificar Serial output
- [ ] Testar MQTT connectivity
- [ ] Validar sensores IR
- [ ] Validar servo motors
- [ ] Testar fluxo entrada (com vagas)
- [ ] Testar fluxo entrada (sem vagas)
- [ ] Testar fluxo saída
- [ ] Integrar com Backend
- [ ] Verificar Dashboard real-time

### Deployment
- [ ] Código em produção
- [ ] MQTT broker rodando
- [ ] Backend processando eventos
- [ ] Dashboard atualizando live
- [ ] Testes de carga/stress passando

---

## 💡 Features Extras (Opcional)

### Adicionar LED Status
```cpp
// Pisca verde/vermelho indicando status MQTT
const int LED_PIN = 5;
```

### Adicionar Buzzer
```cpp
// Som ao abrir/fechar cancelas ou quando lotado
const int BUZZER_PIN = 12;
```

### Adicionar Display LCD
```cpp
// Mostrar: Vagas disponíveis, Status WiFi/MQTT
// Biblioteca: LiquidCrystal_I2C
```

---

## 📞 Suporte

### Se algo não funcionar:

1. **Verificar Logs**: `pio device monitor --baud 115200`
2. **Testar Hardware**: Use sketches isolados em `SMART_GATE_TESTS.ino`
3. **Consultar Guia**: `SMART_GATE_CONTROL_GUIDE.md` → Seção Troubleshooting
4. **Validar Conexões**: I2C (0x20/0x21), PWM (GPIO 18/19), WiFi, MQTT

---

## 📦 Estrutura de Arquivos

```
parking-iot-system/
├── iot/esp32/
│   ├── parking_controller_platformio/
│   │   ├── include/
│   │   │   ├── Config.h          ⚙️ Configuração WiFi/MQTT
│   │   │   └── ParkingConfig.h   ⚙️ Configuração Hardware
│   │   ├── src/
│   │   │   └── main.cpp          ⭐ CÓDIGO PRINCIPAL
│   │   └── platformio.ini        ⚙️ Dependências
│   └── SMART_GATE_TESTS.ino      🔬 Testes Isolados
│
├── docs/
│   ├── SMART_GATE_CONTROL_GUIDE.md          📖 Guia Completo
│   ├── SMART_GATE_TEST_VALIDATION.md        🧪 Teste & Validação
│   └── SMART_GATE_BACKEND_INTEGRATION.md    🔧 Integração .NET
│
└── README.md                                  📝 Este arquivo
```

---

## 🎯 Próximos Passos

1. **Ler** `docs/SMART_GATE_CONTROL_GUIDE.md` (5-10 min)
2. **Fazer Upload** do código para ESP32 (2 min)
3. **Monitorar** Serial para verificar boot (1 min)
4. **Testar** seguindo `docs/SMART_GATE_TEST_VALIDATION.md` (30-60 min)
5. **Integrar** com Backend usando `docs/SMART_GATE_BACKEND_INTEGRATION.md` (1-2 horas)

---

## ✅ Status

| Componente | Status |
|-----------|--------|
| Código Principal | ✅ **Pronto** |
| Documentação | ✅ **Completa** |
| Testes Isolados | ✅ **Disponível** |
| Backend Integration | ✅ **Documentado** |
| Troubleshooting | ✅ **Incluído** |

---

## 📝 Versão & Data

**Versão:** 1.0  
**Data:** Maio de 2026  
**Desenvolvido por:** GitHub Copilot - Smart Parking System  

---

## 🙏 Obrigado!

Este código foi desenvolvido com atenção a cada detalhe para garantir:
- ✨ Funcionamento robusto
- 🔧 Fácil manutenção
- 📚 Documentação completa
- 🧪 Testes abrangentes
- 🔌 Integração perfeita

**Boa sorte com seu projeto de estacionamento inteligente! 🚗🚪**

---

**Precisa de ajuda?** Consulte a documentação acima ou revise a seção de Troubleshooting em `SMART_GATE_CONTROL_GUIDE.md`.
