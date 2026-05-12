#!/bin/bash

# 🎯 TESTE COMPLETO: MQTT → Backend → SignalR → Frontend (em tempo real)

set -e

BROKER="192.168.15.177"
PORT="1884"
USER="parking_iot"
PASS="ParkingIot@2026"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      🧪 TESTE COMPLETO: MQTT ↔ SignalR ↔ Frontend            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 1: Backend MQTT Subscription
# ═══════════════════════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TESTE 1/4] Verificando Backend MQTT Subscription"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if docker logs parking-backend 2>/dev/null | grep -q "MQTT subscribed to"; then
    echo "✅ Backend inscrito em tópicos MQTT"
    echo ""
    docker logs parking-backend 2>/dev/null | grep "MQTT subscribed to" | head -1
else
    echo "❌ Backend NÃO subscrito!"
    echo "Verifique se backend está rodando:"
    echo "  docker logs parking-backend | tail -50"
    exit 1
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 2: SignalR Connection Status
# ═══════════════════════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TESTE 2/4] Verificando SignalR Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if docker logs parking-backend 2>/dev/null | grep -q "SignalR] Client connected"; then
    echo "✅ Frontend conectado ao SignalR"
    echo ""
    docker logs parking-backend 2>/dev/null | grep "SignalR] Client connected" | head -1
else
    echo "⚠️ Nenhum cliente SignalR conectado ainda"
    echo "Frontend conecta quando carrega a página:"
    echo "  1. Abra http://localhost:3000 no browser"
    echo "  2. Aguarde a página carregar completamente"
    echo "  3. Reexecute este teste"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 3: Publicar Mensagem Teste MQTT
# ═══════════════════════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TESTE 3/4] Publicando Mensagem Teste no MQTT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📤 Publicando: parking/spots"
echo "   Payload: {\"spots\":[{\"id\":1,\"occupied\":true},{\"id\":2,\"occupied\":false}]}"
echo ""

mosquitto_pub -h "$BROKER" -p "$PORT" \
  -u "$USER" -P "$PASS" \
  -t "parking/spots" \
  -m '{"spots":[{"id":1,"occupied":true},{"id":2,"occupied":false}]}' \
  2>&1 && echo "✅ Publicado com sucesso" || echo "❌ Erro ao publicar"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# TESTE 4: Monitorar Backend Processando
# ═══════════════════════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[TESTE 4/4] Aguardando Processamento (10 segundos)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Pegar timestamp antes
BEFORE=$(date +%s)

# Aguardar
echo "⏳ Aguardando 3 segundos para processar..."
sleep 3

# Pegar logs recentes (últimas 2 linhas)
RECENT_LOGS=$(docker logs parking-backend 2>/dev/null | tail -20)

echo ""
echo "📋 Logs recentes do backend:"
echo ""
echo "$RECENT_LOGS" | grep -E "(MQTT|Spot|Broadcast|Updated)" || echo "❌ Nenhuma mensagem MQTT encontrada"

echo ""
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# RESULTADO
# ═══════════════════════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    📊 RESULTADO DO TESTE                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

MQTT_OK=$(docker logs parking-backend 2>/dev/null | grep -c "MQTT subscribed to" || echo 0)
SIGNALR_OK=$(docker logs parking-backend 2>/dev/null | grep -c "SignalR] Client connected" || echo 0)
BROADCAST=$(docker logs parking-backend 2>/dev/null | grep -c "Broadcast\|Updated" || echo 0)

echo "Status MQTT Backend:"
if [ "$MQTT_OK" -gt 0 ]; then
    echo "  ✅ Backend inscrito em tópicos MQTT"
else
    echo "  ❌ Backend NÃO subscrito"
fi
echo ""

echo "Status SignalR Frontend:"
if [ "$SIGNALR_OK" -gt 0 ]; then
    echo "  ✅ Frontend conectado ao SignalR"
else
    echo "  ⚠️ Frontend não conectado (abra http://localhost:3000)"
fi
echo ""

echo "Status de Broadcasts:"
if [ "$BROADCAST" -gt 0 ]; then
    echo "  ✅ Backend disparando SignalR broadcasts"
else
    echo "  ❌ Nenhum broadcast detectado"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# PRÓXIMOS PASSOS
# ═══════════════════════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🎯 PRÓXIMOS PASSOS                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ "$MQTT_OK" -eq 0 ]; then
    echo "1️⃣  MQTT Backend não subscrito:"
    echo "    - Verifique se backend está rodando: docker ps | grep backend"
    echo "    - Verifique logs: docker logs parking-backend | tail -50"
    echo ""
fi

if [ "$SIGNALR_OK" -eq 0 ]; then
    echo "2️⃣  Frontend não conectado ao SignalR:"
    echo "    - Abra http://localhost:3000 no browser"
    echo "    - Aguarde página carregar completamente"
    echo "    - Reexecute este teste"
    echo ""
fi

if [ "$BROADCAST" -eq 0 ]; then
    echo "3️⃣  Nenhum broadcast detectado:"
    echo "    - Backend recebeu mensagem MQTT? (procure por 'MQTT mensagem recebida' nos logs)"
    echo "    - Backend processou? (procure por 'MqttHandler' nos logs)"
    echo "    - Teste manualmente:"
    echo "      docker logs -f parking-backend | grep -i 'mqtt\\|broadcast'"
    echo ""
fi

echo "4️⃣  Testar manualmente MQTT → Backend:"
echo "    Terminal 1: docker logs -f parking-backend | grep -i mqtt"
echo "    Terminal 2: mosquitto_pub -h 192.168.15.177 -p 1884 \\"
echo "                  -u parking_iot -P ParkingIot@2026 \\"
echo "                  -t parking/spots \\"
echo "                  -m '{\"spots\":[{\"id\":1,\"occupied\":true}]}'"
echo ""

echo "5️⃣  Testar Frontend SignalR (F12 → Console):"
echo "    console.log(window.signalRConnection?.state)"
echo "    // Esperado: 1 (Conectado)"
echo ""

echo "✨ Quando tudo funcionar:"
echo "   - MQTT recebe dados da ESP32"
echo "   - Backend processa e envia via SignalR"
echo "   - Frontend renderiza em tempo real"
echo "   - Dashboard atualiza automaticamente"
echo ""
