/*
 * ============================================================
 *  Parking System — ESP32 Smart Gate Control
 * ============================================================
 *  
 *  ✅ FEATURES:
 *     • Controle inteligente de 2 cancelas (Entrada/Saída)
 *     • Sincronização de vagas via MQTT
 *     • Sensores IR para detecção de carros
 *     • Servo motors com posições: Fechada (0°) / Aberta (90°)
 *     • Máquina de estado para cada cancela
 *     • Reconexão WiFi/MQTT automática
 *
 *  TÓPICOS MQTT:
 *     • Subscribe: parking/spots/snapshot → Sincroniza vagas
 *     • Publish:   parking/entry         → Evento de entrada
 *     • Publish:   parking/exit          → Evento de saída
 *     • Publish:   parking/device/status → Status da ESP32
 *
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MCP23X17.h>
#include <ESP32Servo.h>

// ============================================================
//  📝 CONFIGURAÇÃO
// ============================================================

#include "../include/Config.h"
#include "../include/ParkingConfig.h"

// ============================================================
//  🔧 VARIÁVEIS GLOBAIS
// ============================================================

WiFiClient espClient;
PubSubClient mqtt(espClient);
Adafruit_MCP23X17 mcp0;
Adafruit_MCP23X17 mcp1;
Servo servoEntrada;
Servo servoSaida;

// 📊 Estado de vagas (sincronizado via MQTT)
struct {
  uint8_t vagasTotais = TOTAL_SPOTS;
  uint8_t vagasOcupadas = 0;
  uint8_t vagasLivres = TOTAL_SPOTS;
  unsigned long lastUpdateMs = 0;
} vagasState;

// 🚪 Máquina de Estado - Cancela de Entrada
enum GateState {
  GATE_IDLE,
  GATE_CAR_DETECTED,
  GATE_OPENING,
  GATE_OPEN,
  GATE_WAITING_CAR_PASS,
  GATE_CLOSING,
  GATE_CLOSED,
  GATE_BLOCKED  // Sem vagas
};

struct {
  GateState state = GATE_IDLE;
  unsigned long stateChangeMs = 0;
  uint8_t consecutiveReadings = 0;
  bool lastSensorReading = false;
} gateEntry;

struct {
  GateState state = GATE_IDLE;
  unsigned long stateChangeMs = 0;
  uint8_t consecutiveReadings = 0;
  bool lastSensorReading = false;
} gateSaida;

// ⏱️ Timers
unsigned long lastMqttPublishMs = 0;
unsigned long lastStatusPublishMs = 0;

// ============================================================
//  📨 CALLBACKS E HANDLERS
// ============================================================

/**
 * Callback ao receber mensagens MQTT
 * Processa mensagens de sincronização de vagas
 */
void onMessageReceived(char* topic, byte* payload, unsigned int length) {
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("[MQTT RX] Tópico: ");
  Serial.println(topic);

  // Copia payload para string segura
  char buffer[512] = {0};
  if (length > 510) length = 510;
  strncpy(buffer, (char*)payload, length);

  Serial.print("[MQTT RX] Payload: ");
  Serial.println(buffer);

  // ✅ Processa snapshot de vagas
  if (strcmp(topic, TOPIC_SPOT_SNAPSHOT) == 0) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, buffer);

    if (!error) {
      if (doc.containsKey("totalSpots")) {
        vagasState.vagasTotais = doc["totalSpots"];
      }
      if (doc.containsKey("occupiedSpots")) {
        vagasState.vagasOcupadas = doc["occupiedSpots"];
      }
      if (doc.containsKey("availableSpots")) {
        vagasState.vagasLivres = doc["availableSpots"];
      }

      vagasState.lastUpdateMs = millis();

      Serial.print("  → Vagas Totais: ");
      Serial.print(vagasState.vagasTotais);
      Serial.print(" | Ocupadas: ");
      Serial.print(vagasState.vagasOcupadas);
      Serial.print(" | Livres: ");
      Serial.println(vagasState.vagasLivres);
    } else {
      Serial.print("[JSON] ❌ Erro: ");
      Serial.println(error.f_dealloc());
    }
  }

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
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("[WiFi] ✅ Conectado!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[WiFi] ❌ Não conseguiu conectar. Reiniciando...");
    delay(1000);
    ESP.restart();
  }
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
    Serial.print("[MQTT] Broker: ");
    Serial.println(MQTT_BROKER);

    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println("[MQTT] ✅ Conectado!");

      // Subscreve aos tópicos necessários
      mqtt.subscribe(TOPIC_SPOT_SNAPSHOT);
      Serial.print("[MQTT] Inscrito em: ");
      Serial.println(TOPIC_SPOT_SNAPSHOT);

      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } else {
      Serial.println("[MQTT] ❌ Falhou. Tentando em 2s...");
      delay(2000);
    }
  }
}

// ============================================================
//  🔧 SERVO — Controle
// ============================================================

/**
 * Abre a cancela (0°)
 */
void abreServoCancela(Servo& servo, const char* nome) {
  servo.write(SERVO_OPEN_ANGLE);
  Serial.print("[SERVO] ");
  Serial.print(nome);
  Serial.print(" → ");
  Serial.print(SERVO_OPEN_ANGLE);
  Serial.println("° (ABERTA)");
}

/**
 * Fecha a cancela (90°)
 */
void fechaServoCancela(Servo& servo, const char* nome) {
  servo.write(SERVO_CLOSED_ANGLE);
  Serial.print("[SERVO] ");
  Serial.print(nome);
  Serial.print(" → ");
  Serial.print(SERVO_CLOSED_ANGLE);
  Serial.println("° (FECHADA)");
}

// ============================================================
//  📖 SENSORES — Leitura
// ============================================================

/**
 * Lê sensor IR de entrada (MCP2 pino 6)
 * Retorna true se carro detectado (pino em LOW)
 */
bool lerSensorEntrada() {
  return !mcp1.digitalRead(ENTRY_GATE_PIN); // Inverte porque é ativo-baixo
}

/**
 * Lê sensor IR de saída (MCP2 pino 7)
 * Retorna true se carro detectado (pino em LOW)
 */
bool lerSensorSaida() {
  return !mcp1.digitalRead(EXIT_GATE_PIN); // Inverte porque é ativo-baixo
}

/**
 * Debounce simples para leitura de sensores
 */
bool lerSensorComDebounce(bool (*lerFunc)(), bool& ultimaLeitura, uint8_t& contador) {
  bool leitura = lerFunc();

  if (leitura == ultimaLeitura) {
    contador++;
    if (contador >= 3) { // 3 leituras consecutivas = confirmado
      return leitura;
    }
  } else {
    contador = 0;
    ultimaLeitura = leitura;
  }

  return ultimaLeitura; // Retorna última leitura estável
}

// ============================================================
//  🚪 LÓGICA DE CANCELAS
// ============================================================

/**
 * Máquina de estado: Cancela de Entrada
 * Abre SOMENTE se houver vagas disponíveis
 */
void updateGateEntry() {
  bool carroDetectado = lerSensorComDebounce(lerSensorEntrada, gateEntry.lastSensorReading, gateEntry.consecutiveReadings);
  unsigned long agora = millis();
  unsigned long tempoDecorrido = agora - gateEntry.stateChangeMs;

  switch (gateEntry.state) {
    case GATE_IDLE:
      if (carroDetectado) {
        Serial.println("[ENTRADA] 🚗 Carro detectado no sensor!");

        if (vagasState.vagasLivres > 0) {
          Serial.println("[ENTRADA] ✅ Vagas disponíveis. Abrindo cancela...");
          abreServoCancela(servoEntrada, "Entrada");
          gateEntry.state = GATE_OPENING;
          gateEntry.stateChangeMs = agora;
        } else {
          Serial.println("[ENTRADA] ❌ Estacionamento LOTADO! Mantendo cancela fechada.");
          gateEntry.state = GATE_BLOCKED;
          gateEntry.stateChangeMs = agora;
        }
      }
      break;

    case GATE_OPENING:
      // Aguarda o tempo de abertura antes de marcar como aberta
      if (tempoDecorrido >= 500) {
        gateEntry.state = GATE_OPEN;
        gateEntry.stateChangeMs = agora;
      }
      break;

    case GATE_OPEN:
      // Aguarda carro passar (sensor deixar de detectar)
      if (!carroDetectado) {
        Serial.println("[ENTRADA] ✅ Carro passou. Esperando 2s antes de fechar...");
        gateEntry.state = GATE_WAITING_CAR_PASS;
        gateEntry.stateChangeMs = agora;
      }
      break;

    case GATE_WAITING_CAR_PASS:
      // Aguarda 2 segundos após carro passar
      if (tempoDecorrido >= 2000) {
        Serial.println("[ENTRADA] 🔒 Fechando cancela...");
        fechaServoCancela(servoEntrada, "Entrada");
        gateEntry.state = GATE_CLOSING;
        gateEntry.stateChangeMs = agora;

        // 📤 Publica evento de entrada com vagaId obrigatório
        StaticJsonDocument<256> doc;
        doc["parkingLotId"] = PARKING_LOT_ID;
        doc["vagaId"] = "spot-sensor-entrada"; // ID da vaga associada ao sensor de entrada
        doc["eventType"] = "entry";
        doc["timestamp"] = millis();
        String payload;
        serializeJson(doc, payload);
        mqtt.publish(TOPIC_PARKING_ENTRY, payload.c_str());
        Serial.print("[MQTT TX] ");
        Serial.println(TOPIC_PARKING_ENTRY);
        Serial.print("[MQTT] Payload: ");
        Serial.println(payload);
      }
      break;

    case GATE_CLOSING:
      // Aguarda cancelamento do fechamento
      if (tempoDecorrido >= 500) {
        gateEntry.state = GATE_CLOSED;
        gateEntry.stateChangeMs = agora;
      }
      break;

    case GATE_CLOSED:
      // Aguarda timeout para voltar a IDLE
      if (tempoDecorrido >= 1000) {
        gateEntry.state = GATE_IDLE;
        gateEntry.stateChangeMs = agora;
      }
      break;

    case GATE_BLOCKED:
      // Mantém cancela fechada enquanto estacionamento está lotado
      if (vagasState.vagasLivres > 0) {
        Serial.println("[ENTRADA] ✅ Vagas liberadas! Voltando ao modo normal.");
        gateEntry.state = GATE_IDLE;
        gateEntry.stateChangeMs = agora;
      }
      // Timeout: após 10 segundos, tenta voltar a IDLE
      if (tempoDecorrido >= 10000) {
        gateEntry.state = GATE_IDLE;
        gateEntry.stateChangeMs = agora;
      }
      break;

    default:
      gateEntry.state = GATE_IDLE;
      break;
  }
}

/**
 * Máquina de estado: Cancela de Saída
 * Abre SEMPRE que detectar carro
 */
void updateGateSaida() {
  bool carroDetectado = lerSensorComDebounce(lerSensorSaida, gateSaida.lastSensorReading, gateSaida.consecutiveReadings);
  unsigned long agora = millis();
  unsigned long tempoDecorrido = agora - gateSaida.stateChangeMs;

  switch (gateSaida.state) {
    case GATE_IDLE:
      if (carroDetectado) {
        Serial.println("[SAÍDA] 🚗 Carro detectado no sensor!");
        Serial.println("[SAÍDA] ✅ Abrindo cancela...");
        abreServoCancela(servoSaida, "Saída");
        gateSaida.state = GATE_OPENING;
        gateSaida.stateChangeMs = agora;
      }
      break;

    case GATE_OPENING:
      if (tempoDecorrido >= 500) {
        gateSaida.state = GATE_OPEN;
        gateSaida.stateChangeMs = agora;
      }
      break;

    case GATE_OPEN:
      // Aguarda carro passar
      if (!carroDetectado) {
        Serial.println("[SAÍDA] ✅ Carro passou. Esperando 2s antes de fechar...");
        gateSaida.state = GATE_WAITING_CAR_PASS;
        gateSaida.stateChangeMs = agora;
      }
      break;

    case GATE_WAITING_CAR_PASS:
      if (tempoDecorrido >= 2000) {
        Serial.println("[SAÍDA] 🔒 Fechando cancela...");
        fechaServoCancela(servoSaida, "Saída");
        gateSaida.state = GATE_CLOSING;
        gateSaida.stateChangeMs = agora;

        // 📤 Publica evento de saída com vagaId obrigatório
        StaticJsonDocument<256> doc;
        doc["parkingLotId"] = PARKING_LOT_ID;
        doc["vagaId"] = "spot-sensor-saida"; // ID da vaga associada ao sensor de saída
        doc["eventType"] = "exit";
        doc["timestamp"] = millis();
        String payload;
        serializeJson(doc, payload);
        mqtt.publish(TOPIC_PARKING_EXIT, payload.c_str());
        Serial.print("[MQTT TX] ");
        Serial.println(TOPIC_PARKING_EXIT);
        Serial.print("[MQTT] Payload: ");
        Serial.println(payload);
      }
      break;

    case GATE_CLOSING:
      if (tempoDecorrido >= 500) {
        gateSaida.state = GATE_CLOSED;
        gateSaida.stateChangeMs = agora;
      }
      break;

    case GATE_CLOSED:
      if (tempoDecorrido >= 1000) {
        gateSaida.state = GATE_IDLE;
        gateSaida.stateChangeMs = agora;
      }
      break;

    default:
      gateSaida.state = GATE_IDLE;
      break;
  }
}

// ============================================================
//  📤 STATUS — Publicação
// ============================================================

/**
 * Publica status da ESP32 no MQTT
 */
void publishDeviceStatus() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = MQTT_CLIENT_ID;
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["status"] = "online";
  doc["uptime_s"] = millis() / 1000;
  doc["wifiSignal_dbm"] = WiFi.RSSI();
  doc["entryGateState"] = gateEntry.state;
  doc["exitGateState"] = gateSaida.state;
  doc["vagasLivres"] = vagasState.vagasLivres;
  doc["vagasOcupadas"] = vagasState.vagasOcupadas;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  bool ok = mqtt.publish(TOPIC_DEVICE_STATUS, payload.c_str(), true);
  Serial.print("[MQTT TX] Status publicado: ");
  Serial.println(ok ? "✅" : "❌");
}

// ============================================================
//  ⚡ SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("════════════════════════════════════════════════");
  Serial.println("   Parking System — Smart Gate Control");
  Serial.println("   ESP32 + 2 Servo Gates + IR Sensors");
  Serial.println("════════════════════════════════════════════════");
  Serial.println();

  // 🌐 WiFi
  connectWiFi();
  Serial.println();

  // 🔌 I2C / MCP23017
  Serial.println("[I2C] Inicializando...");
  Wire.begin(21, 22); // SDA=21, SCL=22 (padrão ESP32)

  if (!mcp0.begin_I2C(MCP1_ADDR)) {
    Serial.println("[MCP23017 #0] ❌ Não encontrado em 0x20");
    while (1) delay(1000);
  }
  Serial.println("[MCP23017 #0] ✅ Detectado em 0x20");

  if (!mcp1.begin_I2C(MCP2_ADDR)) {
    Serial.println("[MCP23017 #1] ❌ Não encontrado em 0x21");
    while (1) delay(1000);
  }
  Serial.println("[MCP23017 #1] ✅ Detectado em 0x21");

  // Configura sensores de entrada/saída como INPUT
  mcp1.pinMode(ENTRY_GATE_PIN, INPUT_PULLUP);
  mcp1.pinMode(EXIT_GATE_PIN, INPUT_PULLUP);
  Serial.println("[Sensores IR] ✅ Configurados (MCP2: pinos 6 e 7)");

  // 🎛️ Servo Motors
  servoEntrada.attach(SERVO_ENTRY_PIN, 1000, 2000); // PWM: 1000-2000 µs
  servoSaida.attach(SERVO_EXIT_PIN, 1000, 2000);
  fechaServoCancela(servoEntrada, "Entrada");
  fechaServoCancela(servoSaida, "Saída");
  Serial.println("[Servo Motors] ✅ Configurados e fechados");

  // 🔌 MQTT
  Serial.println();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessageReceived);
  connectMQTT();

  // Inicializa timers
  lastMqttPublishMs = millis();
  lastStatusPublishMs = millis();

  Serial.println();
  Serial.println("[Sistema] ✅ Pronto! Aguardando carros...");
  Serial.println();
}

// ============================================================
//  🔄 LOOP
// ============================================================

void loop() {
  unsigned long agora = millis();

  // 🌐 WiFi — Reconexão automática
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Conexão perdida. Reconectando...");
    connectWiFi();
  }

  // 🔌 MQTT — Reconexão automática
  if (!mqtt.connected()) {
    connectMQTT();
  }

  mqtt.loop();

  // 🚪 Atualiza máquinas de estado das cancelas
  updateGateEntry();
  updateGateSaida();

  // 📤 Publica status periodicamente (a cada 15s)
  if (agora - lastStatusPublishMs >= DEVICE_STATUS_PUBLISH_MS) {
    lastStatusPublishMs = agora;
    publishDeviceStatus();
  }

  delay(50); // Pequeno delay para evitar travamento
}
