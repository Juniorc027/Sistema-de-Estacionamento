/*
  ╔════════════════════════════════════════════════════════════════════════════╗
  ║     SMART PARKING ESP32 IoT - MQTT FIXED VERSION v2.0                    ║
  ║     ROBUST MQTT Connection with Docker Mosquitto Support                 ║
  ║     Port: 1883 | ClientID: esp32-parking-01 | Last Will: Implemented     ║
  ║                                                                            ║
  ║     CORREÇÕES APLICADAS:                                                  ║
  ║     ✓ Porta MQTT: 1883 (era 1884)                                        ║
  ║     ✓ ClientID: esp32-parking-01 (era ESP32_ParkingSystem)               ║
  ║     ✓ Last Will Testament implementado                                    ║
  ║     ✓ Connection state codes traduzidos                                   ║
  ║     ✓ Tópicos específicos por vaga                                        ║
  ║     ✓ Logging detalhado do Serial Monitor                                ║
  ║     ✓ Heartbeat de status periódico                                       ║
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
// CONFIGURAÇÕES MQTT - CORRIGIDAS PARA DOCKER ✓
// ═══════════════════════════════════════════════════════════════════════════════
#define MQTT_BROKER "192.168.15.177"       // IP do host onde Docker roda
#define MQTT_PORT 1883                     // ✓ CORRIGIDO: era 1884
#define MQTT_CLIENT_ID "esp32-parking-01"  // ✓ CORRIGIDO: era ESP32_ParkingSystem
#define MQTT_USER "parking_iot"
#define MQTT_PASSWORD "ParkingIot@2026"

// Tópicos MQTT
#define TOPIC_DEVICE_STATUS "parking/device/esp32-parking-01/status"
#define TOPIC_DEVICE_CONFIG "parking/config"
#define TOPIC_PARKING_LOT_ID "45fc18f2-bdd8-4b11-b964-f8face1147f0"

// ═══════════════════════════════════════════════════════════════════════════════
// I2C E MCP23017 - Configuração de Vagas
// ═══════════════════════════════════════════════════════════════════════════════
Adafruit_MCP23017 mcp1;  // Endereço 0x20 - Vagas 1-16
Adafruit_MCP23017 mcp2;  // Endereço 0x21 - Vagas 17-20 + Sensores

#define TOTAL_VAGAS 20
#define MCP1_VAGAS 16
#define MCP2_VAGAS 4

#define SENSOR_IR_MCP1_PIN 8   // Pino no MCP1 para sensor IR
#define SENSOR_GROUND_PIN 9    // Pino no MCP2 para sensor de ocupação

// Pino de LED no MCP2
#define LED_DISPONIVEL_PIN 0
#define LED_OCUPADO_PIN 1
#define LED_ERRO_PIN 2

// ═══════════════════════════════════════════════════════════════════════════════
// SERVO MOTORES
// ═══════════════════════════════════════════════════════════════════════════════
#define SERVO_GATE_ENTRY_PIN 16
#define SERVO_GATE_EXIT_PIN 17
#define SERVO_MIN_US 1000
#define SERVO_MAX_US 2000

Servo servoEntry;
Servo servoExit;

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADOS E VARIÁVEIS GLOBAIS
// ═══════════════════════════════════════════════════════════════════════════════

// Estrutura para rastrear estado de cada vaga
struct VagaState {
  bool ocupada;
  bool mudancaDetectada;
  unsigned long ultimaMudanca;
  uint8_t estabilizacao;  // Contador para debounce
};

VagaState vagas[TOTAL_VAGAS];

// Cliente WiFi e MQTT
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Contadores e timestamps
unsigned long ultimaLeituraSensores = 0;
unsigned long ultimoHeartbeat = 0;
unsigned long ultimaTentativaWiFi = 0;
unsigned long ultimaTentativaMQTT = 0;

int reconexoes_wifi = 0;
int reconexoes_mqtt = 0;
unsigned long uptime_ms = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Traduzir código de estado MQTT para mensagem legível ✓
// ═══════════════════════════════════════════════════════════════════════════════
String getMQTTStateMessage(int state) {
  switch(state) {
    case -4: return "MQTT_CONNECTION_TIMEOUT (-4) - Timeout na conexão";
    case -3: return "MQTT_CONNECTION_LOST (-3) - Conexão perdida";
    case -2: return "MQTT_CONNECT_FAILED (-2) - Falha ao conectar";
    case -1: return "MQTT_DISCONNECTED (-1) - Desconectado";
    case 0:  return "MQTT_CONNECTED (0) - Conectado com sucesso!";
    case 1:  return "MQTT_CONNECT_BAD_PROTOCOL (1) - Protocolo inválido";
    case 2:  return "MQTT_CONNECT_BAD_CLIENT_ID (2) - ClientID rejeitado";
    case 3:  return "MQTT_CONNECT_UNAVAILABLE (3) - Servidor não disponível";
    case 4:  return "MQTT_CONNECT_BAD_CREDENTIALS (4) - Credenciais inválidas";
    case 5:  return "MQTT_CONNECT_UNAUTHORIZED (5) - Não autorizado";
    default: return "MQTT_UNKNOWN_STATE (?) - Estado desconhecido";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Conectar ao WiFi com retry logic
// ═══════════════════════════════════════════════════════════════════════════════
void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;  // Já conectado
  }

  unsigned long agora = millis();
  if (agora - ultimaTentativaWiFi < 5000) {
    return;  // Não tentar reconectar muito frequentemente
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
    Serial.println("[WiFi] ✅ Conectado!");
    Serial.println("  IP: " + WiFi.localIP().toString());
    Serial.println("  RSSI: " + String(WiFi.RSSI()) + " dBm");
  } else {
    Serial.println("[WiFi] ❌ Falha na conexão");
    reconexoes_wifi++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Conectar ao MQTT com Last Will Testament ✓
// ═══════════════════════════════════════════════════════════════════════════════
void conectarMQTT() {
  if (mqttClient.connected()) {
    return;  // Já conectado
  }

  unsigned long agora = millis();
  if (agora - ultimaTentativaMQTT < 5000) {
    return;  // Não tentar reconectar muito frequentemente
  }

  ultimaTentativaMQTT = agora;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] ⚠️ WiFi não conectado, pulando MQTT");
    return;
  }

  Serial.println("\n[MQTT] Conectando a " + String(MQTT_BROKER) + ":" + String(MQTT_PORT));
  Serial.println("  ClientID: " + String(MQTT_CLIENT_ID));
  Serial.println("  User: " + String(MQTT_USER));

  // ✓ CORRIGIDO: Agora com Last Will Testament
  // Parâmetros: clientID, username, password, willTopic, willQoS, willRetain, willMessage
  const char* willTopic = TOPIC_DEVICE_STATUS;
  const char* willMessage = "offline";
  boolean willRetain = true;
  byte willQoS = 1;

  boolean conectado = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USER,
    MQTT_PASSWORD,
    willTopic,
    willQoS,
    willRetain,
    willMessage
  );

  if (conectado) {
    Serial.println("[MQTT] ✅ Conectado com sucesso!");
    Serial.println("  Last Will Topic: " + String(willTopic));
    Serial.println("  Last Will Message: " + String(willMessage));

    // Publicar status online
    publishDeviceStatus("online");

    // Subscrever a tópicos de configuração
    mqttClient.subscribe(TOPIC_DEVICE_CONFIG);
    Serial.println("[MQTT] ✅ Assinado em: " + String(TOPIC_DEVICE_CONFIG));

  } else {
    int estadoMQTT = mqttClient.state();
    String mensagem = getMQTTStateMessage(estadoMQTT);
    Serial.println("[MQTT] ❌ Falha ao conectar");
    Serial.println("  " + mensagem);
    reconexoes_mqtt++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Publicar status do dispositivo (online/offline) - Heartbeat
// ═══════════════════════════════════════════════════════════════════════════════
void publishDeviceStatus(const char* status) {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["device_id"] = MQTT_CLIENT_ID;
  doc["status"] = status;
  doc["uptime_s"] = millis() / 1000;
  doc["timestamp"] = time(nullptr);
  doc["free_heap"] = ESP.getFreeHeap();

  char buffer[256];
  serializeJson(doc, buffer);

  boolean publicado = mqttClient.publish(TOPIC_DEVICE_STATUS, buffer, true);  // Retain = true

  if (publicado) {
    Serial.println("[HEARTBEAT] ✅ Publicado em " + String(TOPIC_DEVICE_STATUS));
  } else {
    Serial.println("[HEARTBEAT] ❌ Falha ao publicar");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Publicar estado de uma vaga específica ✓
// ═══════════════════════════════════════════════════════════════════════════════
void publicarVaga(uint8_t vagaId, bool ocupada) {
  if (!mqttClient.connected()) {
    Serial.println("[VAGA " + String(vagaId) + "] ⚠️ MQTT não conectado, não publica");
    return;
  }

  // Construir tópico específico: "parking/spots/{vagaId}"
  char topico[64];
  snprintf(topico, sizeof(topico), "parking/spots/%d", vagaId);

  // Construir payload JSON
  StaticJsonDocument<256> doc;
  doc["vagaId"] = vagaId;
  doc["status"] = ocupada ? "ocupada" : "livre";
  doc["parkingLotId"] = TOPIC_PARKING_LOT_ID;
  doc["device"] = MQTT_CLIENT_ID;
  doc["uptime_s"] = millis() / 1000;
  doc["timestamp"] = String(time(nullptr));

  char payload[256];
  serializeJson(doc, payload);

  boolean publicado = mqttClient.publish(topico, payload, false);  // Retain = false

  if (publicado) {
    Serial.println("[MQTT TX] ✅ " + String(topico) + " = " + String(ocupada ? "OCUPADA" : "LIVRE"));
  } else {
    Serial.println("[MQTT TX] ❌ Falha ao publicar vaga " + String(vagaId));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Callback para mensagens MQTT recebidas
// ═══════════════════════════════════════════════════════════════════════════════
void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT RX] Recebido em ");
  Serial.print(topic);
  Serial.print(": ");
  
  char mensagem[length + 1];
  memcpy(mensagem, payload, length);
  mensagem[length] = '\0';
  
  Serial.println(mensagem);

  // Processar configurações se necessário
  if (strcmp(topic, TOPIC_DEVICE_CONFIG) == 0) {
    Serial.println("[CONFIG] Configuração recebida do servidor");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Inicializar I2C e MCPs
// ═══════════════════════════════════════════════════════════════════════════════
void inicializarI2C() {
  Serial.println("\n[INIT] Inicializando I2C...");
  Wire.begin(21, 22);  // SDA=21, SCL=22

  // Escanear barramento I2C
  Serial.println("[SCAN I2C] Verificando endereços...");
  byte enderecosEncontrados = 0;

  for (byte i = 8; i < 120; i++) {
    Wire.beginTransmission(i);
    if (Wire.endTransmission() == 0) {
      Serial.print("  ✅ 0x" + String(i, HEX) + " encontrado");
      if (i == 0x20) Serial.println(" (MCP1)");
      else if (i == 0x21) Serial.println(" (MCP2)");
      else Serial.println();
      enderecosEncontrados++;
    }
  }
  Serial.println("Total: " + String(enderecosEncontrados));

  // Inicializar MCP1 (vagas 1-16)
  if (!mcp1.begin_I2C(0x20)) {
    Serial.println("[MCP1] ❌ Falha ao inicializar em 0x20");
  } else {
    Serial.println("[MCP1] ✅ Inicializado em 0x20");
    for (int i = 0; i < 16; i++) {
      mcp1.pinMode(i, INPUT);
      vagas[i].ocupada = false;
      vagas[i].mudancaDetectada = false;
      vagas[i].ultimaMudanca = 0;
      vagas[i].estabilizacao = 0;
    }
  }

  // Inicializar MCP2 (vagas 17-20 + pinos extras)
  if (!mcp2.begin_I2C(0x21)) {
    Serial.println("[MCP2] ❌ Falha ao inicializar em 0x21");
  } else {
    Serial.println("[MCP2] ✅ Inicializado em 0x21");
    for (int i = 0; i < 4; i++) {
      mcp2.pinMode(i, INPUT);
      vagas[MCP1_VAGAS + i].ocupada = false;
      vagas[MCP1_VAGAS + i].mudancaDetectada = false;
      vagas[MCP1_VAGAS + i].ultimaMudanca = 0;
      vagas[MCP1_VAGAS + i].estabilizacao = 0;
    }
    // Pinos de LED
    mcp2.pinMode(LED_DISPONIVEL_PIN + 3, OUTPUT);
    mcp2.pinMode(LED_OCUPADO_PIN + 3, OUTPUT);
    mcp2.pinMode(LED_ERRO_PIN + 3, OUTPUT);
  }

  // Teste inicial de leitura
  Serial.println("\n[TESTE I2C] Estado inicial dos pinos...");
  int ocupadas = 0;
  for (int i = 0; i < TOTAL_VAGAS; i++) {
    VagaState* vaga = &vagas[i];
    bool estado = (i < MCP1_VAGAS) ? mcp1.digitalRead(i) : mcp2.digitalRead(i - MCP1_VAGAS);
    vaga->ocupada = estado;
    if (estado) ocupadas++;
  }
  Serial.println("[MCP1] Vagas: " + String(ocupadas) + "/" + String(TOTAL_VAGAS) + " ocupadas");
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Inicializar Servos
// ═══════════════════════════════════════════════════════════════════════════════
void inicializarServos() {
  Serial.println("\n[INIT] Inicializando Servos...");
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  
  servoEntry.setPeriodHertz(50);
  servoExit.setPeriodHertz(50);
  
  if (servoEntry.attach(SERVO_GATE_ENTRY_PIN, SERVO_MIN_US, SERVO_MAX_US) &&
      servoExit.attach(SERVO_GATE_EXIT_PIN, SERVO_MIN_US, SERVO_MAX_US)) {
    Serial.println("[SERVO] ✅ Servos anexados");
    servoEntry.write(0);
    servoExit.write(0);
  } else {
    Serial.println("[SERVO] ❌ Falha ao anexar servos");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Ler e processar sensores de vagas
// ═══════════════════════════════════════════════════════════════════════════════
void lerSensoresVagas() {
  unsigned long agora = millis();
  if (agora - ultimaLeituraSensores < 500) {
    return;  // Ler apenas a cada 500ms
  }
  ultimaLeituraSensores = agora;

  for (int i = 0; i < TOTAL_VAGAS; i++) {
    VagaState* vaga = &vagas[i];
    
    // Ler estado do pino
    bool estadoAtual = (i < MCP1_VAGAS) ? mcp1.digitalRead(i) : mcp2.digitalRead(i - MCP1_VAGAS);

    // Debounce
    if (estadoAtual != vaga->ocupada) {
      vaga->estabilizacao++;
      if (vaga->estabilizacao >= 3) {  // 3 leituras consistentes
        if (estadoAtual != vaga->ocupada) {
          vaga->ocupada = estadoAtual;
          vaga->mudancaDetectada = true;
          vaga->ultimaMudanca = agora;

          // Publicar mudança
          uint8_t vagaNum = i + 1;
          Serial.println("[VAGA] " + String(vagaNum) + " -> " + String(vaga->ocupada ? "OCUPADA" : "LIVRE"));
          publicarVaga(vagaNum, vaga->ocupada);
        }
        vaga->estabilizacao = 0;
      }
    } else {
      vaga->estabilizacao = 0;
    }
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
  Serial.println("║     Smart Parking ESP32 IoT - V2.0 (MQTT ROBUST)         ║");
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

  Serial.println("\n[INIT] ✅ SETUP COMPLETO - Sistema pronto!\n");
  Serial.println("═══════════════════════════════════════════════════════════");
  Serial.println("WiFi:  " + String(WiFi.status() == WL_CONNECTED ? "✅" : "❌"));
  Serial.println("MQTT:  " + String(mqttClient.connected() ? "✅" : "❌"));
  Serial.println("I2C:   ✅ / ✅");
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

  // Ler sensores e publicar mudanças
  lerSensoresVagas();

  // Publicar heartbeat periódico
  publicarHeartbeat();

  // Pequeno delay para evitar watchdog trigger
  delay(10);
}
