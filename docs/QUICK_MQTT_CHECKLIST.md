╔════════════════════════════════════════════════════════════════════════════════╗
║             CHECKLIST RÁPIDO - ESP32 MQTT INTEGRATION (v2.0)                  ║
║                  Implementação e Validação em 5 Passos                        ║
╚════════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════════
PASSO 1: VERIFICAR CONFIGURAÇÕES DOCKER (2 min)
═══════════════════════════════════════════════════════════════════════════════════

☐ Verificar docker-compose.yml - Porta Mosquitto:
  docker-compose.yml linha 32:
  Deve ter: "${MQTT_PORT:-1883}:1883"
  
  ✅ Confirmado?

☐ Verificar arquivo .env existe:
  ls /home/junior/Documentos/coder/parking-iot-system/.env
  
  Se existir, verificar:
  MQTT_PORT=1883 (não 1884!)
  
  ✅ Confirmado?

☐ Containers Docker rodando:
  docker ps -a | grep parking
  
  Esperado:
  • parking-mosquitto (1883:1883)
  • parking-backend
  • parking-frontend  
  • postgres
  
  ✅ Confirmado?

═══════════════════════════════════════════════════════════════════════════════════
PASSO 2: UPLOAD DO CÓDIGO CORRIGIDO NA ESP32 (3 min)
═══════════════════════════════════════════════════════════════════════════════════

☐ Abrir arquivo:
  /home/junior/Documentos/coder/parking-iot-system/iot/esp32/SmartParking_ESP32_IoT_MQTT_FIXED.ino

☐ Verificar configurações críticas NO CÓDIGO:
  
  Linha ~36-37:
  #define MQTT_BROKER "192.168.15.177"      ✓ CORRETO
  #define MQTT_PORT 1883                     ✓ CORRETO (era 1884)
  #define MQTT_CLIENT_ID "esp32-parking-01"  ✓ CORRETO (era ESP32_ParkingSystem)
  
  ✅ Confirmado?

☐ Compilar e Upload:
  1. Arduino IDE ou PlatformIO
  2. Board: ESP32 Dev Module
  3. Port: /dev/ttyUSB0 (ou COM3 no Windows)
  4. Baud: 115200
  5. Upload!

☐ Serial Monitor aberto em 115200 baud

  ✅ Upload completo?

═══════════════════════════════════════════════════════════════════════════════════
PASSO 3: VERIFICAR SERIAL MONITOR - OUTPUT ESPERADO (1 min)
═══════════════════════════════════════════════════════════════════════════════════

Você deve ver nos primeiros 5 segundos:

☐ Inicialização de I2C:
  [INIT] Inicializando I2C...
  [SCAN I2C] Verificando endereços...
    ✅ 0x20          (MCP1)
    ✅ 0x21          (MCP2)
  
  ✅ Visto?

☐ Inicialização de Servos:
  [INIT] Inicializando Servos...
  [SERVO] ✅ Servos anexados
  
  ✅ Visto?

☐ Conexão WiFi (importante!):
  [INIT] Inicializando WiFi...
  [WiFi] Conectando a 'VIVOFIBRA-WIFI6-E9D8'...
  ................
  [WiFi] ✅ Conectado!
    IP: 192.168.15.178
    RSSI: -35 dBm
  
  ✅ Visto?

☐ Conexão MQTT (CRÍTICO!):
  [MQTT] Conectando a 192.168.15.177:1883
    ClientID: esp32-parking-01
    User: parking_iot
  
  E então:
  [MQTT] ✅ Conectado com sucesso!
    Last Will Topic: parking/device/esp32-parking-01/status
    Last Will Message: offline
  [MQTT] ✅ Assinado em: parking/config
  
  ✅ VISTO?
  
  ❌ Se NÃO viu "✅ Conectado", procure por mensagem de ERRO:
  [MQTT] ❌ Falha ao conectar
    MQTT_CONNECT_BAD_CREDENTIALS (4) - Verif MQTT_USER/MQTT_PASSWORD
    MQTT_CONNECT_BAD_CLIENT_ID (2) - Use "esp32-parking-01"
    MQTT_CONNECT_FAILED (-2) - Verifique IP 192.168.15.177 porta 1883

═══════════════════════════════════════════════════════════════════════════════════
PASSO 4: TESTE MANUAL - SIMULAR SENSOR (2 min)
═══════════════════════════════════════════════════════════════════════════════════

☐ Bloqueie sensor IR da vaga 1:
  Aproxime sua mão do sensor IR
  
  Esperado no Serial Monitor:
  [VAGA] 1 -> OCUPADA
  [MQTT TX] ✅ parking/spots/1 = OCUPADA
  
  ✅ Visto?

☐ Desbloqueie o sensor:
  Afaste a mão
  
  Esperado:
  [VAGA] 1 -> LIVRE
  [MQTT TX] ✅ parking/spots/1 = LIVRE
  
  ✅ Visto?

═══════════════════════════════════════════════════════════════════════════════════
PASSO 5: VERIFICAR BACKEND RECEBEU A MENSAGEM (1 min)
═══════════════════════════════════════════════════════════════════════════════════

☐ Terminal do Host - Ver logs do Backend:
  docker logs parking-backend | tail -20
  
  Procure por:
  [13:XX:XX INF] MQTT mensagem recebida: parking/spots/1 -> {"vagaId":1,"status":"ocupada"...}
  [13:XX:XX INF] Status da vaga 001 atualizado para Occupied
  [13:XX:XX INF] [MqttHandler] Broadcasting SpotUpdated: SpotNumber=001, Status=Occupied
  
  ✅ Visto?

☐ Abrir Dashboard:
  http://localhost:3000
  
  Verificar:
  • Vaga 001 está VERMELHA (occupied)
  • Ocupação mostra 5% (1/20)
  • "Entradas 24h" mudou para 1
  
  ✅ Confirmado no 3D?

═══════════════════════════════════════════════════════════════════════════════════
PASSO 6: TESTE COM MOSQUITTO_PUB (Validação dupla - 1 min OPCIONAL)
═══════════════════════════════════════════════════════════════════════════════════

Este teste valida que tudo está funcionando corretamente:

☐ Terminal do Host:
  mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
    -t parking/spots/2 -m '{"vagaId":2,"status":"ocupada"}'

☐ Verificar no dashboard:
  Agora devem estar ocupados:
  • Vaga 001 (da ESP32)
  • Vaga 002 (do manual)
  Ocupação: 10% (2/20)
  
  ✅ Confirmado?

═══════════════════════════════════════════════════════════════════════════════════
RESUMO: SE TUDO PASSOU ✓
═══════════════════════════════════════════════════════════════════════════════════

Sistema 100% funcional! Fluxo completo validado:

ESP32 Sensors → MQTT Publish → Docker Mosquitto Broker → 
Backend MQTT Handler → SignalR Broadcast → Frontend Dashboard Update

Flow: ✅ Sensor detecção → ✅ MQTT publicação → ✅ Backend recepção → 
       ✅ Broadcast → ✅ Dashboard atualização

═══════════════════════════════════════════════════════════════════════════════════
SOLUÇÃO DE PROBLEMAS RÁPIDA
═══════════════════════════════════════════════════════════════════════════════════

PROBLEMA: "❌ Falha ao conectar - MQTT_CONNECT_FAILED (-2)"
SOLUÇÃO:
  • Verifique IP do host: ip addr show eth0 | grep inet
  • Teste conectividade: ping 192.168.15.177
  • Verifique porta: docker logs parking-mosquitto | grep listener
  • Verifique firewall: sudo ufw status

PROBLEMA: "❌ Falha ao conectar - MQTT_CONNECT_BAD_CREDENTIALS (4)"
SOLUÇÃO:
  • Verifique usuário MQTT no arquivo:
    docker exec parking-mosquitto grep "parking_iot" /mosquitto/config/passwordfile
  • Resetar senha:
    docker exec parking-mosquitto mosquitto_passwd -b /mosquitto/config/passwordfile parking_iot ParkingIot@2026

PROBLEMA: "ESP32 conecta mas não publica"
SOLUÇÃO:
  • Verifique debug no Serial Monitor
  • Teste com mosquitto_pub do host (funciona?)
  • Se funcionar: problema é com sensor
    → Bloqueie sensor manualmente
    → Procure por "[VAGA]" no Serial Monitor
  • Se não funcionar: problema é com Docker/Broker

PROBLEMA: "Backend recebe mas Dashboard não atualiza"
SOLUÇÃO:
  • Recarregue página do dashboard (F5)
  • Verifique SignalR logs: docker logs parking-backend | grep SignalR
  • Abra DevTools (F12) e veja console para erros

═══════════════════════════════════════════════════════════════════════════════════
PRÓXIMAS ETAPAS (Após validação)
═══════════════════════════════════════════════════════════════════════════════════

1. ✅ Validar com todos os 20 sensores
2. ✅ Validar reconexão (desconectar WiFi por 30s)
3. ✅ Validar Last Will (desligar ESP32, backend deve receber "offline")
4. ✅ Testar portão de entrada/saída com servos
5. ✅ Implementar reconexão automática robusta (já está!)
6. ✅ Configurar alertas no dashboard para falhas
7. ✅ Deploy em produção

═══════════════════════════════════════════════════════════════════════════════════
ARQUIVO DE REFERÊNCIA: LOGS ESPERADOS COMPLETOS
═══════════════════════════════════════════════════════════════════════════════════

ESP32 Serial Monitor (Startup Completo - Esperado):

---
╔════════════════════════════════════════════════════════════╗
║     Smart Parking ESP32 IoT - V2.0 (MQTT ROBUST)         ║
╚════════════════════════════════════════════════════════════╝

[INIT] Inicializando I2C...
[SCAN I2C] Verificando endereços...
  ✅ 0x20 encontrado (MCP1)
  ✅ 0x21 encontrado (MCP2)
Total: 2

[MCP1] ✅ Inicializado em 0x20
[MCP2] ✅ Inicializado em 0x21

[TESTE I2C] Estado inicial dos pinos...
[MCP1] Vagas: 0/20 ocupadas

[INIT] Inicializando Servos...
[SERVO] ✅ Servos anexados

[INIT] Inicializando WiFi...
[WiFi] Conectando a 'VIVOFIBRA-WIFI6-E9D8'...
..........
[WiFi] ✅ Conectado!
  IP: 192.168.15.178
  RSSI: -35 dBm

[MQTT] Conectando a 192.168.15.177:1883
  ClientID: esp32-parking-01
  User: parking_iot

[MQTT] ✅ Conectado com sucesso!
  Last Will Topic: parking/device/esp32-parking-01/status
  Last Will Message: offline
[MQTT] ✅ Assinado em: parking/config

[INIT] ✅ SETUP COMPLETO - Sistema pronto!

═══════════════════════════════════════════════════════════
WiFi:  ✅
MQTT:  ✅
I2C:   ✅ / ✅
═══════════════════════════════════════════════════════════

[HEARTBEAT] ✅ Publicado em parking/device/esp32-parking-01/status
[VAGA] 1 -> OCUPADA
[MQTT TX] ✅ parking/spots/1 = OCUPADA
---

═══════════════════════════════════════════════════════════════════════════════════
SUPORTE
═══════════════════════════════════════════════════════════════════════════════════

Documentação completa:
  📖 ESP32_MQTT_TESTING_GUIDE_V2.0.md

Arquivo de código corrigido:
  💾 SmartParking_ESP32_IoT_MQTT_FIXED.ino

Para mais testes e validação passo-a-passo:
  🧪 Consulte ESP32_MQTT_TESTING_GUIDE_V2.0.md

═══════════════════════════════════════════════════════════════════════════════════
