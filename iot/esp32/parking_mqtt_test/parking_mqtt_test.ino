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

// ============================================================
//  CONFIGURAÇÕES — ajuste aqui antes de subir para o ESP32
// ============================================================

// WiFi
const char* WIFI_SSID     = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";

// Broker MQTT (IP do seu computador)
const char* MQTT_BROKER   = "192.168.15.177";
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT_ID = "esp32-parking-01";

// Tópicos
const char* TOPIC_TESTE   = "estacionamento/teste";
const char* TOPIC_ENTRADA = "parking/entry";   // usado pelo backend
const char* TOPIC_SAIDA   = "parking/exit";    // usado pelo backend
const char* TOPIC_STATUS  = "parking/status";  // backend responde aqui

// ID do estacionamento (Estacionamento Central — vindo do banco)
const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";

// Total de vagas simuladas
const int TOTAL_VAGAS = 3;

// Intervalo de alternância de status (ms) — igual ao código HTTP anterior
const unsigned long PUBLISH_INTERVAL = 10000;

// ============================================================
//  VARIÁVEIS GLOBAIS
// ============================================================
WiFiClient   espClient;
PubSubClient mqtt(espClient);

unsigned long lastPublishTime = 0;
int  messageCount = 0;
bool vagaOcupada[TOTAL_VAGAS + 1] = {false, true, false, true}; // índice 1-3, espelha código HTTP anterior

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
  while (!mqtt.connected()) {
    Serial.print("[MQTT] Conectando ao broker ");
    Serial.print(MQTT_BROKER);
    Serial.print(":");
    Serial.print(MQTT_PORT);
    Serial.print(" ...");

    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println(" ✅ Conectado!");

      // Assinar tópicos para receber respostas
      mqtt.subscribe(TOPIC_STATUS);
      Serial.print("[MQTT] Inscrito em: ");
      Serial.println(TOPIC_STATUS);

    } else {
      Serial.print(" ❌ Falhou. rc=");
      Serial.print(mqtt.state());
      Serial.println(" | Tentando novamente em 3s...");
      /*
       * Códigos de erro do PubSubClient:
       * -4 = Timeout de conexão
       * -3 = Conexão recusada (broker não responde)
       * -2 = Conexão recusada (cliente desconectado)
       * -1 = Desconectado
       *  1 = Versão de protocolo incorreta
       *  2 = Client ID rejeitado
       *  3 = Servidor indisponível
       *  4 = Usuário/senha incorretos
       *  5 = Não autorizado
       */
      delay(3000);
    }
  }
}

// ============================================================
//  PUBLICAR STATUS DE UMA VAGA
//  Lógica extraída do enviarVaga() do código HTTP anterior:
//    vagaId  = 1, 2 ou 3
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

  // Escolhe tópico baseado no status — igual à lógica HTTP anterior
  const char* topico = ocupada ? TOPIC_ENTRADA : TOPIC_SAIDA;

  bool ok = mqtt.publish(topico, buffer);

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

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessageReceived);

  connectMQTT();

  // Estado inicial das vagas — igual ao setup() do código HTTP anterior
  Serial.println("=== Enviando estado inicial das vagas ===");
  enviarVaga(1, true);  // ocupada
  delay(1000);
  enviarVaga(2, false); // livre
  delay(1000);
  enviarVaga(3, true);  // ocupada

  Serial.println("[Sistema] Pronto! Alternando vaga 1 a cada 10 segundos...");
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

  // A cada PUBLISH_INTERVAL ms, alterna status da vaga 1 — igual ao loop() do código HTTP anterior
  unsigned long now = millis();
  if (now - lastPublishTime >= PUBLISH_INTERVAL) {
    lastPublishTime = now;

    vagaOcupada[1] = !vagaOcupada[1]; // alterna vaga 1

    Serial.println("\n=== Atualização periódica da Vaga 1 ===");
    enviarVaga(1, vagaOcupada[1]);
  }
}
