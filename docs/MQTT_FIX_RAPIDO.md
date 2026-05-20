# 🚀 FIX RÁPIDO - ESP32 MQTT Connection Error -2

## ❌ Problema
```
[MQTT] Erro: Falha de rede
[MQTT] Tentativa #32 ... rc=-2
```

## ✅ Solução (3 passos)

### 1️⃣ Restart Docker (já foi feito!)
```bash
cd d:\pi3\Sistema-de-Estacionamento
docker compose down
docker compose up -d
```

### 2️⃣ Verificar se funcionou
Abra o Jupyter Notebook:
- [MQTT_TROUBLESHOOTING.ipynb](MQTT_TROUBLESHOOTING.ipynb)

Execute a célula "MQTT Broker Network Connectivity" e veja se conecta.

Se vir ✅ **"MQTT CONECTADO com sucesso!"** → FUNCIONOU!

### 3️⃣ Upload na ESP32
Recompile e upload do código em:
- [iot/esp32/parking_mqtt_test/parking_mqtt_test_FIXED.ino](../../iot/esp32/parking_mqtt_test/parking_mqtt_test_FIXED.ino)

Agora deve conectar e você verá:
```
[MQTT] ✅ Conectado!
[MQTT] Inscrito em: parking/status
```

---

## 📝 Alterações feitas:

| Arquivo | Mudança |
|---------|---------|
| `infra/mqtt/mosquitto.conf` | ✅ Adicionado `bind_address 0.0.0.0` |
| `iot/esp32/parking_mqtt_test_FIXED.ino` | ✅ WiFi e broker IP atualizados |
| `docs/MQTT_TROUBLESHOOTING.ipynb` | ✅ Criado com 6 testes de diagnóstico |

---

**Problema Raiz**: Mosquitto escutando apenas em 127.0.0.1 (não acessível da rede)
**Solução**: `bind_address 0.0.0.0` (escuta em todas as interfaces)

Veja o notebook completo para mais detalhes!
