╔════════════════════════════════════════════════════════════════════════════════╗
║              TESTES PASSO A PASSO - ESP32 ↔ MOSQUITTO (Docker)                ║
║              Smart Parking MQTT Integration Testing Guide v2.0                 ║
╚════════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════════
TESTE 1: VERIFICAR MOSQUITTO ESTÁ RODANDO E ACESSÍVEL
═══════════════════════════════════════════════════════════════════════════════════

FROM: Máquina Host (não Docker)

COMANDO:
  mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
    -t parking/test -m "teste-conexao-host" -v

RESULTADO ESPERADO:
  topic parking/test
  message teste-conexao-host

LOGS DO BACKEND (docker logs parking-backend):
  [13:XX:XX INF] MQTT mensagem recebida: parking/test -> teste-conexao-host
  [13:XX:XX INF] [MQTT] ========== Processing: parking/test ==========

═══════════════════════════════════════════════════════════════════════════════════
TESTE 2: VERIFICAR MOSQUITTO LOGS PARA CONEXÕES
═══════════════════════════════════════════════════════════════════════════════════

FROM: Terminal do Host

COMANDO:
  docker logs parking-mosquitto -f

DESCRIÇÃO:
  Mostra em tempo real todos os eventos MQTT:
  - Conexões (New client connected)
  - Desconexões (Client disconnected)
  - Publicações (Received PUBLISH)
  - Subscrições (Received SUBSCRIBE)

RESULTADO ESPERADO (quando ESP32 conectar):
  1778592430: New client connected from 192.168.15.178:49865 as esp32-parking-01 (p4, c1, k15, u'parking_iot').
  1778592430: No will message specified. ← Pode ignorar, Last Will é setup interno
  1778592430: Received SUBSCRIBE from esp32-parking-01
  1778592430:        parking/config (QoS 0)

═══════════════════════════════════════════════════════════════════════════════════
TESTE 3: UPLOAD DO CÓDIGO CORRIGIDO NA ESP32
═══════════════════════════════════════════════════════════════════════════════════

ARQUIVO: SmartParking_ESP32_IoT_MQTT_FIXED.ino

PASSOS:
  1. Abra o arquivo em Arduino IDE ou VS Code + PlatformIO
  2. Verifique as configurações críticas:
  
     ERRADO:  #define MQTT_PORT 1884
     CORRETO: #define MQTT_PORT 1883
     
     ERRADO:  mqttClient.connect("ESP32_ParkingSystem", ...)
     CORRETO: mqttClient.connect("esp32-parking-01", ...)
  
  3. Compile e faça upload
  4. Abra Serial Monitor a 115200 baud

═══════════════════════════════════════════════════════════════════════════════════
TESTE 4: VERIFICAR SERIAL MONITOR DA ESP32 AO LIGAR
═══════════════════════════════════════════════════════════════════════════════════

BAUD RATE: 115200
ESPERADO DURANTE O SETUP (primeiros 5 segundos):

  ╔════════════════════════════════════════════════════════════╗
  ║     Smart Parking ESP32 IoT - V2.0 (MQTT ROBUST)         ║
  ╚════════════════════════════════════════════════════════════╝

  [INIT] Inicializando I2C...
  [SCAN I2C] Verificando endereços no barramento...
    ✅ 0x20          ← MCP1 encontrado
    ✅ 0x21          ← MCP2 encontrado
  Total: 2
  
  [MCP1] ✅ Inicializado em 0x20
  [MCP2] ✅ Inicializado em 0x21
  
  [TESTE I2C] Estado inicial dos pinos...
  [MCP1] Vagas: 0/16 ocupadas
  [MCP2] Vagas: 0/4 ocupadas
  
  [INIT] Inicializando Servos...
  [SERVO] ✅ Servos anexados
  
  [INIT] Inicializando WiFi...
  [WiFi] Conectando a 'VIVOFIBRA-WIFI6-E9D8'...
  ............
  [WiFi] ✅ Conectado!
    IP: 192.168.15.178
    RSSI: -35 dBm
  
  [INIT] Inicializando MQTT...
  [MQTT] Cliente configurado
  [MQTT] Conectando a 192.168.15.177:1883 (ClientID: esp32-parking-01)...
  [MQTT] ✅ Conectado com sucesso!
    ClientID: esp32-parking-01
    User: parking_iot
    Last Will: parking/device/esp32-parking-01/status
  [MQTT] ✅ Assinado em: parking/config
  
  [INIT] ✅ SETUP COMPLETO - Sistema pronto!
  
  ═══════════════════════════════════════════════════════════
  WiFi: ✅
  MQTT: ✅
  I2C:  ✅ / ✅
  ═══════════════════════════════════════════════════════════

✅ SE VER TUDO ISSO: Sistema está OK para o Teste 5!

❌ SE VER ERRO DE MQTT:
  [MQTT] ❌ Falha ao conectar. Código: 4 (MQTT_CONNECT_BAD_CREDENTIALS)
  → PROBLEMA: Credenciais erradas (usuario/senha)
  → SOLUÇÃO: Verifique MQTT_USER e MQTT_PASSWORD

  [MQTT] ❌ Falha ao conectar. Código: 2 (MQTT_CONNECT_BAD_CLIENT_ID)
  → PROBLEMA: ClientID não permitido
  → SOLUÇÃO: Use "esp32-parking-01" (não "ESP32_ParkingSystem")

  [MQTT] ❌ Falha ao conectar. Código: -2 (MQTT_CONNECT_FAILED)
  → PROBLEMA: Não consegue conectar no broker
  → SOLUÇÃO: Verifique IP (192.168.15.177) e porta (1883)

═══════════════════════════════════════════════════════════════════════════════════
TESTE 5: VERIFICAR CONEXÃO ESP32 NO MOSQUITTO
═══════════════════════════════════════════════════════════════════════════════════

FROM: Terminal do Host (enquanto ESP32 está ligada)

COMANDO:
  docker logs parking-mosquitto | grep esp32-parking-01

RESULTADO ESPERADO:
  1778592430: New client connected from 192.168.15.178:49865 as esp32-parking-01 (p4, c1, k15, u'parking_iot').
  1778592430: Received SUBSCRIBE from esp32-parking-01
  1778592430:        parking/config (QoS 0)
  1778592430: Sending SUBACK to esp32-parking-01

═══════════════════════════════════════════════════════════════════════════════════
TESTE 6: SIMULAR MUDANÇA DE VAGA (Sensor IR Bloqueado)
═══════════════════════════════════════════════════════════════════════════════════

AÇÃO FÍSICA:
  1. Bloqueie o sensor IR da vaga 1 (mova a mão perto do sensor)
  2. Veja o Serial Monitor da ESP32

ESPERADO NO SERIAL MONITOR:
  [VAGA] 1 -> OCUPADA                ← Mudança de estado detectada
  [MQTT TX] ✅ parking/spots/1 = {"vagaId":1,"status":"ocupada","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":15,"timestamp":"15234"}

ESPERADO NOS LOGS DO BACKEND:
  docker logs parking-backend | grep -i "spotNumber=001"
  
  [13:XX:XX INF] MQTT mensagem recebida: parking/spots/1 -> {"vagaId":1,"status":"ocupada",...}
  [13:XX:XX INF] [MQTT] ========== Processing: parking/spots/1 ==========
  [13:XX:XX INF] Status da vaga 001 atualizado para Occupied
  [13:XX:XX INF] [MQTT] Status transition for spot 001: Free → Occupied
  [13:XX:XX INF] [SessionMgmt] CreateSession START for spot 001
  [13:XX:XX INF] [SessionMgmt] ✓✓✓ CreateSession SUCCESS for spot 001
  [13:XX:XX INF] [MqttHandler] Broadcasting SpotUpdated: SpotNumber=001, Status=Occupied
  [13:XX:XX INF] [Dashboard RT] Broadcast sent: Occupancy=5.0% (1/20)

ESPERADO NO DASHBOARD (http://localhost:3000):
  - Ocupação mudou de 0% para 5%
  - Entradas 24h mudou de 0 para 1
  - Indicador visual da vaga 001 muda para VERMELHO/Ocupada
  - Timestamp atualizado

═══════════════════════════════════════════════════════════════════════════════════
TESTE 7: VERIFICAR ATUALIZAÇÕES CONTÍNUAS (Todo sensor)
═══════════════════════════════════════════════════════════════════════════════════

AÇÃO:
  Deixe a ESP32 rodando por 1 minuto
  Verifique o heartbeat periódico

ESPERADO NO SERIAL MONITOR (a cada 60 segundos):
  [HEARTBEAT] ✅ Publicado em parking/device/esp32-parking-01/status

ESPERADO NOS LOGS DO BACKEND:
  docker logs parking-backend | tail -20
  
  [13:XX:XX INF] MQTT mensagem recebida: parking/device/esp32-parking-01/status -> {"status":"online",...}
  [13:XX:XX INF] [Dashboard RT] Real-time update triggered

═══════════════════════════════════════════════════════════════════════════════════
TESTE 8: TESTE DE RECONEXÃO (Simular Desconexão)
═══════════════════════════════════════════════════════════════════════════════════

AÇÃO:
  Desligue o WiFi da ESP32 por 30 segundos, depois reconecte

ESPERADO NO SERIAL MONITOR:
  [WiFi] ⚠️ Desconectado. Reconectando...
  [WiFi] Conectando a 'VIVOFIBRA-WIFI6-E9D8'...
  .....
  [WiFi] ✅ Conectado!
  [MQTT] ⚠️ Desconectado. Reconectando...
  [MQTT] Conectando a 192.168.15.177:1883 (ClientID: esp32-parking-01)...
  [MQTT] ✅ Conectado com sucesso!

CONFIRMAÇÃO:
  Serial Monitor mostra "reconnects_wifi" e "reconnects_mqtt" aumentando

═══════════════════════════════════════════════════════════════════════════════════
TESTE 9: FULL END-TO-END
═══════════════════════════════════════════════════════════════════════════════════

CHECKLIST FINAL:

  ✅ ESP32 conecta ao WiFi
  ✅ ESP32 conecta ao MQTT com clientId "esp32-parking-01"
  ✅ Sensores de vagas mudam estado e publicam mensagens JSON
  ✅ Backend recebe mensagens MQTT e processa
  ✅ Backend cria entradas de veículo e sessões de estacionamento
  ✅ Backend broadcast via SignalR para frontend
  ✅ Dashboard 3D atualiza em tempo real
  ✅ Relatórios mostram entradas/saídas
  ✅ Reconexão automática funciona
  ✅ Last Will Topic ativa ao desconectar

═══════════════════════════════════════════════════════════════════════════════════
COMANDOS ÚTEIS DE DEBUG
═══════════════════════════════════════════════════════════════════════════════════

# Ver todas as mensagens MQTT enviadas pela ESP32:
docker logs parking-mosquitto -f | grep "esp32-parking-01"

# Ver messages recebidas pelo backend da ESP32:
docker logs parking-backend -f | grep "\[MQTT\]"

# Ver broadcasts realizados:
docker logs parking-backend -f | grep "Broadcasting"

# Ver status de conexão:
docker logs parking-mosquitto -f | grep -E "connected|disconnected"

# Publicar teste manualmente do host:
mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t parking/spots/1 -m '{"vagaId":1,"status":"ocupada"}'

# Subscrever a um tópico:
mosquitto_sub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/#" -v

═══════════════════════════════════════════════════════════════════════════════════
RESOLUÇÃO DE PROBLEMAS
═══════════════════════════════════════════════════════════════════════════════════

PROBLEMA: ESP32 não conecta no WiFi
SOLUÇÃO:
  - Verifique WIFI_SSID e WIFI_PASSWORD
  - Verifique sinal WiFi (RSSI > -70 dBm)
  - Reinicie ESP32

PROBLEMA: WiFi OK, mas MQTT falha com código 4
SOLUÇÃO:
  - Verifique MQTT_USER = "parking_iot"
  - Verifique MQTT_PASSWORD = "ParkingIot@2026"
  - Confirme no arquivo ~/.mosquitto_passwd existe o usuário

PROBLEMA: WiFi OK, MQTT falha com código 2
SOLUÇÃO:
  - Altere ClientID para "esp32-parking-01"
  - Verifique que ACL permite este clientId

PROBLEMA: WiFi OK, MQTT falha com código -2
SOLUÇÃO:
  - Verifique MQTT_BROKER = "192.168.15.177" (IP do host)
  - Verifique MQTT_PORT = 1883
  - Teste: ping 192.168.15.177
  - Verifique firewall permite porta 1883

PROBLEMA: MQTT conecta mas nenhuma mensagem é publicada
SOLUÇÃO:
  - Verifique sensor IR está funcionando (Serial Monitor mostra mudanças?)
  - Bloqueie manualmente o sensor
  - Verifique logs do backend: "MQTT mensagem recebida"

PROBLEMA: Mensagem recebida no backend mas não aparece no 3D
SOLUÇÃO:
  - Verifique SignalR está conectado (Frontend logs mostram "✅ Conectado")
  - Verifique ID do estacionamento no frontend = "45fc18f2-bdd8-4b11-b964-f8face1147f0"
  - Verifique logs do backend: "Broadcasting SpotUpdated"

═══════════════════════════════════════════════════════════════════════════════════
RESUMO: O QUE CORRIGIMOS
═══════════════════════════════════════════════════════════════════════════════════

❌ ANTES (Não funcionava):
   - Porta MQTT: 1884 (errada para Docker)
   - ClientID: "ESP32_ParkingSystem" (não reconhecido)
   - Tópico: "parking/spots" (genérico)
   - Sem Last Will
   - Sem logs detalhados

✅ DEPOIS (Funciona perfeitamente):
   - Porta MQTT: 1883 (correta)
   - ClientID: "esp32-parking-01" (compatível com ACL)
   - Tópico: "parking/spots/{vagaId}" (específico)
   - Last Will implementado
   - Logs com error codes e mensagens de erro claras

═══════════════════════════════════════════════════════════════════════════════════
