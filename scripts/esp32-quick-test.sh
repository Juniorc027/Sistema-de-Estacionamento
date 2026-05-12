#!/bin/bash

# ============================================================
#  QUICK TEST SCRIPT — Smart Parking ESP32
# ============================================================
#  Testes rápidos para validar sistema sem Postman/Insomnia
#
#  Uso: chmod +x esp32-quick-test.sh && ./esp32-quick-test.sh
# ============================================================

set -e

BROKER="192.168.15.177"
PORT="1884"
USERNAME="parking_iot"
PASSWORD="ParkingIot@2026"
PARKING_LOT_ID="45fc18f2-bdd8-4b11-b964-f8face1147f0"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
#  TESTES
# ============================================================

test_mqtt_connection() {
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}[TESTE 1] Verificar conexão MQTT${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  
  if ! command -v mosquitto_pub &> /dev/null; then
    echo -e "${RED}❌ mosquitto_pub não instalado${NC}"
    echo "   Ubuntu: sudo apt-get install mosquitto-clients"
    echo "   macOS:  brew install mosquitto"
    return 1
  fi

  # Tenta publicar teste
  mosquitto_pub -h "$BROKER" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" \
    -t "parking/test" -m "test" 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Conexão MQTT OK${NC}"
    return 0
  else
    echo -e "${RED}❌ Falha ao conectar${NC}"
    echo "   • Broker: $BROKER:$PORT"
    echo "   • Username: $USERNAME"
    echo "   • Password: $PASSWORD"
    return 1
  fi
}

test_update_vagas() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}[TESTE 2] Atualizar vagas disponíveis${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  
  PAYLOAD='{"availableSpots": 10}'
  
  echo -e "${YELLOW}Enviando:${NC}"
  echo "  Tópico:  parking/config/spots"
  echo "  Payload: $PAYLOAD"
  echo ""
  
  mosquitto_pub -h "$BROKER" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" \
    -t "parking/config/spots" -m "$PAYLOAD"
  
  echo -e "${GREEN}✅ Enviado${NC}"
  echo ""
  echo "Esperado no ESP32:"
  echo "  [Config] Vagas atualizadas: 20 → 10"
}

test_simular_vaga_ocupada() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}[TESTE 3] Simular vaga ocupada (vaga 5)${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  
  PAYLOAD="{\"vagaId\": 5, \"occupied\": true, \"parkingLotId\": \"$PARKING_LOT_ID\", \"device\": \"esp32-parking-01\", \"timestamp\": $(date +%s)000}"
  
  echo -e "${YELLOW}Enviando:${NC}"
  echo "  Tópico:  parking/spots/5"
  echo "  Payload: $PAYLOAD"
  echo ""
  
  mosquitto_pub -h "$BROKER" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" \
    -t "parking/spots/5" -m "$PAYLOAD"
  
  echo -e "${GREEN}✅ Enviado${NC}"
}

test_simular_vaga_livre() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}[TESTE 4] Simular vaga liberada (vaga 5)${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  
  PAYLOAD="{\"vagaId\": 5, \"occupied\": false, \"parkingLotId\": \"$PARKING_LOT_ID\", \"device\": \"esp32-parking-01\", \"timestamp\": $(date +%s)000}"
  
  echo -e "${YELLOW}Enviando:${NC}"
  echo "  Tópico:  parking/spots/5"
  echo "  Payload: $PAYLOAD"
  echo ""
  
  mosquitto_pub -h "$BROKER" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" \
    -t "parking/spots/5" -m "$PAYLOAD"
  
  echo -e "${GREEN}✅ Enviado${NC}"
}

test_simular_entrada() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}[TESTE 5] Simular ENTRADA de carro${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  
  PAYLOAD="{\"event\": \"entry\", \"timestamp\": $(date +%s)000, \"parkingLotId\": \"$PARKING_LOT_ID\", \"device\": \"esp32-parking-01\", \"vagasDisponiveis\": 10}"
  
  echo -e "${YELLOW}Enviando:${NC}"
  echo "  Tópico:  parking/events/entry"
  echo "  Payload: $PAYLOAD"
  echo ""
  
  mosquitto_pub -h "$BROKER" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" \
    -t "parking/events/entry" -m "$PAYLOAD"
  
  echo -e "${GREEN}✅ Enviado${NC}"
  echo ""
  echo "Esperado no ESP32:"
  echo "  [ENTRADA] 🚗 Carro detectado!"
  echo "  [Servo Entrada] Movendo para 0° (ABERTO)"
  echo "  [Servo Entrada] ⏱️ Timeout - Fechando..."
}

test_simular_saida() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}[TESTE 6] Simular SAÍDA de carro${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  
  PAYLOAD="{\"event\": \"exit\", \"timestamp\": $(date +%s)000, \"parkingLotId\": \"$PARKING_LOT_ID\", \"device\": \"esp32-parking-01\", \"vagasDisponiveis\": 11}"
  
  echo -e "${YELLOW}Enviando:${NC}"
  echo "  Tópico:  parking/events/exit"
  echo "  Payload: $PAYLOAD"
  echo ""
  
  mosquitto_pub -h "$BROKER" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" \
    -t "parking/events/exit" -m "$PAYLOAD"
  
  echo -e "${GREEN}✅ Enviado${NC}"
  echo ""
  echo "Esperado no ESP32:"
  echo "  [SAÍDA] 🚗 Carro detectado!"
  echo "  [Servo Saída] Movendo para 0° (ABERTO)"
  echo "  [Servo Saída] ⏱️ Timeout - Fechando..."
}

test_subscribe_topics() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}[TESTE 7] Monitorar tópicos em tempo real${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  
  echo -e "${YELLOW}Aguardando mensagens (Ctrl+C para parar):${NC}"
  echo ""
  
  mosquitto_sub -h "$BROKER" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" \
    -t "parking/#" \
    -F "%Y-%m-%d %H:%M:%S | %t | %p" 2>/dev/null || true
}

# ============================================================
#  MENU INTERATIVO
# ============================================================

main() {
  clear
  echo -e "${BLUE}════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}     Smart Parking ESP32 — TESTE RÁPIDO       ${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${YELLOW}Configuração:${NC}"
  echo "  Broker:     $BROKER:$PORT"
  echo "  Username:   $USERNAME"
  echo "  Parking ID: $PARKING_LOT_ID"
  echo ""
  
  while true; do
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo "MENU DE TESTES"
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo "1 - Verificar conexão MQTT"
    echo "2 - Atualizar vagas disponíveis (backend → ESP32)"
    echo "3 - Simular mudança de vaga (ESP32 → backend)"
    echo "4 - Simular vaga liberada"
    echo "5 - Simular ENTRADA de carro"
    echo "6 - Simular SAÍDA de carro"
    echo "7 - Monitorar tópicos em tempo real"
    echo "8 - Executar sequência completa"
    echo "0 - Sair"
    echo ""
    echo -n "Escolha uma opção: "
    read -r OPCAO
    
    case "$OPCAO" in
      1) test_mqtt_connection ;;
      2) test_update_vagas ;;
      3) test_simular_vaga_ocupada ;;
      4) test_simular_vaga_livre ;;
      5) test_simular_entrada ;;
      6) test_simular_saida ;;
      7) test_subscribe_topics ;;
      8)
        echo ""
        echo -e "${YELLOW}Executando sequência completa...${NC}"
        echo ""
        test_mqtt_connection && \
        test_update_vagas && \
        sleep 2 && \
        test_simular_vaga_ocupada && \
        sleep 2 && \
        test_simular_entrada && \
        sleep 4 && \
        test_simular_vaga_livre && \
        sleep 2 && \
        test_simular_saida
        echo ""
        echo -e "${GREEN}✅ Sequência completa!${NC}"
        ;;
      0)
        echo ""
        echo -e "${GREEN}Encerrando...${NC}"
        exit 0
        ;;
      *)
        echo -e "${RED}❌ Opção inválida${NC}"
        ;;
    esac
    
    echo ""
    echo "Pressione ENTER para continuar..."
    read -r
    clear
  done
}

# Verifica se mosquitto_pub/sub estão instalados
if ! command -v mosquitto_pub &> /dev/null; then
  echo -e "${RED}❌ ERRO: mosquitto-clients não instalado${NC}"
  echo ""
  echo "Instale com:"
  echo "  Ubuntu/Debian: sudo apt-get install mosquitto-clients"
  echo "  macOS:         brew install mosquitto"
  echo "  Fedora:        sudo dnf install mosquitto"
  exit 1
fi

main
