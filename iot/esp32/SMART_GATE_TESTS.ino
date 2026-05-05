/*
 * ============================================================
 *  Smart Gate Control — Testes Isolados (Sketches)
 * ============================================================
 *  
 *  Use estes sketches para validar componentes individuais.
 *  Copie e cole cada seção em um novo arquivo .ino e faça upload.
 *
 * ============================================================
 */

// ============================================================
//  🧪 TESTE 1: I2C Bus Scan
// ============================================================
// Detecta todos os dispositivos I2C conectados
// Esperado: 0x20 (MCP0) e 0x21 (MCP1)

/*
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[I2C] Iniciando scan...");
  Wire.begin(21, 22);
  delay(100);
  
  byte error, address;
  int nDevices = 0;
  
  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("[I2C] Dispositivo encontrado em 0x");
      Serial.println(address, HEX);
      nDevices++;
    }
  }
  
  Serial.print("[I2C] Total de dispositivos: ");
  Serial.println(nDevices);
}

void loop() {
  delay(1000);
}
*/

// ============================================================
//  🧪 TESTE 2: Leitura de Sensores IR (via MCP23017)
// ============================================================
// Lê os sensores IR continuamente
// Esperado: HIGH quando sem obstáculo, LOW quando com carro

/*
#include <Wire.h>
#include <Adafruit_MCP23X17.h>

Adafruit_MCP23X17 mcp1;
const uint8_t ENTRY_PIN = 6;
const uint8_t EXIT_PIN = 7;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 2] Leitura de Sensores IR");
  
  Wire.begin(21, 22);
  
  if (!mcp1.begin_I2C(0x21)) {
    Serial.println("[MCP1] ❌ Não encontrado");
    while (1) delay(1000);
  }
  
  Serial.println("[MCP1] ✅ Detectado");
  
  mcp1.pinMode(ENTRY_PIN, INPUT_PULLUP);
  mcp1.pinMode(EXIT_PIN, INPUT_PULLUP);
  
  Serial.println("[Sensores] Prontos. Aproxime um objeto do sensor...");
}

void loop() {
  bool entrada = mcp1.digitalRead(ENTRY_PIN);
  bool saida = mcp1.digitalRead(EXIT_PIN);
  
  Serial.print("Entrada (Pino 6): ");
  Serial.print(entrada ? "HIGH (livre)" : "LOW  (carro)");
  Serial.print("  |  Saída (Pino 7): ");
  Serial.println(saida ? "HIGH (livre)" : "LOW  (carro)");
  
  delay(500);
}
*/

// ============================================================
//  🧪 TESTE 3: PWM Servo Motor - Teste Manual
// ============================================================
// Move servo entre 0° e 90° continuamente
// Visualize a barra do servo se movendo suavemente

/*
#include <ESP32Servo.h>

Servo servoTeste;
const int SERVO_PIN = 18;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 3] PWM Servo Motor");
  Serial.println("[Servo] Anexando ao GPIO 18...");
  
  servoTeste.attach(SERVO_PIN, 1000, 2000);
  
  Serial.println("[Servo] ✅ Anexado. Iniciando sequência de teste...");
  delay(1000);
}

void loop() {
  // Abre (0°)
  Serial.println("[Servo] Movendo para 0° (ABERTA)...");
  servoTeste.write(0);
  delay(2000);
  
  // Fecha (90°)
  Serial.println("[Servo] Movendo para 90° (FECHADA)...");
  servoTeste.write(90);
  delay(2000);
  
  // Posição intermediária
  Serial.println("[Servo] Movendo para 45° (meia abertura)...");
  servoTeste.write(45);
  delay(2000);
}
*/

// ============================================================
//  🧪 TESTE 4: WiFi Connection Test
// ============================================================
// Testa conexão WiFi com timeout
// Esperado: Conecta e mostra IP

/*
#include <WiFi.h>

const char* WIFI_SSID = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 4] WiFi Connection");
  Serial.print("[WiFi] Conectando a: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 40) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] ✅ Conectado!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("[WiFi] ❌ Falha na conexão");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(".");
    delay(1000);
  } else {
    Serial.println("[WiFi] Reconectando...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}
*/

// ============================================================
//  🧪 TESTE 5: MQTT Connection Test
// ============================================================
// Testa conexão ao broker MQTT
// Esperado: Conecta e publica mensagem de teste

/*
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";
const char* MQTT_BROKER = "192.168.0.10";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp32-test-01";

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 5] MQTT Connection");
  
  // Conecta WiFi
  Serial.print("[WiFi] Conectando...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 40) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] ❌ Falha");
    return;
  }
  
  Serial.println("[WiFi] ✅ Conectado");
  
  // Conecta MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  
  Serial.print("[MQTT] Conectando a ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  
  if (mqtt.connect(MQTT_CLIENT_ID)) {
    Serial.println("[MQTT] ✅ Conectado!");
    
    // Publica teste
    mqtt.publish("test/esp32", "Hello from ESP32!");
    Serial.println("[MQTT] ✅ Mensagem publicada em: test/esp32");
  } else {
    Serial.print("[MQTT] ❌ Falha. rc=");
    Serial.println(mqtt.state());
  }
}

void loop() {
  if (!mqtt.connected()) {
    Serial.println("[MQTT] Reconectando...");
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println("[MQTT] ✅ Reconectado");
      mqtt.publish("test/esp32", "Reconected!");
    }
  }
  
  mqtt.loop();
  delay(5000);
}
*/

// ============================================================
//  🧪 TESTE 6: MQTT Message Receive
// ============================================================
// Subscreve a um tópico e recebe mensagens
// Esperado: Recebe e exibe mensagens publicadas

/*
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";
const char* MQTT_BROKER = "192.168.0.10";
const char* MQTT_CLIENT_ID = "esp32-test-02";
const char* TOPIC_SUBSCRIBE = "parking/spots/snapshot";

WiFiClient espClient;
PubSubClient mqtt(espClient);

void onMessageReceived(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT RX] Tópico: ");
  Serial.println(topic);
  Serial.print("[MQTT RX] Payload: ");
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 6] MQTT Message Receive");
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 40) {
    delay(500);
    tentativas++;
  }
  
  mqtt.setServer(MQTT_BROKER, 1883);
  mqtt.setCallback(onMessageReceived);
  
  if (mqtt.connect(MQTT_CLIENT_ID)) {
    Serial.println("[MQTT] ✅ Conectado");
    mqtt.subscribe(TOPIC_SUBSCRIBE);
    Serial.print("[MQTT] ✅ Inscrito em: ");
    Serial.println(TOPIC_SUBSCRIBE);
    Serial.println("\n[Aguardando mensagens. Publique em outro terminal:]");
    Serial.print("mosquitto_pub -h 192.168.0.10 -t ");
    Serial.print(TOPIC_SUBSCRIBE);
    Serial.println(" -m '{\"totalSpots\":20,\"availableSpots\":5}'");
  }
}

void loop() {
  if (!mqtt.connected()) {
    mqtt.connect(MQTT_CLIENT_ID);
  }
  mqtt.loop();
  delay(100);
}
*/

// ============================================================
//  🧪 TESTE 7: Debounce Sensor
// ============================================================
// Testa debounce de um sensor IR
// Esperado: Leitura estável sem flukings

/*
#include <Wire.h>
#include <Adafruit_MCP23X17.h>

Adafruit_MCP23X17 mcp1;
const uint8_t SENSOR_PIN = 6;

// Variáveis de debounce
bool ultimaLeitura = false;
uint8_t contador = 0;

bool lerComDebounce() {
  bool leitura = !mcp1.digitalRead(SENSOR_PIN); // Inverte
  
  if (leitura == ultimaLeitura) {
    contador++;
    if (contador >= 3) {
      return leitura;
    }
  } else {
    contador = 0;
    ultimaLeitura = leitura;
  }
  
  return ultimaLeitura;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 7] Debounce Sensor");
  
  Wire.begin(21, 22);
  
  if (!mcp1.begin_I2C(0x21)) {
    Serial.println("[MCP1] ❌ Erro");
    while (1) delay(1000);
  }
  
  mcp1.pinMode(SENSOR_PIN, INPUT_PULLUP);
  Serial.println("[Sensor] Pronto. Ative/Desative continuamente...");
}

void loop() {
  bool resultado = lerComDebounce();
  
  Serial.print("Leitura: ");
  Serial.println(resultado ? "CARRO" : "LIVRE");
  
  delay(100);
}
*/

// ============================================================
//  🧪 TESTE 8: JSON Parsing
// ============================================================
// Testa parsing de JSON do snapshot de vagas
// Esperado: Extrai valores corretamente

/*
#include <ArduinoJson.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 8] JSON Parsing");
  
  // JSON de teste
  const char* json = "{\"totalSpots\":20,\"occupiedSpots\":15,\"availableSpots\":5}";
  
  Serial.print("[JSON Input] ");
  Serial.println(json);
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, json);
  
  if (error) {
    Serial.print("[JSON] ❌ Erro: ");
    Serial.println(error.f_dealloc());
  } else {
    Serial.println("[JSON] ✅ Parseado com sucesso");
    
    int total = doc["totalSpots"];
    int ocupadas = doc["occupiedSpots"];
    int livres = doc["availableSpots"];
    
    Serial.print("Total: ");
    Serial.print(total);
    Serial.print(" | Ocupadas: ");
    Serial.print(ocupadas);
    Serial.print(" | Livres: ");
    Serial.println(livres);
  }
}

void loop() {
  delay(1000);
}
*/

// ============================================================
//  🧪 TESTE 9: Memory Leak Check
// ============================================================
// Monitora heap memory para detectar vazamentos
// Esperado: Heap deve se manter estável

/*
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("[Teste 9] Memory Leak Check");
  Serial.println("[Heap] Monitorando memória...");
}

void loop() {
  static unsigned long ultimoCheck = 0;
  unsigned long agora = millis();
  
  if (agora - ultimoCheck >= 5000) {
    ultimoCheck = agora;
    
    uint32_t heaplivre = ESP.getFreeHeap();
    uint8_t fragmentacao = 100 - (ESP.getLargestFreeBlock() * 100) / heaplivre;
    
    Serial.print("[Heap] Livre: ");
    Serial.print(heaplivre);
    Serial.print(" bytes | Fragmentação: ");
    Serial.print(fragmentacao);
    Serial.println("%");
  }
}
*/

// ============================================================
//  🧪 TESTE 10: Serial Communication Speed
// ============================================================
// Verifica se baud rate está correto
// Esperado: Texto deve aparecer legível

/*
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("════════════════════════════════════════════════");
  Serial.println("[Teste 10] Serial Communication Speed");
  Serial.println("════════════════════════════════════════════════");
  Serial.println();
  Serial.println("Se esse texto está LEGÍVEL:");
  Serial.println("✅ Baud rate 115200 está correto");
  Serial.println();
  Serial.println("Se está ILEGÍVEL (lixo aleatório):");
  Serial.println("❌ Baud rate não está 115200");
  Serial.println("   Ajuste em: pio device monitor --baud 115200");
  Serial.println();
}

void loop() {
  delay(1000);
}
*/

// ============================================================
//  🎯 Como Usar Estes Testes
// ============================================================
/*
1. Descomente um teste de cada vez
2. Copie e cole em um novo arquivo .ino
3. Faça upload: pio run --target upload
4. Monitore: pio device monitor --baud 115200
5. Analise o resultado
6. Teste o próximo componente

Sequência recomendada:
Teste 1 (I2C) → Teste 2 (Sensores IR) → Teste 3 (Servo)
→ Teste 4 (WiFi) → Teste 5 (MQTT) → Teste 6 (MQTT Receive)
→ Teste 7 (Debounce) → Teste 8 (JSON) → Teste 9 (Memory)
→ Teste 10 (Serial)

Se algum teste falhar, não passe para o próximo até corrigir!
*/
