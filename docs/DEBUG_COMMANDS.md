╔════════════════════════════════════════════════════════════════════════════════╗
║                     COMANDOS ÚTEIS DE DEBUG - MQTT                            ║
║              Cópia/Cola pronta para usar em terminal/console                  ║
╚════════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════════
VERIFICAR DOCKER - CONTAINERS RODANDO
═══════════════════════════════════════════════════════════════════════════════════

# Ver todos os containers
docker ps -a

# Ver especificamente os containers do parking
docker ps -a | grep parking

# Ver logs do Mosquitto em tempo real
docker logs parking-mosquitto -f

# Ver logs do Backend em tempo real
docker logs parking-backend -f

# Ver logs de um container específico (últimas 50 linhas)
docker logs parking-backend | tail -50

# Ver status dos containers
docker stats parking-mosquitto parking-backend

═══════════════════════════════════════════════════════════════════════════════════
VERIFICAR MOSQUITTO - CONEXÕES E MENSAGENS
═══════════════════════════════════════════════════════════════════════════════════

# Ver todas as conexões (procura por "esp32-parking-01")
docker logs parking-mosquitto | grep "esp32-parking-01"

# Ver logs do Mosquitto dos últimos 5 minutos
docker logs parking-mosquitto --since 5m

# Ver se há clientes conectados
docker exec parking-mosquitto mosquitto_sub -h localhost -t '$SYS/broker/clients/#'

# Ver tópicos publicados
docker logs parking-mosquitto | grep "Received PUBLISH"

# Ver subscrições
docker logs parking-mosquitto | grep "Received SUBSCRIBE"

═══════════════════════════════════════════════════════════════════════════════════
TESTES COM MOSQUITTO_PUB - PUBLICAR MENSAGENS
═══════════════════════════════════════════════════════════════════════════════════

# Teste simples - publicar mensagem de teste
mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "test/hello" -m "teste" -v

# Publicar vaga 1 como ocupada
mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/1" -m '{"vagaId":1,"status":"ocupada"}' -v

# Publicar vaga 1 como livre
mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/1" -m '{"vagaId":1,"status":"livre"}' -v

# Publicar múltiplas vagas (ocupadas)
for i in {1..5}; do
  mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
    -t "parking/spots/$i" -m "{\"vagaId\":$i,\"status\":\"ocupada\"}"
done

# Publicar múltiplas vagas (livres)
for i in {1..5}; do
  mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
    -t "parking/spots/$i" -m "{\"vagaId\":$i,\"status\":\"livre\"}"
done

═══════════════════════════════════════════════════════════════════════════════════
TESTES COM MOSQUITTO_SUB - SUBSCREVER A TÓPICOS
═══════════════════════════════════════════════════════════════════════════════════

# Subscrever a todos os tópicos parking (verbose)
mosquitto_sub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/#" -v

# Subscrever apenas às vagas
mosquitto_sub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/#" -v

# Subscrever a status de dispositivo
mosquitto_sub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/device/#" -v

# Subscrever e exibir JSON formatado (com jq se disponível)
mosquitto_sub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/#" -v | while read line; do echo $line | jq . 2>/dev/null || echo $line; done

═══════════════════════════════════════════════════════════════════════════════════
VERIFICAR CONECTIVIDADE E FIREWALL
═══════════════════════════════════════════════════════════════════════════════════

# Verificar IP da máquina host
ip addr show eth0 | grep "inet " | awk '{print $2}'

# Ou alternativa
hostname -I

# Ping para o host (de dentro de Docker)
docker exec parking-backend ping 192.168.15.177 -c 3

# Verificar se porta 1883 está aberta
sudo ufw status numbered | grep 1883

# Permitir porta 1883 (se bloqueada)
sudo ufw allow 1883/tcp

# Verificar quem está escutando na porta 1883
sudo lsof -i :1883

# Teste de conectividade da porta (nc/netcat)
nc -zv 192.168.15.177 1883

# Teste com telnet
telnet 192.168.15.177 1883

═══════════════════════════════════════════════════════════════════════════════════
VERIFICAR CONFIGURAÇÕES MOSQUITTO
═══════════════════════════════════════════════════════════════════════════════════

# Ver arquivo de configuração
docker exec parking-mosquitto cat /mosquitto/config/mosquitto.conf | grep -v "^#"

# Ver arquivo de senhas
docker exec parking-mosquitto cat /mosquitto/config/passwordfile

# Ver arquivo de ACL
docker exec parking-mosquitto cat /mosquitto/config/aclfile

# Verificar se usuário existe
docker exec parking-mosquitto grep "parking_iot" /mosquitto/config/passwordfile

# Redefinir senha (se necessário)
docker exec parking-mosquitto mosquitto_passwd -b /mosquitto/config/passwordfile parking_iot ParkingIot@2026

═══════════════════════════════════════════════════════════════════════════════════
VERIFICAR BACKEND - MQTT HANDLER
═══════════════════════════════════════════════════════════════════════════════════

# Ver todas as mensagens MQTT processadas
docker logs parking-backend | grep "\[MQTT\]"

# Ver mensagens de um tópico específico
docker logs parking-backend | grep "parking/spots/1"

# Ver broadcasts realizados
docker logs parking-backend | grep "Broadcasting"

# Ver criação de sessões
docker logs parking-backend | grep "CreateSession"

# Ver atualização de vagas
docker logs parking-backend | grep "SpotNumber=001"

# Ver erros MQTT
docker logs parking-backend | grep -i "mqtt.*error\|error.*mqtt"

# Contar quantas mensagens foram recebidas
docker logs parking-backend | grep "MQTT mensagem recebida" | wc -l

═══════════════════════════════════════════════════════════════════════════════════
VERIFICAR FRONTEND - CONEXÃO SIGNALR
═══════════════════════════════════════════════════════════════════════════════════

# Abrir console do navegador (em http://localhost:3000)
# Pressione F12 e vá para Console
# Cole:

// Ver se conectado ao SignalR
console.log(window.parkingAppState);

// Ver status de conexão
console.log("Conectado:", window.parkingAppState?.isConnected);

// Ver ocupação
console.log("Ocupação:", window.parkingAppState?.occupancyPercentage);

// Ver lista de vagas
console.log("Vagas:", window.parkingAppState?.spots);

═══════════════════════════════════════════════════════════════════════════════════
TESTE COMPLETO - PASSO A PASSO
═══════════════════════════════════════════════════════════════════════════════════

# Terminal 1: Ver logs do Mosquitto em tempo real
docker logs parking-mosquitto -f

# Terminal 2: Ver logs do Backend em tempo real
docker logs parking-backend -f

# Terminal 3: Publicar teste
mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/1" -m '{"vagaId":1,"status":"ocupada"}' -v

# Esperado no Terminal 1:
# Received PUBLISH from parking_iot

# Esperado no Terminal 2:
# [MQTT] ========== Processing: parking/spots/1 ==========
# [MQTT] Broadcasting SpotUpdated

# Terminal 4: Abrir dashboard http://localhost:3000
# Vaga 1 deve estar VERMELHA (Occupied)
# Ocupação deve mostrar 5% (1/20)

═══════════════════════════════════════════════════════════════════════════════════
TESTE - RECONEXÃO AUTOMÁTICA
═══════════════════════════════════════════════════════════════════════════════════

# Simular queda de conexão Mosquitto
docker stop parking-mosquitto

# Ver logs do Backend - deve mostrar erro
docker logs parking-backend | tail -10

# Reiniciar Mosquitto
docker start parking-mosquitto

# Ver logs do Backend - deve reconectar
docker logs parking-backend | tail -10

# Verificar ESP32 no Serial Monitor
# Deve mostrar:
# [WiFi] ⚠️ Desconectado. Reconectando...
# [MQTT] ⚠️ Desconectado. Reconectando...
# [WiFi] ✅ Conectado!
# [MQTT] ✅ Conectado com sucesso!

═══════════════════════════════════════════════════════════════════════════════════
TESTE - LAST WILL TESTAMENT
═══════════════════════════════════════════════════════════════════════════════════

# Terminal: Subscrever a status do device
mosquitto_sub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/device/esp32-parking-01/status" -v

# Desligar ESP32 (cortar poder ou reset)

# Esperado no Terminal:
# parking/device/esp32-parking-01/status offline

# Isto confirma que Last Will está funcionando!

═══════════════════════════════════════════════════════════════════════════════════
LIMPAR LOGS
═══════════════════════════════════════════════════════════════════════════════════

# Limpar todos os logs dos containers
docker logs --follow parking-mosquitto > /dev/null 2>&1 &
docker logs --follow parking-backend > /dev/null 2>&1 &

# Reiniciar containers (limpa logs)
docker restart parking-mosquitto parking-backend

# Ver tamanho dos logs
du -sh $(docker inspect --format='{{.LogPath}}' parking-mosquitto)

═══════════════════════════════════════════════════════════════════════════════════
TESTE DE STRESS - MUITAS PUBLICAÇÕES
═══════════════════════════════════════════════════════════════════════════════════

# Publicar 100 mensagens rapidamente
for i in {1..100}; do
  mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
    -t "parking/spots/$((i % 20 + 1))" -m "{\"vagaId\":$((i % 20 + 1)),\"status\":\"$([ $((i % 2)) -eq 0 ] && echo 'ocupada' || echo 'livre')\",\"iteration\":$i}" &
done
wait

# Ver quantas mensagens foram processadas
docker logs parking-backend | grep "MQTT mensagem" | wc -l

═══════════════════════════════════════════════════════════════════════════════════
MONITORAR EM TEMPO REAL
═══════════════════════════════════════════════════════════════════════════════════

# Monitorar tudo ao mesmo tempo (5 terminais)
# Terminal 1
watch -n 1 'docker ps | grep parking'

# Terminal 2
docker logs parking-mosquitto -f | grep esp32-parking-01

# Terminal 3
docker logs parking-backend -f | grep Broadcasting

# Terminal 4
docker stats parking-mosquitto parking-backend --no-stream

# Terminal 5 (navegador)
# Abrir http://localhost:3000 e observar dashboard

═══════════════════════════════════════════════════════════════════════════════════
DEBUGAR MQTT PAYLOAD
═══════════════════════════════════════════════════════════════════════════════════

# Publicar e ver exatamente o que foi publicado
mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/1" \
  -m '{
    "vagaId": 1,
    "status": "ocupada",
    "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
    "device": "esp32-parking-01",
    "timestamp": "'$(date +%s)'"
  }' -v

# Subscrever e salvar em arquivo
mosquitto_sub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/#" > /tmp/mqtt-log.txt &

# Ver arquivo depois
cat /tmp/mqtt-log.txt

═══════════════════════════════════════════════════════════════════════════════════
RESETAR TUDO (SE DER PROBLEMA)
═══════════════════════════════════════════════════════════════════════════════════

# Parar todos os containers
docker-compose down

# Remover volumes (ATENÇÃO: deleta dados!)
docker-compose down -v

# Reconstruir do zero
docker-compose up --build

# Verificar se tudo está OK
docker ps -a | grep parking

═══════════════════════════════════════════════════════════════════════════════════
ATALHOS ÚTEIS
═══════════════════════════════════════════════════════════════════════════════════

# Alias para tornar mais fácil
alias mqtt_logs='docker logs parking-mosquitto -f'
alias backend_logs='docker logs parking-backend -f'
alias mqtt_test='mosquitto_pub -h 192.168.15.177 -p 1883 -u parking_iot -P ParkingIot@2026'

# Usar:
mqtt_logs          # Ver logs do Mosquitto
backend_logs       # Ver logs do Backend
mqtt_test -t "parking/spots/1" -m "teste"  # Publicar teste

═══════════════════════════════════════════════════════════════════════════════════

                        💡 DICA IMPORTANTE

Se algo não funcionar:

1. Verifique os 3 logs ao mesmo tempo:
   docker logs parking-mosquitto -f     (Terminal 1)
   docker logs parking-backend -f       (Terminal 2)
   Serial Monitor ESP32 115200 baud     (Terminal 3)

2. Publique uma mensagem de teste
   mosquitto_pub ... -t "parking/spots/1" ...

3. Veja em qual ponto falha:
   - Mosquitto recebe? (Terminal 1)
   - Backend processa? (Terminal 2)
   - Dashboard atualiza? (Terminal 3/Browser)

4. Segue a ordem de debug:
   Docker Mosquitto → Backend → Frontend

═══════════════════════════════════════════════════════════════════════════════════
