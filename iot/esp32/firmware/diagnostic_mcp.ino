/*
 * ============================================================
 *  DIAGNÓSTICO MCP23017 — Teste de Fiação das 22 Vagas
 * ============================================================
 *  Objetivo: Varrer todos os 22 pinos e mostrar contínuo o estado
 *  (sem MQTT, apenas para debugar fiação).
 *
 *  Bibliotecas: Adafruit_MCP23X17
 * ============================================================
 */

#include <Wire.h>
#include <Adafruit_MCP23X17.h>

Adafruit_MCP23X17 mcp0;
Adafruit_MCP23X17 mcp1;

#define ENDERECO_MCP0 0x20
#define ENDERECO_MCP1 0x21

const int TOTAL_VAGAS = 22;

struct SensorMap {
  uint8_t mcpIndex;
  uint8_t pin;
};

const SensorMap SENSOR_MAP[TOTAL_VAGAS] = {
  {0, 0}, {0, 1}, {0, 2}, {0, 3}, {0, 4},
  {0, 5}, {0, 6}, {0, 7}, {0, 8}, {0, 9},
  {0,10}, {0,11}, {0,12}, {0,13}, {0,14},
  {0,15}, {1, 0}, {1, 1}, {1, 2}, {1, 3}, {1, 4}, {1, 5}
};

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║  DIAGNÓSTICO MCP23017 — 22 Vagas      ║");
  Serial.println("╚════════════════════════════════════════╝\n");

  Wire.begin();

  if (!mcp0.begin_I2C(ENDERECO_MCP0)) {
    Serial.println("❌ MCP0 (0x20) não encontrado!");
    while (1) delay(1000);
  }
  Serial.println("✅ MCP0 (0x20) detectado");

  if (!mcp1.begin_I2C(ENDERECO_MCP1)) {
    Serial.println("❌ MCP1 (0x21) não encontrado!");
    while (1) delay(1000);
  }
  Serial.println("✅ MCP1 (0x21) detectado\n");

  // Configura todos os pinos como entrada
  for (int i = 0; i < TOTAL_VAGAS; i++) {
    SensorMap map = SENSOR_MAP[i];
    if (map.mcpIndex == 0) {
      mcp0.pinMode(map.pin, INPUT_PULLUP);
    } else {
      mcp1.pinMode(map.pin, INPUT_PULLUP);
    }
  }

  Serial.println("═══════════════════════════════════════");
  Serial.println("Pressione qualquer tecla no Monitor");
  Serial.println("Serial para começar o scan...");
  Serial.println("═══════════════════════════════════════\n");
}

void loop() {
  // Aguarda input do usuário
  if (Serial.available()) {
    Serial.read(); // Consome o caracter
    Serial.println("\n┌─ SCAN DE TODAS AS 22 VAGAS ─────────────┐");
    
    for (int i = 0; i < TOTAL_VAGAS; i++) {
      int vagaId = i + 1;
      SensorMap map = SENSOR_MAP[i];
      int raw = (map.mcpIndex == 0) ? mcp0.digitalRead(map.pin) : mcp1.digitalRead(map.pin);
      
      Serial.print("│ Vaga ");
      if (vagaId < 10) Serial.print(" ");
      Serial.print(vagaId);
      Serial.print(" (MCP");
      Serial.print(map.mcpIndex);
      Serial.print(", pin ");
      if (map.pin < 10) Serial.print(" ");
      Serial.print(map.pin);
      Serial.print(") = ");
      
      if (raw == LOW) {
        Serial.print("LOW  [🚗 OCUPADA]");
      } else {
        Serial.print("HIGH [✅ LIVRE  ]");
      }
      Serial.println();
    }
    
    Serial.println("└──────────────────────────────────────┘");
    Serial.println("\n⏳ Aguardando próximo scan... (3s)\n");
    delay(3000);
  }
}
