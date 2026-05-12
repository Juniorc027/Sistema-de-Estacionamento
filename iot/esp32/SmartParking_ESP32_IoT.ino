/*
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SISTEMA DE ESTACIONAMENTO INTELIGENTE                    ║
 * ║                           Smart Parking ESP32 IoT                           ║
 * ║                                                                              ║
 * ║  Projeto: Monitoramento de 20 Vagas + 2 Cancelas com Servos                ║
 * ║  Microcontrolador: ESP32 Dev Module                                         ║
 * ║  Data: 11/05/2026                                                           ║
 * ║  Versão: 1.1 DEBUG ROBUSTAS                                                ║
 * ║                                                                              ║
 * ║  MELHORIAS APLICADAS:                                                       ║
 * ║  ✅ Diagnóstico I2C completo                                               ║
 * ║  ✅ Teste de leitura de todos os pinos                                     ║
 * ║  ✅ Logs periódicos de status                                              ║
 * ║  ✅ Validação robusta de inicialização                                     ║
 * ║  ✅ Detecção de mudanças de estado (anti-spam)                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: INCLUDES E DEFINIÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

#include <Wire.h>
#include <Adafruit_MCP23X17.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ─ Configuração WiFi ─
#define WIFI_SSID "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD "03012006Ju"
#define WIFI_RETRY_INTERVAL 10000  // 10 segundos

// ─ Configuração MQTT ─
#define MQTT_BROKER "192.168.15.177"
#define MQTT_PORT 1884
#define MQTT_USER "parking_iot"
#define MQTT_PASSWORD "ParkingIot@2026"
#define MQTT_RETRY_INTERVAL 5000   // 5 segundos

// ─ Tópicos MQTT ─
#define TOPIC_SPOTS "parking/spots"
#define TOPIC_EVENTS "parking/events"
#define TOPIC_CONFIG "parking/config"

// ─ Configuração I2C ─
#define I2C_SDA 21
#define I2C_SCL 22
#define I2C_FREQ 100000

// ─ Endereços MCP23017 ─
#define MCP1_ADDR 0x20  // Vagas 1-16
#define MCP2_ADDR 0x21  // Vagas 17-20 + Sensores

// ─ Pinos Servo ─
#define SERVO_ENTRADA_PIN 13
#define SERVO_SAIDA_PIN 12

// ─ Pinos MCP2 para Sensores ─
#define SENSOR_ENTRADA_PIN 6   // A6 do MCP2
#define SENSOR_SAIDA_PIN 14    // B6 do MCP2

// ─ Configuração de Sensores ─
#define SENSOR_ACTIVE_LOW true
#define DEBOUNCE_READINGS 3
#define DEBOUNCE_INTERVAL 500     // 500ms
#define SERVO_TIMEOUT 3000        // 3 segundos

// ─ Ângulos do Servo ─
#define SERVO_OPEN 0              // Aberto
#define SERVO_CLOSED 90           // Fechado

// ─ Flags de Debug ─
#define DEBUG_LEITURA_CONTINUA true    // Log contínuo de leituras (a cada 30s)
#define DEBUG_MUDANCAS_ESTADO true     // Log de mudanças de estado
#define DEBUG_I2C_VERBOSO false        // I2C com detalhes (desabilitar em produção)
#define DEBUG_CADA_LEITURA true        // ⚠️ ULTRA-VERBOSE: mostra CADA leitura de sensor

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: VARIÁVEIS GLOBAIS
// ═══════════════════════════════════════════════════════════════════════════════

// ─ Objetos I2C e MQTT ─
Adafruit_MCP23X17 mcp1;
Adafruit_MCP23X17 mcp2;
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ─ Servos ─
Servo servoEntrada;
Servo servoSaida;

// ─ Estado das Vagas (20 vagas total) ─
bool estadoVagas[20];          // true = ocupada, false = livre
bool estadoVagasAnterior[20];  // Estado anterior para detecção de mudança

// ─ Contadores de Debounce para Vagas ─
uint8_t debounceCounterVagas[20];

// ─ Contadores de Debounce para Sensores ─
uint8_t debounceCounterEntrada;
uint8_t debounceCounterSaida;

// ─ Estados dos Sensores ─
bool sensorEntradaDetectado = false;
bool sensorSaidaDetectado = false;
bool sensorEntradaAnterior = false;
bool sensorSaidaAnterior = false;

// ─ Controle de Servos ─
bool servoEntradaAberto = false;
unsigned long tempoAberturaEntrada = 0;

bool servoSaidaAberto = false;
unsigned long tempoAberturaSaida = 0;

// ─ Variável de Vagas Livres (recebida do Backend) ─
int vagasLivres = 20;

// ─ Timestamps para Reconexão ─
unsigned long ultimaTentativaWiFi = 0;
unsigned long ultimaTentativaMQTT = 0;

// ─ Timestamps para Leitura de Sensores ─
unsigned long ultimaLeituraSensores = 0;

// ─ Flags de Status I2C ─
bool mcp1Ativo = false;
bool mcp2Ativo = false;

// ─ Contadores de Debug ─
unsigned long loopsTotal = 0;
unsigned long loopsSemMudanca = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 2B: FUNÇÕES DE DIAGNÓSTICO
// ═══════════════════════════════════════════════════════════════════════════════

/// <summary>
/// Verifica quais endereços I2C responderam no barramento
/// </summary>
void diagnosticoI2C() {
  Serial.println("\n[DIAGNÓSTICO I2C] Verificando barramento...");
  int count = 0;
  
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("  ✅ Dispositivo encontrado: 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      count++;
    }
  }
  
  Serial.print("Total: ");
  Serial.print(count);
  Serial.println(" dispositivo(s)\n");
  
  if (count == 0) {
    Serial.println("⚠️ AVISO: Nenhum dispositivo I2C detectado!");
    Serial.println("   Verifique:");
    Serial.println("   • Fiação SDA (GPIO 21) e SCL (GPIO 22)");
    Serial.println("   • Alimentação +5V e GND dos MCPs");
    Serial.println("   • Resistores pull-up 10kΩ em SDA e SCL");
    Serial.println("   • Endereços dos MCPs (pinos A0/A1/A2)\n");
  }
}

/// <summary>
/// Testa leitura de todos os pinos após inicialização
/// </summary>
void testeLeituraMCPs() {
  Serial.println("[TESTE I2C] Lendo estado atual de todos os pinos...\n");
  
  // ─ MCP1 (Vagas 1-16) ─
  if (mcp1Ativo) {
    Serial.println("MCP1 (0x20) - Vagas 1-16:");
    int ocupadas = 0;
    for (int i = 0; i < 16; i++) {
      bool estado = mcp1.digitalRead(i);
      if (!estado) ocupadas++;
      
      if (DEBUG_I2C_VERBOSO) {
        Serial.print("  Pino ");
        if (i < 10) Serial.print("0");
        Serial.print(i);
        Serial.print(" (Vaga ");
        if (i + 1 < 10) Serial.print("0");
        Serial.print(i + 1);
        Serial.print("): ");
        Serial.println(estado ? "HIGH (LIVRE)" : "LOW (OCUPADA)");
      }
    }
    Serial.print("  Resumo: ");
    Serial.print(ocupadas);
    Serial.println("/16 vagas ocupadas ✅");
  } else {
    Serial.println("❌ MCP1 não ativo - pulando teste");
  }
  
  // ─ MCP2 (Vagas 17-20) ─
  if (mcp2Ativo) {
    Serial.println("\nMCP2 (0x21) - Vagas 17-20:");
    int ocupadas = 0;
    for (int i = 0; i < 4; i++) {
      bool estado = mcp2.digitalRead(i);
      if (!estado) ocupadas++;
      
      if (DEBUG_I2C_VERBOSO) {
        Serial.print("  Pino 0");
        Serial.print(i);
        Serial.print(" (Vaga ");
        Serial.print(16 + i + 1);
        Serial.print("): ");
        Serial.println(estado ? "HIGH (LIVRE)" : "LOW (OCUPADA)");
      }
    }
    Serial.print("  Resumo: ");
    Serial.print(ocupadas);
    Serial.println("/4 vagas ocupadas ✅");
    
    // ─ Sensores ─
    Serial.println("\nSensores de Cancela:");
    bool entradaEstado = mcp2.digitalRead(SENSOR_ENTRADA_PIN);
    bool saidaEstado = mcp2.digitalRead(SENSOR_SAIDA_PIN);
    Serial.print("  A6 (Entrada): ");
    Serial.println(entradaEstado ? "HIGH (sem carro)" : "LOW (carro detectado)");
    Serial.print("  B6 (Saída):   ");
    Serial.println(saidaEstado ? "HIGH (sem carro)" : "LOW (carro detectado)");
    Serial.println();
  } else {
    Serial.println("❌ MCP2 não ativo - pulando teste");
  }
}

/// <summary>
/// Log periódico de status dos MCPs (para debug contínuo)
/// </summary>
void logStatusMCPs() {
  static unsigned long ultimoLog = 0;
  static const unsigned long INTERVALO_LOG = 30000; // 30 segundos
  
  if (!DEBUG_LEITURA_CONTINUA) return;
  
  if (millis() - ultimoLog > INTERVALO_LOG) {
    Serial.println("\n[PERÍODO 30s] Status dos MCPs:");
    
    if (mcp1Ativo) {
      int ocupadasMCP1 = 0;
      for (int i = 0; i < 16; i++) {
        if (!mcp1.digitalRead(i)) ocupadasMCP1++;
      }
      Serial.print("  MCP1: ");
      Serial.print(ocupadasMCP1);
      Serial.print("/16 vagas | WiFi: ");
      Serial.print(WiFi.status() == WL_CONNECTED ? "✅" : "❌");
      Serial.print(" | MQTT: ");
      Serial.println(mqttClient.connected() ? "✅" : "❌");
    }
    
    if (mcp2Ativo) {
      int ocupadasMCP2 = 0;
      for (int i = 0; i < 4; i++) {
        if (!mcp2.digitalRead(i)) ocupadasMCP2++;
      }
      Serial.print("  MCP2: ");
      Serial.print(ocupadasMCP2);
      Serial.print("/4 vagas | Vagas Livres: ");
      Serial.println(vagasLivres);
    }
    
    Serial.print("  Loops totais: ");
    Serial.print(loopsTotal);
    Serial.print(" | Loops SEM mudança: ");
    Serial.println(loopsSemMudanca);
    
    ultimoLog = millis();
  }
}

/// <summary>
/// Debug ULTRA-VERBOSO: mostra CADA leitura de sensor em tempo real
/// Ativa automaticamente cada 2 segundos para evitar spam
/// </summary>
void debugCadaLeitura() {
  static unsigned long ultimoDebug = 0;
  static const unsigned long INTERVALO_DEBUG = 2000; // 2 segundos entre prints
  
  if (!DEBUG_CADA_LEITURA) return;
  if (millis() - ultimoDebug < INTERVALO_DEBUG) return;
  
  Serial.println("\n╔══ LEITURA ULTRA-VERBOSA ════════════════════════════════════╗");
  
  // ─ MCP1 ─
  if (mcp1Ativo) {
    Serial.print("║ MCP1 (0x20): ");
    for (int i = 0; i < 16; i++) {
      bool raw = mcp1.digitalRead(i);
      bool adjusted = SENSOR_ACTIVE_LOW ? !raw : raw;
      Serial.print(adjusted ? "█" : "□");
    }
    Serial.println("  ║");
  }
  
  // ─ MCP2 Vagas ─
  if (mcp2Ativo) {
    Serial.print("║ MCP2 Vagas:  ");
    for (int i = 0; i < 4; i++) {
      bool raw = mcp2.digitalRead(i);
      bool adjusted = SENSOR_ACTIVE_LOW ? !raw : raw;
      Serial.print(adjusted ? "█" : "□");
    }
    Serial.print("    ║\n║ Sensores:    ");
    
    // ─ Sensores ─
    bool entRaw = mcp2.digitalRead(SENSOR_ENTRADA_PIN);
    bool saiRaw = mcp2.digitalRead(SENSOR_SAIDA_PIN);
    bool entAdj = SENSOR_ACTIVE_LOW ? !entRaw : entRaw;
    bool saiAdj = SENSOR_ACTIVE_LOW ? !saiRaw : saiRaw;
    
    Serial.print("Ent:");
    Serial.print(entAdj ? "✓" : "○");
    Serial.print("(raw:");
    Serial.print(entRaw ? "H" : "L");
    Serial.print(") Sai:");
    Serial.print(saiAdj ? "✓" : "○");
    Serial.print("(raw:");
    Serial.print(saiRaw ? "H" : "L");
    Serial.println(")  ║");
  }
  
  Serial.println("╚════════════════════════════════════════════════════════════════╝");
  ultimoDebug = millis();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: SETUP
// ═══════════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(100);
  
  Serial.println("\n\n╔══════════════════════════════════════════════════════════════╗");
  Serial.println("║           SMART PARKING ESP32 - INICIANDO SISTEMA             ║");
  Serial.println("║                     VERSION 1.1 - DEBUG                       ║");
  Serial.println("╚══════════════════════════════════════════════════════════════╝\n");

  // ─ Inicializar I2C ─
  Serial.println("[I2C] Inicializando barramento I2C (SDA=21, SCL=22, 100kHz)...");
  Wire.begin(I2C_SDA, I2C_SCL, I2C_FREQ);
  delay(200);

  // ─ Diagnóstico I2C ─
  diagnosticoI2C();

  // ─ Inicializar MCP1 (Vagas 1-16) ─
  Serial.print("[MCP1] Inicializando em endereço 0x20... ");
  if (!mcp1.begin_I2C(MCP1_ADDR)) {
    Serial.println("❌ FALHA!");
    Serial.println("    ERRO: MCP1 (0x20) não encontrado no barramento I2C!");
    Serial.println("    Verifique: Fiação I2C, alimentação, resistores pull-up");
    mcp1Ativo = false;
  } else {
    Serial.println("✅ OK");
    mcp1Ativo = true;
  }

  // ─ Configurar todos os pinos MCP1 como entrada com pull-up ─
  if (mcp1Ativo) {
    Serial.println("[MCP1] Configurando 16 pinos como INPUT_PULLUP...");
    for (int i = 0; i < 16; i++) {
      mcp1.pinMode(i, INPUT_PULLUP);
    }
    delay(100);
    Serial.println("[MCP1] ✅ 16 pinos configurados");
  }

  // ─ Inicializar MCP2 (Vagas 17-20 + Sensores) ─
  Serial.print("[MCP2] Inicializando em endereço 0x21... ");
  if (!mcp2.begin_I2C(MCP2_ADDR)) {
    Serial.println("❌ FALHA!");
    Serial.println("    ERRO: MCP2 (0x21) não encontrado no barramento I2C!");
    Serial.println("    Verifique: Fiação I2C, alimentação, resistores pull-up");
    mcp2Ativo = false;
  } else {
    Serial.println("✅ OK");
    mcp2Ativo = true;
  }

  // ─ Configurar pinos MCP2 ─
  if (mcp2Ativo) {
    Serial.println("[MCP2] Configurando pinos:");
    
    // A0-A3: Vagas 17-20
    Serial.println("  • A0-A3 (Vagas 17-20): INPUT_PULLUP");
    for (int i = 0; i < 4; i++) {
      mcp2.pinMode(i, INPUT_PULLUP);
    }
    
    // A6: Sensor Entrada
    Serial.println("  • A6 (Sensor Entrada): INPUT_PULLUP");
    mcp2.pinMode(SENSOR_ENTRADA_PIN, INPUT_PULLUP);
    
    // B6: Sensor Saída
    Serial.println("  • B6 (Sensor Saída): INPUT_PULLUP");
    mcp2.pinMode(SENSOR_SAIDA_PIN, INPUT_PULLUP);
    
    delay(100);
    Serial.println("[MCP2] ✅ Pinos configurados");
  }

  // ─ Teste rápido de leitura ─
  testeLeituraMCPs();

  // ─ Inicializar Servos ─
  Serial.println("[SERVO] Inicializando servos...");
  servoEntrada.attach(SERVO_ENTRADA_PIN, 1000, 2000);
  servoSaida.attach(SERVO_SAIDA_PIN, 1000, 2000);
  servoEntrada.write(SERVO_CLOSED);
  servoSaida.write(SERVO_CLOSED);
  delay(500);
  Serial.println("[SERVO] ✅ Servos posicionados em FECHADO");

  // ─ Inicializar estado das vagas ─
  memset(estadoVagas, false, sizeof(estadoVagas));
  memset(estadoVagasAnterior, false, sizeof(estadoVagasAnterior));
  memset(debounceCounterVagas, 0, sizeof(debounceCounterVagas));

  // ─ Inicializar contadores de debounce ─
  debounceCounterEntrada = 0;
  debounceCounterSaida = 0;

  // ─ Conectar WiFi ─
  Serial.println("[WiFi] Conectando...");
  conectarWiFi();

  // ─ Configurar MQTT ─
  Serial.println("[MQTT] Configurando cliente MQTT...");
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(callbackMQTT);
  
  conectarMQTT();

  Serial.println("\n✅ SISTEMA PRONTO - Monitorando vagas...\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

void loop() {
  loopsTotal++;
  
  // ─ Reconectar WiFi se necessário ─
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - ultimaTentativaWiFi > WIFI_RETRY_INTERVAL) {
      Serial.println("[WiFi] Reconectando...");
      conectarWiFi();
      ultimaTentativaWiFi = millis();
    }
  }

  // ─ Reconectar MQTT se necessário ─
  if (!mqttClient.connected()) {
    if (millis() - ultimaTentativaMQTT > MQTT_RETRY_INTERVAL) {
      Serial.println("[MQTT] Reconectando...");
      conectarMQTT();
      ultimaTentativaMQTT = millis();
    }
  } else {
    mqttClient.loop();
  }

  // ─ Ler sensores a cada 500ms ─
  if (millis() - ultimaLeituraSensores > DEBOUNCE_INTERVAL) {
    bool mudouAlgo = false;
    
    // Verificar antes
    bool estadoAntesVagas[20];
    memcpy(estadoAntesVagas, estadoVagas, sizeof(estadoVagas));
    
    if (mcp1Ativo) lerSensoresVagas();
    if (mcp2Ativo) processarSensoresEntradaSaida();
    processarServos();
    
    // Verificar depois
    for (int i = 0; i < 20; i++) {
      if (estadoAntesVagas[i] != estadoVagas[i]) {
        mudouAlgo = true;
        break;
      }
    }
    if (!mudouAlgo && sensorEntradaDetectado) mudouAlgo = true;
    if (!mudouAlgo && sensorSaidaDetectado) mudouAlgo = true;
    
    if (mudouAlgo) {
      loopsSemMudanca = 0;
    } else {
      loopsSemMudanca++;
    }
    
    ultimaLeituraSensores = millis();
  }

  // ─ Debug ultra-verboso ─
  debugCadaLeitura();
  
  // ─ Log periódico ─
  logStatusMCPs();

  delay(50);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 5: FUNÇÕES DE CONEXÃO
// ═══════════════════════════════════════════════════════════════════════════════

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Já conectado");
    return;
  }

  Serial.print("[WiFi] Conectando a "); Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\n✅ WiFi Conectado: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Falha na conexão WiFi");
  }
}

void conectarMQTT() {
  if (mqttClient.connected()) {
    Serial.println("[MQTT] Já conectado");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] WiFi não conectado. Aguardando...");
    return;
  }

  Serial.print("[MQTT] Conectando a "); Serial.print(MQTT_BROKER);
  Serial.print(":"); Serial.println(MQTT_PORT);

  if (mqttClient.connect("ESP32_ParkingSystem", MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("✅ MQTT Conectado");
    Serial.print("[MQTT] Assinando tópico: ");
    Serial.println(TOPIC_CONFIG);
    mqttClient.subscribe(TOPIC_CONFIG);
  } else {
    Serial.print("❌ Falha MQTT. Código: ");
    Serial.println(mqttClient.state());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 6: CALLBACK MQTT
// ═══════════════════════════════════════════════════════════════════════════════

void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  char buffer[256];
  if (length > sizeof(buffer) - 1) length = sizeof(buffer) - 1;
  memcpy(buffer, payload, length);
  buffer[length] = '\0';

  Serial.print("[MQTT] Mensagem recebida: ");
  Serial.print(topic);
  Serial.print(" -> ");
  Serial.println(buffer);

  if (strcmp(topic, TOPIC_CONFIG) == 0) {
    StaticJsonDocument<256> doc;
    DeserializationError erro = deserializeJson(doc, buffer);

    if (!erro && doc.containsKey("availableSpots")) {
      vagasLivres = doc["availableSpots"];
      Serial.print("[CONFIG] Vagas livres atualizadas: ");
      Serial.println(vagasLivres);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 7: LEITURA DE SENSORES (VAGAS)
// ═══════════════════════════════════════════════════════════════════════════════

void lerSensoresVagas() {
  if (!mcp1Ativo && !mcp2Ativo) return;

  // ─ Ler vagas 1-16 do MCP1 ─
  if (mcp1Ativo) {
    for (int i = 0; i < 16; i++) {
      bool leitura = mcp1.digitalRead(i);
      if (SENSOR_ACTIVE_LOW) leitura = !leitura;

      if (leitura == estadoVagas[i]) {
        debounceCounterVagas[i]++;
      } else {
        debounceCounterVagas[i] = 0;
      }

      if (debounceCounterVagas[i] >= DEBOUNCE_READINGS) {
        if (estadoVagas[i] != estadoVagasAnterior[i] && DEBUG_MUDANCAS_ESTADO) {
          Serial.print("[VAGA] ");
          Serial.print(i + 1);
          Serial.print(" -> ");
          Serial.println(estadoVagas[i] ? "OCUPADA" : "LIVRE");
        }
        estadoVagasAnterior[i] = estadoVagas[i];
        estadoVagas[i] = leitura;
        debounceCounterVagas[i] = 0;
      }
    }
  }

  // ─ Ler vagas 17-20 do MCP2 ─
  if (mcp2Ativo) {
    for (int i = 0; i < 4; i++) {
      bool leitura = mcp2.digitalRead(i);
      if (SENSOR_ACTIVE_LOW) leitura = !leitura;

      int vagaIdx = 16 + i;

      if (leitura == estadoVagas[vagaIdx]) {
        debounceCounterVagas[vagaIdx]++;
      } else {
        debounceCounterVagas[vagaIdx] = 0;
      }

      if (debounceCounterVagas[vagaIdx] >= DEBOUNCE_READINGS) {
        if (estadoVagas[vagaIdx] != estadoVagasAnterior[vagaIdx] && DEBUG_MUDANCAS_ESTADO) {
          Serial.print("[VAGA] ");
          Serial.print(vagaIdx + 1);
          Serial.print(" -> ");
          Serial.println(estadoVagas[vagaIdx] ? "OCUPADA" : "LIVRE");
        }
        estadoVagasAnterior[vagaIdx] = estadoVagas[vagaIdx];
        estadoVagas[vagaIdx] = leitura;
        debounceCounterVagas[vagaIdx] = 0;
      }
    }
  }

  publicarStatusVagas();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 8: PROCESSAMENTO DE SENSORES (ENTRADA/SAÍDA)
// ═══════════════════════════════════════════════════════════════════════════════

void processarSensoresEntradaSaida() {
  if (!mcp2Ativo) return;

  // ─ Ler sensor entrada (MCP2-A6) ─
  bool leituraEntrada = mcp2.digitalRead(SENSOR_ENTRADA_PIN);
  if (SENSOR_ACTIVE_LOW) leituraEntrada = !leituraEntrada;

  if (leituraEntrada == sensorEntradaDetectado) {
    debounceCounterEntrada++;
  } else {
    debounceCounterEntrada = 0;
  }

  if (debounceCounterEntrada >= DEBOUNCE_READINGS) {
    sensorEntradaAnterior = sensorEntradaDetectado;
    sensorEntradaDetectado = leituraEntrada;
    debounceCounterEntrada = 0;

    if (sensorEntradaDetectado && !sensorEntradaAnterior) {
      Serial.println("[EVENTO] Carro detectado na ENTRADA");
      if (vagasLivres > 0) {
        servoEntradaAberto = true;
        tempoAberturaEntrada = millis();
        Serial.print("[SERVO ENTRADA] Abrindo (vagas livres: ");
        Serial.print(vagasLivres);
        Serial.println(")");
        publicarEventoEntrada();
      } else {
        Serial.println("[SERVO ENTRADA] Bloqueado - Sem vagas disponíveis");
      }
    }
  }

  // ─ Ler sensor saída (MCP2-B6) ─
  bool leituraSaida = mcp2.digitalRead(SENSOR_SAIDA_PIN);
  if (SENSOR_ACTIVE_LOW) leituraSaida = !leituraSaida;

  if (leituraSaida == sensorSaidaDetectado) {
    debounceCounterSaida++;
  } else {
    debounceCounterSaida = 0;
  }

  if (debounceCounterSaida >= DEBOUNCE_READINGS) {
    sensorSaidaAnterior = sensorSaidaDetectado;
    sensorSaidaDetectado = leituraSaida;
    debounceCounterSaida = 0;

    if (sensorSaidaDetectado && !sensorSaidaAnterior) {
      Serial.println("[EVENTO] Carro detectado na SAÍDA");
      servoSaidaAberto = true;
      tempoAberturaSaida = millis();
      Serial.println("[SERVO SAÍDA] Abrindo");
      publicarEventoSaida();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 9: PROCESSAMENTO DE SERVOS
// ═══════════════════════════════════════════════════════════════════════════════

void processarServos() {
  if (servoEntradaAberto) {
    servoEntrada.write(SERVO_OPEN);

    if (millis() - tempoAberturaEntrada > SERVO_TIMEOUT) {
      servoEntrada.write(SERVO_CLOSED);
      servoEntradaAberto = false;
      Serial.println("[SERVO ENTRADA] Fechando (timeout)");
    }
  }

  if (servoSaidaAberto) {
    servoSaida.write(SERVO_OPEN);

    if (millis() - tempoAberturaSaida > SERVO_TIMEOUT) {
      servoSaida.write(SERVO_CLOSED);
      servoSaidaAberto = false;
      Serial.println("[SERVO SAÍDA] Fechando (timeout)");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 10: PUBLICAÇÃO DE DADOS MQTT
// ═══════════════════════════════════════════════════════════════════════════════

void publicarStatusVagas() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<512> doc;
  JsonArray vagas = doc.createNestedArray("spots");

  for (int i = 0; i < 20; i++) {
    if (estadoVagas[i] != estadoVagasAnterior[i]) {
      JsonObject vaga = vagas.createNestedObject();
      vaga["id"] = i + 1;
      vaga["occupied"] = estadoVagas[i];
    }
  }

  if (vagas.size() > 0) {
    char payload[512];
    serializeJson(doc, payload);
    mqttClient.publish(TOPIC_SPOTS, payload);
  }

  for (int i = 0; i < 20; i++) {
    estadoVagasAnterior[i] = estadoVagas[i];
  }
}

void publicarEventoEntrada() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["event"] = "entry";
  doc["timestamp"] = millis();
  doc["vagasDisponiveis"] = vagasLivres;

  char payload[256];
  serializeJson(doc, payload);
  mqttClient.publish(TOPIC_EVENTS, payload);
}

void publicarEventoSaida() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<256> doc;
  doc["event"] = "exit";
  doc["timestamp"] = millis();
  doc["vagasDisponiveis"] = vagasLivres;

  char payload[256];
  serializeJson(doc, payload);
  mqttClient.publish(TOPIC_EVENTS, payload);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIM DO CÓDIGO
// ═══════════════════════════════════════════════════════════════════════════════
