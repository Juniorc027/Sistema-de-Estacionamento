# 🧪 Testes e Troubleshooting — Smart Parking ESP32

## 📋 Procedimento de Teste Sequencial

### ✅ Teste 1: Compilação

**Objetivo:** Verificar se o código compila sem erros

```
Arduino IDE → Sketch → Verify (ou Ctrl+R)

Esperado:
  Compiling sketch...
  ✅ Sketch uses 234,567 bytes of program storage
  ✅ Global variables use 12,345 bytes
  
Se ERRO:
  ❌ Verifique biblioteca: PubSubClient, Adafruit_MCP23X17, etc
  ❌ Verifique sintaxe C++
  ❌ Copie o código corretamente
```

### ✅ Teste 2: Upload

**Objetivo:** Fazer upload do código para a ESP32

```
Arduino IDE → Sketch → Upload (ou Ctrl+U)

Esperado:
  Connecting........_____....._____._____
  ✅ Writing at 0x00000000... (0%)
  ✅ Hard resetting via RTS pin...

Se ERRO:
  ❌ Board → Selecione "ESP32 Dev Module"
  ❌ Port → Selecione a porta COM correta
  ❌ Upload Speed → 921600
  ❌ Drivers CH340 (windows)
```

### ✅ Teste 3: Serial Monitor

**Objetivo:** Ver logs do sistema

```
Arduino IDE → Tools → Serial Monitor

Baud Rate: 115200
Esperado:

╔══════════════════════════════════════════════════════════════╗
║           SMART PARKING ESP32 - INICIANDO SISTEMA             ║
╚══════════════════════════════════════════════════════════════╝

[I2C] Inicializando barramento I2C (SDA=21, SCL=22)...
[MCP1] Inicializando em endereço 0x20... OK
[MCP2] Inicializando em endereço 0x21... OK
[SERVO] Inicializando servos...
[SERVO] Servos posicionados em FECHADO
[WiFi] Conectando...
✅ WiFi Conectado: 192.168.x.x
[MQTT] Configurando cliente MQTT...
[MQTT] Conectando a 192.168.15.177:1884
✅ MQTT Conectado
[MQTT] Assinando tópico: parking/config
✅ SISTEMA PRONTO - Monitorando vagas...

Se NÃO aparecer:
  ❌ Serial Monitor baudrate ≠ 115200
  ❌ Porta COM errada
  ❌ Clique botão RESET na placa
```

### ✅ Teste 4: I2C Communication

**Objetivo:** Verificar se MCP23017 responde

```
Arduino IDE → File → Examples → Wire → I2C Scanner

Resultado esperado:

I2C device found at address 0x20 (MCP1)
I2C device found at address 0x21 (MCP2)

Se NÃO aparecer:
  ❌ Fiação I2C (SDA=GPIO21, SCL=GPIO22)
  ❌ Alimentação MCP (+5V, GND)
  ❌ Resistores pull-up 10kΩ faltando
  ❌ MCP23017 com mau contato
```

### ✅ Teste 5: WiFi Connection

**Objetivo:** Verificar conexão WiFi

No Serial Monitor após boot:

```
[WiFi] Conectando...
. . . . . .
✅ WiFi Conectado: 192.168.15.177

Se aparecer ❌:
  Verifique SSID: VIVOFIBRA-WIFI6-E9D8
  Verifique Senha: 03012006Ju
  Verifique se WiFi está ligado
  Aguarde mais tempo (até 30s)
```

### ✅ Teste 6: MQTT Connection

**Objetivo:** Verificar conexão ao broker MQTT

No Serial Monitor após WiFi:

```
[MQTT] Conectando a 192.168.15.177:1884
✅ MQTT Conectado
[MQTT] Assinando tópico: parking/config

Se aparecer ❌ Falha MQTT:
  Verifique IP broker: 192.168.15.177
  Verifique porta: 1884
  Verifique credenciais:
    Usuário: parking_iot
    Senha: ParkingIot@2026
  Teste com MQTT Explorer
```

### ✅ Teste 7: Sensor Leitura

**Objetivo:** Testar leitura de sensores de vagas

**Procedimento:**
```
1. Abra Serial Monitor (115200)
2. Espere mensagem: ✅ SISTEMA PRONTO
3. Coloque a mão sobre um sensor IR
4. Aguarde 1.5s (debounce)
```

**Esperado:**
```
[VAGA] 1 -> OCUPADA
[MQTT] Publicando parking/spots...

Se NÃO funcionar:
  Verifique sensor IR conectado
  Teste sensor com multímetro (GND quando detecta)
  Verifique MCP pino correto
```

### ✅ Teste 8: Sensores Entrada/Saída

**Objetivo:** Testar sensores de cancela

**Procedimento Entrada:**
```
1. Serial Monitor aberto
2. Simule movimento no sensor entrada (MCP2-A6)
3. Observe resposta
```

**Esperado:**
```
[EVENTO] Carro detectado na ENTRADA
[SERVO ENTRADA] Abrindo (vagas livres: 20)
(servo move para 0°)
[SERVO ENTRADA] Fechando (timeout) ← após 3s
(servo move para 90°)

Se vagasLivres = 0:
[SERVO ENTRADA] Bloqueado - Sem vagas disponíveis
```

**Procedimento Saída:**
```
1. Serial Monitor aberto
2. Simule movimento no sensor saída (MCP2-B6)
3. Observe resposta
```

**Esperado:**
```
[EVENTO] Carro detectado na SAÍDA
[SERVO SAÍDA] Abrindo
(servo move para 0°)
[SERVO SAÍDA] Fechando (timeout) ← após 3s
(servo move para 90°)
```

---

## 🚨 Guia de Troubleshooting

### ❌ Problema: "Sketch uses X bytes of program storage space"

**Sintoma:**
```
Sketch uses 256678 bytes of program storage space (78%).
```

**Solução:**
- ✅ Normal se < 80%
- ⚠️ Se > 90%, remova código desnecessário
- ✅ ESP32 tem 1.3MB de espaço

---

### ❌ Problema: "MCP1 não respondendo"

**Sintomas:**
```
[MCP1] Inicializando em endereço 0x20... FALHA!
ERRO: MCP1 não respondendo. Verifique conexão I2C.
```

**Causas Possíveis:**

1. **Fiação I2C Errada**
   ```
   Verifique:
   - SDA = GPIO 21 ✓
   - SCL = GPIO 22 ✓
   - Conectados ao MCP1
   ```

2. **Alimentação Faltando**
   ```
   MCP23017 precisa de:
   - +5V (pino VCC)
   - GND (pino VSS, x2 recomendado)
   ```

3. **Resistores Pull-up Faltando**
   ```
   I2C requer:
   - 10kΩ em SDA (para +5V)
   - 10kΩ em SCL (para +5V)
   ```

4. **Endereço I2C Errado**
   ```
   Verifique pinos de configuração:
   MCP1: A0=GND, A1=GND, A2=GND → 0x20 ✓
   MCP2: A0=5V, A1=GND, A2=GND → 0x21 ✓
   ```

**Solução Passo a Passo:**
```
1. Desligue tudo (ESP32 e sensores)
2. Verifique fiação com multímetro
3. Teste com I2C Scanner (Examples → Wire → I2C_Scanner)
4. Se aparecer 0x20 e 0x21, ok
5. Se não aparecer, remonte conexões
```

---

### ❌ Problema: "Servo não se move"

**Sintomas:**
```
[SERVO] Inicializando servos...
Serial Monitor mostra tudo ok, mas servo não move
```

**Causas Possíveis:**

1. **GPIO Errado**
   ```
   Verifique:
   - Entrada: GPIO 13 ✓
   - Saída: GPIO 12 ✓
   ```

2. **Alimentação Insuficiente**
   ```
   Servo consome 500mA-1A
   Alimentação USB ESP32 = 500mA total
   
   ✅ SOLUÇÃO: Fonte separada 5V 2A
   ```

3. **PWM Não Disponível**
   ```
   Alguns GPIO podem ter conflitos
   Tente GPIOs alternativos: 2, 4, 5, 14, 15, 16, 17
   ```

4. **Servo Com Defeito**
   ```
   Teste servo separadamente com código simples
   ```

**Solução Passo a Passo:**
```
1. Verifique GPIO 13 com voltímetro
   - Esperado: voltagem PWM variável
2. Desconecte servo, ligue com fonte separada
3. Se ainda não funciona, servo defeituoso
4. Compre novo servo SG90 ou MG90S
```

---

### ❌ Problema: "WiFi não conecta"

**Sintomas:**
```
[WiFi] Conectando...
..... (continua pontilhado)
❌ Falha na conexão WiFi
```

**Causas Possíveis:**

1. **SSID Incorreto**
   ```
   Verificar no código (linha ~42):
   #define WIFI_SSID "VIVOFIBRA-WIFI6-E9D8"
   
   Seu WiFi se chama assim?
   ```

2. **Senha Incorreta**
   ```
   Verificar no código (linha ~43):
   #define WIFI_PASSWORD "03012006Ju"
   
   Senha correta?
   ```

3. **WiFi Offline**
   ```
   Verifique:
   - Router ligado
   - WiFi habilitado
   - Outros dispositivos conectam?
   ```

4. **Fora do Alcance**
   ```
   ESP32 perto do router (< 5m)
   ```

**Solução:**
```
1. Abra smartphone
2. Conecte ao WiFi "VIVOFIBRA-WIFI6-E9D8"
3. Se conectar, ESP32 deve conectar também
4. Se não conectar, WiFi offline
5. Se conecta mas ESP32 não, verifique credenciais
```

---

### ❌ Problema: "MQTT não conecta"

**Sintomas:**
```
[MQTT] Conectando a 192.168.15.177:1884
❌ Falha MQTT. Código: -1
```

**Códigos de Erro:**
```
-1 = Perdeu conexão
-2 = Falha ao conectar
-3 = Leitura falhou
-4 = Escrita falhou
-5 = Fora do alcance
```

**Causas Possíveis:**

1. **WiFi Não Conectado**
   ```
   Verifique WiFi primeiro
   MQTT precisa de conexão WiFi ativa
   ```

2. **IP do Broker Errado**
   ```
   Verificar no código (linha ~47):
   #define MQTT_BROKER "192.168.15.177"
   
   Seu broker está neste IP?
   ```

3. **Porta Errada**
   ```
   Verificar no código (linha ~48):
   #define MQTT_PORT 1884
   
   Seu broker usa esta porta?
   ```

4. **Credenciais Erradas**
   ```
   Verificar no código (linhas ~49-50):
   #define MQTT_USER "parking_iot"
   #define MQTT_PASSWORD "ParkingIot@2026"
   ```

5. **Broker Offline**
   ```
   Verifique se docker está rodando
   ```

**Solução:**
```
1. Instale MQTT Explorer: http://mqtt-explorer.com
2. Conecte ao broker: 192.168.15.177:1884
3. Use credenciais: parking_iot / ParkingIot@2026
4. Se conectar, broker ok
5. Se não conectar, inicie broker ou verifique IP
```

---

### ❌ Problema: "Sensores Sempre Ocupados"

**Sintomas:**
```
[VAGA] 1 -> OCUPADA
[VAGA] 2 -> OCUPADA
[VAGA] 3 -> OCUPADA
(todos ocupados, sem mudanças)
```

**Causa:** Sensores ou lógica invertida

**Solução:**
```
Verifique no código (linha ~92):
#define SENSOR_ACTIVE_LOW true

Se mudar para FALSE:
  - LOW  → LIVRE
  - HIGH → OCUPADA

Inverta conforme necessário
```

---

### ❌ Problema: "Servo Abre mas não Fecha"

**Sintomas:**
```
[SERVO ENTRADA] Abrindo
(servo abre para 0°)
[SERVO ENTRADA] Fechando (timeout)
(servo continua aberto)
```

**Causa:** Servo travado ou pino GPIO não escreve

**Solução:**
```
1. Solte servo manualmente
2. Teste PWM:
   ```cpp
   servoEntrada.write(90);  // Deve fechar
   delay(1000);
   servoEntrada.write(0);   // Deve abrir
   ```
3. Se não funciona, servo ou GPIO defeituoso
```

---

## 🔍 Verificação Rápida com MQTT Explorer

### Instalação
```
Windows: https://github.com/thomasnordquist/MQTT-Explorer/releases
Linux: sudo apt install mqtt-explorer
Mac: brew install mqtt-explorer
```

### Teste de Conexão
```
1. Abra MQTT Explorer
2. Clique "+"
3. Preencha:
   - Name: Smart Parking
   - Host: 192.168.15.177
   - Port: 1884
   - Username: parking_iot
   - Password: ParkingIot@2026
4. Clique "Connect"

Se conectar: ✅ Broker ok
Se falhar: ❌ Broker offline ou IP errado
```

### Monitore Tópicos
```
Após ESP32 iniciar, veja:

parking/
  ├── spots
  │   └── Mudanças de vagas
  ├── events
  │   ├── entry
  │   └── exit
  └── config
      └── availableSpots (recebido)
```

---

## 📊 Tabela de Teste Rápido

| Sistema | OK | Error | Verificar |
|---------|----|----|-----------|
| Compilação | ✅ | ❌ | Bibliotecas |
| Upload | ✅ | ❌ | Port/Board |
| Serial | ✅ | ❌ | Baudrate 115200 |
| I2C | ✅ | ❌ | Fiação SDA/SCL |
| MCP1 | ✅ | ❌ | Alimentação |
| MCP2 | ✅ | ❌ | Endereço 0x21 |
| WiFi | ✅ | ❌ | SSID/Senha |
| MQTT | ✅ | ❌ | IP/Porta/Creds |
| Servo Ent | ✅ | ❌ | GPIO 13 |
| Servo Saí | ✅ | ❌ | GPIO 12 |
| Sensores | ✅ | ❌ | Fiação MCP |

---

## 🎯 Checklist Final de Testes

- [ ] Código compila sem erros
- [ ] Upload bem-sucedido
- [ ] Serial Monitor mostra boot correto
- [ ] I2C Scanner encontra 0x20 e 0x21
- [ ] WiFi conecta automaticamente
- [ ] MQTT conecta ao broker
- [ ] Sensores de vaga respondem
- [ ] Sensor entrada detecta movimento
- [ ] Sensor saída detecta movimento
- [ ] Servo entrada abre/fecha
- [ ] Servo saída abre/fecha
- [ ] Entrada bloqueada se sem vagas
- [ ] Saída sempre abre
- [ ] MQTT Explorer mostra tópicos
- [ ] Backend recebe eventos

---

## 📞 Se Tudo Falhar

```
1. Reinicie ESP32 (botão RESET)
2. Verifique alimentação
3. Compile e faça upload novamente
4. Abra Serial Monitor
5. Se continuar, siga checklist acima
6. Teste cada componente isoladamente
7. Se ainda não funcionar, componente defeituoso
```

---

**Data:** 11/05/2026  
**Versão:** 1.0  
**Status:** ✅ Completo  

🧪 Boa sorte nos testes!
