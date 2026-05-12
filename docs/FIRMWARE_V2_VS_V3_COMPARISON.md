# ESP32 Firmware - Comparação v2.0 vs v3.0 (Arquitetura Corrigida)

## 🔴 PROBLEMA NA v2.0

```cpp
// ❌ ERRADO: Tratava vagas 21 e 22 como vagas reais
#define TOTAL_VAGAS 22
#define MCP1_VAGAS 16
#define MCP2_VAGAS 6  // ← Aqui estava errado! Eram 6 pinos para vagas

// MCP2 pinos:
// 0-5: Vagas 17-22
// 8: Sensor IR (extra)
// 9: Sensor Ground (extra)
```

**Consequência:** ESP32 publicava `parking/spots/21` e `parking/spots/22` que nunca deveriam ser vagas!

---

## ✅ CORREÇÃO NA v3.0

```cpp
// ✅ CORRETO: 20 vagas reais apenas
#define TOTAL_VAGAS 20
#define MCP1_VAGAS 16
#define MCP2_VAGAS 4  // ← Apenas 4 pinos para vagas 17-20

// MCP2 pino layout CORRETO:
// Pino 0-3:   Vagas 17-20 (sensores de ocupação)
// Pino 4:     Sensor ENTRADA (gate entry detection)
// Pino 5:     Sensor SAÍDA (gate exit detection)
// Pino 6-8:   LEDs de status (disponível, ocupado, erro)
```

**Ganho:** 
- Apenas 20 vagas publicadas em MQTT
- Sensores de portão agora integrados e usáveis
- Acionamento automático de servos

---

## 📊 Comparação Função por Função

### 1. INICIALIZAÇÃO I2C

#### v2.0 (❌ Errado)
```cpp
void inicializarI2C() {
  // ...
  // MCP1: vagas 1-16
  for (int i = 0; i < 16; i++) {
    mcp1.pinMode(i, INPUT);
    vagas[i].ocupada = false;
  }
  
  // MCP2: vagas 17-22 (❌ TOO MANY!)
  for (int i = 0; i < 6; i++) {  // ← 6 pinos! 
    mcp2.pinMode(i, INPUT);
    vagas[MCP1_VAGAS + i].ocupada = false;  // vagas 17-22
  }
  
  // Pinos "extras" (sem uso claro)
  mcp2.pinMode(LED_DISPONIVEL_PIN + 3, OUTPUT);  // pino 8 ou 9?
  mcp2.pinMode(LED_OCUPADO_PIN + 3, OUTPUT);
  mcp2.pinMode(LED_ERRO_PIN + 3, OUTPUT);
}
```

#### v3.0 (✅ Correto)
```cpp
void inicializarI2C() {
  // ...
  // MCP1: vagas 1-16
  for (int i = 0; i < 16; i++) {
    mcp1.pinMode(i, INPUT);
    vagas[i].ocupada = false;
  }
  
  // MCP2: APENAS vagas 17-20 (4 pinos)
  for (int i = 0; i < 4; i++) {  // ← 4 pinos apenas
    mcp2.pinMode(i, INPUT);
    vagas[MCP1_VAGAS + i].ocupada = false;  // vagas 17-20
  }
  
  // Sensores de portão (NOVO!)
  mcp2.pinMode(GATE_ENTRY_SENSOR_PIN, INPUT);    // Pino 4
  mcp2.pinMode(GATE_EXIT_SENSOR_PIN, INPUT);     // Pino 5
  
  // LEDs definidos claramente
  mcp2.pinMode(LED_DISPONIVEL_PIN, OUTPUT);   // Pino 6
  mcp2.pinMode(LED_OCUPADO_PIN, OUTPUT);      // Pino 7
  mcp2.pinMode(LED_ERRO_PIN, OUTPUT);         // Pino 8
}
```

---

### 2. LEITURA DE SENSORES

#### v2.0 (❌ Tudo junto)
```cpp
void lerSensoresVagas() {
  // Lia TODAS as 22 vagas em um loop
  for (int i = 0; i < TOTAL_VAGAS; i++) {  // 22 iterações!
    // ...lógica de debounce e publicação
  }
  
  // Sensores de portão? Não faziam nada claro
  // Estavam lá como pinos 8 e 9 mas sem lógica
}
```

#### v3.0 (✅ Separado e Lógico)
```cpp
// Função 1: Apenas vagas (1-20)
void lerSensoresVagas() {
  for (int i = 0; i < TOTAL_VAGAS; i++) {  // 20 iterações
    // ...lógica de ocupação
    uint8_t vagaNum = i + 1;  // 1-20
    publicarVaga(vagaNum, vaga->ocupada);
  }
}

// Função 2: NOVA - Sensores de portão separados
void lerSensoresPortao() {
  // Sensor ENTRADA
  bool sensorEntradaAtual = mcp2.digitalRead(GATE_ENTRY_SENSOR_PIN);
  if (sensorEntradaAtual && !gateEntry.sensorAtivo) {
    acionarServoEntrada();  // Abre servo entrada
  }
  
  // Timeout automático
  if (gateEntry.servoAcionado && tempo_decorrido > SERVO_OPEN_TIME_MS) {
    fecharServoEntrada();  // Fecha servo entrada
  }
  
  // Sensor SAÍDA (mesmo padrão)
  bool sensorSaidaAtual = mcp2.digitalRead(GATE_EXIT_SENSOR_PIN);
  if (sensorSaidaAtual && !gateExit.sensorAtivo) {
    acionarServoSaida();  // Abre servo saída
  }
  
  // Timeout automático
  if (gateExit.servoAcionado && tempo_decorrido > SERVO_OPEN_TIME_MS) {
    fecharServoSaida();  // Fecha servo saída
  }
}
```

---

### 3. PUBLICAÇÃO MQTT

#### v2.0 (❌ Publica 22 vagas)
```cpp
void publicarVaga(uint8_t vagaId, bool ocupada) {
  char topico[64];
  snprintf(topico, sizeof(topico), "parking/spots/%d", vagaId);
  
  // Publica vagaId 1-22 (❌ VAGAS 21-22 FAKE!)
  // Backend recebe e não sabe que não devem existir
}

// No loop principal:
lerSensoresVagas();  // Publicaria vagas 1-22
```

#### v3.0 (✅ Publica apenas 20 + portões)
```cpp
void publicarVaga(uint8_t vagaId, bool ocupada) {
  // Validação: NUNCA publicar vagas inválidas
  if (vagaId < 1 || vagaId > TOTAL_VAGAS) {
    Serial.println("[VAGA] ERROR - ID inválida: " + String(vagaId));
    return;  // ← Segurança!
  }
  
  char topico[64];
  snprintf(topico, sizeof(topico), "parking/spots/%d", vagaId);
  // Publica apenas 1-20
}

// NOVO: Publicar eventos de portão
void publicarEntrada() {
  // Publica em "parking/entry"
  // Evento separado, não vaga
}

void publicarSaida() {
  // Publica em "parking/exit"
  // Evento separado, não vaga
}

// No loop principal:
lerSensoresVagas();   // Apenas 1-20
lerSensoresPortao();  // Portões separados
```

---

### 4. ESTRUTURAS DE DADOS

#### v2.0 (❌)
```cpp
VagaState vagas[TOTAL_VAGAS];  // 22 elementos
// Mas alguns não eram vagas reais (21-22)

// Não havia estrutura para portões
// Sensores de portão eram pinos "soltos"
```

#### v3.0 (✅)
```cpp
VagaState vagas[TOTAL_VAGAS];     // Exatamente 20 elementos
GateState gateEntry;               // Novo: controla portão entrada
GateState gateExit;                // Novo: controla portão saída

struct GateState {
  bool sensorAtivo;
  unsigned long ultimaAtivacao;
  uint8_t estabilizacao;
  bool servoAcionado;              // Track se servo está aberto
  unsigned long tempoAcaoServos;   // Para timeout automático
};
```

---

### 5. SERVOS

#### v2.0 (❌ Sem Lógica de Portão)
```cpp
void inicializarServos() {
  servoEntry.attach(SERVO_GATE_ENTRY_PIN);
  servoExit.attach(SERVO_GATE_EXIT_PIN);
  servoEntry.write(0);
  servoExit.write(0);
  // ...depois nunca era usado
}

// No loop, nada acontecia com servos
void loop() {
  // ...
  // Servos não eram acionados automaticamente
}
```

#### v3.0 (✅ Lógica Completa)
```cpp
#define SERVO_OPEN_ANGLE 90
#define SERVO_CLOSED_ANGLE 0
#define SERVO_OPEN_TIME_MS 2000       // Porta fica aberta por 2s
#define SERVO_CLOSE_DELAY_MS 500      // +500ms antes de fechar

void acionarServoEntrada() {
  Serial.println("[SERVO ENTRADA] Abrindo portao entrada...");
  servoEntry.write(SERVO_OPEN_ANGLE);
  gateEntry.servoAcionado = true;
  gateEntry.tempoAcaoServos = millis();
  publicarEntrada();  // MQTT event
}

void fecharServoEntrada() {
  Serial.println("[SERVO ENTRADA] Fechando portao entrada...");
  servoEntry.write(SERVO_CLOSED_ANGLE);
  gateEntry.servoAcionado = false;
}

// No loop:
void loop() {
  lerSensoresVagas();    // 20 vagas
  lerSensoresPortao();   // Detecta sensor → aciona servo automaticamente
  // Timeout automático fecha servo após 2s
}
```

---

## 📈 Tópicos MQTT - Antes vs Depois

### v2.0 (❌ Incorreto)
```
parking/spots/1  ← OK
parking/spots/2  ← OK
...
parking/spots/20 ← OK
parking/spots/21 ← ❌ FAKE! Não deveria existir
parking/spots/22 ← ❌ FAKE! Não deveria existir

(sensores de portão não tinham tópicos claros)
```

### v3.0 (✅ Correto)
```
parking/spots/1  ← OK (20 vagas apenas)
parking/spots/2  ← OK
...
parking/spots/20 ← OK

parking/entry    ← NOVO! Evento de entrada
parking/exit     ← NOVO! Evento de saída

(sem vagas fake)
```

---

## 🎯 Impacto na Validação Backend

### v2.0 Backend (❌ Confuso)
```csharp
// Backend recebe:
// parking/spots/21 e parking/spots/22
// Mas só tem 20 vagas no banco!

int vagaId = json["vagaId"].ToInt32();  // 21 ou 22
var spot = await _context.ParkingSpots
    .FirstOrDefaultAsync(s => s.SpotNumber == vagaId);
    
// spot é NULL! 
// Mensagem é IGNORADA ou gera ERRO
```

### v3.0 Backend (✅ Validado)
```csharp
// Backend recebe APENAS 1-20
// Se receber 21+, é BUG na ESP32

int vagaId = json["vagaId"].ToInt32();  // Sempre 1-20
var spot = await _context.ParkingSpots
    .FirstOrDefaultAsync(s => s.SpotNumber == vagaId);
    
// spot sempre encontrado (se setup correto)
// Validação: if (vagaId < 1 || vagaId > 20) throw;

// Sensores de portão tratados separado:
if (topic == "parking/entry")
{
    await HandleGateEntryAsync(payload);
}
```

---

## 📋 Checklist de Mudança

### Hardware
- [ ] Verificar MCP2 pinos 4-5 têm sensores de portão conectados
- [ ] Verificar MCP2 pinos 0-3 têm sensores das vagas 17-20
- [ ] Verificar pinos 16-17 (ESP32) têm servos conectados

### Firmware
- [ ] Carregar v3.0 na ESP32
- [ ] Verificar serial output mostra "20 vagas" (não 22)
- [ ] Testar leitura de vaga publicando apenas 1-20
- [ ] Testar sensores de portão publicam em `parking/entry` e `parking/exit`

### Backend
- [ ] Remover qualquer validação que aceita vagaId > 20
- [ ] Implementar handler para `parking/entry` e `parking/exit`
- [ ] Testar criar ParkingSession ao receber entry event

### Testes
- [ ] Publicar vaga 1-20: ✅ Backend recebe
- [ ] Publicar vaga 21: ✅ Backend ignora (segurança)
- [ ] Acionar sensor entrada: ✅ Servo abre + MQTT event
- [ ] Acionar sensor saída: ✅ Servo abre + MQTT event
- [ ] Aguardar timeout: ✅ Servo fecha automaticamente

---

## 🚀 Deploy

```bash
# 1. Carregar firmware v3.0
# Arduino IDE -> Sketch -> Upload para ESP32

# 2. Verificar logs
# Conexão serial (9600 baud)
# Deve mostrar: "20 vagas" e sensores de portão funcionando

# 3. Testar MQTT
docker exec parking-mosquitto mosquitto_sub \
  -h localhost -p 1883 -u parking_iot -P 'ParkingIot@2026' \
  -t 'parking/#' -v
  
# Deve ver:
# parking/spots/1 através parking/spots/20 (ocupação)
# parking/entry (quando sensor acionado)
# parking/exit (quando sensor acionado)
```

---

## ❓ FAQ

**P: Posso voltar pra v2.0?**
R: Não recomendo. v2.0 tem vagas fake (21-22). v3.0 é correto.

**P: E se meu hardware tem diferentes pinos?**
R: Edite os defines no topo do firmware v3.0:
```cpp
#define GATE_ENTRY_SENSOR_PIN 4  // Mudar para seu pino
#define GATE_EXIT_SENSOR_PIN 5   // Mudar para seu pino
```

**P: Servos não fecham sozinhos?**
R: Fecham após `SERVO_OPEN_TIME_MS + SERVO_CLOSE_DELAY_MS` (2.5s total)

**P: Preciso validar vagas no backend agora?**
R: Sim! Adicione:
```csharp
if (vagaId < 1 || vagaId > 20) 
    throw new InvalidOperationException("Invalid spot ID");
```

**P: Como fazer billing de entrada/saída?**
R: Veja `ESP32_MQTT_V3_ARCHITECTURE.md` - seção "Tratamento de Saída"
