# ✅ Checklist Rápido — MQTT Acesso Remoto

## 🎯 Objetivo
Fazer a ESP32 conectar ao MQTT de **outra máquina** (ou outro lugar da rede) sem usar cabo USB.

---

## 📋 Checklist em 5 Minutos

### **Fase 1: Descobrir IP (1 min)**
- [ ] Abra terminal na sua máquina host
- [ ] Execute: `hostname -I`
- [ ] Anote o primeiro IP (ex: `192.168.0.10`)
- [ ] Este é o IP que a ESP32 vai usar

### **Fase 2: Corrigir Docker (1 min)**
- [ ] Edite `docker-compose.yml`
- [ ] Verifique a seção `mosquitto`
- [ ] Confirme que tem:
  ```yaml
  ports:
    - "1883:1883"
    - "9001:9001"
  ```
- [ ] Se não tiver, adicione essas linhas

### **Fase 3: Corrigir Mosquitto Config (1 min)**
- [ ] Copie `infra/mqtt/mosquitto.conf.remote-enabled` para `infra/mqtt/mosquitto.conf`
  ```bash
  cp infra/mqtt/mosquitto.conf.remote-enabled infra/mqtt/mosquitto.conf
  ```
- [ ] Ou edite manualmente e adicione `bind_address 0.0.0.0` nos listeners

### **Fase 4: Reiniciar Docker (1 min)**
- [ ] Execute:
  ```bash
  docker-compose down
  docker-compose up -d
  docker-compose logs -f mosquitto
  ```
- [ ] Espere aparecer `mosquitto: listening on port 1883` ✅

### **Fase 5: Atualizar ESP32 (1 min)**
- [ ] Abra `iot/esp32/parking_mqtt_test/parking_mqtt_test_FIXED.ino`
- [ ] Procure por:
  ```cpp
  const char* MQTT_BROKER = "192.168.0.10";  // ⭐ MUDE PARA SEU IP!
  ```
- [ ] Altere `192.168.0.10` para o IP que você anotou
- [ ] Mude de `parking_mqtt_test.ino` para `parking_mqtt_test_FIXED.ino`
- [ ] Upload para ESP32

---

## 🧪 Testar (5 min)

### **Teste 1: Verificar MQTT**
```bash
# Terminal no seu computador
mosquitto_sub -h 192.168.0.10 -p 1883 -u parking_iot -P ParkingIot@2026 -t 'parking/#'
```
- [ ] Se aparecer sem erro ✅

### **Teste 2: Usar Script Automático**
```bash
# Na raiz do projeto
chmod +x scripts/mqtt-test-remote.sh
MQTT_HOST=192.168.0.10 ./scripts/mqtt-test-remote.sh
```
- [ ] Deve passar em todos os testes ✅

### **Teste 3: Monitorar ESP32**
- [ ] Abra Serial Monitor (9600 baud) da ESP32
- [ ] Procure por:
  ```
  [WiFi] ✅ Conectado!
  [MQTT] ✅ Conectado!
  [MQTT] Vaga 1 → livre | ✅ Publicado
  ```

### **Teste 4: Dashboard**
- [ ] Acesse http://localhost:3000
- [ ] Veja se as vagas aparecem em tempo real ✅

---

## 🚨 Se não funcionar...

| Sintoma | Solução |
|---------|---------|
| ESP32 mostra `rc=4` | Credenciais erradas. Verifique usuario e password |
| ESP32 mostra `rc=-2` | Não consegue conectar ao servidor. Verifique IP |
| MQTT não inicia | `docker-compose up -d` |
| Serial vazio | Verifique baud rate (115200) |
| Firewall bloqueia | `sudo ufw allow 1883/tcp` |

---

## 🎓 Entendimento Rápido

```
┌─────────────────────┐
│  Sua Máquina Host   │
│  192.168.0.10       │
│  ┌───────────────┐  │
│  │   Mosquitto   │  │
│  │   1883 ← 0.0.0.0 ← AQUI ERA O BUG!
│  └───────────────┘  │
└─────────────────────┘
         ↑
         │ WiFi/Rede
         │
┌─────────────────────┐
│   ESP32 em outro   │
│   lugar da rede     │
│   ┌───────────────┐ │
│   │ Conecta aqui! │ │
│   └───────────────┘ │
└─────────────────────┘
```

---

## 📚 Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| `docs/MQTT_REMOTE_ACCESS_GUIDE.md` | Guia completo detalhado |
| `infra/mqtt/mosquitto.conf.remote-enabled` | Config corrigida |
| `iot/esp32/parking_mqtt_test/parking_mqtt_test_FIXED.ino` | Código ESP32 corrigido |
| `scripts/mqtt-test-remote.sh` | Script de teste automático |

---

## 💡 Dica Pro
Se quiser testar rápido SEM a ESP32:
```bash
# Publica uma vaga ocupada
mosquitto_pub -h 192.168.0.10 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t parking/spots/1 \
  -m '{"vagaId":1,"status":"ocupada"}'

# Veja aparecer no dashboard em tempo real!
```

---

## ✨ Resultado Final
Apresentação com ESP32 conectada pelo WiFi, sem cabo USB! 🎉

Se tiver dúvidas, consulte `docs/MQTT_REMOTE_ACCESS_GUIDE.md` para explicação completa.
