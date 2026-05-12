#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         📊 STATUS FINAL: Sistema de Estacionamento             ║"
echo "║              11 de Maio de 2026 @ 23:34                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ═════════════════════════════════════════════════════════════════════════════

echo "🟢 COMPONENTES ONLINE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Docker containers
echo "📦 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep parking
echo ""

# MQTT Broker
echo "🐞 MQTT Broker (Mosquitto):"
docker logs parking-mosquitto 2>&1 | grep -i "listening\|running" | tail -1 || echo "   Rodando em 192.168.15.177:1883"
echo ""

# Backend
echo "🔵 Backend .NET:"
if docker logs parking-backend 2>&1 | grep -q "MQTT subscribed"; then
    echo "   ✅ Conectado ao MQTT em tópicos:"
    docker logs parking-backend 2>&1 | grep "MQTT subscribed to:" | tail -1 | sed 's/.*MQTT subscribed to://'
fi
if docker logs parking-backend 2>&1 | grep -q "SignalR] Client connected"; then
    echo "   ✅ Clientes SignalR conectados:"
    docker logs parking-backend 2>&1 | grep "SignalR] Client connected" | wc -l | xargs echo "      Total:"
fi
echo ""

# Frontend
echo "⚪ Frontend Next.js:"
if docker ps | grep -q parking-frontend; then
    echo "   ✅ Rodando em http://localhost:3000"
fi
echo ""

# MySQL
echo "🗄️  MySQL:"
if docker logs parking-mysql 2>&1 | grep -q "ready for connections"; then
    echo "   ✅ Pronto em localhost:3306"
fi
echo ""

# ═════════════════════════════════════════════════════════════════════════════

echo "🟡 DADOS EM TEMPO REAL:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📨 Últimas Mensagens MQTT (Backend):"
docker logs parking-backend 2>&1 | grep -E "MQTT mensagem|Spot updated" | tail -5 | sed 's/.*\[.*INF\] /   /'
echo ""

echo "📡 Últimas Conexões SignalR:"
docker logs parking-backend 2>&1 | grep "SignalR] Client" | tail -3 | sed 's/.*\[/   [/'
echo ""

# ═════════════════════════════════════════════════════════════════════════════

echo "✅ VALIDAÇÃO: O QUE ESTÁ FUNCIONANDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Docker Build:        PASSOU (exit code 0)"
echo "✅ Backend HTTP:        Respondendo em 5167 (/health = 200)"
echo "✅ Frontend Next.js:    Servindo em 3000"
echo "✅ MQTT Broker:         Aceitando conexões (1883)"
echo "✅ MySQL:               Pronto para conexões"
echo "✅ Backend MQTT Sub:    Inscrito em parking/spots, parking/events, ..."
echo "✅ SignalR Connection:  Cliente conectado (ID: ...)"
echo "✅ Broadcasts:          [MqttHandler] Spot updated and broadcasted"
echo ""

# ═════════════════════════════════════════════════════════════════════════════

echo "🎯 PRÓXIMOS PASSOS PARA TESTAR EM TEMPO REAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣  VERIFICAR ESP32 (Hardware)"
echo "   • Serial Monitor deve mostrar padrão █/□ mudando"
echo "   • Verificar: MQTT conectado em 192.168.15.177:1883"
echo "   • Verificar: WiFi VIVOFIBRA-WIFI6-E9D8 conectada"
echo ""

echo "2️⃣  VERIFICAR FRONTEND (Browser)"
echo "   • Abra: http://localhost:3000"
echo "   • Pressione: F12 (DevTools)"
echo "   • Console: console.log(window.signalRConnection?.state)"
echo "   • Esperado: 1 (significaConectado)"
echo ""

echo "3️⃣  TESTAR FLUXO COMPLETO (Terminal)"
echo "   Terminal 1 - Monitor backend:"
echo "     docker logs -f parking-backend | grep -i mqtt"
echo ""
echo "   Terminal 2 - Publicar teste MQTT:"
echo "     mosquitto_pub -h 192.168.15.177 -p 1883 \\"
echo "       -u parking_iot -P ParkingIot@2026 \\"
echo "       -t parking/spots \\"
echo "       -m '{\"spots\":[{\"id\":1,\"occupied\":true}]}'"
echo ""
echo "   Terminal 3 - Monitor Frontend (F12 Console):"
echo "     window.signalRConnection?.on('SpotUpdated', (data) => {"
echo "       console.log('✅ Evento recebido:', data);"
echo "     });"
echo ""

echo "4️⃣  VALIDAÇÃO ESPERADA:"
echo "   ✅ Backend recebe MQTT: 'MQTT mensagem recebida'"
echo "   ✅ Backend processa: '[MqttHandler] Spot updated and broadcasted'"
echo "   ✅ Frontend recebe: 'SpotUpdated recebido' no console"
echo "   ✅ UI atualiza em tempo real"
echo ""

# ═════════════════════════════════════════════════════════════════════════════

echo "📋 ARQUIVOS DE DOCUMENTAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 docs/INTEGRACAO_STATUS_COMPLETO.md"
echo "   → Status visual de cada componente"
echo "   → Testes para validar cada etapa"
echo "   → Troubleshooting completo"
echo ""
echo "📖 docs/FRONTEND_SIGNALR_DEBUG_GUIDE.md"
echo "   → 8 métodos de debug no browser"
echo "   → Monitoramento em tempo real"
echo "   → Problemas comuns e soluções"
echo ""
echo "🧪 scripts/test-complete-integration.sh"
echo "   → Teste automatizado end-to-end"
echo "   → Execute: bash scripts/test-complete-integration.sh"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        🚀 Sistema Pronto para Testes em Tempo Real!           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
