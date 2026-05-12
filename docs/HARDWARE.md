# Hardware Configuration Guide

## ESP32 Pinout Reference

### GPIO Assignments

| GPIO Pin | Function | Device | Voltage | Notes |
|----------|----------|--------|---------|-------|
| 18 | PWM Output | Entry Gate Servo | 3.3V | Frequency: 50Hz, Pulse: 1-2ms |
| 19 | PWM Output | Exit Gate Servo | 3.3V | Frequency: 50Hz, Pulse: 1-2ms |
| 21 | SDA | I2C Bus | 3.3V (pull-up) | Pull-up resistor: 4.7kΩ |
| 22 | SCL | I2C Bus | 3.3V (pull-up) | Pull-up resistor: 4.7kΩ |
| GND | Ground | All modules | 0V | Common reference |

### Power Supply

- **ESP32 Power**: 5V USB or external adapter (500mA minimum)
- **Servo Power**: 5-6V external supply (2A capacity recommended)
  - **Entry Servo**: GPIO 18 control line (shared GND with ESP32)
  - **Exit Servo**: GPIO 19 control line (shared GND with ESP32)
- **I2C Pull-ups**: 3.3V with 4.7kΩ resistors on SDA/SCL

## I2C Expander Modules (MCP23017)

### I2C Address Configuration

| Module | I2C Address | Device ID | Function |
|--------|-------------|-----------|----------|
| MCP0 | 0x20 | A2:A0 = 000 | Spots 1-16 occupancy sensors |
| MCP1 | 0x21 | A2:A0 = 001 | Spots 17-20 + Gate IR sensors |

### Pin Mapping

#### MCP0 (Address 0x20) - Spots 1-16
```
Pin 0  → Spot 1  occupancy sensor
Pin 1  → Spot 2  occupancy sensor
Pin 2  → Spot 3  occupancy sensor
Pin 3  → Spot 4  occupancy sensor
Pin 4  → Spot 5  occupancy sensor
Pin 5  → Spot 6  occupancy sensor
Pin 6  → Spot 7  occupancy sensor
Pin 7  → Spot 8  occupancy sensor
Pin 8  → Spot 9  occupancy sensor
Pin 9  → Spot 10 occupancy sensor
Pin 10 → Spot 11 occupancy sensor
Pin 11 → Spot 12 occupancy sensor
Pin 12 → Spot 13 occupancy sensor
Pin 13 → Spot 14 occupancy sensor
Pin 14 → Spot 15 occupancy sensor
Pin 15 → Spot 16 occupancy sensor
```

#### MCP1 (Address 0x21) - Spots 17-20 + Gates
```
Pin 0 → Spot 17 occupancy sensor
Pin 1 → Spot 18 occupancy sensor
Pin 2 → Spot 19 occupancy sensor
Pin 3 → Spot 20 occupancy sensor
Pin 4 → [Reserved]
Pin 5 → [Reserved]
Pin 6 → Entry Gate IR Sensor  ⚠️ KEY SIGNAL
Pin 7 → Exit Gate IR Sensor   ⚠️ KEY SIGNAL
```

## Servo Motor Configuration

### Servo Specifications
- **Type**: Standard SG90 (or equivalent 9g servo)
- **Control Signal**: PWM (3.3V logic)
- **Frequency**: 50Hz (20ms period)
- **Pulse Duration**: 
  - **Closed (0°)**: 0.5ms pulse width → Closed gate
  - **Open (90°)**: 1.5ms pulse width → Open gate
  - **Range**: 0.5ms - 2.5ms (0° - 180°)
- **Torque**: 2.0kg-cm minimum
- **Speed**: 0.1s per 60° minimum

### Gate Opening Logic
```c
// In firmware (Config.h)
#define CLOSED_ANGLE    0     // Closed position: 0°
#define OPEN_ANGLE      90    // Open position: 90°
#define GATE_DURATION_MS 3000 // Keep gate open for 3 seconds
```

### Servo Control
```c
// Entry Gate Control
ledcWrite(SERVO_ENTRY_CHANNEL, PWM_ANGLE_0);   // Close gate
delay(100);
ledcWrite(SERVO_ENTRY_CHANNEL, PWM_ANGLE_90);  // Open gate
delay(GATE_DURATION_MS);
ledcWrite(SERVO_ENTRY_CHANNEL, PWM_ANGLE_0);   // Close gate
```

## Magnetic Reed Switch (Occupancy Sensors)

### Specifications
- **Type**: Normally Open (NO) magnetic reed switch
- **Trigger**: Magnetic field from vehicle (magnet on car body)
- **Voltage**: 3.3V (pulled high via MCP23017)
- **Current**: ~5mA when triggered
- **Contact Resistance**: < 1Ω when closed
- **Debounce Time**: 120ms (configured in firmware)

### Sensor Circuit
```
MCP23017 Pin (INPUT)
    ↓
Pull-up resistor (internal to MCP23017)
    ↓
Reed Switch in parallel with GND
    ↓
Vehicle approaching → Magnetic field → Switch closes → Pin reads LOW
Vehicle leaving    → Field removed  → Switch opens  → Pin reads HIGH
```

## IR Sensor (Gate Detection)

### Specifications
- **Type**: Infrared Beam Sensor (break-beam)
- **Voltage**: 3.3V
- **Output**: Normally HIGH, LOW when beam broken
- **Detection Range**: 20-100mm (adjustable via potentiometer)
- **Response Time**: ~10ms

### Wiring
```
IR Sensor TX (Transmitter):
    3.3V → 220Ω Resistor → Anode (longer leg)

IR Sensor RX (Receiver):
    Output → MCP1 Pin 6 (Entry) or Pin 7 (Exit)
    3.3V ← Pull-up resistor (4.7kΩ)
    GND ← Cathode (shorter leg)
```

### Logic Level
```
No obstruction: RX output = HIGH (3.3V) → MCP pin reads HIGH
Vehicle approaching: Beam broken → RX output = LOW (0V) → MCP pin reads LOW → Trigger gate open
```

## Wiring Diagram

```
                    ┌─────────────────────┐
                    │     ESP32 Board     │
                    └─────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
        GPIO18           │            GPIO19
    (Entry Servo)        │         (Exit Servo)
          │              │              │
          │              │              │
    ┌─────┴─────┐    ┌───┴───┐    ┌─────┴─────┐
    │   Servo   │    │ POWER │    │   Servo   │
    │  (Entry)  │    │ 5V    │    │  (Exit)   │
    │           │    │ GND   │    │           │
    └───────────┘    └───┬───┘    └───────────┘
                         │
                    Power Distribution
                         │
          ┌──────────────┼──────────────┐
          │              │              │
        GPIO21          GPIO22         GND
       (SDA)            (SCL)        (Common)
          │              │              │
          │              │              │
    ┌─────┴──────────────┴──────┬──────┴─────┐
    │     I2C BUS (4.7kΩ pulls) │            │
    └──────────────────┬─────────┘            │
                       │                      │
              ┌────────┴────────┐             │
              │                 │             │
          ┌───┴───┐         ┌───┴───┐        │
          │ MCP0  │         │ MCP1  │        │
          │0x20   │         │0x21   │        │
          └───┬───┘         └───┬───┘        │
              │                 │            │
        Pins 0-15          Pins 0-7          │
        (Spots 1-16)   (Spots 17-20+Gates)  │
              │                 │            │
              │            ┌────┴────┐       │
              │            │  Pins 6-7       │
              │            │  IR Sensors     │
              │            │(Entry/Exit)     │
              │            └────┬────┘       │
              │                 │            │
         [Reed Switches]   [Beam Sensors]  [GND Common]
         (Occupancy)      (Gate Trigger)
              │                 │            │
              └─────────────────┼────────────┘
                           [Ground Reference]
```

## Software Configuration

### PlatformIO Configuration (platformio.ini)
```ini
[env:esp32dev]
platform = espressif32
board = esp32doit-devkit-v1
framework = arduino
lib_deps =
    ESP32Servo
    ArduinoMqttClient
upload_speed = 921600
monitor_speed = 115200
```

### Firmware Configuration (Config.h)
```c
// WiFi Configuration
#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASSWORD "YOUR_PASSWORD"

// MQTT Configuration
#define MQTT_BROKER_IP "192.168.0.10"
#define MQTT_BROKER_PORT 1883
#define MQTT_CLIENT_ID "parking-esp32-001"

// GPIO Pins
#define SERVO_ENTRY_PIN 18
#define SERVO_EXIT_PIN 19
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22

// Servo Control
#define SERVO_FREQ 50      // 50Hz
#define PWM_CHANNEL_ENTRY 0
#define PWM_CHANNEL_EXIT 1
```

### Hardware Configuration (ParkingConfig.h)
```c
// MCP23017 I2C Addresses
#define MCP_ADDRESS_0 0x20  // Spots 1-16
#define MCP_ADDRESS_1 0x21  // Spots 17-20 + Gates

// Gate IR Sensor Pins (MCP1)
#define GATE_ENTRY_PIN 6
#define GATE_EXIT_PIN 7

// Sensor Debounce
#define SENSOR_DEBOUNCE_MS 120

// Gate Timings
#define GATE_OPEN_DURATION_MS 3000
#define GATE_CLOSED_ANGLE 0
#define GATE_OPEN_ANGLE 90
```

## Testing & Validation

### Servo Test
```c
// Test servo movement
ledcWrite(SERVO_ENTRY_CHANNEL, PWM_ANGLE_0);  // Should go to 0°
delay(1000);
ledcWrite(SERVO_ENTRY_CHANNEL, PWM_ANGLE_90); // Should go to 90°
```

### I2C Communication Test
```c
Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
Wire.beginTransmission(MCP_ADDRESS_0);
Wire.write(IODIR);  // Read input direction register
Wire.endTransmission();
```

### Sensor Debug
- Use serial monitor to log reed switch state changes
- Monitor IR sensor beam breaks with timestamp
- Verify debouncing prevents spurious triggers

---

**Last Updated**: 2025
**Version**: 1.0
**Hardware Rev**: ESP32-WROOM-32 + MCP23017 x2
