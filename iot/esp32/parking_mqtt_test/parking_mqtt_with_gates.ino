/*
 * ============================================================
 *  Parking System — ESP32 MQTT + Servos de Entrada/Saída
 * ============================================================
 *  
 *  ✅ VERSÃO COM CATRACA (CANCELA):
 *     • 2 Servos: Entrada (GPIO 32) + Saída (GPIO 33)
 *     • 2 IR Sensors: Entrada (MCP1/B6) + Saída (MCP1/A6)
 *     • 20 Vagas via 2x MCP23017
 *     • MQTT em tempo real
 *
 *  Bibliotecas necessárias (Library Manager):
 *    - PubSubClient  (by Nick O'Leary)
 *    - ArduinoJson   (by Benoit Blanchon)
 *    - Adafruit MCP23017
 *    - ESP32Servo    (by John K. Bennett) — NÃO use Servo.h padrão!
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MCP23X17.h>
#include <ESP32Servo.h>  // ⭐ IMPORTANTE: ESP32Servo, não Servo.h!

// ============================================================
//  ⚙️ CONFIGURAÇÕES — AJUSTE AQUI
// ============================================================

// 🌐 WiFi
const char* WIFI_SSID     = "Moto G (5) 5987";
const char* WIFI_PASSWORD = "200512mari";

// 🔌 MQTT BROKER
const char* MQTT_BROKER   = "10.169.240.210";
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT_ID = "esp32-parking-01";
const char* MQTT_USERNAME  = "parking_iot";
const char* MQTT_PASSWORD  = "ParkingIot@2026";

// 📡 Tópicos MQTT
const char* TOPIC_SPOT_BASE = "parking/spots";
const char* TOPIC_STATUS    = "parking/status";
const char* TOPIC_DEVICE_STATUS = "parking/device/esp32-parking-01/status";
const char* TOPIC_GATE_ENTRY = "parking/gates/entry";
const char* TOPIC_GATE_EXIT  = "parking/gates/exit";

// 🏢 ID do Estacionamento
const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";

// 🅿️ Total de Vagas
const int TOTAL_VAGAS = 20;

// 🔌 Endereços I2C dos MCP23017
const uint8_t MCP_ADDRESS_0 = 0x20;
const uint8_t MCP_ADDRESS_1 = 0x21;

// 📊 Intervalo de leitura (ms)
const unsigned long READ_INTERVAL = 500;

// ============================================================
//  🚪 CONFIGURAÇÃO DOS SERVOS E IR SENSORS
// ============================================================

// Servos
#define SERVO_ENTRY_PIN  32  // Servo entrada
#define SERVO_EXIT_PIN   33  // Servo saída

// IR Sensors (ambos no MCP1 / 0x21)
#define IR_ENTRY_MCP_PIN 6   // MCP1 porta A6 (pino 6 biblioteca Adafruit)
#define IR_EXIT_MCP_PIN  14  // MCP1 porta B6 (pino 14 biblioteca Adafruit)

// Estados dos Servos (graus)
#define SERVO_OPEN   90   // Aberto
#define SERVO_CLOSED  0   // Fechado

// Tempo de abertura (ms)
#define GATE_OPEN_TIME 3000

// ============================================================
//  📋 Estrutura de Mapeamento de Sensores
// ============================================================

struct SensorMap {
  uint8_t mcpIndex;
  uint8_t pin;
};

// Mapeamento: Vagas 1..16 → MCP 0, Vagas 17..20 → MCP 1
const SensorMap SENSOR_MAP[TOTAL_VAGAS] = {
  {0, 0}, {0, 1}, {0, 2}, {0, 3}, {0, 4},
  {0, 5}, {0, 6}, {0, 7}, {0, 8}, {0, 9},
  {0,10}, {0,11}, {0,12}, {0,13}, {0,14},
  {0,15}, {1, 0}, {1, 1}, {1, 2}, {1, 3}
};

const bool SENSOR_ACTIVE_LOW = true;

// ============================================================
//  🔧 Variáveis Globais
// ============================================================

WiFiClient espClient;
PubSubClient mqtt(espClient);
Adafruit_MCP23X17 mcp0;
Adafruit_MCP23X17 mcp1;

// Servos
Servo servoEntry;
Servo servoExit;

unsigned long lastReadTime = 0;
int messageCount = 0;
bool vagaOcupada[TOTAL_VAGAS + 1] = {false};

// Estado dos IRs (para debounce)
bool irEntryLastState = HIGH;
bool irExitLastState = HIGH;
unsigned long irEntryLastChangeTime = 0;
unsigned long irExitLastChangeTime = 0;
const unsigned long IR_DEBOUNCE_TIME = 50;  // 50ms debounce

// Estado dos Gates (para evitar múltiplas ativações)
bool gateEntryActive = false;
bool gateExitActive = false;
unsigned long gateEntryOpenTime = 0;
unsigned long gateExitOpenTime = 0;

// ============================================================
//  📨 Callback — Mensagens Recebidas
// ============================================================

void onMessageReceived(char* topic, byte* payload, unsigned int length) {
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("[MQTT] Mensagem Recebida | Tópico: ");
  Serial.println(topic);
  Serial.print("[MQTT] Payload: ");
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ============================================================
//  🌐 WiFi — Conexão
// ============================================================

void connectWiFi() {
  Serial.print("[WiFi] Conectando a: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    tentativas++;
    if (tentativas > 30) {
      Serial.println("\n[WiFi] ❌ Não conseguiu conectar em 15s. Reiniciando...");
      ESP.restart();
    }
  }

  Serial.println();
  Serial.println("[WiFi] ✅ Conectado!");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[WiFi] RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}

// ============================================================
//  🔌 MQTT — Conexão
// ============================================================

void connectMQTT() {
  int tentativa = 0;

  while (!mqtt.connected()) {
    tentativa++;
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("[MQTT] Tentativa #");
    Serial.println(tentativa);
    Serial.print("[MQTT] Broker   : ");
    Serial.println(MQTT_BROKER);
    Serial.print("[MQTT] Porta    : ");
    Serial.println(MQTT_PORT);
    Serial.print("[MQTT] ClientId : ");
    Serial.println(MQTT_CLIENT_ID);
    Serial.print("[MQTT] Usuario  : ");
    Serial.println(MQTT_USERNAME);
    Serial.println("[MQTT] Conectando...");

    if (mqtt.connect(
          MQTT_CLIENT_ID,
          MQTT_USERNAME,
          MQTT_PASSWORD,
          TOPIC_DEVICE_STATUS,
          1,
          true,
          "offline"
        )) {
      Serial.println(" ✅ Conectado!");

      mqtt.publish(TOPIC_DEVICE_STATUS, "online", true);

      mqtt.subscribe(TOPIC_STATUS);
      Serial.print("[MQTT] Inscrito em: ");
      Serial.println(TOPIC_STATUS);
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    } else {
      int rc = mqtt.state();
      Serial.print(" ❌ Falhou. rc=");
      Serial.println(rc);
      
      switch (rc) {
        case -4:
          Serial.println("[MQTT] Erro: Timeout de conexão");
          break;
        case -3:
          Serial.println("[MQTT] Erro: Conexão perdida");
          break;
        case -2:
          Serial.println("[MQTT] Erro: Falha de rede");
          break;
        case -1:
          Serial.println("[MQTT] Erro: Cliente desconectado");
          break;
        case 1:
          Serial.println("[MQTT] Erro: Protocolo MQTT inválido");
          break;
        case 2:
          Serial.println("[MQTT] Erro: Client ID rejeitado");
          break;
        case 3:
          Serial.println("[MQTT] Erro: Servidor indisponível");
          break;
        case 4:
          Serial.println("[MQTT] Erro: Usuário/senha INCORRETOS!");
          break;
        case 5:
          Serial.println("[MQTT] Erro: Não autorizado (ACL)");
          break;
        default:
          Serial.println("[MQTT] Erro desconhecido");
          break;
      }
      
      Serial.println("[MQTT] Tentando novamente em 3s...");
      delay(3000);
    }
  }
}

// ============================================================
//  📖 Leitura de Sensores — Vagas
// ============================================================

bool lerSensorOcupado(int vagaId) {
  if (vagaId < 1 || vagaId > TOTAL_VAGAS) return false;

  SensorMap map = SENSOR_MAP[vagaId - 1];
  bool pinState;

  if (map.mcpIndex == 0) {
    pinState = mcp0.digitalRead(map.pin);
  } else {
    pinState = mcp1.digitalRead(map.pin);
  }

  return SENSOR_ACTIVE_LOW ? (pinState == LOW) : (pinState == HIGH);
}

// ============================================================
//  🚪 SERVOS — Controle de Catraca
// ============================================================

int contarVagasLivres() {
  int livres = 0;
  for (int i = 1; i <= TOTAL_VAGAS; i++) {
    if (!vagaOcupada[i]) {
      livres++;
    }
  }
  return livres;
}

void abrirServo(Servo &servo, const char* nomeCatraca) {
  Serial.println("─────────────────────────────────────");
  Serial.print("[GATE] 🚪 Abrindo catraca: ");
  Serial.println(nomeCatraca);
  servo.write(SERVO_OPEN);
}

void fecharServo(Servo &servo, const char* nomeCatraca) {
  Serial.print("[GATE] 🚪 Fechando catraca: ");
  Serial.println(nomeCatraca);
  servo.write(SERVO_CLOSED);
  Serial.println("─────────────────────────────────────");
}

void acionarCatraca(Servo &servo, const char* nomeCatraca, const char* topicPublish, bool permitir) {
  if (!permitir) {
    Serial.println("─────────────────────────────────────");
    Serial.print("[GATE] ❌ ");
    Serial.print(nomeCatraca);
    Serial.println(" BLOQUEADA - sem vagas disponíveis");
    
    // Publica evento de bloqueio
    mqtt.publish(topicPublish, "{\"status\":\"blocked\",\"reason\":\"no_spots_available\"}", true);
    Serial.println("─────────────────────────────────────");
    return;
  }

  abrirServo(servo, nomeCatraca);
  
  // Publica evento de abertura
  StaticJsonDocument<100> doc;
  doc["status"] = "open";
  doc["timestamp"] = millis();
  String buffer;
  serializeJson(doc, buffer);
  mqtt.publish(topicPublish, buffer.c_str(), true);

  delay(GATE_OPEN_TIME);  // Aguarda 3 segundos
  fecharServo(servo, nomeCatraca);
  
  // Publica evento de fechamento
  doc["status"] = "closed";
  buffer = "";
  serializeJson(doc, buffer);
  mqtt.publish(topicPublish, buffer.c_str(), true);
}

// ============================================================
//  📤 Publicar Status da Vaga
// ============================================================

void enviarVaga(int vagaId, bool ocupada) {
  String topico = String(TOPIC_SPOT_BASE) + "/" + String(vagaId);

  StaticJsonDocument<200> doc;
  doc["vagaId"] = vagaId;
  doc["status"] = ocupada ? "ocupada" : "livre";
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"] = MQTT_CLIENT_ID;
  doc["uptime_s"] = millis() / 1000;

  String buffer;
  serializeJson(doc, buffer);

  bool ok = mqtt.publish(topico.c_str(), buffer.c_str(), true);

  Serial.println("─────────────────────────────────────");
  Serial.print("[MQTT] Vaga ");
  Serial.print(vagaId);
  Serial.print(" → ");
  Serial.print(ocupada ? "ocupada" : "livre");
  Serial.print(" | Tópico: ");
  Serial.println(topico);
  Serial.print("[MQTT] Payload: ");
  Serial.println(buffer);
  Serial.println(ok ? "       ✅ Publicado" : "       ❌ Falha!");
}

// ============================================================
//  🔍 Leitura de IR Sensors — Catracas
// ============================================================

void verificarIREntry() {
  bool irCurrentState = mcp1.digitalRead(IR_ENTRY_MCP_PIN);

  if (irCurrentState != irEntryLastState) {
    irEntryLastChangeTime = millis();
  }

  if ((millis() - irEntryLastChangeTime) > IR_DEBOUNCE_TIME) {
    if (irCurrentState == LOW && irEntryLastState == LOW && !gateEntryActive) {
      // IR detectou veículo (transição confirmada após debounce)
      Serial.println();
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      Serial.println("[IR] 🚗 Veículo detectado na ENTRADA!");
      
      int vagasLivres = contarVagasLivres();
      Serial.print("[GATE] Vagas livres: ");
      Serial.println(vagasLivres);

      if (vagasLivres > 0) {
        gateEntryActive = true;
        Serial.println("[GATE] ✅ Liberando entrada...");
        acionarCatraca(servoEntry, "ENTRADA", TOPIC_GATE_ENTRY, true);
        gateEntryActive = false;
      } else {
        Serial.println("[GATE] ❌ Bloqueando entrada - SEM VAGAS!");
        acionarCatraca(servoEntry, "ENTRADA", TOPIC_GATE_ENTRY, false);
      }
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
  }

  irEntryLastState = irCurrentState;
}

void verificarIRExit() {
  bool irCurrentState = mcp1.digitalRead(IR_EXIT_MCP_PIN);

  if (irCurrentState != irExitLastState) {
    irExitLastChangeTime = millis();
  }

  if ((millis() - irExitLastChangeTime) > IR_DEBOUNCE_TIME) {
    if (irCurrentState == LOW && irExitLastState == LOW && !gateExitActive) {
      // IR detectou veículo
      Serial.println();
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      Serial.println("[IR] 🚗 Veículo detectado na SAÍDA!");
      Serial.println("[GATE] ✅ Liberando saída (sempre permite)...");

      gateExitActive = true;
      acionarCatraca(servoExit, "SAÍDA", TOPIC_GATE_EXIT, true);
      gateExitActive = false;

      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
  }

  irExitLastState = irCurrentState;
}

// ============================================================
//  ⚡ SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("════════════════════════════════════════");
  Serial.println("   Parking System — ESP32 MQTT + GATES");
  Serial.println("════════════════════════════════════════");
  Serial.println();

  // WiFi
  connectWiFi();
  Serial.println();

  // I2C
  Wire.begin();

  if (!mcp0.begin_I2C(MCP_ADDRESS_0)) {
    Serial.println("[MCP23017 #0] ❌ Não encontrado em 0x20");
    while (1) delay(1000);
  }
  Serial.println("[MCP23017 #0] ✅ Detectado em 0x20");

  if (!mcp1.begin_I2C(MCP_ADDRESS_1)) {
    Serial.println("[MCP23017 #1] ❌ Não encontrado em 0x21");
    while (1) delay(1000);
  }
  Serial.println("[MCP23017 #1] ✅ Detectado em 0x21");

  // Sensores de vagas
  for (int i = 0; i < TOTAL_VAGAS; i++) {
    SensorMap map = SENSOR_MAP[i];
    if (map.mcpIndex == 0) {
      mcp0.pinMode(map.pin, INPUT_PULLUP);
    } else {
      mcp1.pinMode(map.pin, INPUT_PULLUP);
    }
  }
  Serial.println("[Sensores] ✅ 20 entradas configuradas");

  // IR Sensors (ambos no MCP1)
  mcp1.pinMode(IR_ENTRY_MCP_PIN, INPUT_PULLUP);
  mcp1.pinMode(IR_EXIT_MCP_PIN, INPUT_PULLUP);
  Serial.println("[IR Sensors] ✅ Entrada e Saída configurados");

  // Servos
  servoEntry.attach(SERVO_ENTRY_PIN);
  servoExit.attach(SERVO_EXIT_PIN);
  servoEntry.write(SERVO_CLOSED);
  servoExit.write(SERVO_CLOSED);
  Serial.println("[Servos] ✅ Entrada (GPIO32) e Saída (GPIO33) configurados");
  Serial.println();

  // MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessageReceived);
  connectMQTT();

  // Estado inicial das vagas
  Serial.println("=== Enviando estado inicial das vagas ===");
  for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
    vagaOcupada[vagaId] = lerSensorOcupado(vagaId);
    enviarVaga(vagaId, vagaOcupada[vagaId]);
    delay(300);
  }

  Serial.println("[Sistema] ✅ Pronto! Monitorando sensores e catracas...");
  Serial.println();
}

// ============================================================
//  🔄 LOOP
// ============================================================

void loop() {
  // WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Conexão perdida. Reconectando...");
    connectWiFi();
  }

  // MQTT
  if (!mqtt.connected()) {
    Serial.println("[MQTT] Conexão perdida. Reconectando...");
    connectMQTT();
  }

  mqtt.loop();

  // 🚪 Verifica catracas (IR Sensors)
  verificarIREntry();
  verificarIRExit();

  // Lê sensores de vagas periodicamente
  unsigned long now = millis();
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
      bool leituraAtual = lerSensorOcupado(vagaId);
      
      if (leituraAtual != vagaOcupada[vagaId]) {
        vagaOcupada[vagaId] = leituraAtual;
        enviarVaga(vagaId, leituraAtual);
      }
    }
  }
}
