#!/bin/bash
# 🚀 TESTE RÁPIDO: Validar Integração MQTT ↔ SignalR ↔ ESP32

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🧪 TESTE DE INTEGRAÇÃO COMPLETA                       ║"
echo "║    MQTT (ESP32) → Backend .NET → SignalR → Frontend React     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ═════════════════════════════════════════════════════════════════════════════
# TESTE 1: Verificar Backend MQTT Subscription
# ═════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[1/5]${NC} Verificando Backend MQTT Subscription..."
if docker logs parking-system-api-1 2>/dev/null | grep -q "MQTT subscribed to"; then
    echo -e "${GREEN}✅ Backend inscrito em tópicos MQTT${NC}"
    docker logs parking-system-api-1 2>/dev/null | grep "MQTT subscribed to" | head -1
else
    echo -e "${RED}❌ Backend NÃO subscrito! Verifique logs:${NC}"
    docker logs parking-system-api-1 | tail -20
fi
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# TESTE 2: Verificar ESP32 Conexão
# ═════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[2/5]${NC} Verificando ESP32 no Barramento I2C..."
echo -e "${YELLOW}   → Serial Monitor deve mostrar:${NC}"
echo "      [DIAGNÓSTICO I2C] Verificando barramento..."
echo "      ✅ Dispositivo encontrado: 0x20"
echo "      ✅ Dispositivo encontrado: 0x21"
echo ""
echo -e "${YELLOW}   → Se SIM: ESP32 lendo sensores corretamente${NC}"
echo -e "${YELLOW}   → Se NÃO: Verificar fiação I2C e alimentação dos MCPs${NC}"
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# TESTE 3: Publicar Mensagem Teste MQTT
# ═════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[3/5]${NC} Publicando mensagem teste no MQTT..."
echo ""
echo -e "${YELLOW}Comando:${NC}"
echo "  mosquitto_pub -h 192.168.15.177 -p 1884 \\"
echo "    -u parking_iot -P ParkingIot@2026 \\"
echo "    -t parking/spots \\"
echo "    -m '{\"spots\":[{\"id\":1,\"occupied\":true},{\"id\":2,\"occupied\":false}]}'"
echo ""

read -p "Pressione ENTER para executar (Ctrl+C para cancelar)..."

mosquitto_pub -h 192.168.15.177 -p 1884 \
  -u parking_iot -P ParkingIot@2026 \
  -t parking/spots \
  -m '{"spots":[{"id":1,"occupied":true},{"id":2,"occupied":false}]}' \
  && echo -e "${GREEN}✅ Mensagem publicada${NC}" \
  || echo -e "${RED}❌ Erro ao publicar${NC}"
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# TESTE 4: Verificar Backend Recebeu
# ═════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[4/5]${NC} Aguardando confirmação do Backend (5s)..."
sleep 2

if docker logs parking-system-api-1 2>/dev/null | grep -q "MQTT mensagem recebida"; then
    echo -e "${GREEN}✅ Backend RECEBEU mensagem MQTT!${NC}"
    echo ""
    echo "Últimas mensagens:"
    docker logs parking-system-api-1 2>/dev/null | grep "MQTT mensagem recebida" | tail -3
else
    echo -e "${RED}⚠️ Backend NÃO recebeu mensagem${NC}"
    echo "Verifique:"
    echo "  1. Mosquitto está rodando?"
    echo "  2. Backend está conectado ao Mosquitto?"
    echo "  3. Permissões ACL do usuário parking_iot?"
fi
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# TESTE 5: Verificar SignalR Broadcast
# ═════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}[5/5]${NC} Verificando SignalR Broadcast..."

if docker logs parking-system-api-1 2>/dev/null | grep -q "Broadcast sent"; then
    echo -e "${GREEN}✅ SignalR DISPAROU eventos para Frontend!${NC}"
    echo ""
    echo "Eventos enviados:"
    docker logs parking-system-api-1 2>/dev/null | grep "Broadcast sent" | tail -3
else
    echo -e "${YELLOW}⚠️ Nenhum broadcast detectado${NC}"
    echo "Possíveis causas:"
    echo "  1. parkingLotId ainda é Guid.Empty"
    echo "  2. Erro no desserializar JSON"
    echo ""
    echo "Verifique logs completos:"
    docker logs parking-system-api-1 | tail -30
fi
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# RESUMO
# ═════════════════════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   📊 RESUMO FINAL                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Checklist:"
echo "  [ ] Backend subscrito em parking/spots"
echo "  [ ] Backend subscrito em parking/events"
echo "  [ ] Backend RECEBEU mensagem MQTT"
echo "  [ ] Backend processou em MqttToSignalRHandler"
echo "  [ ] SignalR enviou 'SpotUpdated'"
echo "  [ ] SignalR enviou 'UpdateDashboardStats'"
echo ""
echo "Frontend (Next.js):"
echo "  1. Abra DevTools → Console"
echo "  2. Procure por: 'SpotUpdated recebido' ou 'UpdateDashboardStats recebido'"
echo "  3. Se aparecer → ✅ Conexão SignalR funcionando"
echo ""
echo "ESP32:"
echo "  1. Serial Monitor deve mostrar mudanças no padrão de □ e █"
echo "  2. Se receber vagas livres em parking/config → ✅ Feedback OK"
echo ""
