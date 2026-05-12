# 📋 Diagrama de Pinagem — Smart Parking ESP32

## 🎯 Visão Geral Rápida

```
ESP32 Dev Module
    │
    ├─► GPIO 21 (SDA) ─────────────► I2C BUS
    ├─► GPIO 22 (SCL) ─────────────► I2C BUS
    │
    ├─► GPIO 13 ───► Servo Entrada
    ├─► GPIO 12 ───► Servo Saída
    │
    └─ Alimentação: 5V + GND


I2C BUS (100kHz)
    │
    ├─► MCP23017 #0 (0x20)
    │   └─ 16 Pinos (A0-A7, B0-B7)
    │      └─ Sensores Vagas 1-16
    │
    └─► MCP23017 #1 (0x21)
        ├─ Pinos A0-A3: Sensores Vagas 17-20
        ├─ Pino A6: Sensor IR Entrada
        └─ Pino B6: Sensor IR Saída
```

---

## 🔌 Pinagem ESP32 Dev Module

### Pinos Utilizados

```
┌──────────────────────────────────────────────────────────────┐
│                    ESP32 Dev Module                          │
└──────────────────────────────────────────────────────────────┘

┌─ PINOS DE ENTRADA/SAÍDA UTILIZADOS ─────────────────────────┐
│                                                              │
│  GPIO 21 (SDA)  ───────► Barramento I2C                     │
│  GPIO 22 (SCL)  ───────► Barramento I2C                     │
│                                                              │
│  GPIO 13        ───────► PWM Servo Entrada                  │
│  GPIO 12        ───────► PWM Servo Saída                    │
│                                                              │
│  5V             ───────► Alimentação MCP + Servos           │
│  GND (x2)       ───────► Massa MCP + Servos                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎛️ Configuração I2C

### Barramento I2C (100 kHz)

```
┌──────────────────────────────────────────────────────────────┐
│                      BARRAMENTO I2C                          │
│                  SDA = GPIO 21 / SCL = GPIO 22              │
│                      Frequência: 100kHz                      │
└──────────────────────────────────────────────────────────────┘

    ESP32
      │
      ├─ GPIO 21 (SDA) ─────┬─────────► Resistor Pull-up 10kΩ ─► +5V
      │                     │
      │                     ├─► MCP23017 #0 (0x20) SDA
      │                     │
      │                     └─► MCP23017 #1 (0x21) SDA
      │
      └─ GPIO 22 (SCL) ─────┬─────────► Resistor Pull-up 10kΩ ─► +5V
                            │
                            ├─► MCP23017 #0 (0x20) SCL
                            │
                            └─► MCP23017 #1 (0x21) SCL
```

### Endereços I2C

```
MCP23017 #1 (Vagas 1-16)          MCP23017 #2 (Vagas 17-20 + Sensores)
    Endereço: 0x20                    Endereço: 0x21
    
    Pinos de Configuração:           Pinos de Configuração:
    A0 = GND                         A0 = 5V
    A1 = GND                         A1 = GND
    A2 = GND                         A2 = GND
    
    ┌─ PORTA A (A0-A7) ─┐            ┌─ PORTA A (A0-A3) ─┐
    │ 0 = Vaga 1        │            │ 0 = Vaga 17       │
    │ 1 = Vaga 2        │            │ 1 = Vaga 18       │
    │ 2 = Vaga 3        │            │ 2 = Vaga 19       │
    │ 3 = Vaga 4        │            │ 3 = Vaga 20       │
    │ 4 = Vaga 5        │            │ 6 = Sensor ENTRADA│
    │ 5 = Vaga 6        │            └───────────────────┘
    │ 6 = Vaga 7        │
    │ 7 = Vaga 8        │            ┌─ PORTA B (B0-B7) ─┐
    └───────────────────┘            │ 0 = (não usado)   │
                                     │ 1 = (não usado)   │
    ┌─ PORTA B (B0-B7) ─┐            │ ...               │
    │ 0 = Vaga 9        │            │ 6 = Sensor SAÍDA  │
    │ 1 = Vaga 10       │            │ ...               │
    │ 2 = Vaga 11       │            └───────────────────┘
    │ 3 = Vaga 12       │
    │ 4 = Vaga 13       │
    │ 5 = Vaga 14       │
    │ 6 = Vaga 15       │
    │ 7 = Vaga 16       │
    └───────────────────┘
```

---

## 🚗 Esquema de Sensores de Vagas

### MCP23017 #0 (0x20) — Vagas 1-16

```
Portas: A0-A7 (Vagas 1-8) + B0-B7 (Vagas 9-16)

Cada pino configurado como INPUT_PULLUP:
- Pino = LOW (0V)  → Veículo Detectado (OCUPADA)
- Pino = HIGH (5V) → Sem Veículo (LIVRE)

GND ◄─ Sensor IR (Vaga)
5V  ◄─ Resistor Pull-up 10kΩ
GPIO ─► MCP Pin
```

### MCP23017 #1 (0x21) — Vagas 17-20

```
Portas: A0-A3 (Vagas 17-20)

Mesma lógica:
- LOW  → OCUPADA
- HIGH → LIVRE
```

---

## 🚪 Esquema de Sensores de Entrada/Saída

### MCP23017 #1 (0x21) — Sensores de Cancela

```
┌─ SENSOR ENTRADA ────────────────────────┐
│                                         │
│  MCP2-A6 (Pino 6 de PORTA A)            │
│                                         │
│  Lógica:                                │
│  LOW  (0V)  → Carro Detectado           │
│  HIGH (5V) → Sem Carro                  │
│                                         │
│  Ação ESP32:                            │
│  • Se LOW e vagasLivres > 0             │
│    ├─ Abre Servo Entrada (GPIO 13)      │
│    ├─ Aguarda 3 segundos                │
│    └─ Fecha automaticamente             │
│  • Se vagasLivres = 0                   │
│    └─ Mantém fechado (bloqueado)        │
│                                         │
└─────────────────────────────────────────┘

┌─ SENSOR SAÍDA ──────────────────────────┐
│                                         │
│  MCP2-B6 (Pino 6 de PORTA B)            │
│                                         │
│  Lógica:                                │
│  LOW  (0V)  → Carro Detectado           │
│  HIGH (5V) → Sem Carro                  │
│                                         │
│  Ação ESP32:                            │
│  • Se LOW detectado                     │
│    ├─ Abre Servo Saída (GPIO 12)        │
│    ├─ Aguarda 3 segundos                │
│    └─ Fecha automaticamente             │
│  • Saída sempre abre (sem bloqueio)     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎛️ Servos PWM

### Servo Entrada (GPIO 13)

```
Conector 3 pinos:
  [Marrom] = GND
  [Vermelho] = 5V (alimentação separada!)
  [Laranja] = GPIO 13

Ângulos:
  0°   = Aberto (OPEN)
  90°  = Fechado (CLOSED)
  
Comportamento:
  • Abre quando detectar carro EM ENTRADA
    └─ Apenas se vagasLivres > 0
  • Fecha automaticamente após 3 segundos
  • Bloqueia se estacionamento cheio
```

### Servo Saída (GPIO 12)

```
Conector 3 pinos:
  [Marrom] = GND
  [Vermelho] = 5V (alimentação separada!)
  [Laranja] = GPIO 12

Ângulos:
  0°   = Aberto (OPEN)
  90°  = Fechado (CLOSED)
  
Comportamento:
  • Abre quando detectar carro EM SAÍDA
  • Fecha automaticamente após 3 segundos
  • Sempre abre (sem restrições)
```

---

## 🔌 Fiação Completa

### Diagrama de Conexões

```
┌─────────────────────────────────────────────────────────────────┐
│                         ESP32 DEV MODULE                        │
│                                                                 │
│  3V3  [•] [•] GND                                               │
│                                                                 │
│  GPIO13 [•]─────► SERVO ENTRADA (PWM)                           │
│  GPIO12 [•]─────► SERVO SAÍDA (PWM)                             │
│  GPIO21 [•]─────► I2C SDA                                       │
│  GPIO22 [•]─────► I2C SCL                                       │
│                                                                 │
│  5V    [•]─────┬─► Alimentação Servos                           │
│                └─► Alimentação MCP23017                         │
│                                                                 │
│  GND   [•]─────┬─► Massa Servos                                 │
│  GND   [•]─────┴─► Massa MCP23017                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                      │                    │
         │                      │                    │
         ▼                      ▼                    ▼
    [SERVOS]              [MCP23017 I2C]        [SENSORES IR]
         │                      │                    │
    ┌────┴────┐            ┌────┴─────┐         ┌───┴────┐
    │          │            │          │         │        │
 Entrada    Saída        MCP1      MCP2      Vagas   Cancelas
(GPIO13)   (GPIO12)     (0x20)    (0x21)   (1-20)  (Ent/Saí)
    │          │            │          │         │        │
```

---

## 📊 Tabela de Pinos

### ESP32

| GPIO | Função | Tipo | Observação |
|------|--------|------|-----------|
| 13 | Servo Entrada | PWM Output | 1000-2000µs |
| 12 | Servo Saída | PWM Output | 1000-2000µs |
| 21 | I2C SDA | I2C | Com pull-up 10kΩ |
| 22 | I2C SCL | I2C | Com pull-up 10kΩ |
| 5V | Alimentação | Power | Até 500mA recomendado |
| GND | Massa | Ground | 2x GND recomendado |

### MCP23017 #0 (0x20)

| Pino | Função | Entrada/Saída | Descrição |
|------|--------|----------------|-----------|
| A0 | Vaga 1 | INPUT | Sensor IR |
| A1 | Vaga 2 | INPUT | Sensor IR |
| A2 | Vaga 3 | INPUT | Sensor IR |
| A3 | Vaga 4 | INPUT | Sensor IR |
| A4 | Vaga 5 | INPUT | Sensor IR |
| A5 | Vaga 6 | INPUT | Sensor IR |
| A6 | Vaga 7 | INPUT | Sensor IR |
| A7 | Vaga 8 | INPUT | Sensor IR |
| B0 | Vaga 9 | INPUT | Sensor IR |
| B1 | Vaga 10 | INPUT | Sensor IR |
| B2 | Vaga 11 | INPUT | Sensor IR |
| B3 | Vaga 12 | INPUT | Sensor IR |
| B4 | Vaga 13 | INPUT | Sensor IR |
| B5 | Vaga 14 | INPUT | Sensor IR |
| B6 | Vaga 15 | INPUT | Sensor IR |
| B7 | Vaga 16 | INPUT | Sensor IR |

### MCP23017 #1 (0x21)

| Pino | Função | Entrada/Saída | Descrição |
|------|--------|----------------|-----------|
| A0 | Vaga 17 | INPUT | Sensor IR |
| A1 | Vaga 18 | INPUT | Sensor IR |
| A2 | Vaga 19 | INPUT | Sensor IR |
| A3 | Vaga 20 | INPUT | Sensor IR |
| A6 | Entrada | INPUT | Sensor IR Cancela |
| B6 | Saída | INPUT | Sensor IR Cancela |

---

## 🔧 Componentes Necessários

### Lista de Materiais

```
┌────────────────────────────────────────────────────────────┐
│                    COMPONENTES ELETRÔNICOS                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✓ 1x ESP32 Dev Module                                   │
│  ✓ 2x MCP23017 I2C Expander (DIP-28)                    │
│  ✓ 2x Servo Motor (SG90 ou MG90S)                       │
│  ✓ 22x Sensores IR (20 vagas + 2 cancelas)             │
│  ✓ 2x Resistor 10kΩ (pull-up I2C)                       │
│  ✓ 1x Capacitor 100µF (estabilização servo)             │
│  ✓ 1x Diodo 1N4007 (proteção)                           │
│  ✓ Fios jumper (macho-fêmea, macho-macho)              │
│  ✓ Protoboard ou PCB                                     │
│  ✓ Fonte 5V 2A (mínimo)                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Observações Importantes

### Alimentação
```
❌ NÃO alimentar servos pela ESP32
✅ SIM usar fonte separada 5V 2A mínimo

Razão: Servos consomem muita corrente
       ESP32 pode reiniciar ou danificar
```

### I2C Pull-up
```
❌ NÃO remover resistores pull-up
✅ SIM manter 10kΩ em SDA e SCL

Razão: Protocolo I2C requer pull-ups
       Sem eles: erros de comunicação
```

### Debounce
```
Implementado no código:
- 3 leituras consecutivas iguais
- Intervalo de 500ms entre leituras
- Confirmação = 1.5 segundos total
```

### Sensor Ativo Baixo
```
#define SENSOR_ACTIVE_LOW true

Significa:
- LOW (0V)   → Veículo DETECTADO
- HIGH (5V)  → SEM Veículo

Típico para sensores infravermelho
```

---

## 🧪 Teste de Pinagem

### Serial Monitor (com sistema ligado)

```
Esperado ver ao conectar:

[I2C] Inicializando barramento I2C (SDA=21, SCL=22)...
[MCP1] Inicializando em endereço 0x20... OK
[MCP2] Inicializando em endereço 0x21... OK
[SERVO] Inicializando servos...
[WiFi] Conectando...
✅ WiFi Conectado: 192.168.x.x
[MQTT] Conectando...
✅ MQTT Conectado
✅ SISTEMA PRONTO - Monitorando vagas...
```

### Se MCP não aparecer "OK"
```
1. Verifique fiação I2C (SDA/SCL)
2. Verifique alimentação (+5V/GND)
3. Verifique resistores pull-up (10kΩ)
4. Teste com I2C Scanner
```

### Se Servo não responde
```
1. Verifique GPIO 13 e GPIO 12
2. Verifique alimentação separada (+5V)
3. Verifique massa (GND)
4. Teste com código servo simples
```

---

## 📚 Referências Rápidas

### Pinos ESP32
- Total: 36 pinos
- PWM: Todos os GPIO
- I2C: Flexível (usamos 21/22)
- Recomendado: GPIO 1-39 (evitar 0, 6-11)

### MCP23017
- I2C Address: 0x20-0x27 (8 endereços possíveis)
- 16 Pinos: A0-A7, B0-B7
- Voltagem: 3.3V a 5V
- Pull-up: Recomendado para entrada

### Servo SG90
- Voltagem: 4.8V - 6V
- Torque: 2.5 kg·cm
- Velocidade: 0.12 sec/60°
- PWM: 1ms (0°) a 2ms (180°)

---

## ✅ Checklist de Montagem

- [ ] ESP32 conectada ao computador
- [ ] MCP1 e MCP2 soldadas ou em protoboard
- [ ] I2C fiação: SDA (21), SCL (22)
- [ ] Resistores pull-up 10kΩ em SDA/SCL
- [ ] Sensores IR conectados aos MCPs
- [ ] Servos conectados (GPIO 13, GPIO 12)
- [ ] Fonte separada 5V 2A
- [ ] Capacitor 100µF nos servos
- [ ] Todas as massas conectadas
- [ ] Código carregado com sucesso

---

**Data:** 11/05/2026  
**Versão:** 1.0  
**Status:** ✅ Completo  

🔧 Pronto para montagem!
