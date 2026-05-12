/*
 * ============================================================
 *  SMART PARKING SYSTEM — ESP32 Completo
 * ============================================================
 *  Arquivo único com toda a lógica de hardware:
 *  - 20 Sensores de vaga (via MCP23017)
 *  - Cancela de entrada (sensor IR + servo)
 *  - Cancela de saída (sensor IR + servo)
 *  - Conexão MQTT bidireccional
 *  - Reconexão automática WiFi/MQTT
 * ============================================================
 *
 *  BIBLIOTECAS NECESSÁRIAS (instale via Library Manager):
 *    - PubSubClient (by Nick O'Leary)
 *    - Adafruit_MCP23X17 (by Adafruit)
 *    - ESP32Servo (by John K. Bennett)
 *    - ArduinoJson (by Benoit Blanchon)
 * 
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MCP23X17.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ============================================================
//  SEÇÃO 1: DEFINES E CONFIGURAÇÕES
// ============================================================

// --------- WiFi ---------
#define WIFI_SSID           "VIVOFIBRA-WIFI6-E9D8"
#define WIFI_PASSWORD       "03012006Ju"
#define WIFI_RECONNECT_INTERVAL 10000  // 10s

// --------- MQTT ---------
#define MQTT_BROKER         "192.168.15.177"
#define MQTT_PORT           1884
#define MQTT_CLIENT_ID      "esp32-parking-01"
#define MQTT_USERNAME       "parking_iot"
#define MQTT_PASSWORD       "ParkingIot@2026"
#define MQTT_RECONNECT_INTERVAL 5000   // 5s

// --------- IDs e Configuração ---------
#define PARKING_LOT_ID      "45fc18f2-bdd8-4b11-b964-f8face1147f0"
#define TOTAL_VAGAS         20
#define MCP_ADDRESS_0       0x20  // Vagas 1-16
#define MCP_ADDRESS_1       0x21  // Vagas 17-20 + cancelas

// --------- Pinos das Vagas (via MCP) ---------
// MCP #0: pinos 0-15 (vagas 1-16)
// MCP #1: pinos 0-3 (vagas 17-20), pinos 6-7 (sensores cancelas)

// --------- Pinos das Cancelas (MCP #1) ---------
#define ENTRY_SENSOR_PIN    6   // Sensor IR entrada (MCP#1)
#define EXIT_SENSOR_PIN     7   // Sensor IR saída (MCP#1)

// --------- Pinos do Servo (GPIO diretos) ---------
#define SERVO_ENTRADA_PIN   18  // Servo motor entrada
#define SERVO_SAIDA_PIN     19  // Servo motor saída

// --------- Ângulos dos Servos ---------
#define SERVO_ABERTO        0   // 0° = porta aberta
#define SERVO_FECHADO       90  // 90° = porta fechada

// --------- Timeouts ---------
#define DEBOUNCE_THRESHOLD  3       // 3 leituras consecutivas para confirmar
#define SERVO_WAIT_TIME     3000    // 3 segundos para carro passar
#define SENSOR_READ_INTERVAL 500    // 500ms entre leituras

// --------- Lógica dos Sensores ---------
#define SENSOR_ACTIVE_LOW   true   // true = sensor IR ativa em LOW

// ============================================================
//  SEÇÃO 2: VARIÁVEIS GLOBAIS
// ============================================================

// --------- Objetos WiFi e MQTT ---------
WiFiClient espClient;
PubSubClient mqtt(espClient);
unsigned long lastWiFiReconnect = 0;
unsigned long lastMqttReconnect = 0;

// --------- MCPs (Multiplexadores I2C) ---------
Adafruit_MCP23X17 mcp;    // 0x20 - Vagas 1-16
Adafruit_MCP23X17 mcp2;   // 0x21 - Vagas 17-20 + Cancelas

// --------- Servos ---------
Servo servoEntrada;
Servo servoSaida;

// --------- Estado das Vagas ---------
bool vagaOcupada[TOTAL_VAGAS + 1] = {false};  // índice 1..TOTAL_VAGAS
uint8_t contadorDebounce[TOTAL_VAGAS + 1] = {0};

// --------- Estado das Cancelas (com debounce) ---------
bool estadoEntrada = false;
uint8_t contadorEntrada = 0;
bool ultimoEstadoEntrada = false;
unsigned long ultimaTrocaEntrada = 0;

bool estadoSaida = false;
uint8_t contadorSaida = 0;
bool ultimoEstadoSaida = false;
unsigned long ultimaTrocaSaida = 0;

// --------- Estado dos Servos ---------
bool servoEntradaAberto = true;
bool servoSaidaAberto = true;
unsigned long tempoAberturasEntrada = 0;
unsigned long tempoAberturasSaida = 0;

// --------- Configuração do Estacionamento ---------
int vagasDisponiveis = TOTAL_VAGAS;  // Atualizado pelo backend via MQTT
unsigned long lastSensorRead = 0;

// ============================================================
//  SEÇÃO 3: SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("════════════════════════════════════════════════");
  Serial.println("     SMART PARKING SYSTEM — ESP32 INICIANDO     ");
  Serial.println("════════════════════════════════════════════════");

  // Inicializa I2C
  Wire.begin(21, 22);  // SDA=21, SCL=22 (padrão ESP32)
  Serial.println("[I2C] Barramento inicializado");

  // Inicializa MCPs
  if (!mcp.begin_I2C(MCP_ADDRESS_0)) {
    Serial.println("[MCP#0] ❌ ERRO: Não encontrado em 0x20");
    while (1) delay(1000);
  }
  Serial.println("[MCP#0] ✅ Inicializado (vagas 1-16)");

  if (!mcp2.begin_I2C(MCP_ADDRESS_1)) {
    Serial.println("[MCP#1] ❌ ERRO: Não encontrado em 0x21");
    while (1) delay(1000);
  }
  Serial.println("[MCP#1] ✅ Inicializado (vagas 17-20 + cancelas)");

  // Configura pinos das vagas como entrada
  for (int i = 0; i < 16; i++) {
    mcp.pinMode(i, INPUT_PULLUP);
  }
  for (int i = 0; i < 4; i++) {
    mcp2.pinMode(i, INPUT_PULLUP);
  }
  Serial.println("[Vagas] ✅ 20 sensores configurados");

  // Configura pinos das cancelas como entrada
  mcp2.pinMode(ENTRY_SENSOR_PIN, INPUT_PULLUP);
  mcp2.pinMode(EXIT_SENSOR_PIN, INPUT_PULLUP);
  Serial.println("[Cancelas] ✅ Sensores IR configurados");

  // Inicializa servos
  servoEntrada.attach(SERVO_ENTRADA_PIN, 1000, 2000);
  servoSaida.attach(SERVO_SAIDA_PIN, 1000, 2000);
  servoEntrada.write(SERVO_FECHADO);
  servoSaida.write(SERVO_FECHADO);
  servoEntradaAberto = false;
  servoSaidaAberto = false;
  Serial.println("[Servos] ✅ Anexados e em posição fechada");

  // Conecta WiFi
  conectarWiFi();

  // Configura MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(callbackMqtt);

  // Conecta MQTT
  conectarMqtt();

  Serial.println();
  Serial.println("════════════════════════════════════════════════");
  Serial.println("     ✅ SISTEMA PRONTO — Monitorando...         ");
  Serial.println("════════════════════════════════════════════════");
  Serial.println();
}

// ============================================================
//  SEÇÃO 4: LOOP PRINCIPAL
// ============================================================

void loop() {
  // Reconecta WiFi se necessário
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long agora = millis();
    if (agora - lastWiFiReconnect >= WIFI_RECONNECT_INTERVAL) {
      lastWiFiReconnect = agora;
      Serial.println("[WiFi] Reconectando...");
      conectarWiFi();
    }
  }

  // Reconecta MQTT se necessário
  if (!mqtt.connected()) {
    unsigned long agora = millis();
    if (agora - lastMqttReconnect >= MQTT_RECONNECT_INTERVAL) {
      lastMqttReconnect = agora;
      Serial.println("[MQTT] Reconectando...");
      conectarMqtt();
    }
  }

  // Processa mensagens MQTT
  mqtt.loop();

  // Lê sensores a cada SENSOR_READ_INTERVAL
  unsigned long agora = millis();
  if (agora - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = agora;

    // Lê vagas
    lerSensoresVagas();

    // Lê e processa cancelas
    processarCancelaEntrada();
    processarCancelaSaida();
  }

  // Verifica timeouts dos servos (fecha após SERVO_WAIT_TIME)
  verificarTimeoutServos();
}

// ============================================================
//  SEÇÃO 5: FUNÇÕES DE CONEXÃO
// ============================================================

void conectarWiFi() {
  Serial.print("[WiFi] Conectando a: ");
  Serial.println(WIFI_SSID);

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
    Serial.print("[WiFi] ✅ Conectado! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] ⚠️ Falha na conexão (reconectará em 10s)");
  }
}

void conectarMqtt() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] ❌ WiFi não conectado");
    return;
  }

  Serial.print("[MQTT] Conectando a: ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  int tentativas = 0;
  while (!mqtt.connected() && tentativas < 3) {
    if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println("[MQTT] ✅ Conectado!");

      // Subscribe em tópicos
      mqtt.subscribe("parking/config/spots");
      Serial.println("[MQTT] ✅ Inscrito em: parking/config/spots");
      return;
    }

    Serial.print("[MQTT] ❌ Falha. rc=");
    Serial.println(mqtt.state());
    delay(1000);
    tentativas++;
  }

  if (!mqtt.connected()) {
    Serial.println("[MQTT] ⚠️ Falha na conexão (reconectará em 5s)");
  }
}

// ============================================================
//  SEÇÃO 6: CALLBACK MQTT
// ============================================================

void callbackMqtt(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String payloadStr = "";
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }

  Serial.print("[MQTT RX] Tópico: ");
  Serial.print(topicStr);
  Serial.print(" | Payload: ");
  Serial.println(payloadStr);

  // Processa atualização de vagas disponíveis
  if (topicStr == "parking/config/spots") {
    StaticJsonDocument<200> doc;
    DeserializationError erro = deserializeJson(doc, payloadStr);

    if (erro) {
      Serial.println("[MQTT] ❌ Erro ao parsear JSON");
      return;
    }

    if (doc.containsKey("availableSpots")) {
      int novasVagas = doc["availableSpots"].as<int>();
      if (novasVagas != vagasDisponiveis) {
        Serial.print("[Config] Vagas atualizadas: ");
        Serial.print(vagasDisponiveis);
        Serial.print(" → ");
        Serial.println(novasVagas);
        vagasDisponiveis = novasVagas;
      }
    }
  }
}

// ============================================================
//  SEÇÃO 7: FUNÇÕES DE LEITURA DE SENSORES
// ============================================================

void lerSensoresVagas() {
  for (int vagaId = 1; vagaId <= TOTAL_VAGAS; vagaId++) {
    bool leitura = lerSensorVaga(vagaId);

    // Debounce: só atualiza após DEBOUNCE_THRESHOLD leituras iguais
    if (leitura == vagaOcupada[vagaId]) {
      contadorDebounce[vagaId] = 0;
    } else {
      contadorDebounce[vagaId]++;
      if (contadorDebounce[vagaId] >= DEBOUNCE_THRESHOLD) {
        // Mudança confirmada
        vagaOcupada[vagaId] = leitura;
        contadorDebounce[vagaId] = 0;

        // Publica mudança
        publicarStatusVaga(vagaId);
      }
    }
  }
}

bool lerSensorVaga(int vagaId) {
  int pin;
  Adafruit_MCP23X17* mcpPtr;

  if (vagaId <= 16) {
    mcpPtr = &mcp;
    pin = vagaId - 1;
  } else {
    mcpPtr = &mcp2;
    pin = vagaId - 17;
  }

  int raw = mcpPtr->digitalRead(pin);
  return SENSOR_ACTIVE_LOW ? (raw == LOW) : (raw == HIGH);
}

void publicarStatusVaga(int vagaId) {
  StaticJsonDocument<200> doc;
  doc["vagaId"] = vagaId;
  doc["occupied"] = vagaOcupada[vagaId];
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"] = MQTT_CLIENT_ID;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  String topico = "parking/spots/" + String(vagaId);
  mqtt.publish(topico.c_str(), payload.c_str(), true);

  Serial.print("[Vaga ");
  Serial.print(vagaId);
  Serial.print("] ");
  Serial.println(vagaOcupada[vagaId] ? "OCUPADA" : "LIVRE");
}

// ============================================================
//  SEÇÃO 8: FUNÇÕES DE PROCESSAMENTO DAS CANCELAS
// ============================================================

void processarCancelaEntrada() {
  bool leituraAtual = lerSensorCancelaEntrada();

  // Debounce
  if (leituraAtual == ultimoEstadoEntrada) {
    contadorEntrada = 0;
  } else {
    contadorEntrada++;
    if (contadorEntrada >= DEBOUNCE_THRESHOLD) {
      ultimoEstadoEntrada = leituraAtual;
      contadorEntrada = 0;

      // Se carro detectado (transição LOW → HIGH)
      if (leituraAtual && !estadoEntrada) {
        Serial.println("[ENTRADA] 🚗 Carro detectado!");

        if (vagasDisponiveis > 0) {
          Serial.println("[ENTRADA] ✅ Vagas disponíveis - ABRINDO cancela");
          abrirServoEntrada();
          publicarEventoEntrada();
        } else {
          Serial.println("[ENTRADA] ❌ Sem vagas - Cancela MANTÉM FECHADA");
        }
      }

      estadoEntrada = leituraAtual;
      ultimaTrocaEntrada = millis();
    }
  }
}

void processarCancelaSaida() {
  bool leituraAtual = lerSensorCancelaSaida();

  // Debounce
  if (leituraAtual == ultimoEstadoSaida) {
    contadorSaida = 0;
  } else {
    contadorSaida++;
    if (contadorSaida >= DEBOUNCE_THRESHOLD) {
      ultimoEstadoSaida = leituraAtual;
      contadorSaida = 0;

      // Se carro detectado (transição LOW → HIGH)
      if (leituraAtual && !estadoSaida) {
        Serial.println("[SAÍDA] 🚗 Carro detectado!");
        Serial.println("[SAÍDA] ✅ ABRINDO cancela (saída livre)");
        abrirServoSaida();
        publicarEventoSaida();
      }

      estadoSaida = leituraAtual;
      ultimaTrocaSaida = millis();
    }
  }
}

bool lerSensorCancelaEntrada() {
  int raw = mcp2.digitalRead(ENTRY_SENSOR_PIN);
  return SENSOR_ACTIVE_LOW ? (raw == LOW) : (raw == HIGH);
}

bool lerSensorCancelaSaida() {
  int raw = mcp2.digitalRead(EXIT_SENSOR_PIN);
  return SENSOR_ACTIVE_LOW ? (raw == LOW) : (raw == HIGH);
}

void abrirServoEntrada() {
  servoEntrada.write(SERVO_ABERTO);
  servoEntradaAberto = true;
  tempoAberturasEntrada = millis();
  Serial.println("[Servo Entrada] Movendo para 0° (ABERTO)");
}

void fecharServoEntrada() {
  servoEntrada.write(SERVO_FECHADO);
  servoEntradaAberto = false;
  Serial.println("[Servo Entrada] Movendo para 90° (FECHADO)");
}

void abrirServoSaida() {
  servoSaida.write(SERVO_ABERTO);
  servoSaidaAberto = true;
  tempoAberturasSaida = millis();
  Serial.println("[Servo Saída] Movendo para 0° (ABERTO)");
}

void fecharServoSaida() {
  servoSaida.write(SERVO_FECHADO);
  servoSaidaAberto = false;
  Serial.println("[Servo Saída] Movendo para 90° (FECHADO)");
}

void verificarTimeoutServos() {
  unsigned long agora = millis();

  // Fecha servo de entrada após SERVO_WAIT_TIME
  if (servoEntradaAberto && (agora - tempoAberturasEntrada >= SERVO_WAIT_TIME)) {
    Serial.println("[Servo Entrada] ⏱️ Timeout - Fechando...");
    fecharServoEntrada();
  }

  // Fecha servo de saída após SERVO_WAIT_TIME
  if (servoSaidaAberto && (agora - tempoAberturasSaida >= SERVO_WAIT_TIME)) {
    Serial.println("[Servo Saída] ⏱️ Timeout - Fechando...");
    fecharServoSaida();
  }
}

// ============================================================
//  SEÇÃO 9: FUNÇÕES DE PUBLICAÇÃO DE EVENTOS
// ============================================================

void publicarEventoEntrada() {
  StaticJsonDocument<200> doc;
  doc["event"] = "entry";
  doc["timestamp"] = millis();
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"] = MQTT_CLIENT_ID;
  doc["vagasDisponiveis"] = vagasDisponiveis;

  String payload;
  serializeJson(doc, payload);

  mqtt.publish("parking/events/entry", payload.c_str(), false);

  Serial.print("[MQTT TX] Evento publicado: parking/events/entry | Vagas: ");
  Serial.println(vagasDisponiveis);
}

void publicarEventoSaida() {
  StaticJsonDocument<200> doc;
  doc["event"] = "exit";
  doc["timestamp"] = millis();
  doc["parkingLotId"] = PARKING_LOT_ID;
  doc["device"] = MQTT_CLIENT_ID;
  doc["vagasDisponiveis"] = vagasDisponiveis;

  String payload;
  serializeJson(doc, payload);

  mqtt.publish("parking/events/exit", payload.c_str(), false);

  Serial.print("[MQTT TX] Evento publicado: parking/events/exit | Vagas: ");
  Serial.println(vagasDisponiveis);
}

// ============================================================
//  FIM DO ARQUIVO
// ============================================================
