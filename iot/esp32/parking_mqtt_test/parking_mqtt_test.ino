/*
 * ============================================================
 *  Parking System — ESP32 MQTT Teste de Comunicação
 * ============================================================
 *  Objetivo: Testar comunicação entre ESP32 e backend via MQTT
 *  Sem sensores, sem LEDs — apenas comunicação pura.
 *
 *  Bibliotecas necessárias (instalar pelo Library Manager):
 *    - PubSubClient  (by Nick O'Leary)
 *    - ArduinoJson   (by Benoit Blanchon)
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MCP23X17.h>

// ============================================================
//  CONFIGURAÇÕES — ajuste aqui antes de subir para o ESP32
// ============================================================

// WiFi
const char* WIFI_SSID     = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";

// Broker MQTT (IP do seu computador)
const char* MQTT_BROKER   = "192.168.15.177";
const int   MQTT_PORT     = 1884;  // Docker Compose mapeou 1884:1883
const char* MQTT_CLIENT_ID = "esp32-parking-01";
const char* MQTT_USERNAME  = "parking_iot";
const char* MQTT_PASSWORD  = "ParkingIot@2026";

// Tópicos
const char* TOPIC_TESTE   = "estacionamento/teste";
const char* TOPIC_ENTRADA = "parking/entry";   // usado pelo backend
const char* TOPIC_SAIDA   = "parking/exit";    // usado pelo backend
const char* TOPIC_STATUS  = "parking/status";  // backend responde aqui
const char* TOPIC_SPOT_BASE = "parking/spots"; // padrão oficial
const char* TOPIC_DEVICE_STATUS = "parking/device/esp32-parking-01/status";

// Compatibilidade temporária com backend legado
const bool ENABLE_LEGACY_TOPIC_MIRROR = false;

// ID do estacionamento (Estacionamento Central — vindo do banco)
const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";

// Total de vagas (22 sensores digitais D0)
const int TOTAL_VAGAS = 22;

// Dois MCP23017 no mesmo barramento I2C
// MCP #0: A2 A1 A0 = 000 -> 0x20
// MCP #1: A2 A1 A0 = 001 -> 0x21
const uint8_t MCP_ADDRESS_0 = 0x20;
const uint8_t MCP_ADDRESS_1 = 0x21;

struct SensorMap {
  uint8_t mcpIndex; // 0 ou 1
  uint8_t pin;      // 0..15 (GPA0..GPA7=0..7, GPB0..GPB7=8..15)
};

// Mapeamento padrão para 22 sensores:
// Vagas 1..16  -> MCP 0 (pinos 0..15)
// Vagas 17..22 -> MCP 1 (pinos 0..5)
const SensorMap SENSOR_MAP[TOTAL_VAGAS] = {
  {0, 0}, {0, 1}, {0, 2}, {0, 3}, {0, 4},
  {0, 5}, {0, 6}, {0, 7}, {0, 8}, {0, 9},
  {0,10}, {0,11}, {0,12}, {0,13}, {0,14},
  {0,15}, {1, 0}, {1, 1}, {1, 2}, {1, 3}, {1, 4}, {1, 5}
};

// Lógica do sensor IR digital (D0)
// true  => D0=0 significa OCUPADA
// false => D0=1 significa OCUPADA
const bool SENSOR_ACTIVE_LOW = true;

// Intervalo de leitura/publicação quando houver mudança (ms)
const unsigned long READ_INTERVAL = 500;

// ============================================================
//  VARIÁVEIS GLOBAIS
// ============================================================
WiFiClient   espClient;
PubSubClient mqtt(espClient);
Adafruit_MCP23X17 mcp;
Adafruit_MCP23X17 mcp2;

unsigned long lastReadTime = 0;
int  messageCount = 0;
bool vagaOcupada[TOTAL_VAGAS + 1] = {false}; // índice 1..TOTAL_VAGAS

// ============================================================
//  CALLBACK — chamado quando backend publica em tópico assinado
// ============================================================
void onMessageReceived(char* topic, byte* payload, unsigned int length) {
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("[MQTT] Mensagem recebida no tópico: ");
  Serial.println(topic);

  // Converte payload para string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("[MQTT] Conteúdo: ");
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
  Serial.print("[WiFi] IP do ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.print("[WiFi] RSSI (sinal): ");
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
    Serial.print("[MQTT] Broker   : ");
    Serial.println(MQTT_BROKER);
    Serial.print("[MQTT] Porta    : ");
    Serial.println(MQTT_PORT);
    Serial.print("[MQTT] ClientId : ");
    Serial.println(MQTT_CLIENT_ID);
    Serial.print("[MQTT] Username : ");
    Serial.println(MQTT_USERNAME);
    Serial.print("[MQTT] WillTopic: ");
    Serial.println(TOPIC_DEVICE_STATUS);
    Serial.println("[MQTT] Conectando...");

    // Last Will: broker publica "offline" se o ESP32 cair sem desconectar
    if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD, TOPIC_DEVICE_STATUS, 1, true, "offline")) {
      Serial.println(" ✅ Conectado!");

      // Estado online (retain=true para observabilidade)
      mqtt.publish(TOPIC_DEVICE_STATUS, "online", true);

      // Assinar tópicos para receber respostas
      mqtt.subscribe(TOPIC_STATUS);
      Serial.print("[MQTT] Inscrito em: ");
      Serial.println(TOPIC_STATUS);
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    } else {
      int rc = mqtt.state();
      Serial.print(" ❌ Falhou. rc=");
      Serial.println(rc);
      Serial.print("[MQTT] Diagnóstico rc=");
      Serial.print(rc);
      Serial.print(" -> ");
      switch (rc) {
        case -4:
          Serial.println("Timeout de conexão");
          break;
        case -3:
          Serial.println("Conexão perdida");
          break;
        case -2:
          Serial.println("Falha de conexão de rede");
          break;
        case -1:
          Serial.println("Cliente desconectado");
          break;
        case 1:
          Serial.println("Protocolo MQTT incorreto");
          break;
        case 2:
          Serial.println("Client ID rejeitado");
          break;
        case 3:
          Serial.println("Servidor indisponível");
          break;
        case 4:
          Serial.println("Usuário/senha incorretos");
          break;
        case 5:
          Serial.println("Não autorizado (ACL/permissão)");
          break;
        default:
          Serial.println("Erro desconhecido");
          break;
      }
      Serial.println(" | Tentando novamente em 3s...");
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      delay(3000);
    }
  }
}

// ============================================================
//  LEITURA DOS SENSORES NO MCP23017
// ============================================================
bool lerSensorOcupado(int vagaId) {
  SensorMap map = SENSOR_MAP[vagaId - 1];
  int raw = (map.mcpIndex == 0) ? mcp.digitalRead(map.pin) : mcp2.digitalRead(map.pin);
  return SENSOR_ACTIVE_LOW ? (raw == LOW) : (raw == HIGH);
}

// ============================================================
//  PUBLICAR STATUS DE UMA VAGA
//  Lógica extraída do enviarVaga() do código HTTP anterior:
//    vagaId  = 1..TOTAL_VAGAS
//    ocupada = true → publica em parking/entry
//    ocupada = false → publica em parking/exit
// ============================================================
void enviarVaga(int vagaId, bool ocupada) {
  messageCount++;

  // Monta JSON idêntico ao que o backend espera
  StaticJsonDocument<200> doc;
  doc["vagaId"]      = vagaId;
  doc["status"]      = ocupada ? "ocupada" : "livre";
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"]      = MQTT_CLIENT_ID;
  doc["uptime_s"]    = millis() / 1000;

  char buffer[200];
  serializeJson(doc, buffer);

  // Padrão oficial: parking/spots/{vagaId}
  String topico = String(TOPIC_SPOT_BASE) + "/" + String(vagaId);

  // retain=true garante snapshot da última leitura por vaga
  bool ok = mqtt.publish(topico.c_str(), buffer, true);

  // Compatibilidade temporária com tópicos legados
  if (ENABLE_LEGACY_TOPIC_MIRROR) {
    const char* legacyTopic = ocupada ? TOPIC_ENTRADA : TOPIC_SAIDA;
    mqtt.publish(legacyTopic, buffer, false);
  }

  Serial.println("-------------------------------");
  Serial.print("[MQTT] Vaga ");
  Serial.print(vagaId);
  Serial.print(" → ");
  Serial.print(ocupada ? "ocupada" : "livre");
  Serial.print(" | tópico: ");
  Serial.println(topico);
  Serial.print("[MQTT] Payload: ");
  Serial.println(buffer);
  Serial.println(ok ? "       ✅ Publicado" : "       ❌ Falha ao publicar");
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("════════════════════════════════════════");
  Serial.println("   Parking System — ESP32 MQTT Test     ");
  Serial.println("════════════════════════════════════════");

  connectWiFi();

  Wire.begin(); // I2C padrão ESP32: SDA=21, SCL=22

  if (!mcp.begin_I2C(MCP_ADDRESS_0)) {
    Serial.println("[MCP23017 #0] ❌ Não encontrado em 0x20. Verifique SDA/SCL/VCC/GND/endereço.");
    while (1) {
      delay(1000);
    }
  }

  if (!mcp2.begin_I2C(MCP_ADDRESS_1)) {
    Serial.println("[MCP23017 #1] ❌ Não encontrado em 0x21. Verifique A0/A1/A2 e fiação I2C.");
    while (1) {
      delay(1000);
    }
  }

  for (int i = 0; i < TOTAL_VAGAS; i++) {
    SensorMap map = SENSOR_MAP[i];
    if (map.mcpIndex == 0) {
      mcp.pinMode(map.pin, INPUT_PULLUP);
    } else {
      mcp2.pinMode(map.pin, INPUT_PULLUP);
    }
  }

  Serial.println("[MCP23017 #0] ✅ Inicializado em 0x20");
  Serial.println("[MCP23017 #1] ✅ Inicializado em 0x21");
  Serial.println("[Sensores] ✅ 22 entradas digitais configuradas");

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessageReceived);

  connectMQTT();

  // Estado inicial das vagas a partir da leitura real dos sensores
  Serial.println("=== Enviando estado inicial das vagas ===");
  for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
    vagaOcupada[vagaId] = lerSensorOcupado(vagaId);
    enviarVaga(vagaId, vagaOcupada[vagaId]);
    delay(300);
  }

  Serial.println("[Sistema] Pronto! Monitorando sensores via MCP23017...");
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  // Reconecta WiFi se cair
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Conexão perdida. Reconectando...");
    connectWiFi();
  }

  // Reconecta MQTT se cair
  if (!mqtt.connected()) {
    Serial.println("[MQTT] Conexão perdida. Reconectando...");
    connectMQTT();
  }

  // Processa mensagens recebidas
  mqtt.loop();

  // A cada READ_INTERVAL, lê sensores no MCP e publica somente quando mudar
  unsigned long now = millis();
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
      bool leituraAtual = lerSensorOcupado(vagaId);
      if (leituraAtual != vagaOcupada[vagaId]) {
        vagaOcupada[vagaId] = leituraAtual;
        Serial.print("[Sensor] Mudança na vaga ");
        Serial.print(vagaId);
        Serial.print(" -> ");
        Serial.println(leituraAtual ? "ocupada" : "livre");
        enviarVaga(vagaId, leituraAtual);
      }
    }
  }
}
