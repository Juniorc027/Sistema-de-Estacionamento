# Smart Gate Control — Guia de Teste e Validação

## 🧪 Checklist de Validação

Este guia ajuda a validar cada componente do sistema de cancelas inteligentes.

---

## ✅ Fase 1: Verificações Básicas de Hardware

### 1.1 Verificar Alimentação

```
□ ESP32: LED azul piscando (indica que está ligado)
□ Servo Entrada: Luz vermelha (standby)
□ Servo Saída: Luz vermelha (standby)
□ MCP23017 #0: LED piscando
□ MCP23017 #1: LED piscando
```

### 1.2 Verificar Conexões I2C

```bash
# Terminal na máquina com ESP32 conectada
i2cdetect -y 1

# Saída esperada:
#      0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
# 00:                         -- -- -- -- -- -- -- -- 
# 10:                         -- -- -- -- -- -- -- -- 
# 20: 20 -- -- -- -- -- -- -- 21 -- -- -- -- -- -- -- 
# 30:                         -- -- -- -- -- -- -- -- 
# 40:                         -- -- -- -- -- -- -- -- 
# 50:                         -- -- -- -- -- -- -- -- 
# 60:                         -- -- -- -- -- -- -- -- 
# 70:                         -- -- -- -- -- -- -- --

# 0x20 = MCP0 ✅
# 0x21 = MCP1 ✅
```

### 1.3 Verificar PWM (Servo Motors)

```bash
# Conectar osciloscópio ou analisador lógico nos pinos PWM
# GPIO 18 (Entrada) e GPIO 19 (Saída)

# Esperado:
# - Frequência: ~50 Hz (período 20ms)
# - Duty Cycle 0°: ~1ms (5% duty)
# - Duty Cycle 90°: ~1.5ms (7.5% duty)
```

---

## ✅ Fase 2: Teste Serial

### 2.1 Upload e Monitor

```bash
cd /home/junior/Documentos/coder/parking-iot-system/iot/esp32/parking_controller_platformio

# Upload
pio run --target upload

# Monitor (força reinicialização automática)
pio device monitor --baud 115200

# Esperado no Serial:
# ════════════════════════════════════════════════
#    Parking System — Smart Gate Control
#    ESP32 + 2 Servo Gates + IR Sensors
# ════════════════════════════════════════════════
# 
# [WiFi] Conectando a: VIVOFIBRA-WIFI6-E9D8
# ...
# [WiFi] ✅ Conectado!
# [WiFi] IP: 192.168.0.XXX
```

### 2.2 Verificar Inicialização

```
✅ [I2C] Inicializando...
✅ [MCP23017 #0] ✅ Detectado em 0x20
✅ [MCP23017 #1] ✅ Detectado em 0x21
✅ [Sensores IR] ✅ Configurados (MCP2: pinos 6 e 7)
✅ [Servo Motors] ✅ Configurados e fechados
✅ [MQTT] ✅ Conectado!
✅ [MQTT] Inscrito em: parking/spots/snapshot
✅ [Sistema] ✅ Pronto! Aguardando carros...
```

**Se falhar:**
- MCP23017 não detectado → Verificar conexão I2C (SDA=GPIO21, SCL=GPIO22)
- WiFi não conecta → Verificar SSID/senha em `Config.h`
- MQTT não conecta → Verificar IP do broker, firewall porta 1883

---

## ✅ Fase 3: Teste MQTT

### 3.1 Monitor de Todos os Tópicos

**Terminal 1:**
```bash
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v

# Esperado (a cada 15s):
# parking/device/status {"deviceId":"esp32-parking-22",...}
```

### 3.2 Publicar Snapshot de Vagas

**Terminal 2:**
```bash
# Com 5 vagas livres
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" -m \
  '{"totalSpots":20,"occupiedSpots":15,"availableSpots":5}'

# Serial da ESP32 esperado:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# [MQTT RX] Tópico: parking/spots/snapshot
# [MQTT RX] Payload: {"totalSpots":20,"occupiedSpots":15,"availableSpots":5}
#   → Vagas Totais: 20 | Ocupadas: 15 | Livres: 5
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

✅ **Verificação:** ESP32 recebeu e parseou corretamente as vagas

### 3.3 Publicar Snapshot com Zero Vagas

**Terminal 2:**
```bash
# Estacionamento lotado
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" -m \
  '{"totalSpots":20,"occupiedSpots":20,"availableSpots":0}'
```

✅ **Verificação:** ESP32 atualiza `vagasLivres = 0`

---

## ✅ Fase 4: Teste de Sensores IR

### 4.1 Verificar Leitura Raw do IR (Entrada)

**Terminal 3 (novo terminal):**
```bash
# Coloque um objeto em frente ao sensor IR de entrada
# Aguarde 3 segundos
# Retire o objeto

# Serial da ESP32 esperado:
# [ENTRADA] 🚗 Carro detectado no sensor!
```

### 4.2 Verificar Leitura Raw do IR (Saída)

```bash
# Coloque um objeto em frente ao sensor IR de saída
# Aguarde 3 segundos
# Retire o objeto

# Serial da ESP32 esperado:
# [SAÍDA] 🚗 Carro detectado no sensor!
```

✅ **Ambos os sensores funcionam** → Próxima fase

---

## ✅ Fase 5: Teste de Servo Motors

### 5.1 Testar Atuação Manual

```cpp
// Adicionar este código temporariamente em setup() para teste
void setup() {
  // ... código existente ...
  
  // TESTE MANUAL - Comentar após validação
  while (true) {
    Serial.println("Testando servo entrada...");
    servoEntrada.write(0);   // Abre
    delay(2000);
    servoEntrada.write(90);  // Fecha
    delay(2000);
    
    Serial.println("Testando servo saída...");
    servoSaida.write(0);     // Abre
    delay(2000);
    servoSaida.write(90);    // Fecha
    delay(2000);
  }
}
```

**Esperado:**
- Servo Entrada se move entre 0° (aberto) e 90° (fechado)
- Servo Saída se move entre 0° (aberto) e 90° (fechado)

### 5.2 Verificar Feedback Físico

```
□ Servo Entrada: Barra se move suavemente para cima (0°) e para baixo (90°)
□ Servo Saída: Barra se move suavemente para cima (0°) e para baixo (90°)
□ Sem ruídos estranhos
□ Movimento consistente (não trava)
```

---

## ✅ Fase 6: Teste Integrado - Fluxo de Entrada

### 6.1 Cenário: Com Vagas Disponíveis

**Preparação:**

Terminal 1 (monitor MQTT):
```bash
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v
```

Terminal 2 (publicar snapshot):
```bash
# Publica 5 vagas livres
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" -m \
  '{"totalSpots":20,"occupiedSpots":15,"availableSpots":5}'
```

**Execução:**
1. Coloque objeto em frente ao IR de entrada por 3 segundos
2. Remova o objeto

**Serial esperado:**
```
[ENTRADA] 🚗 Carro detectado no sensor!
[ENTRADA] ✅ Vagas disponíveis. Abrindo cancela...
[SERVO] Entrada → 0° (ABERTA)
[ENTRADA] ✅ Carro passou. Esperando 2s antes de fechar...
[ENTRADA] 🔒 Fechando cancela...
[SERVO] Entrada → 90° (FECHADA)
[MQTT TX] parking/entry
```

**MQTT esperado:**
```
parking/device/status {"deviceId":"esp32-parking-22","entryGateState":0,...}
parking/entry {"parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","eventType":"entry",...}
```

✅ **Sucesso:** Cancela abriu, carro passou, cancela fechou, evento publicado

---

### 6.2 Cenário: SEM Vagas Disponíveis

**Preparação:**

```bash
# Publica 0 vagas livres (estacionamento lotado)
mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" -m \
  '{"totalSpots":20,"occupiedSpots":20,"availableSpots":0}'
```

**Execução:**
1. Coloque objeto em frente ao IR de entrada por 5 segundos
2. Remova o objeto

**Serial esperado:**
```
[ENTRADA] 🚗 Carro detectado no sensor!
[ENTRADA] ❌ Estacionamento LOTADO! Mantendo cancela fechada.
[Sensor ainda detectando...]
[ENTRADA] (Cancelado após 10s, volta a IDLE)
```

✅ **Sucesso:** Cancela permaneceu fechada (90°) por estar lotada

---

## ✅ Fase 7: Teste Integrado - Fluxo de Saída

### 7.1 Cenário: Saída Livre

**Preparação:**

Terminal 1 (monitor MQTT):
```bash
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v
```

**Execução:**
1. Coloque objeto em frente ao IR de saída por 3 segundos
2. Remova o objeto

**Serial esperado:**
```
[SAÍDA] 🚗 Carro detectado no sensor!
[SAÍDA] ✅ Abrindo cancela...
[SERVO] Saída → 0° (ABERTA)
[SAÍDA] ✅ Carro passou. Esperando 2s antes de fechar...
[SAÍDA] 🔒 Fechando cancela...
[SERVO] Saída → 90° (FECHADA)
[MQTT TX] parking/exit
```

**MQTT esperado:**
```
parking/exit {"parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","eventType":"exit",...}
```

✅ **Sucesso:** Cancela abriu, carro passou, cancela fechou, evento publicado

---

## ✅ Fase 8: Teste de Reconexão

### 8.1 WiFi Dropout

**Ação:**
1. Desligar roteador por 10 segundos
2. Ligar roteador novamente

**Serial esperado:**
```
[WiFi] Conexão perdida. Reconectando...
[WiFi] Conectando a: VIVOFIBRA-WIFI6-E9D8
...
[WiFi] ✅ Conectado!
```

✅ **Sucesso:** ESP32 reconectou automaticamente

### 8.2 MQTT Dropout

**Ação:**
1. Parar broker MQTT: `docker compose stop mqtt` (ou seu método)
2. Aguardar 10 segundos
3. Iniciar broker novamente

**Serial esperado:**
```
[MQTT] Conexão perdida. Reconectando...
[MQTT] Tentativa #1
[MQTT] ✅ Conectado!
[MQTT] Inscrito em: parking/spots/snapshot
```

✅ **Sucesso:** ESP32 reconectou ao MQTT

---

## ✅ Fase 9: Teste de Sincronização com Backend

### 9.1 Integração com API

**Requisito:** Backend publicando snapshots a cada 30s

```csharp
// Backend: Chamar a cada 30s
await _parkingSnapshotService.PublishSnapshotAsync(parkingLotId);
```

**Verificação no Serial:**
```
# A cada 30s, ESP32 deve receber e processar:
[MQTT RX] Tópico: parking/spots/snapshot
[MQTT RX] Payload: {...}
  → Vagas Totais: 20 | Ocupadas: X | Livres: Y
```

✅ **Sucesso:** Sincronização automática funcionando

### 9.2 Verificar Eventos no Backend

**Ação:**
1. Simular carro na entrada
2. Simular carro na saída

**Verificação na API:**
```csharp
// Debugar se eventos chegam
GET /api/v1/parking/{parkingLotId}/events

// Esperado:
[
  { "type": "entry", "timestamp": "2026-05-05T10:15:30Z" },
  { "type": "exit", "timestamp": "2026-05-05T10:16:45Z" }
]
```

✅ **Sucesso:** Backend recebeu eventos corretamente

---

## ✅ Fase 10: Teste de Carga/Stress

### 10.1 Múltiplas Ativações Rápidas

**Ação:**
1. Ativar IR entrada 5 vezes em sequência (com delay mínimo)
2. Ativar IR saída 5 vezes em sequência

**Verificação:**
```
□ Nenhuma crash ou reboot da ESP32
□ Todos os eventos publicados no MQTT
□ Serial mostra sequência correta de estados
□ WiFi/MQTT permanece conectado
```

### 10.2 MQTT Message Flood

**Ação:**
```bash
# Publicar snapshots a cada 100ms por 1 minuto
for i in {1..600}; do
  mosquitto_pub -h 192.168.0.10 -t "parking/spots/snapshot" -m \
    '{"totalSpots":20,"occupiedSpots":15,"availableSpots":5}'
  sleep 0.1
done
```

**Verificação:**
```
□ ESP32 não trava
□ Sem buffer overflow no Serial
□ Todos os eventos tratados
□ Sem perda de conectividade
```

---

## 📊 Matriz de Teste Resumida

| Fase | Componente | Status | Notas |
|------|-----------|--------|-------|
| 1 | Hardware | ☐ Pass | Verificar alimentação |
| 2 | I2C Bus | ☐ Pass | 0x20 e 0x21 detectados |
| 3 | WiFi | ☐ Pass | Conecta e reconecta |
| 4 | MQTT | ☐ Pass | Publish/Subscribe funciona |
| 5 | IR Entrada | ☐ Pass | Detecta obstáculos |
| 6 | IR Saída | ☐ Pass | Detecta obstáculos |
| 7 | Servo Entrada | ☐ Pass | Move 0-90° |
| 8 | Servo Saída | ☐ Pass | Move 0-90° |
| 9 | Fluxo Entrada (com vagas) | ☐ Pass | Abre e fecha |
| 10 | Fluxo Entrada (sem vagas) | ☐ Pass | Bloqueia |
| 11 | Fluxo Saída | ☐ Pass | Abre e fecha |
| 12 | Reconexão WiFi | ☐ Pass | Reconecta auto |
| 13 | Reconexão MQTT | ☐ Pass | Reconecta auto |
| 14 | Backend Integration | ☐ Pass | Eventos recebidos |
| 15 | Stress Test | ☐ Pass | Sem trava |

---

## 🎯 Critério de Sucesso

✅ **Sistema Aprovado quando:**
- Todas as 15 fases passam
- Serial não mostra erros críticos
- MQTT publica eventos corretamente
- Backend recebe e processa eventos
- Dashboard atualiza em tempo real

❌ **Se algo falhar:**
1. Verificar logs no Serial
2. Consultar seção **Troubleshooting** em `SMART_GATE_CONTROL_GUIDE.md`
3. Validar hardware e conexões
4. Testar cada módulo isoladamente

---

## 🔧 Comandos Úteis para Debug

```bash
# 1. Monitorar MQTT em tempo real (verbose)
mosquitto_sub -h 192.168.0.10 -t "parking/#" -v

# 2. Verificar conectividade I2C
i2cdetect -y 1

# 3. Testar conectividade MQTT
telnet 192.168.0.10 1883

# 4. Resetar ESP32
# (desconectar e reconectar USB, ou adicionar botão RESET)

# 5. Monitorar consumo de memória
# (adicionar em loop() ocasionalmente)
Serial.print("Heap livre: ");
Serial.println(ESP.getFreeHeap());

# 6. Listar portas seriais
ls -l /dev/ttyUSB* /dev/ttyACM*
```

---

## 📞 Suporte

Se encontrar problemas:
1. Consultar `SMART_GATE_CONTROL_GUIDE.md` - Seção **Troubleshooting**
2. Verificar logs do Serial (`pio device monitor`)
3. Validar hardware com testes isolados
4. Confirmar conectividade de rede (WiFi/MQTT)

**Data:** Maio de 2026  
**Versão:** 1.0
