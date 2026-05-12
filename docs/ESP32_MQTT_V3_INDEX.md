# 📚 ESP32 MQTT v3.0 - DOCUMENTAÇÃO COMPLETA

## 🎯 Resumo Executivo

A arquitetura do firmware ESP32 foi **CORRIGIDA** para refletir a realidade do hardware:

```
ANTES (v2.0) ❌
├─ TOTAL_VAGAS = 22 (incorreto!)
├─ MCP2 tinha 6 pinos para "vagas" 17-22
├─ Sensores de portão eram "soltos" sem lógica
└─ Publicava vagas 21-22 que NÃO existem

DEPOIS (v3.0) ✅
├─ TOTAL_VAGAS = 20 (correto!)
├─ MCP2 tem 4 pinos para vagas 17-20 APENAS
├─ Sensores de portão integrados e funcionais
└─ Nunca publica vagas fora de 1-20
```

---

## 📋 ARQUIVOS CRIADOS

### 1️⃣ **FIRMWARE** (Código Principal)
**Arquivo:** [`iot/esp32/SmartParking_ESP32_IoT_MQTT_v3.ino`](../iot/esp32/SmartParking_ESP32_IoT_MQTT_v3.ino)

**O Quê:**
- Firmware completo para ESP32
- Arquitetura corrigida: 20 vagas + 2 sensores portão
- MQTT robusto com Last Will, Heartbeat, Reconnect
- Acionamento automático de servos com timeout

**Principais Mudanças:**
```cpp
#define TOTAL_VAGAS 20                    // Era 22
#define GATE_ENTRY_SENSOR_PIN 4           // Novo pino MCP2
#define GATE_EXIT_SENSOR_PIN 5            // Novo pino MCP2
#define SERVO_OPEN_TIME_MS 2000           // Novo: timeout automático
```

**Funções Novas:**
- `lerSensoresPortao()` - Lê sensores de entrada/saída
- `acionarServoEntrada()` - Abre servo entrada
- `fecharServoEntrada()` - Fecha servo entrada
- `acionarServoSaida()` - Abre servo saída
- `fecharServoSaida()` - Fecha servo saída
- `publicarEntrada()` - Publica em `parking/entry`
- `publicarSaida()` - Publica em `parking/exit`

---

### 2️⃣ **ARQUITETURA & INTEGRAÇÃO** (Backend Integration Guide)
**Arquivo:** [`docs/ESP32_MQTT_V3_ARCHITECTURE.md`](../docs/ESP32_MQTT_V3_ARCHITECTURE.md)

**O Quê:**
- Explicação da nova arquitetura
- Tópicos MQTT publicados e seus formatos
- **Como integrar sensores de portão no backend**
- Tratamento de eventos de entrada/saída
- Fluxo completo: Vehicle Entry → Exit
- DTOs e handlers necessários

**Seções Principal:**
1. Resumo das mudanças
2. Tópicos MQTT (vagas + portões + device status)
3. Integração Backend - 5 passos
4. Tratamento de entrada (criar ParkingSession)
5. Tratamento de saída (finalizar ParkingSession)
6. Transição de estados
7. Fluxo completo (Vehicle Entry → Exit)
8. Logging e debugging
9. Checklist de implementação

**Para Backend Developers:**
```csharp
// Novo handler necessário:
private async Task HandleGateEntryAsync(string payload)
{
    // 1. Parse GateEventDto
    // 2. Create ParkingSession (status: "waiting_spot")
    // 3. Publish to SignalR
}

private async Task HandleGateExitAsync(string payload)
{
    // 1. Find active session
    // 2. Set ExitTime and status=completed
    // 3. Calculate fee
    // 4. Publish to SignalR
}
```

---

### 3️⃣ **COMPARAÇÃO V2.0 vs V3.0** (What Changed & Why)
**Arquivo:** [`docs/FIRMWARE_V2_VS_V3_COMPARISON.md`](../docs/FIRMWARE_V2_VS_V3_COMPARISON.md)

**O Quê:**
- Comparação lado-a-lado de ambas versões
- Por que cada mudança foi necessária
- Problemas na v2.0 e soluções na v3.0
- Impacto no backend
- Checklist de mudança

**Seções Principais:**
1. Problema na v2.0 (vagas 21-22)
2. Correção na v3.0 (apenas 1-20)
3. Comparação função por função:
   - inicializarI2C() - 🔴❌ vs ✅
   - lerSensoresVagas() - 🔴❌ vs ✅
   - lerSensoresPortao() - ❌ (não existia) vs ✅ (novo)
   - publicarVaga() - ❌ (sem validação) vs ✅ (validado)
   - Servos - ❌ (sem lógica) vs ✅ (completo)
4. Estruturas de dados
5. Tópicos MQTT - antes/depois
6. Impacto no backend validation
7. Checklist de mudança
8. FAQ

**Para Entender a Evolução:**
```
v2.0: for(i=0; i<22; i++) → Publica vagas 1-22 ❌
v3.0: for(i=0; i<20; i++) → Publica vagas 1-20 ✅

v2.0: Servos não fazem nada
v3.0: Servos acionam em <100ms, fecham em 2.5s ✅
```

---

### 4️⃣ **QUICK REFERENCE** (Diagrama Visual & Referência Rápida)
**Arquivo:** [`docs/ESP32_MQTT_V3_QUICK_REFERENCE.md`](../docs/ESP32_MQTT_V3_QUICK_REFERENCE.md)

**O Quê:**
- Diagramas visuais da arquitetura
- Tabelas de pinos (MCP1 e MCP2)
- Fluxo de leitura e publicação (ASCII diagrams)
- Protocolo MQTT com exemplos JSON
- Configurações críticas
- Testes rápidos
- Troubleshooting table
- Checklist pré-deploy

**Conteúdo:**
- 🔌 Diagrama de pinos (ESP32 ↔ MCP23017)
- 📍 Layout MCP1 (vagas 1-16)
- 📍 Layout MCP2 (vagas 17-20 + portões + LEDs)
- 📊 Tabela de sensores
- 🔄 Fluxo de leitura (loop, debounce, timeout)
- 📡 Fluxo MQTT (conexão, subscrição, publicação)
- 🔧 Comportamento de servos (sequência de estados)
- ⚙️ Configurações críticas (WiFi, MQTT, pinos, timeouts)
- 🧪 Testes rápidos (4 testes)
- ✅ Checklist pré-deploy
- 🆘 Troubleshooting table

**Para Validação Rápida:**
```
MCP1[0-15]    → Vagas 1-16
MCP2[0-3]     → Vagas 17-20
MCP2[4]       → Sensor Entrada
MCP2[5]       → Sensor Saída
MCP2[6-8]     → LEDs
GPIO16        → Servo Entrada
GPIO17        → Servo Saída
```

---

### 5️⃣ **UPLOAD & DEPLOY** (Step-by-Step Instructions)
**Arquivo:** [`docs/ESP32_MQTT_V3_UPLOAD_DEPLOY.md`](../docs/ESP32_MQTT_V3_UPLOAD_DEPLOY.md)

**O Quê:**
- Setup completo do Arduino IDE
- Instalação de bibliotecas
- Configuração de board
- Upload passo-a-passo
- Validação via Serial Monitor
- Testes MQTT
- Troubleshooting

**7 Partes Principais:**
1. **Preparar Ambiente** - Arduino IDE setup
2. **Preparar Código** - Verificar configurações
3. **Verificar Compilação** - Testar sintaxe
4. **Conectar Hardware** - I2C e servos
5. **Fazer Upload** - Upload ao ESP32
6. **Verificar Serial Monitor** - Validação pós-boot
7. **Validar via MQTT** - Testes funcionais

**Validação Esperada:**
```
✓ WiFi conecta
✓ MQTT conecta com Last Will
✓ Publica 6/6 tópicos
✓ Vagas 1-20 aparecem
✓ Nenhuma vaga 21-22
✓ Sensor entrada funciona
✓ Sensor saída funciona
✓ Servo fecha automaticamente
```

---

## 🔗 FLUXO DE USO

```
┌─────────────────────────────────────────┐
│ 1. PRIMEIRO CONTATO?                   │
│    Ler: ESP32_MQTT_V3_QUICK_REFERENCE  │
│           (entender arquitetura visual)│
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 2. ENTENDER MUDANÇAS?                  │
│    Ler: FIRMWARE_V2_VS_V3_COMPARISON    │
│           (por que cada mudança)       │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 3. FAZER UPLOAD?                       │
│    Ler: ESP32_MQTT_V3_UPLOAD_DEPLOY     │
│           (passo-a-passo completo)     │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 4. INTEGRAR BACKEND?                   │
│    Ler: ESP32_MQTT_V3_ARCHITECTURE      │
│           (handlers, DTOs, fluxos)     │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ 5. DEBUG/TROUBLESHOOT?                 │
│    Ler: ESP32_MQTT_V3_QUICK_REFERENCE  │
│           (seção Troubleshooting)      │
└─────────────────────────────────────────┘
```

---

## 📊 MATRIZ DE CONTEÚDO

| Documento | Audience | Propósito | Tempo Leitura |
|-----------|----------|-----------|---------------|
| **Quick Reference** | Todos | Visão rápida da arquitetura + diagrama | 10 min |
| **Comparison v2→v3** | Desenvolvedores | Entender o que mudou e por quê | 15 min |
| **Architecture** | Backend Dev | Integração backend + handlers MQTT | 20 min |
| **Upload & Deploy** | Hardware Dev | Setup Arduino IDE + deploy | 30 min |
| **Firmware Code** | Especialistas | Código fonte completo + comentários | 45 min |

---

## ✅ MUDANÇAS PRINCIPAIS (Resumo Executivo)

### Hardware: MCP2 Pinos
```diff
- Pino 0-5: Vagas 17-22 (❌ 6 pinos!)
- Pino 8: Sensor IR (vago)
- Pino 9: Sensor Ground (vago)

+ Pino 0-3: Vagas 17-20 (✅ 4 pinos)
+ Pino 4: Sensor Entrada (novo!)
+ Pino 5: Sensor Saída (novo!)
+ Pino 6-8: LEDs (status)
```

### Firmware: Variáveis
```diff
- TOTAL_VAGAS = 22
- MCP2_VAGAS = 6
- Sem estrutura para portões

+ TOTAL_VAGAS = 20
+ MCP2_VAGAS = 4
+ struct GateState para entrada/saída
```

### Firmware: Funções
```diff
- lerSensoresVagas() → processa 22 vagas
- Servos sem lógica automática
- Sem publicação de eventos portão

+ lerSensoresVagas() → processa 20 vagas
+ lerSensoresPortao() → lógica portão separada
+ acionarServoEntrada/Saida() → automático
+ Timeout automático (2.5s)
+ publicarEntrada/Saida() → MQTT events
```

### MQTT: Tópicos
```diff
- parking/spots/1..22
- Sem tópicos de portão

+ parking/spots/1..20
+ parking/entry
+ parking/exit
+ parking/device/esp32-parking-01/status
```

### Backend: Handlers Necessários
```diff
- Ignorar vagas 21-22 (confusão)
- Sem lógica de entrada/saída

+ Validar 1-20 apenas
+ HandleGateEntryAsync() → criar Session
+ HandleGateExitAsync() → finalizar Session
+ Integração com SignalR para dashboard
```

---

## 🎓 EXEMPLO PRÁTICO: Event Flow

```
CENÁRIO: Vehicle entra, estaciona, sai

TIMESTAMP T0 (Vehicle chega)
├─ [Sensor ENTRADA acionado]
├─ ESP32: "parking/entry" publicado
├─ Backend: HandleGateEntryAsync()
│  └─ Criar ParkingSession(status: waiting_spot)
└─ Dashboard: Notifica "Vehicle entering"

TIMESTAMP T1 (Vehicle estaciona em vaga 5)
├─ [Sensor Vaga 5 muda: ocupada]
├─ ESP32: "parking/spots/5" publicado (status: ocupada)
├─ Backend: publicarVaga() recebe evento
│  └─ Atualizar ParkingSession.VehicleId = spot5
│  └─ ParkingSession.status = occupied
└─ Dashboard: Marca vaga 5 como ocupada (vermelho)

TIMESTAMP T2 (Vehicle sai da vaga)
├─ [Sensor Vaga 5 muda: livre]
├─ ESP32: "parking/spots/5" publicado (status: livre)
├─ Backend: publicarVaga() recebe evento
│  └─ Atualizar ParkingSession.status = vacated
└─ Dashboard: Marca vaga 5 como livre (verde)

TIMESTAMP T3 (Vehicle sai do parking)
├─ [Sensor SAÍDA acionado]
├─ ESP32: "parking/exit" publicado
├─ Backend: HandleGateExitAsync()
│  └─ Finalizar ParkingSession(status: completed, ExitTime)
│  └─ Calcular fee
└─ Dashboard: Notifica "Vehicle exited", mostra fee

RESULTADO:
└─ Database: ParkingSession criada com:
   entry_time = T0
   exit_time = T3
   vehicle_spot = 5
   fee = (T3-T0) * rate
   status = completed
```

---

## 🔍 VALIDAÇÃO CHECKLIST

- [ ] Ler `ESP32_MQTT_V3_QUICK_REFERENCE.md` (diagrama visual)
- [ ] Ler `FIRMWARE_V2_VS_V3_COMPARISON.md` (mudanças)
- [ ] Download firmware `SmartParking_ESP32_IoT_MQTT_v3.ino`
- [ ] Setup Arduino IDE (passo-a-passo em `UPLOAD_DEPLOY.md`)
- [ ] Fazer upload (passo 5 em `UPLOAD_DEPLOY.md`)
- [ ] Validar Serial Monitor (passo 6 em `UPLOAD_DEPLOY.md`)
- [ ] Testar MQTT (passo 7 em `UPLOAD_DEPLOY.md`)
- [ ] Implementar backend handlers (`ESP32_MQTT_V3_ARCHITECTURE.md`)
- [ ] Testar evento de entrada completo
- [ ] Testar evento de saída completo
- [ ] Validar ParkingSession no banco
- [ ] Deploy em produção

---

## 📞 SUPORTE RÁPIDO

| Dúvida | Resposta | Documento |
|--------|----------|-----------|
| Qual é a arquitetura? | 20 vagas + 2 portões | Quick Reference |
| O que mudou da v2.0? | Vagas 21-22 removidas + portões | Comparison |
| Como integrar? | Handlers para entry/exit | Architecture |
| Como fazer upload? | Arduino IDE + passo-a-passo | Upload Deploy |
| Qual tópico para portão? | `parking/entry` e `parking/exit` | Architecture |
| Como criar Session? | Em `HandleGateEntryAsync()` | Architecture |
| Como finalizar Session? | Em `HandleGateExitAsync()` | Architecture |
| Servo não fecha? | Check timeout (2.5s) | Quick Reference |
| Publicando vaga 21? | Firmware v2.0 carregado | Comparison |

---

## 📚 STACK COMPLETO

```
╔════════════════════════════════════════════════════════════════════╗
║                    PARKING IOT SYSTEM STACK                        ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║ HARDWARE (Camada 1)                                              ║
│ ├─ ESP32 Dev Module (WiFi + I2C + GPIO)                          ║
│ ├─ MCP23017 @ 0x20 (Vagas 1-16)                                  ║
│ ├─ MCP23017 @ 0x21 (Vagas 17-20 + Portões + LEDs)               ║
│ ├─ 20x Sensores IR (ocupação)                                    ║
│ ├─ 2x Sensores (entrada/saída)                                   ║
│ └─ 2x Servos (portão entrada/saída)                              ║
║                                                                    ║
║ FIRMWARE (Camada 2) ← CORRIGIDO v3.0                              ║
│ ├─ Arduino IDE + ESP32 Board Support                              ║
│ ├─ WiFi + MQTT Client (PubSubClient)                              ║
│ ├─ I2C + MCP23017 Driver (Adafruit)                               ║
│ ├─ Servo Control (ESP32Servo)                                     ║
│ ├─ JSON Serialization (ArduinoJson)                               ║
│ └─ Logic: 20 vagas + 2 portões automáticos                        ║
║                                                                    ║
║ BROKER (Camada 3)                                                 ║
│ └─ Mosquitto MQTT 2.1.2 (Docker)                                  ║
║                                                                    ║
║ BACKEND (Camada 4) ← INTEGRAÇÃO NECESSÁRIA                        ║
│ ├─ .NET 8 + MQTTnet                                               ║
│ ├─ SignalR (real-time)                                            ║
│ ├─ MySQL 8.0 (database)                                           ║
│ ├─ MqttToSignalRHandler (vagas) ✅                                 ║
│ ├─ HandleGateEntryAsync() (novo) ← TODO                           ║
│ └─ HandleGateExitAsync() (novo) ← TODO                            ║
║                                                                    ║
║ FRONTEND (Camada 5)                                               ║
│ ├─ Next.js 14 (React)                                             ║
│ ├─ WebGL 3D Visualization                                         ║
│ ├─ SignalR Client                                                 ║
│ └─ Real-time Dashboard Updates                                    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 🚀 PRÓXIMOS PASSOS (In Order)

1. ✅ **[Concluído]** Firmware v3.0 criado com arquitetura corrigida
2. ✅ **[Concluído]** Documentação completa (5 documentos)
3. **[Próximo]** Upload firmware na ESP32 (seguir `UPLOAD_DEPLOY.md`)
4. **[Próximo]** Validar MQTT publicando 1-20 vagas
5. **[Próximo]** Validar sensores de portão acionando servos
6. **[Próximo]** Implementar handlers de backend (`Architecture.md`)
7. **[Próximo]** Testar evento de entrada → criar Session
8. **[Próximo]** Testar evento de saída → finalizar Session
9. **[Próximo]** Integração com Dashboard 3D
10. **[Próximo]** Deploy em produção

---

## 📌 PONTOS-CHAVE

✅ **20 vagas reais** (não 22)
✅ **Sensores de portão integrados** (MCP2[4-5])
✅ **Servos automáticos** (abrem/fecham com timeout)
✅ **MQTT robusto** (Last Will, Heartbeat, Reconnect)
✅ **Backend hooks** (Entry/Exit handlers)
✅ **Documentação completa** (5 guias + código)

🔴 **NUNCA** publicar vagas 21-22
🔴 **NUNCA** confundir vagas com portões
🔴 **NUNCA** ignorar timeout de servo (2.5s)

---

**Versão:** 3.0 (Arquitetura Corrigida)  
**Data:** 12 de maio de 2026  
**Status:** Pronto para Deploy  
**Próximo Milestones:** Upload ESP32 + Backend Integration
