/*
  ╔════════════════════════════════════════════════════════════════════════════╗
  ║     SMART PARKING ESP32 IoT - MQTT ARCHITECTURE FIXED v3.0               ║
  ║     20 PARKING SPOTS + GATE ENTRY/EXIT SENSORS                           ║
  ║     Port: 1883 | ClientID: esp32-parking-01                              ║
  ║                                                                            ║
  ║     ARQUITETURA CORRIGIDA:                                                ║
  ║     ✓ Total: 20 vagas reais (não 22)                                      ║
  ║     ✓ MCP1 (0x20): Vagas 1-16 (16 pinos)                                  ║
  ║     ✓ MCP2 (0x21): Vagas 17-20 (4 pinos) + Gate Sensors + LEDs            ║
  ║     ✓ Gate Entry sensor → aciona servo de entrada                         ║
  ║     ✓ Gate Exit sensor → aciona servo de saída                            ║
  ║     ✓ Publicar MQTT APENAS vagas 1-20 em parking/spots/{id}              ║
  ║     ✓ Portões em tópicos separados: parking/entry e parking/exit         ║
  ║     ✓ Robust MQTT com Last Will + Heartbeat                               ║
  ╚════════════════════════════════════════════════════════════════════════════╝
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MCP23017.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <time.h>

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DE REDE
// ═══════════════════════════════════════════════════════════════════════════════
#define WIFI_SSID "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD "E9D8VIVO"

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES MQTT
// ═══════════════════════════════════════════════════════════════════════════════
#define MQTT_BROKER "192.168.15.177"
#define MQTT_PORT 1883
#define MQTT_CLIENT_ID "esp32-parking-01"
#define MQTT_USER "parking_iot"
#define MQTT_PASSWORD "ParkingIot@2026"

// Tópicos MQTT
#define TOPIC_DEVICE_STATUS "parking/device/esp32-parking-01/status"
#define TOPIC_DEVICE_CONFIG "parking/config"
#define TOPIC_GATE_ENTRY "parking/entry"
#define TOPIC_GATE_EXIT "parking/exit"
#define PARKING_LOT_ID "45fc18f2-bdd8-4b11-b964-f8face1147f0"

// ═══════════════════════════════════════════════════════════════════════════════
// I2C E MCP23017 - ARQUITETURA CORRIGIDA
// ═══════════════════════════════════════════════════════════════════════════════
Adafruit_MCP23017 mcp1;  // 0x20 - Vagas 1-16
Adafruit_MCP23017 mcp2;  // 0x21 - Vagas 17-20 + Sensores portões + LEDs

// VAGAS (20 total)
#define TOTAL_VAGAS 20
#define MCP1_VAGAS 16
#define MCP2_VAGAS 4

// MCP2 Pino Layout (0x21):
// Pinos 0-3:     Vagas 17-20 (sensores de ocupação)
// Pino  4:       Sensor de Entrada (gate entry)
// Pino  5:       Sensor de Saída (gate exit)
// Pinos 6-10:    LEDs de status
#define GATE_ENTRY_SENSOR_PIN 4
#define GATE_EXIT_SENSOR_PIN 5
#define LED_DISPONIVEL_PIN 6
#define LED_OCUPADO_PIN 7
#define LED_ERRO_PIN 8

// ═══════════════════════════════════════════════════════════════════════════════
// SERVO MOTORES
// ═══════════════════════════════════════════════════════════════════════════════
#define SERVO_GATE_ENTRY_PIN 16
#define SERVO_GATE_EXIT_PIN 17
#define SERVO_MIN_US 1000
#define SERVO_MAX_US 2000
#define SERVO_CLOSED_ANGLE 0
#define SERVO_OPEN_ANGLE 90
#define SERVO_OPEN_TIME_MS 2000   // Tempo porta aberta (2 segundos)
#define SERVO_CLOSE_DELAY_MS 500  // Delay antes de fechar

Servo servoEntry;
Servo servoExit;

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRUTURAS E VARIÁVEIS GLOBAIS
// ═══════════════════════════════════════════════════════════════════════════════

// Estrutura para rastrear estado de cada vaga
struct VagaState {
  bool ocupada;
  bool mudancaDetectada;
  unsigned long ultimaMudanca;
  uint8_t estabilizacao;  // Contador para debounce
};

// Estrutura para rastrear estado dos portões
struct GateState {
  bool sensorAtivo;
  unsigned long ultimaAtivacao;
  uint8_t estabilizacao;
  bool servoAcionado;
  unsigned long tempoAcaoServos;
};

VagaState vagas[TOTAL_VAGAS];
GateState gateEntry;
GateState gateExit;

// Cliente WiFi e MQTT
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Contadores e timestamps
unsigned long ultimaLeituraSensores = 0;
unsigned long ultimaLeituraPortoes = 0;
unsigned long ultimoHeartbeat = 0;
unsigned long ultimaTentativaWiFi = 0;
unsigned long ultimaTentativaMQTT = 0;

int reconexoes_wifi = 0;
int reconexoes_mqtt = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Traduzir código de estado MQTT
// ═══════════════════════════════════════════════════════════════════════════════
String getMQTTStateMessage(int state) {
  switch(state) {
    case -4: return "MQTT_CONNECTION_TIMEOUT (-4)";
    case -3: return "MQTT_CONNECTION_LOST (-3)";
    case -2: return "MQTT_CONNECT_FAILED (-2)";
    case -1: return "MQTT_DISCONNECTED (-1)";
    case 0:  return "MQTT_CONNECTED (0) - OK!";
    case 1:  return "MQTT_CONNECT_BAD_PROTOCOL (1)";
    case 2:  return "MQTT_CONNECT_BAD_CLIENT_ID (2)";
    case 3:  return "MQTT_CONNECT_UNAVAILABLE (3)";
    case 4:  return "MQTT_CONNECT_BAD_CREDENTIALS (4)";
    case 5:  return "MQTT_CONNECT_UNAUTHORIZED (5)";
    default: return "MQTT_UNKNOWN (?)";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Conectar ao WiFi
// ═══════════════════════════════════════════════════════════════════════════════
void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long agora = millis();
  if (agora - ultimaTentativaWiFi < 5000) {
    return;
  }

  ultimaTentativaWiFi = agora;

  Serial.println("\n[WiFi] Conectando a '" + String(WIFI_SSID) + "'...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] OK - IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("[WiFi] FALHA - Tentando novamente");
    reconexoes_wifi++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Conectar ao MQTT
// ═══════════════════════════════════════════════════════════════════════════════
void conectarMQTT() {
  if (mqttClient.connected()) {
    return;
  }

  unsigned long agora = millis();
  if (agora - ultimaTentativaMQTT < 5000) {
    return;
  }

  ultimaTentativaMQTT = agora;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] WiFi desconectado");
    return;
  }

  Serial.println("[MQTT] Conectando a " + String(MQTT_BROKER) + "...");

  const char* willTopic = TOPIC_DEVICE_STATUS;
  const char* willMessage = "offline";

  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD, willTopic, 1, true, willMessage)) {
    Serial.println("[MQTT] OK - ClientID: " + String(MQTT_CLIENT_ID));
    publishDeviceStatus("online");
    mqttClient.subscribe(TOPIC_DEVICE_CONFIG);
    Serial.println("[MQTT] Inscrito em: " + String(TOPIC_DEVICE_CONFIG));
  } else {
    Serial.println("[MQTT] FALHA - " + String(getMQTTStateMessage(mqttClient.state())));
    reconexoes_mqtt++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Publicar status do dispositivo
// ═══════════════════════════════════════════════════════════════════════════════
void publishDeviceStatus(const char* status) {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["device_id"] = MQTT_CLIENT_ID;
  doc["status"] = status;
  doc["uptime_s"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["wifi_signal"] = WiFi.RSSI();

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_DEVICE_STATUS, buffer, true);
  
  Serial.println("[HEARTBEAT] Status: " + String(status));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Publicar estado de uma vaga (APENAS VAGAS 1-20)
// ═══════════════════════════════════════════════════════════════════════════════
void publicarVaga(uint8_t vagaId, bool ocupada) {
  if (!mqttClient.connected()) {
    return;
  }

  // Validar que é uma vaga válida (1-20)
  if (vagaId < 1 || vagaId > TOTAL_VAGAS) {
    Serial.println("[VAGA] ERROR - ID inválida: " + String(vagaId));
    return;
  }

  char topico[64];
  snprintf(topico, sizeof(topico), "parking/spots/%d", vagaId);

  StaticJsonDocument<256> doc;
  doc["vagaId"] = vagaId;
  doc["status"] = ocupada ? "ocupada" : "livre";
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"] = MQTT_CLIENT_ID;
  doc["uptime_s"] = millis() / 1000;
  doc["timestamp"] = (unsigned long)time(nullptr);

  char payload[256];
  serializeJson(doc, payload);

  if (mqttClient.publish(topico, payload, false)) {
    Serial.println("[VAGA] " + String(vagaId) + " = " + String(ocupada ? "OCUPADA" : "LIVRE"));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Publicar evento de entrada (sensor de entrada acionado)
// ═══════════════════════════════════════════════════════════════════════════════
void publicarEntrada() {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["evento"] = "entrada";
  doc["device"] = MQTT_CLIENT_ID;
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["timestamp"] = (unsigned long)time(nullptr);

  char payload[256];
  serializeJson(doc, payload);

  if (mqttClient.publish(TOPIC_GATE_ENTRY, payload, false)) {
    Serial.println("[ENTRY] Evento publicado - servo acionado");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Publicar evento de saída (sensor de saída acionado)
// ═══════════════════════════════════════════════════════════════════════════════
void publicarSaida() {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["evento"] = "saida";
  doc["device"] = MQTT_CLIENT_ID;
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["timestamp"] = (unsigned long)time(nullptr);

  char payload[256];
  serializeJson(doc, payload);

  if (mqttClient.publish(TOPIC_GATE_EXIT, payload, false)) {
    Serial.println("[EXIT] Evento publicado - servo acionado");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Callback MQTT
// ═══════════════════════════════════════════════════════════════════════════════
void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT RX] ");
  Serial.print(topic);
  Serial.print(": ");
  
  char mensagem[length + 1];
  memcpy(mensagem, payload, length);
  mensagem[length] = '\0';
  
  Serial.println(mensagem);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Inicializar I2C e MCPs
// ═══════════════════════════════════════════════════════════════════════════════
void inicializarI2C() {
  Serial.println("\n[I2C] Inicializando...");
  Wire.begin(21, 22);  // SDA=21, SCL=22

  // Escanear barramento
  Serial.println("[I2C] Verificando endereços...");
  int enderecosEncontrados = 0;

  for (byte i = 8; i < 120; i++) {
    Wire.beginTransmission(i);
    if (Wire.endTransmission() == 0) {
      Serial.print("  0x" + String(i, HEX));
      if (i == 0x20) Serial.println(" (MCP1)");
      else if (i == 0x21) Serial.println(" (MCP2)");
      else Serial.println();
      enderecosEncontrados++;
    }
  }
  Serial.println("[I2C] Total: " + String(enderecosEncontrados) + " endereços");

  // ─────────────────────────────────────────────────────────────────────────────
  // MCP1 (0x20): VAGAS 1-16 (todos 16 pinos como inputs)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!mcp1.begin_I2C(0x20)) {
    Serial.println("[MCP1] ERRO ao inicializar em 0x20");
  } else {
    Serial.println("[MCP1] OK em 0x20 - Vagas 1-16");
    for (int i = 0; i < 16; i++) {
      mcp1.pinMode(i, INPUT);
      vagas[i].ocupada = false;
      vagas[i].mudancaDetectada = false;
      vagas[i].ultimaMudanca = 0;
      vagas[i].estabilizacao = 0;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MCP2 (0x21): VAGAS 17-20 (pinos 0-3) + SENSORES PORTAO (4-5) + LEDs (6-8)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!mcp2.begin_I2C(0x21)) {
    Serial.println("[MCP2] ERRO ao inicializar em 0x21");
  } else {
    Serial.println("[MCP2] OK em 0x21 - Vagas 17-20 + Gates + LEDs");
    
    // Pinos 0-3: Vagas 17-20 (inputs)
    for (int i = 0; i < 4; i++) {
      mcp2.pinMode(i, INPUT);
      vagas[MCP1_VAGAS + i].ocupada = false;
      vagas[MCP1_VAGAS + i].mudancaDetectada = false;
      vagas[MCP1_VAGAS + i].ultimaMudanca = 0;
      vagas[MCP1_VAGAS + i].estabilizacao = 0;
    }
    
    // Pinos 4-5: Sensores de portão (inputs)
    mcp2.pinMode(GATE_ENTRY_SENSOR_PIN, INPUT);
    mcp2.pinMode(GATE_EXIT_SENSOR_PIN, INPUT);
    gateEntry.sensorAtivo = false;
    gateEntry.estabilizacao = 0;
    gateEntry.servoAcionado = false;
    gateExit.sensorAtivo = false;
    gateExit.estabilizacao = 0;
    gateExit.servoAcionado = false;
    
    // Pinos 6-8: LEDs (outputs)
    mcp2.pinMode(LED_DISPONIVEL_PIN, OUTPUT);
    mcp2.pinMode(LED_OCUPADO_PIN, OUTPUT);
    mcp2.pinMode(LED_ERRO_PIN, OUTPUT);
    mcp2.digitalWrite(LED_ERRO_PIN, LOW);  // LED de erro desligado inicialmente
  }

  // Teste inicial
  Serial.println("\n[I2C] Estado inicial das vagas...");
  int ocupadas = 0;
  for (int i = 0; i < TOTAL_VAGAS; i++) {
    bool estado = (i < MCP1_VAGAS) ? mcp1.digitalRead(i) : mcp2.digitalRead(i - MCP1_VAGAS);
    vagas[i].ocupada = estado;
    if (estado) ocupadas++;
  }
  Serial.println("[I2C] Vagas: " + String(ocupadas) + "/" + String(TOTAL_VAGAS) + " ocupadas");
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Inicializar Servos
// ═══════════════════════════════════════════════════════════════════════════════
void inicializarServos() {
  Serial.println("\n[SERVO] Inicializando...");
  
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  
  servoEntry.setPeriodHertz(50);
  servoExit.setPeriodHertz(50);
  
  if (servoEntry.attach(SERVO_GATE_ENTRY_PIN, SERVO_MIN_US, SERVO_MAX_US) &&
      servoExit.attach(SERVO_GATE_EXIT_PIN, SERVO_MIN_US, SERVO_MAX_US)) {
    Serial.println("[SERVO] OK - Entrada (pino 16), Saida (pino 17)");
    // Posição inicial: fechados
    servoEntry.write(SERVO_CLOSED_ANGLE);
    servoExit.write(SERVO_CLOSED_ANGLE);
    Serial.println("[SERVO] Posicionados em FECHADO");
  } else {
    Serial.println("[SERVO] ERRO ao anexar servos");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Acionar servo de entrada (portão entrada)
// ═══════════════════════════════════════════════════════════════════════════════
void acionarServoEntrada() {
  Serial.println("[SERVO ENTRADA] Abrindo portao entrada...");
  servoEntry.write(SERVO_OPEN_ANGLE);
  gateEntry.servoAcionado = true;
  gateEntry.tempoAcaoServos = millis();
  
  // Publicar evento MQTT
  publicarEntrada();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Fechar servo de entrada
// ═══════════════════════════════════════════════════════════════════════════════
void fecharServoEntrada() {
  Serial.println("[SERVO ENTRADA] Fechando portao entrada...");
  servoEntry.write(SERVO_CLOSED_ANGLE);
  gateEntry.servoAcionado = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Acionar servo de saída (portão saída)
// ═══════════════════════════════════════════════════════════════════════════════
void acionarServoSaida() {
  Serial.println("[SERVO SAIDA] Abrindo portao saida...");
  servoExit.write(SERVO_OPEN_ANGLE);
  gateExit.servoAcionado = true;
  gateExit.tempoAcaoServos = millis();
  
  // Publicar evento MQTT
  publicarSaida();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Fechar servo de saída
// ═══════════════════════════════════════════════════════════════════════════════
void fecharServoSaida() {
  Serial.println("[SERVO SAIDA] Fechando portao saida...");
  servoExit.write(SERVO_CLOSED_ANGLE);
  gateExit.servoAcionado = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Ler e processar sensores de VAGAS (1-20)
// ═══════════════════════════════════════════════════════════════════════════════
void lerSensoresVagas() {
  unsigned long agora = millis();
  if (agora - ultimaLeituraSensores < 500) {
    return;  // Ler a cada 500ms
  }
  ultimaLeituraSensores = agora;

  for (int i = 0; i < TOTAL_VAGAS; i++) {
    VagaState* vaga = &vagas[i];
    
    // Ler estado do pino
    bool estadoAtual = (i < MCP1_VAGAS) ? mcp1.digitalRead(i) : mcp2.digitalRead(i - MCP1_VAGAS);

    // Debounce: 3 leituras consistentes
    if (estadoAtual != vaga->ocupada) {
      vaga->estabilizacao++;
      if (vaga->estabilizacao >= 3) {
        vaga->ocupada = estadoAtual;
        vaga->mudancaDetectada = true;
        vaga->ultimaMudanca = agora;

        uint8_t vagaNum = i + 1;  // Vagas são numeradas 1-20
        publicarVaga(vagaNum, vaga->ocupada);
        
        vaga->estabilizacao = 0;
      }
    } else {
      vaga->estabilizacao = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Ler e processar sensores de PORTAO (entrada/saída)
// ═══════════════════════════════════════════════════════════════════════════════
void lerSensoresPortao() {
  unsigned long agora = millis();
  if (agora - ultimaLeituraPortoes < 100) {
    return;  // Ler a cada 100ms
  }
  ultimaLeituraPortoes = agora;

  // ───────────────────────────────────────────────────────────────────────────
  // Sensor ENTRADA (pino 4 do MCP2)
  // ───────────────────────────────────────────────────────────────────────────
  bool sensorEntradaAtual = mcp2.digitalRead(GATE_ENTRY_SENSOR_PIN);
  
  if (sensorEntradaAtual != gateEntry.sensorAtivo) {
    gateEntry.estabilizacao++;
    if (gateEntry.estabilizacao >= 2) {  // 2 leituras = ~200ms
      if (sensorEntradaAtual && !gateEntry.sensorAtivo) {
        // Transição LOW->HIGH: sensor acionado
        Serial.println("[SENSOR ENTRADA] Acionado!");
        acionarServoEntrada();
      }
      gateEntry.sensorAtivo = sensorEntradaAtual;
      gateEntry.estabilizacao = 0;
    }
  } else {
    gateEntry.estabilizacao = 0;
  }

  // Fechar servo se tempo decorrido
  if (gateEntry.servoAcionado && (agora - gateEntry.tempoAcaoServos) > (SERVO_OPEN_TIME_MS + SERVO_CLOSE_DELAY_MS)) {
    fecharServoEntrada();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Sensor SAIDA (pino 5 do MCP2)
  // ───────────────────────────────────────────────────────────────────────────
  bool sensorSaidaAtual = mcp2.digitalRead(GATE_EXIT_SENSOR_PIN);
  
  if (sensorSaidaAtual != gateExit.sensorAtivo) {
    gateExit.estabilizacao++;
    if (gateExit.estabilizacao >= 2) {  // 2 leituras = ~200ms
      if (sensorSaidaAtual && !gateExit.sensorAtivo) {
        // Transição LOW->HIGH: sensor acionado
        Serial.println("[SENSOR SAIDA] Acionado!");
        acionarServoSaida();
      }
      gateExit.sensorAtivo = sensorSaidaAtual;
      gateExit.estabilizacao = 0;
    }
  } else {
    gateExit.estabilizacao = 0;
  }

  // Fechar servo se tempo decorrido
  if (gateExit.servoAcionado && (agora - gateExit.tempoAcaoServos) > (SERVO_OPEN_TIME_MS + SERVO_CLOSE_DELAY_MS)) {
    fecharServoSaida();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Publicar heartbeat periódico
// ═══════════════════════════════════════════════════════════════════════════════
void publicarHeartbeat() {
  unsigned long agora = millis();
  if (agora - ultimoHeartbeat < 60000) {
    return;  // A cada 60 segundos
  }
  ultimoHeartbeat = agora;

  if (mqttClient.connected()) {
    publishDeviceStatus("online");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n╔════════════════════════════════════════════════════════════╗");
  Serial.println("║    Smart Parking ESP32 IoT v3.0 - ARCHITECTURE FIXED     ║");
  Serial.println("║    20 Vagas + Gate Entry/Exit + MQTT Robust              ║");
  Serial.println("╚════════════════════════════════════════════════════════════╝\n");

  // Inicializar componentes
  inicializarI2C();
  inicializarServos();

  // Configurar MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(callbackMQTT);
  mqttClient.setBufferSize(256);

  // Conectar WiFi
  Serial.println("\n[INIT] Inicializando WiFi...");
  conectarWiFi();

  Serial.println("\n[INIT] Sistema pronto!\n");
  Serial.println("═══════════════════════════════════════════════════════════");
  Serial.println("Status: WiFi=" + String(WiFi.status() == WL_CONNECTED ? "OK" : "ERR"));
  Serial.println("        MQTT=" + String(mqttClient.connected() ? "OK" : "AWAIT"));
  Serial.println("        I2C=OK  SERVO=OK");
  Serial.println("═══════════════════════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════
void loop() {
  // Manter conexões ativas
  conectarWiFi();
  conectarMQTT();

  // Processar MQTT
  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  // Ler sensores
  lerSensoresVagas();    // Vagas 1-20
  lerSensoresPortao();   // Sensores de entrada/saída

  // Publicar heartbeat periódico
  publicarHeartbeat();

  // Pequeno delay para evitar watchdog trigger
  delay(10);
}
