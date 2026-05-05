/*
 * ============================================================
 *  Parking System — ESP32 MQTT [VERSÃO CORRIGIDA PARA ACESSO REMOTO]
 * ============================================================
 *  
 *  ✅ MUDANÇAS PRINCIPAIS:
 *     • Porta: 1883 (padrão MQTT, não 1884)
 *     • Bind: 0.0.0.0 (todas as interfaces)
 *     • Fácil configuração de IP remoto
 *
 *  ✅ COMO USAR:
 *     1. Descubra seu IP: hostname -I
 *     2. Configure MQTT_BROKER com seu IP (ex: "192.168.0.10")
 *     3. Mantenha MQTT_PORT = 1883
 *     4. Upload para ESP32
 *
 *  Bibliotecas necessárias (Library Manager):
 *    - PubSubClient  (by Nick O'Leary)
 *    - ArduinoJson   (by Benoit Blanchon)
 *    - Adafruit MCP23017
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MCP23X17.h>

// ============================================================
//  ⚙️ CONFIGURAÇÕES — AJUSTE AQUI
// ============================================================

// 🌐 WiFi
const char* WIFI_SSID     = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";

// 🔌 MQTT BROKER — COLOQUE O IP DA SUA MÁQUINA AQUI
//    ❌ Não use 127.0.0.1 ou localhost
//    ❌ Não use 192.168.15.177 (estava desatualizado)
//    ✅ Use seu IP local (ex: 192.168.0.10)
//
//    Para descobrir: hostname -I
const char* MQTT_BROKER   = "192.168.0.10";  // ⭐ IMPORTANTE: mude para seu IP!
const int   MQTT_PORT     = 1883;             // ✅ Porta padrão (não 1884)
const char* MQTT_CLIENT_ID = "esp32-parking-01";
const char* MQTT_USERNAME  = "parking_iot";
const char* MQTT_PASSWORD  = "ParkingIot@2026";

// 📡 Tópicos MQTT
const char* TOPIC_SPOT_BASE = "parking/spots";
const char* TOPIC_STATUS    = "parking/status";
const char* TOPIC_DEVICE_STATUS = "parking/device/esp32-parking-01/status";

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
//  📋 Estrutura de Mapeamento de Sensores
// ============================================================

struct SensorMap {
  uint8_t mcpIndex;  // Qual MCP (0 ou 1)
  uint8_t pin;       // Qual pino do MCP
};

// Mapeamento: Vagas 1..16 → MCP 0, Vagas 17..20 → MCP 1
const SensorMap SENSOR_MAP[TOTAL_VAGAS] = {
  {0, 0}, {0, 1}, {0, 2}, {0, 3}, {0, 4},
  {0, 5}, {0, 6}, {0, 7}, {0, 8}, {0, 9},
  {0,10}, {0,11}, {0,12}, {0,13}, {0,14},
  {0,15}, {1, 0}, {1, 1}, {1, 2}, {1, 3}
};

// Sensor ativo-baixo: true = ocupada quando D0=0
const bool SENSOR_ACTIVE_LOW = true;

// ============================================================
//  🔧 Variáveis Globais
// ============================================================

WiFiClient espClient;
PubSubClient mqtt(espClient);
Adafruit_MCP23X17 mcp0;
Adafruit_MCP23X17 mcp1;

unsigned long lastReadTime = 0;
int messageCount = 0;
bool vagaOcupada[TOTAL_VAGAS + 1] = {false};

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

    // Last Will & Testament
    if (mqtt.connect(
          MQTT_CLIENT_ID,
          MQTT_USERNAME,
          MQTT_PASSWORD,
          TOPIC_DEVICE_STATUS,    // will_topic
          1,                        // will_qos
          true,                     // will_retain
          "offline"                 // will_payload
        )) {
      Serial.println(" ✅ Conectado!");

      // Publica "online"
      mqtt.publish(TOPIC_DEVICE_STATUS, "online", true);

      // Inscreve para receber respostas
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
          Serial.println("      Verifique credenciais em parking_iot / ParkingIot@2026");
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
//  📖 Leitura de Sensores
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

  // Se SENSOR_ACTIVE_LOW: LOW (0) = ocupada
  return SENSOR_ACTIVE_LOW ? (pinState == LOW) : (pinState == HIGH);
}

// ============================================================
//  📤 Publicar Status da Vaga
// ============================================================

void enviarVaga(int vagaId, bool ocupada) {
  String topico = String(TOPIC_SPOT_BASE) + "/" + String(vagaId);

  // Cria JSON payload
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
//  ⚡ SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("════════════════════════════════════════");
  Serial.println("   Parking System — ESP32 MQTT");
  Serial.println("   [Versão com Acesso Remoto]");
  Serial.println("════════════════════════════════════════");
  Serial.println();

  // WiFi
  connectWiFi();
  Serial.println();

  // I2C
  Wire.begin(); // SDA=21, SCL=22 (padrão ESP32)

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

  // Configura todos os pinos como entrada
  for (int i = 0; i < TOTAL_VAGAS; i++) {
    SensorMap map = SENSOR_MAP[i];
    if (map.mcpIndex == 0) {
      mcp0.pinMode(map.pin, INPUT_PULLUP);
    } else {
      mcp1.pinMode(map.pin, INPUT_PULLUP);
    }
  }
  Serial.println("[Sensores] ✅ 20 entradas configuradas");
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

  Serial.println("[Sistema] ✅ Pronto! Monitorando sensores...");
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

  // Lê sensores periodicamente
  unsigned long now = millis();
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
      bool leituraAtual = lerSensorOcupado(vagaId);
      
      // Publica somente se mudou
      if (leituraAtual != vagaOcupada[vagaId]) {
        vagaOcupada[vagaId] = leituraAtual;
        enviarVaga(vagaId, leituraAtual);
      }
    }
  }
}
