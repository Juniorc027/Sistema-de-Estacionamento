# 🔌 Smart Parking ESP32 — PINAGEM COMPLETA

## 📌 Diagrama de Conexões

```
┌─────────────────────────────────────────────────────────────────┐
│                      ESP32 DEV MODULE                           │
│                                                                 │
│  GND ────► GND (Barramento comum)                               │
│  3V3 ────► VCC_LÓGICA (Sensores, MCPs)                          │
│  5V  ────► VCC_PODER (Servos, Sensores)                         │
│                                                                 │
│  GPIO 21 (SDA) ──┐                                              │
│  GPIO 22 (SCL) ──┼─► I2C BUS (100kHz)                           │
│                  │                                              │
│  GPIO 18 ────────► SERVO_ENTRADA (PWM)                          │
│  GPIO 19 ────────► SERVO_SAIDA (PWM)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼─────────┐  ┌─────▼──────────┐
            │  MCP23017 #0    │  │  MCP23017 #1   │
            │  Endereço: 0x20 │  │  Endereço: 0x21│
            │                 │  │                │
            │  A0 ────► GND   │  │  A0 ────► 5V   │
            │  A1 ────► GND   │  │  A1 ────► GND  │
            │  A2 ────► GND   │  │  A2 ────► GND  │
            │  SDA ──────┬────┼──┼──┬───────────┐ │
            │  SCL ──────┴────┼──┼──┴───────────┘ │
            │  VCC ─────► +5V │  │  VCC ─────► +5V
            │  GND ─────► GND │  │  GND ─────► GND
            │                 │  │                │
            │  GPA0..GPA7     │  │  GPA0..GPA3    │
            │  GPB0..GPB7     │  │  GPA6, GPA7    │
            │  (Pinos 0-15)   │  │  (Pinos 0-7)   │
            └─────────────────┘  └────────────────┘
                     │                     │
        ┌────────────┼────────┐  ┌─────────┼────────────┐
        │            │        │  │         │            │
   ┌────▼─┐  ┌──────▼──┐  ┌──┴──┴┐  ┌──────▼──┐  ┌─────▼─┐
   │Sensor│  │Sensor   │  │Sensor│  │Sensor  │  │Servo │
   │Vaga1 │  │Vaga2    │  │Ent.  │  │Saída   │  │Ent.  │
   │ (P0) │  │ (P1)    │  │ (P6) │  │ (P7)   │  │ (G18)│
   └──────┘  └─────────┘  └──────┘  └────────┘  └──────┘
      ...         ...                              │
   ┌──────┐                                  ┌────▼─────┐
   │Sensor│                                  │ PWM Ctrl  │
   │Vaga16│                                  │ (Servo)   │
   │(P15) │                                  └───────────┘
   └──────┘
```

---

## 📋 TABELA DE PINOS — MCP23017 #0 (0x20)

Vagas 1 a 16 — Sensores Infravermelhos

| Pino MCP | Vaga | Tipo | Lógica |
|----------|------|------|--------|
| GPA0 (0) | 1 | IR | 1=LIVRE, 0=OCUPADA |
| GPA1 (1) | 2 | IR | 1=LIVRE, 0=OCUPADA |
| GPA2 (2) | 3 | IR | 1=LIVRE, 0=OCUPADA |
| GPA3 (3) | 4 | IR | 1=LIVRE, 0=OCUPADA |
| GPA4 (4) | 5 | IR | 1=LIVRE, 0=OCUPADA |
| GPA5 (5) | 6 | IR | 1=LIVRE, 0=OCUPADA |
| GPA6 (6) | 7 | IR | 1=LIVRE, 0=OCUPADA |
| GPA7 (7) | 8 | IR | 1=LIVRE, 0=OCUPADA |
| GPB0 (8) | 9 | IR | 1=LIVRE, 0=OCUPADA |
| GPB1 (9) | 10 | IR | 1=LIVRE, 0=OCUPADA |
| GPB2 (10) | 11 | IR | 1=LIVRE, 0=OCUPADA |
| GPB3 (11) | 12 | IR | 1=LIVRE, 0=OCUPADA |
| GPB4 (12) | 13 | IR | 1=LIVRE, 0=OCUPADA |
| GPB5 (13) | 14 | IR | 1=LIVRE, 0=OCUPADA |
| GPB6 (14) | 15 | IR | 1=LIVRE, 0=OCUPADA |
| GPB7 (15) | 16 | IR | 1=LIVRE, 0=OCUPADA |

**Configuração:**
- VCC: +5V
- GND: GND
- SDA: GPIO 21 (ESP32)
- SCL: GPIO 22 (ESP32)
- A0, A1, A2: GND (garante endereço 0x20)
- INTA, INTB: Não conectados (polling apenas)

---

## 📋 TABELA DE PINOS — MCP23017 #1 (0x21)

Vagas 17-20 + Sensores de Cancela

| Pino MCP | Uso | Tipo | Lógica |
|----------|-----|------|--------|
| GPA0 (0) | Vaga 17 | IR | 1=LIVRE, 0=OCUPADA |
| GPA1 (1) | Vaga 18 | IR | 1=LIVRE, 0=OCUPADA |
| GPA2 (2) | Vaga 19 | IR | 1=LIVRE, 0=OCUPADA |
| GPA3 (3) | Vaga 20 | IR | 1=LIVRE, 0=OCUPADA |
| GPA4 (4) | Não usado | — | — |
| GPA5 (5) | Não usado | — | — |
| **GPA6 (6)** | **IR Entrada** | **IR** | **1=LIVRE, 0=CARRO** |
| **GPA7 (7)** | **IR Saída** | **IR** | **1=LIVRE, 0=CARRO** |

**Configuração:**
- VCC: +5V
- GND: GND
- SDA: GPIO 21 (ESP32)
- SCL: GPIO 22 (ESP32)
- A0: +5V, A1: GND, A2: GND (garante endereço 0x21)

---

## 🎮 TABELA DE SERVOS

| Servo | GPIO | Pino ESP32 | Controle | Ângulo Min | Ângulo Max |
|-------|------|-----------|----------|-----------|-----------|
| Entrada | 18 | GPIO18 | PWM | 0° (Aberto) | 90° (Fechado) |
| Saída | 19 | GPIO19 | PWM | 0° (Aberto) | 90° (Fechado) |

**Conexão do Servo:**
```
Servo 3-pin:
├─ Vermelho   → +5V
├─ Marrom/Preto → GND
└─ Laranja    → GPIO 18 ou 19 (PWM)
```

**Frequência PWM:**
- 1000µs = 0° (Aberto)
- 2000µs = 90° (Fechado)
- Frequência: 50Hz (padrão para servos)

---

## 🔌 LISTA DE COMPONENTES

### Sensores
- 20x Sensor Infravermelho (D0 output)
  - Alimentação: +5V
  - Saída: LOW quando carro detectado
  - Todos com resistor pull-up interno no MCP

### MCPs
- 2x MCP23017 (Multiplexador I2C 16 canais)
  - Endereço #0: 0x20
  - Endereço #1: 0x21
  - Comunicação: I2C (100kHz)

### Servos
- 2x Servo Motor (9g ou maior)
  - Tensão: +5V
  - Torque: 2.5kg/cm (mínimo recomendado)
  - PWM: GPIO 18 e 19

### Conectividade
- ESP32 Dev Module
- WiFi: Built-in
- Fios: 24 AWG mínimo (I2C) + 22 AWG para power

### Alimentação
- Fonte +5V / 3A (mínimo)
  - MCPs: 200mA
  - Sensores: 100mA
  - Servos: 1.5A (pico)
- Capacitor eletrolítico 100µF entre +5V e GND (desacoplamento)

---

## ⚡ CIRCUITO DE ALIMENTAÇÃO

```
┌──────────────┐
│ Fonte +5V 3A │
└──────┬───────┘
       │
       ├──┬──► Capacitor 100µF ──► GND
       │  │
       │  └──────► VCC Barramento
       │
       ├──────────────────────────────────┐
       │                                  │
    [MCP#0]                           [MCP#1]
    [Servos]                        [Sensores]
    [Sensores]                      [Servos]
       │                                  │
       └──────────────────────────────────┘
                      │
                      │
                   GND Barramento
                      │
       ┌──────────────┴──────────────┐
       │                             │
    [ESP32]                   [Capacitor 10µF]
    [Sensores IR]                   │
                                   GND
```

---

## 🧪 TESTE DE PINAGEM

### Teste 1: Verificar I2C (MCPs)
```cpp
// No Arduino IDE, Serial Monitor 115200 baud:
// Esperado:
// [MCP#0] ✅ Inicializado (vagas 1-16)
// [MCP#1] ✅ Inicializado (vagas 17-20 + cancelas)
```

### Teste 2: Verificar Servos
```cpp
// Movimento esperado:
// [Servo Entrada] Movendo para 0° (ABERTO)
// [Servo Entrada] Movendo para 90° (FECHADO)
// [Servo Saída] Movendo para 0° (ABERTO)
// [Servo Saída] Movendo para 90° (FECHADO)
```

### Teste 3: Verificar Sensores IR
```bash
# Coloque um objeto perto do sensor e veja no Serial Monitor:
# [Vaga 1] OCUPADA
# (remova o objeto)
# [Vaga 1] LIVRE
```

---

## 🔧 TROUBLESHOOTING PINAGEM

| Problema | Causa | Solução |
|----------|-------|---------|
| MCP não encontrado | I2C não comunicando | Verifique SDA/SCL, pull-ups |
| Servo não se move | PWM fora do range | Ajuste 1000-2000µs |
| Sensor sempre ocupado | Inversão de lógica | Mude `SENSOR_ACTIVE_LOW` |
| Valores flutuantes | Debounce insuficiente | Aumente `DEBOUNCE_THRESHOLD` |
| Servo tremendo | Alimentação fraca | Use fonte +5V dedicada |

---

## 📸 FOTOS DE REFERÊNCIA

Para referência visual, consulte:
- `docs/HARDWARE.md` — Descrição detalhada
- `iot/esp32/` — Diagrama do circuito

---

**Versão:** 1.0  
**Última atualização:** 11/05/2026  
**Status:** ✅ Verificado e Testado
