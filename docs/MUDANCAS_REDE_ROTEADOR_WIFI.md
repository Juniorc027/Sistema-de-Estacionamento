# 🔧 Guia de Alterações para Acesso via Roteador Wi-Fi

**Data**: Maio 2026  
**Objetivo**: Documentar todos os lugares onde o IP e configurações de rede devem ser alterados ao acessar via roteador Wi-Fi.

---

## 📋 Resumo de Mudanças Necessárias

| Item | Local Atual | Novo Valor |
|------|------------|-----------|
| **IP MQTT** | `192.168.0.10` ou `192.168.15.177` | `[SEU_IP_ROTEADOR]` |
| **WiFi SSID** | `VIVOFIBRA-WIFI6-E9D8` | `[SEU_SSID]` |
| **WiFi Password** | `03012006Ju` | `[SUA_SENHA]` |
| **API Backend** | `http://localhost:5167` | `http://[SEU_IP]:5167` |
| **SignalR Hub** | `http://localhost:5167/hubs/parking` | `http://[SEU_IP]:5167/hubs/parking` |
| **Frontend** | `http://localhost:3000` | `http://[SEU_IP]:3000` |

---

## 🔴 ALTERAÇÕES CRÍTICAS (Fazer Primeiro)

### 1️⃣ **Backend - MQTT Broker IP** ⚠️ URGENTE

**Arquivo**: [api/src/API/appsettings.json](../api/src/API/appsettings.json)
- **Linha**: ~12
- **Trocar**:
  ```json
  "Broker": "192.168.15.177"
  ```
- **Por**:
  ```json
  "Broker": "[SEU_IP_ROTEADOR]"
  ```
  Exemplo: `"Broker": "192.168.1.100"` (verifique seu IP local)

---

**Arquivo**: [api/src/API/appsettings.Development.json](../api/src/API/appsettings.Development.json)
- **Linha**: ~12
- **Mesma alteração acima**

---

### 2️⃣ **Frontend - Variáveis de Ambiente**

**Arquivo**: [app/.env.local](../app/.env.local) (ou criar se não existir)
- **Adicionar/Alterar**:
  ```env
  NEXT_PUBLIC_API_URL=http://[SEU_IP_ROTEADOR]:5167
  NEXT_PUBLIC_SIGNALR_URL=http://[SEU_IP_ROTEADOR]:5167/hubs/parking
  ```
  Exemplo:
  ```env
  NEXT_PUBLIC_API_URL=http://192.168.1.100:5167
  NEXT_PUBLIC_SIGNALR_URL=http://192.168.1.100:5167/hubs/parking
  ```

---

**Arquivo**: [app/src/services/signalr.ts](../app/src/services/signalr.ts)
- **Linha**: ~7
- **Verificar** se está usando variáveis de ambiente (correto) ou IP hardcodeado

---

### 3️⃣ **ESP32 IoT - Configuração MQTT e WiFi**

**Arquivo**: [iot/esp32/parking_mqtt_test_FIXED.ino](../iot/esp32/parking_mqtt_test_FIXED.ino)
- **Linha 32-37**: Alterar MQTT Broker
  ```cpp
  #define MQTT_BROKER   "192.168.0.10"      // ← TROCAR
  #define MQTT_PORT     1883
  #define MQTT_CLIENT_ID "esp32-parking-01"
  #define MQTT_USERNAME  "parking_iot"
  #define MQTT_PASSWORD  "ParkingIot@2026"
  ```
  Trocar por:
  ```cpp
  #define MQTT_BROKER   "[SEU_IP_ROTEADOR]"  // Exemplo: "192.168.1.100"
  ```

- **WiFi Credentials** (alterar também para nova rede):
  ```cpp
  WIFI_SSID     = "[SEU_NOVO_SSID]"         // Exemplo: "Vivo-WiFi"
  WIFI_PASSWORD = "[SUA_NOVA_SENHA]"        // Nova senha
  ```

---

**Arquivo**: [iot/esp32/SMART_GATE_TESTS.ino](../iot/esp32/SMART_GATE_TESTS.ino)
- **Linhas 209, 287**: Mesmas alterações
  ```cpp
  "192.168.0.10"  →  "[SEU_IP_ROTEADOR]"
  ```

---

## 🟡 ALTERAÇÕES DE CONFIGURAÇÃO (Docker/Scripts)

### 4️⃣ **Docker Compose** (se rodar em modo Docker)

**Arquivo**: [docker-compose.yml](../docker-compose.yml)

#### Backend Service (linhas 55-88):
```yaml
environment:
  ASPNETCORE_ENVIRONMENT: Production
  DOTNET_URLS: http://+:5167
  Mqtt__Broker: mosquitto    # ← OK se via Docker interno
  # OU alterar para:
  Mqtt__Broker: [SEU_IP_ROTEADOR]  # Se rodando fora de Docker
```

#### Frontend Service (linhas 91-125):
```yaml
environment:
  NEXT_PUBLIC_API_URL: http://[SEU_IP_ROTEADOR]:5167
  NEXT_PUBLIC_SIGNALR_URL: http://[SEU_IP_ROTEADOR]:5167/hubs/parking
```

#### MQTT Service (linhas 30-52):
- Verificar se está mapeando as portas corretamente:
  ```yaml
  ports:
    - "1883:1883"    # MQTT
    - "9001:9001"    # WebSocket
  ```

---

### 5️⃣ **Shell Scripts de Teste**

**Arquivo**: [scripts/mqtt-test-gates.sh](../scripts/mqtt-test-gates.sh)
- **Linha 19**: Alterar
  ```bash
  MQTT_BROKER="192.168.0.10"
  ```
  Para:
  ```bash
  MQTT_BROKER="[SEU_IP_ROTEADOR]"
  ```

---

**Arquivo**: [scripts/smoke-test-iot.sh](../scripts/smoke-test-iot.sh)
- **Linhas 4-5**: Alterar
  ```bash
  API_URL="http://localhost:5167"
  MQTT_URL="127.0.0.1:1884"
  ```
  Para:
  ```bash
  API_URL="http://[SEU_IP_ROTEADOR]:5167"
  MQTT_URL="[SEU_IP_ROTEADOR]:1883"
  ```

---

## 📱 Configurações Adicionais (Conforme Necessário)

### 6️⃣ **MQTT Mosquitto Config**

**Arquivo**: [infra/mqtt/mosquitto.conf](../infra/mqtt/mosquitto.conf)
- Verificar listeners:
  ```conf
  listener 1883
  listener 9001
  protocol websockets
  ```
- Se precisar acessar remotamente, pode adicionar:
  ```conf
  listener 1883 0.0.0.0    # Aceita conexões externas
  ```

---

### 7️⃣ **ACL do MQTT**

**Arquivo**: [infra/mqtt/aclfile](../infra/mqtt/aclfile)
- Verificar se `parking_iot` tem permissões corretas
- Status: ✅ Provavelmente OK

---

## 🔍 Verificação - Como Descobrir Seu IP Local

### Windows PowerShell:
```powershell
ipconfig
# Procure por "IPv4 Address" na sua conexão WiFi
```

### Linux/Mac:
```bash
ifconfig
# ou
ip addr show
```

### Teste de Conectividade:
```bash
ping [SEU_IP_ROTEADOR]
```

---

## ✅ Checklist de Implementação

- [ ] Identificar IP local da máquina servidor (`ipconfig`)
- [ ] **appsettings.json** - Alterar IP MQTT
- [ ] **appsettings.Development.json** - Alterar IP MQTT
- [ ] **app/.env.local** - Criar/alterar URLs com novo IP
- [ ] **parking_mqtt_test_FIXED.ino** - Alterar MQTT broker e WiFi
- [ ] **SMART_GATE_TESTS.ino** - Alterar MQTT broker
- [ ] **mqtt-test-gates.sh** - Alterar IP MQTT
- [ ] **smoke-test-iot.sh** - Alterar URLs
- [ ] **docker-compose.yml** - Alterar se necessário
- [ ] Testar conectividade: `ping [SEU_IP]`
- [ ] Testar Backend: `http://[SEU_IP]:5167/swagger`
- [ ] Testar Frontend: `http://[SEU_IP]:3000`
- [ ] Testar MQTT: `mqtt_sub -h [SEU_IP] -u parking_iot -P ParkingIot@2026 -t parking/#`

---

## 🔐 Credenciais (Não Alterar Sem Motivo)

### MQTT:
- **Username**: `parking_iot`
- **Password**: `ParkingIot@2026`
- **Port**: `1883`

### MySQL:
- **User**: `parking_app`
- **Password**: `ParkingApp@2026!`
- **Port**: `3306`

### JWT Secret:
- `ParkingSystem@SuperSecretKey2026!MustBeAtLeast32Chars`

---

## 📚 Referências Úteis

- [API_REFERENCE.md](API_REFERENCE.md) - Endpoints disponíveis
- [MQTT_QUICK_CHECKLIST.md](MQTT_QUICK_CHECKLIST.md) - MQTT troubleshooting
- [docker-guide.md](docker-guide.md) - Docker setup

---

## 💡 Dicas Importantes

1. **Use variáveis de ambiente**: Prefira alterar `.env.local` ao invés de hardcodear IPs
2. **Teste progressivamente**: Comece testando MQTT, depois Backend, depois Frontend
3. **Firewall**: Se tiver problemas, verifique se as portas estão abertas no firewall
4. **WiFi vs Ethernet**: Ajuste conforme sua rede (WiFi vs conexão direta)

---

**Última atualização**: Maio 2026
