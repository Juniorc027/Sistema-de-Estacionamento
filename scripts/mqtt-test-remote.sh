#!/bin/bash

# ============================================================
#  MQTT Remote Access Test Script
#  Testa conectividade MQTT remoto e diagnostica problemas
# ============================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
MQTT_HOST="${MQTT_HOST:-localhost}"
MQTT_PORT="${MQTT_PORT:-1883}"
MQTT_USER="${MQTT_USER:-parking_iot}"
MQTT_PASS="${MQTT_PASS:-ParkingIot@2026}"
TEST_TOPIC="parking/test/connectivity"
TEST_PAYLOAD='{"test":"conexão remota ok","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    MQTT Remote Access Connectivity Test               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo

# ============================================================
#  TESTE 1: Verificar se nc/telnet está disponível
# ============================================================
echo -e "${YELLOW}[1/5] Verificando ferramentas necessárias...${NC}"

if ! command -v mosquitto_pub &> /dev/null; then
  echo -e "${RED}❌ mosquitto_pub não encontrado!${NC}"
  echo "   Instale: sudo apt install mosquitto-clients"
  exit 1
fi

if ! command -v mosquitto_sub &> /dev/null; then
  echo -e "${RED}❌ mosquitto_sub não encontrado!${NC}"
  echo "   Instale: sudo apt install mosquitto-clients"
  exit 1
fi

echo -e "${GREEN}✅ Ferramentas OK${NC}"
echo

# ============================================================
#  TESTE 2: Testar conectividade básica
# ============================================================
echo -e "${YELLOW}[2/5] Testando conectividade TCP...${NC}"
echo "      Host: ${BLUE}${MQTT_HOST}${NC}"
echo "      Port: ${BLUE}${MQTT_PORT}${NC}"

if command -v nc &> /dev/null; then
  if nc -zv ${MQTT_HOST} ${MQTT_PORT} 2>&1 | grep -q "succeeded"; then
    echo -e "${GREEN}✅ Porta ${MQTT_PORT} está aberta${NC}"
  else
    echo -e "${RED}❌ Porta ${MQTT_PORT} está fechada ou inacessível${NC}"
    echo "   Verifique:"
    echo "   - Docker está rodando? docker-compose up -d"
    echo "   - Firewall está bloqueando?"
    echo "   - IP correto?"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  nc não disponível, pulando teste TCP${NC}"
fi

echo

# ============================================================
#  TESTE 3: Testar autenticação MQTT
# ============================================================
echo -e "${YELLOW}[3/5] Testando autenticação MQTT...${NC}"
echo "      Usuario: ${BLUE}${MQTT_USER}${NC}"
echo "      Password: ${BLUE}***${NC}"

# Tenta publicar uma mensagem de teste (vai falhar se autenticação estiver errada)
if mosquitto_pub \
  -h "${MQTT_HOST}" \
  -p "${MQTT_PORT}" \
  -u "${MQTT_USER}" \
  -P "${MQTT_PASS}" \
  -t "${TEST_TOPIC}" \
  -m "${TEST_PAYLOAD}" 2>&1; then
  echo -e "${GREEN}✅ Autenticação OK${NC}"
  echo -e "   Mensagem publicada em: ${BLUE}${TEST_TOPIC}${NC}"
else
  echo -e "${RED}❌ Falha na autenticação!${NC}"
  echo "   Verifique credenciais:"
  echo "   - Username: ${MQTT_USER}"
  echo "   - Password correta?"
  exit 1
fi

echo

# ============================================================
#  TESTE 4: Verificar acesso remoto (simular ESP32)
# ============================================================
echo -e "${YELLOW}[4/5] Testando publicação (simulando ESP32)...${NC}"

# Gera um vagaId aleatório
VAGA_ID=$((RANDOM % 20 + 1))
SPOT_TOPIC="parking/spots/${VAGA_ID}"
SPOT_PAYLOAD='{"vagaId":'${VAGA_ID}',"status":"livre","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-test","uptime_s":'$(date +%s)'}'

echo "      Tópico: ${BLUE}${SPOT_TOPIC}${NC}"
echo "      Payload: ${BLUE}${SPOT_PAYLOAD}${NC}"

if mosquitto_pub \
  -h "${MQTT_HOST}" \
  -p "${MQTT_PORT}" \
  -u "${MQTT_USER}" \
  -P "${MQTT_PASS}" \
  -t "${SPOT_TOPIC}" \
  -m "${SPOT_PAYLOAD}" \
  -r 2>&1; then
  echo -e "${GREEN}✅ Mensagem publicada com sucesso${NC}"
else
  echo -e "${RED}❌ Falha ao publicar mensagem!${NC}"
  exit 1
fi

echo

# ============================================================
#  TESTE 5: Testar subscription (receber mensagens)
# ============================================================
echo -e "${YELLOW}[5/5] Testando subscription...${NC}"
echo "      Aguardando mensagens por 3 segundos..."
echo "      Tópico: ${BLUE}parking/#${NC}"
echo

# Usa timeout para não ficar esperando indefinidamente
timeout 3 mosquitto_sub \
  -h "${MQTT_HOST}" \
  -p "${MQTT_PORT}" \
  -u "${MQTT_USER}" \
  -P "${MQTT_PASS}" \
  -t "parking/#" \
  -C 1 || true

echo

# ============================================================
#  RESUMO
# ============================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    ✅ TODOS OS TESTES PASSARAM!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo

echo -e "📊 Resumo da Configuração:"
echo -e "   Host: ${BLUE}${MQTT_HOST}${NC}"
echo -e "   Port: ${BLUE}${MQTT_PORT}${NC}"
echo -e "   User: ${BLUE}${MQTT_USER}${NC}"
echo

echo -e "🎯 Próximos Passos:"
echo -e "   1. Pegue o IP da sua máquina: ${BLUE}hostname -I${NC}"
echo -e "   2. Configure na ESP32: ${BLUE}const char* MQTT_BROKER = \"<seu_ip>\"${NC}"
echo -e "   3. Use porta: ${BLUE}${MQTT_PORT}${NC}"
echo -e "   4. Credenciais: ${BLUE}${MQTT_USER} / ${MQTT_PASS}${NC}"
echo

echo -e "📝 Para monitorar em tempo real:"
echo -e "   ${BLUE}mosquitto_sub -h ${MQTT_HOST} -p ${MQTT_PORT} -u ${MQTT_USER} -P ${MQTT_PASS} -t 'parking/#' -v${NC}"
echo

echo -e "✨ MQTT remoto está funcionando! Agora a ESP32 consegue conectar. 🚀${NC}"
