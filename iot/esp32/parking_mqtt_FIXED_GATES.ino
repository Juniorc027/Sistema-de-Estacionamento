/*
 * ============================================================
 *  Parking System — ESP32 MQTT com Cancelas (ENTRADA/SAÍDA)
 * ============================================================
 *  VERSÃO CORRIGIDA: Agora lê sensores de entrada e saída
 *  
 *  Sensores:
 *    - MCP #0 (0x20): Vagas 1-16 (pinos 0-15)
 *    - MCP #1 (0x21): Vagas 17-20 + ENTRY/EXIT (pinos 0-3, 6-7)
 *    - Pino 6 (MCP#1): Sensor IR ENTRADA (cancela entrada)
 *    - Pino 7 (MCP#1): Sensor IR SAÍDA (cancela saída)
 *
 *  Bibliotecas:
 *    - PubSubClient (by Nick O'Leary)
 *    - ArduinoJson (by Benoit Blanchon)
 *    - Adafruit_MCP23X17 (by Adafruit)
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MCP23X17.h>

// ============================================================
//  CONFIGURAÇÕES
// ============================================================

// WiFi
const char* WIFI_SSID     = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";

// Broker MQTT
const char* MQTT_BROKER   = "192.168.15.177";
const int   MQTT_PORT     = 1884;
const char* MQTT_CLIENT_ID = "esp32-parking-01";
const char* MQTT_USERNAME  = "parking_iot";
const char* MQTT_PASSWORD  = "ParkingIot@2026";

// Tópicos
const char* TOPIC_ENTRADA = "parking/entry";
const char* TOPIC_SAIDA   = "parking/exit";
const char* TOPIC_SPOT_BASE = "parking/spots";
const char* TOPIC_DEVICE_STATUS = "parking/device/esp32-parking-01/status";

// ID do estacionamento
const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";

// Total de vagas
const int TOTAL_VAGAS = 20;

// Endereços I2C dos MCPs
const uint8_t MCP_ADDRESS_0 = 0x20;
const uint8_t MCP_ADDRESS_1 = 0x21;

// ============================================================
//  PINOS DOS SENSORES IR DE ENTRADA/SAÍDA
// ============================================================
const uint8_t ENTRY_SENSOR_PIN = 6;  // MCP#1, pino 6
const uint8_t EXIT_SENSOR_PIN  = 7;  // MCP#1, pino 7

// Lógica dos sensores:
// true  = sensor ATIVO (carro detectado)
// false = sensor INATIVO (sem carro)
const bool SENSOR_ACTIVE_LOW = true;

// ============================================================
//  MAPEAMENTO DE VAGAS
// ============================================================
struct SensorMap {
  uint8_t mcpIndex;
  uint8_t pin;
};

const SensorMap SENSOR_MAP[TOTAL_VAGAS] = {
  {0, 0}, {0, 1}, {0, 2}, {0, 3}, {0, 4},
  {0, 5}, {0, 6}, {0, 7}, {0, 8}, {0, 9},
  {0,10}, {0,11}, {0,12}, {0,13}, {0,14},
  {0,15}, {1, 0}, {1, 1}, {1, 2}, {1, 3}
};

// ============================================================
//  VARIÁVEIS GLOBAIS
// ============================================================
WiFiClient   espClient;
PubSubClient mqtt(espClient);
Adafruit_MCP23X17 mcp;   // 0x20 - vagas
Adafruit_MCP23X17 mcp2;  // 0x21 - vagas + sensores de gate

unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 500;  // ms

// Estado das vagas
bool vagaOcupada[TOTAL_VAGAS + 1] = {false};

// Estado dos sensores de entrada/saída (debounce)
bool estadoEntradaAnterior = false;
bool estadoSaidaAnterior = false;
uint8_t contadorEntrada = 0;
uint8_t contadorSaida = 0;
const uint8_t DEBOUNCE_THRESHOLD = 3;

// ============================================================
//  CALLBACK MQTT
// ============================================================
void onMessageReceived(char* topic, byte* payload, unsigned int length) {
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("[MQTT RX] Tópico: ");
  Serial.println(topic);
  
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("[MQTT RX] Conteúdo: ");
  Serial.println(message);
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ============================================================
//  CONEXÃO WiFi
// ============================================================
void connectWiFi() {
  Serial.print("[WiFi] Conectando à rede: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    tentativas++;
    if (tentativas > 30) {
      Serial.println("\n[WiFi] ERRO: Não conseguiu conectar. Reiniciando...");
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
//  CONEXÃO MQTT
// ============================================================
void connectMQTT() {
  int tentativa = 0;

  while (!mqtt.connected()) {
    tentativa++;
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("[MQTT] Tentativa #");
    Serial.println(tentativa);
    Serial.print("[MQTT] Broker: ");
    Serial.println(MQTT_BROKER);
    Serial.println("[MQTT] Conectando...");

    if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD, TOPIC_DEVICE_STATUS, 1, true, "offline")) {
      Serial.println("[MQTT] ✅ Conectado!");
      mqtt.publish(TOPIC_DEVICE_STATUS, "online", true);
      mqtt.subscribe(TOPIC_DEVICE_STATUS);
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } else {
      Serial.print("[MQTT] ❌ Falhou. rc=");
      Serial.println(mqtt.state());
      delay(3000);
    }
  }
}

// ============================================================
//  LEITURA DE VAGAS
// ============================================================
bool lerSensorVaga(int vagaId) {
  SensorMap map = SENSOR_MAP[vagaId - 1];
  int raw = (map.mcpIndex == 0) ? mcp.digitalRead(map.pin) : mcp2.digitalRead(map.pin);
  return SENSOR_ACTIVE_LOW ? (raw == LOW) : (raw == HIGH);
}

// ============================================================
//  LEITURA DE ENTRADA/SAÍDA COM DEBOUNCE
// ============================================================
bool lerSensorComDebounce(bool &estadoAnterior, uint8_t &contador, int mcp_pin) {
  bool leituraAtual = (mcp2.digitalRead(mcp_pin) == LOW) == SENSOR_ACTIVE_LOW;
  
  if (leituraAtual == estadoAnterior) {
    contador++;
    if (contador >= DEBOUNCE_THRESHOLD) {
      return leituraAtual;
    }
  } else {
    contador = 0;
    estadoAnterior = leituraAtual;
  }
  
  return estadoAnterior;
}

// ============================================================
//  PUBLICAR ENTRADA/SAÍDA
// ============================================================
void enviarEntrada() {
  StaticJsonDocument<200> doc;
  doc["event"]        = "entry";
  doc["timestamp"]    = millis();
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"]       = MQTT_CLIENT_ID;

  char buffer[200];
  serializeJson(doc, buffer);

  bool ok = mqtt.publish(TOPIC_ENTRADA, buffer, false);

  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("[ENTRADA] 🚗 CARRO DETECTADO NA ENTRADA");
  Serial.print("[MQTT] Tópico: ");
  Serial.println(TOPIC_ENTRADA);
  Serial.print("[MQTT] Payload: ");
  Serial.println(buffer);
  Serial.println(ok ? "[MQTT] ✅ Publicado" : "[MQTT] ❌ Falha");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

void enviarSaida() {
  StaticJsonDocument<200> doc;
  doc["event"]        = "exit";
  doc["timestamp"]    = millis();
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"]       = MQTT_CLIENT_ID;

  char buffer[200];
  serializeJson(doc, buffer);

  bool ok = mqtt.publish(TOPIC_SAIDA, buffer, false);

  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("[SAÍDA] 🚗 CARRO DETECTADO NA SAÍDA");
  Serial.print("[MQTT] Tópico: ");
  Serial.println(TOPIC_SAIDA);
  Serial.print("[MQTT] Payload: ");
  Serial.println(buffer);
  Serial.println(ok ? "[MQTT] ✅ Publicado" : "[MQTT] ❌ Falha");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("════════════════════════════════════════");
  Serial.println("  Parking System — ESP32 + Cancelas     ");
  Serial.println("════════════════════════════════════════");

  connectWiFi();

  Wire.begin();

  // Inicializa MCP #0
  if (!mcp.begin_I2C(MCP_ADDRESS_0)) {
    Serial.println("[MCP23017 #0] ❌ Não encontrado");
    while (1) delay(1000);
  }
  Serial.println("[MCP23017 #0] ✅ Inicializado");

  // Inicializa MCP #1
  if (!mcp2.begin_I2C(MCP_ADDRESS_1)) {
    Serial.println("[MCP23017 #1] ❌ Não encontrado");
    while (1) delay(1000);
  }
  Serial.println("[MCP23017 #1] ✅ Inicializado");

  // Configura pinos das vagas
  for (int i = 0; i < TOTAL_VAGAS; i++) {
    SensorMap map = SENSOR_MAP[i];
    if (map.mcpIndex == 0) {
      mcp.pinMode(map.pin, INPUT_PULLUP);
    } else {
      mcp2.pinMode(map.pin, INPUT_PULLUP);
    }
  }

  // ✅ NOVO: Configura pinos de ENTRADA/SAÍDA
  mcp2.pinMode(ENTRY_SENSOR_PIN, INPUT_PULLUP);
  mcp2.pinMode(EXIT_SENSOR_PIN, INPUT_PULLUP);
  Serial.println("[Cancelas] ✅ Sensores de entrada e saída configurados");
  Serial.print("[Cancelas] Entrada no pino ");
  Serial.print(ENTRY_SENSOR_PIN);
  Serial.print(", Saída no pino ");
  Serial.println(EXIT_SENSOR_PIN);

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessageReceived);

  connectMQTT();

  // Estado inicial das vagas
  Serial.println("=== Enviando estado inicial das vagas ===");
  for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
    vagaOcupada[vagaId] = lerSensorVaga(vagaId);
    delay(100);
  }

  // Estado inicial dos sensores de cancela
  estadoEntradaAnterior = (mcp2.digitalRead(ENTRY_SENSOR_PIN) == LOW) == SENSOR_ACTIVE_LOW;
  estadoSaidaAnterior = (mcp2.digitalRead(EXIT_SENSOR_PIN) == LOW) == SENSOR_ACTIVE_LOW;

  Serial.println("[Sistema] ✅ Pronto! Monitorando vagas e cancelas...");
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  // Reconecta WiFi se necessário
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconectando...");
    connectWiFi();
  }

  // Reconecta MQTT se necessário
  if (!mqtt.connected()) {
    Serial.println("[MQTT] Reconectando...");
    connectMQTT();
  }

  mqtt.loop();

  unsigned long now = millis();
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    // ========================================
    //  LEITURA DAS VAGAS
    // ========================================
    for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
      bool leituraAtual = lerSensorVaga(vagaId);
      if (leituraAtual != vagaOcupada[vagaId]) {
        vagaOcupada[vagaId] = leituraAtual;
        
        StaticJsonDocument<200> doc;
        doc["vagaId"]      = vagaId;
        doc["status"]      = leituraAtual ? "ocupada" : "livre";
        doc["parkingLotId"] = PARKING_LOT_ID;
        doc["device"]      = MQTT_CLIENT_ID;

        char buffer[200];
        serializeJson(doc, buffer);

        String topico = String(TOPIC_SPOT_BASE) + "/" + String(vagaId);
        mqtt.publish(topico.c_str(), buffer, true);

        Serial.print("[Vaga ");
        Serial.print(vagaId);
        Serial.print("] ");
        Serial.println(leituraAtual ? "OCUPADA" : "LIVRE");
      }
    }

    // ========================================
    //  LEITURA DE ENTRADA (COM DEBOUNCE)
    // ========================================
    bool estadoEntradaAtual = lerSensorComDebounce(estadoEntradaAnterior, contadorEntrada, ENTRY_SENSOR_PIN);
    if (estadoEntradaAtual && !estadoEntradaAnterior && contadorEntrada >= DEBOUNCE_THRESHOLD) {
      enviarEntrada();
      contadorEntrada = 0;
    }

    // ========================================
    //  LEITURA DE SAÍDA (COM DEBOUNCE)
    // ========================================
    bool estadoSaidaAtual = lerSensorComDebounce(estadoSaidaAnterior, contadorSaida, EXIT_SENSOR_PIN);
    if (estadoSaidaAtual && !estadoSaidaAnterior && contadorSaida >= DEBOUNCE_THRESHOLD) {
      enviarSaida();
      contadorSaida = 0;
    }
  }
}
