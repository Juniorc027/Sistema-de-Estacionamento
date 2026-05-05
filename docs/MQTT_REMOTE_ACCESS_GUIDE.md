# 🚀 MQTT Acesso Remoto — Guia Completo

## ⚠️ Problema Identificado

Você teve que usar USB-C porque a ESP32 não conseguia conectar ao MQTT de forma remota. Há 3 problemas principais:

### 1. **Porta Mapeada Incorreta** 
No arquivo `parking_mqtt_test.ino`:
```cpp
const int MQTT_PORT = 1884;  // ❌ Docker NÃO mapeia porta 1884!
```

Mas no `docker-compose.yml` só há mapeamento da porta 1883:
```yaml
ports:
  - "1883:1883"      # ✅ Correto
  - "9001:9001"      # WebSocket
  # ❌ Falta a 1884:1883
```

### 2. **Mosquitto Não Escuta em Rede Externa**
O mosquitto.conf não especifica binding, então escuta apenas localmente:
```ini
listener 1883
# ❌ Não tem "bind_address 0.0.0.0"
```

### 3. **Firewall/Rede Bloqueando Acesso**
Se o ESP32 está em rede diferente da máquina, precisa:
- Firewall permitir porta 1883
- Rede estar acessível
- Usar IP correto da máquina host

---

## ✅ Solução em 5 Passos

### **Passo 1: Corrigir docker-compose.yml**

Abra `docker-compose.yml` e atualize o serviço mosquitto:

```yaml
mosquitto:
  image: eclipse-mosquitto:2
  container_name: parking-mosquitto
  restart: unless-stopped
  ports:
    - "1883:1883"    # MQTT padrão
    - "9001:9001"    # WebSocket
    # Opcional: se quiser usar 1884 externamente
    # - "1884:1883"  # Redirecionamento alternativo
  volumes:
    - ./infra/mqtt/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    - ./infra/mqtt/passwordfile_local:/mosquitto/config/passwordfile_local:ro
    - ./infra/mqtt/aclfile:/mosquitto/config/aclfile:ro
    - mosquitto_data:/mosquitto/data
    - mosquitto_log:/mosquitto/log
  networks:
    - parking-network
```

### **Passo 2: Atualizar mosquitto.conf**

Edite `infra/mqtt/mosquitto.conf`:

```ini
# ============================================================
#  Mosquitto Configuration — Eclipse Mosquitto 2.x
# ============================================================

# Escutar em TODAS as interfaces (0.0.0.0)
# Isso permite conexão de máquinas externas
listener 1883
protocol mqtt
bind_address 0.0.0.0

# WebSocket (opcional — útil para debug via browser)
listener 9001
protocol websockets
bind_address 0.0.0.0

# Segurança básica
allow_anonymous false
password_file /mosquitto/config/passwordfile_local
acl_file /mosquitto/config/aclfile

# Persistência
persistence true
persistence_location /mosquitto/data/

# Logs detalhados para debug
log_dest stdout
log_dest file /mosquitto/log/mosquitto.log
log_type all
log_timestamp true
```

### **Passo 3: Atualizar Código da ESP32**

Atualize `iot/esp32/parking_mqtt_test/parking_mqtt_test.ino`:

```cpp
// ============================================================
//  CONFIGURAÇÕES — ajuste aqui antes de subir para o ESP32
// ============================================================

// WiFi
const char* WIFI_SSID     = "VIVOFIBRA-WIFI6-E9D8";
const char* WIFI_PASSWORD = "03012006Ju";

// ✅ BROKER MQTT — USAR O IP DA SUA MÁQUINA (não 192.168.15.177)
// Para descobrir: abra terminal e rode: hostname -I
const char* MQTT_BROKER   = "SEU_IP_AQUI";  // Ex: 192.168.0.X
const int   MQTT_PORT     = 1883;           // ✅ Porta padrão

const char* MQTT_CLIENT_ID = "esp32-parking-01";
const char* MQTT_USERNAME  = "parking_iot";
const char* MQTT_PASSWORD  = "ParkingIot@2026";

// Tópicos
const char* TOPIC_TESTE   = "estacionamento/teste";
const char* TOPIC_ENTRADA = "parking/entry";
const char* TOPIC_SAIDA   = "parking/exit";
const char* TOPIC_STATUS  = "parking/status";
const char* TOPIC_SPOT_BASE = "parking/spots";
const char* TOPIC_DEVICE_STATUS = "parking/device/esp32-parking-01/status";

// ID do estacionamento
const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";

// Total de vagas
const int TOTAL_VAGAS = 20;
```

### **Passo 4: Descobrir IP Correto**

**No Linux/Mac (máquina host):**
```bash
hostname -I
```

Exemplo de saída:
```
192.168.0.10 172.17.0.1
```

Use `192.168.0.10` (o primeiro IP).

**No Windows:**
```cmd
ipconfig
```

Procure por "IPv4 Address" na seção WiFi/Ethernet.

### **Passo 5: Reiniciar Serviços**

```bash
# Para os containers
docker-compose down

# Remove volumes antigos (opcional, mas recomendado)
# docker volume prune

# Inicia novamente
docker-compose up -d

# Vê logs do mosquitto
docker-compose logs -f mosquitto
```

---

## 🧪 Testando Conectividade

### **Teste 1: Verificar se MQTT está rodando**

```bash
# No seu computador
nc -zv 192.168.0.10 1883
# Ou com telnet (se tiver instalado)
telnet 192.168.0.10 1883
```

Resposta esperada:
```
Connection to 192.168.0.10 1883 port [tcp/*] succeeded!
```

### **Teste 2: Publicar Mensagem MQTT**

**Instale mosquitto-clients (se não tiver):**
```bash
# Ubuntu/Debian
sudo apt install mosquitto-clients

# macOS
brew install mosquitto

# Windows (usar WSL ou instalar manualmente)
```

**Publique uma mensagem de teste:**
```bash
mosquitto_pub \
  -h 192.168.0.10 \
  -p 1883 \
  -u parking_iot \
  -P ParkingIot@2026 \
  -t parking/spots/1 \
  -m '{"vagaId":1,"status":"ocupada","device":"esp32-parking-01"}'
```

**Inscreva-se para ouvir:**
```bash
mosquitto_sub \
  -h 192.168.0.10 \
  -p 1883 \
  -u parking_iot \
  -P ParkingIot@2026 \
  -t 'parking/spots/#'
```

### **Teste 3: Monitor MQTT em Tempo Real**

Abra dois terminais:

**Terminal 1 (Subscribe):**
```bash
mosquitto_sub -h 192.168.0.10 -p 1883 -u parking_iot -P ParkingIot@2026 -t 'parking/#' -v
```

**Terminal 2 (Publish):**
```bash
# Simular ESP32 publicando
mosquitto_pub -h 192.168.0.10 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t parking/spots/5 \
  -m '{"vagaId":5,"status":"livre","device":"esp32-parking-01"}'
```

---

## 🔧 Checklist de Diagnóstico

Se ainda não funcionar, verifique:

- [ ] **Docker está rodando?**
  ```bash
  docker ps | grep mosquitto
  ```

- [ ] **Mosquitto está healthy?**
  ```bash
  docker-compose ps
  ```
  Status deve ser "healthy" (não "starting")

- [ ] **Firewall está bloqueando?**
  ```bash
  # Linux
  sudo ufw allow 1883/tcp
  sudo ufw allow 9001/tcp
  
  # Mac (talvez precise autorizar na config de segurança)
  # Windows (abrir Windows Defender Firewall > Allow an app)
  ```

- [ ] **IP correto na ESP32?**
  - Rode `hostname -I` no seu computador
  - Use o IP que aparece (ex: 192.168.0.10)
  - NÃO use 127.0.0.1 ou localhost (são locais)
  - NÃO use 192.168.15.177 (estava desatualizado)

- [ ] **Credenciais corretas?**
  - Username: `parking_iot`
  - Password: `ParkingIot@2026`

- [ ] **Logs do mosquitto?**
  ```bash
  docker-compose logs mosquitto
  # Procure por erros de autenticação ou conexão
  ```

---

## 📊 Estrutura de Rede Corrigida

```
Máquina Host (seu PC)
  ├─ IP Local: 192.168.0.10
  └─ Docker Container (Mosquitto)
      ├─ Porta 1883 (MQTT)
      └─ Porta 9001 (WebSocket)
        
ESP32 (Outra máquina, mesma rede WiFi)
  └─ Conecta a: 192.168.0.10:1883
     └─ Autentica com: parking_iot / ParkingIot@2026
     └─ Publica em: parking/spots/{vagaId}
```

---

## 🎯 Apresentação Futura

Agora você pode:
1. ✅ Colocar ESP32 em qualquer máquina na rede
2. ✅ Ela se conecta ao MQTT sem cabo USB
3. ✅ Dados chegam em tempo real no dashboard
4. ✅ Sem problemas de conectividade

Teste isso em casa, confirme que funciona, e leve para a próxima apresentação com segurança! 🚀

---

## 📝 Referências

- [Mosquitto Official Docs](https://mosquitto.org/man/mosquitto-conf-5.html)
- [MQTT Protocol 3.1.1](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html)
- [PubSubClient Library](https://github.com/knolleary/pubsubclient)
