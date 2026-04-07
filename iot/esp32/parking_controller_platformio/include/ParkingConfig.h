#pragma once

#include <Arduino.h>

// ====== Capacidade ======
static constexpr uint8_t TOTAL_SPOTS = 22;
static constexpr bool SENSOR_ACTIVE_LOW = true; // true: LOW = ocupado

// ====== MCP23017 ======
static constexpr uint8_t MCP1_ADDR = 0x20;
static constexpr uint8_t MCP2_ADDR = 0x21;

// Mapeamento de 22 vagas:
// - Vagas 1..16  -> MCP1 pinos 0..15
// - Vagas 17..22 -> MCP2 pinos 0..5
struct SpotMap {
  uint8_t mcpIndex; // 0 ou 1
  uint8_t pin;      // 0..15
};

static constexpr SpotMap SPOT_MAP[TOTAL_SPOTS] = {
  {0, 0}, {0, 1}, {0, 2}, {0, 3}, {0, 4}, {0, 5}, {0, 6}, {0, 7},
  {0, 8}, {0, 9}, {0, 10}, {0, 11}, {0, 12}, {0, 13}, {0, 14}, {0, 15},
  {1, 0}, {1, 1}, {1, 2}, {1, 3}, {1, 4}, {1, 5}
};

// ====== Sensores de cancela (opcional já pronto) ======
// Entrada: MCP2 pino 6 / Saída: MCP2 pino 7
static constexpr uint8_t ENTRY_GATE_MCP_INDEX = 1;
static constexpr uint8_t ENTRY_GATE_PIN = 6;
static constexpr uint8_t EXIT_GATE_MCP_INDEX = 1;
static constexpr uint8_t EXIT_GATE_PIN = 7;

// ====== Servo ======
static constexpr int SERVO_ENTRY_PIN = 18;
static constexpr int SERVO_EXIT_PIN = 19;
static constexpr int SERVO_CLOSED_ANGLE = 0;
static constexpr int SERVO_OPEN_ANGLE = 90;
static constexpr uint32_t SERVO_OPEN_TIME_MS = 2500;

// ====== Temporização ======
static constexpr uint32_t SENSOR_POLL_MS = 50;
static constexpr uint32_t SENSOR_DEBOUNCE_MS = 120;
static constexpr uint32_t SNAPSHOT_PUBLISH_MS = 30000;
static constexpr uint32_t DEVICE_STATUS_PUBLISH_MS = 15000;
