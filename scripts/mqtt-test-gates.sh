#!/bin/bash

# ============================================================
#  Smart Gate Control — MQTT Test Script
# ============================================================
#
# Este script automatiza testes via MQTT sem a necessidade
# de usar o Dashboard. Útil para validação rápida.
#
# USO:
#   chmod +x mqtt-test-gates.sh
#   ./mqtt-test-gates.sh
#
# ============================================================

set -e

# Configurações
MQTT_BROKER="192.168.0.10"
MQTT_PORT="1883"
TOPIC_SNAPSHOT="parking/spots/snapshot"
TOPIC_ENTRY="parking/entry"
TOPIC_EXIT="parking/exit"
PARKING_LOT_ID="45fc18f2-bdd8-4b11-b964-f8face1147f0"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# FUNÇÕES
# ============================================================

print_header() {
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

wait_for_input() {
    print_warning "$1"
    read -p "Pressione ENTER quando pronto..."
}

publish_snapshot() {
    local total=$1
    local occupied=$2
    local available=$3
    
    payload="{\"totalSpots\":$total,\"occupiedSpots\":$occupied,\"availableSpots\":$available}"
    
    print_info "Publicando snapshot: Total=$total Ocupadas=$occupied Livres=$available"
    mosquitto_pub -h "$MQTT_BROKER" -p "$MQTT_PORT" -t "$TOPIC_SNAPSHOT" -m "$payload"
    print_success "Publicado!"
}

monitor_mqtt() {
    print_info "Monitorando todos os tópicos (Ctrl+C para parar)..."
    mosquitto_sub -h "$MQTT_BROKER" -p "$MQTT_PORT" -t "parking/#" -v
}

# ============================================================
# MENU PRINCIPAL
# ============================================================

show_menu() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Smart Gate Control — MQTT Test Menu         ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC}"
    echo -e "${BLUE}║  1${NC}) Monitor MQTT (todos os tópicos)"
    echo -e "${BLUE}║  2${NC}) Teste Entrada com Vagas"
    echo -e "${BLUE}║  3${NC}) Teste Entrada SEM Vagas"
    echo -e "${BLUE}║  4${NC}) Teste Saída"
    echo -e "${BLUE}║  5${NC}) Teste Simulação Completa (Entrada + Saída)"
    echo -e "${BLUE}║  6${NC}) Publicar Snapshot Customizado"
    echo -e "${BLUE}║  0${NC}) Sair"
    echo -e "${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
}

# ============================================================
# TESTES
# ============================================================

test_entry_with_spots() {
    print_header "TESTE 1: Entrada COM Vagas Disponíveis"
    
    print_info "Etapa 1: Publicar snapshot com 5 vagas livres"
    publish_snapshot 20 15 5
    sleep 2
    
    print_warning "Etapa 2: Ativar sensor IR de entrada na ESP32"
    print_info "→ Coloque um objeto em frente ao sensor IR de entrada"
    print_info "→ Mantenha por 3 segundos"
    read -p "Pressione ENTER quando ativar o sensor..."
    
    print_info "Aguardando resposta da ESP32..."
    print_info "Esperado: Servo abre (0°) → Sensor deixa de detectar → Servo fecha (90°)"
    sleep 5
    
    print_warning "Etapa 3: Verificar MQTT"
    print_info "Esperado em: parking/entry"
    print_info "Esperado: evento com parkingLotId e timestamp"
    
    read -p "Pressione ENTER para continuar..."
    print_success "Teste 1 Concluído!"
}

test_entry_without_spots() {
    print_header "TESTE 2: Entrada SEM Vagas (Estacionamento Lotado)"
    
    print_info "Etapa 1: Publicar snapshot com 0 vagas livres"
    publish_snapshot 20 20 0
    sleep 2
    
    print_warning "Etapa 2: Ativar sensor IR de entrada na ESP32"
    print_info "→ Coloque um objeto em frente ao sensor IR de entrada"
    print_info "→ Mantenha por 5 segundos"
    read -p "Pressione ENTER quando ativar o sensor..."
    
    print_info "Aguardando resposta da ESP32..."
    print_info "Esperado: Servo NÃO abre (permanece 90°)"
    print_info "Serial deve mostrar: '❌ Estacionamento LOTADO!'"
    sleep 5
    
    print_success "Teste 2 Concluído!"
}

test_exit() {
    print_header "TESTE 3: Saída (Fluxo Livre)"
    
    print_info "Etapa 1: Publicar snapshot com algumas vagas"
    publish_snapshot 20 10 10
    sleep 2
    
    print_warning "Etapa 2: Ativar sensor IR de saída na ESP32"
    print_info "→ Coloque um objeto em frente ao sensor IR de saída"
    print_info "→ Mantenha por 3 segundos"
    read -p "Pressione ENTER quando ativar o sensor..."
    
    print_info "Aguardando resposta da ESP32..."
    print_info "Esperado: Servo abre (0°) → Sensor deixa de detectar → Servo fecha (90°)"
    sleep 5
    
    print_warning "Etapa 3: Verificar MQTT"
    print_info "Esperado em: parking/exit"
    print_info "Esperado: evento com parkingLotId e timestamp"
    
    read -p "Pressione ENTER para continuar..."
    print_success "Teste 3 Concluído!"
}

test_full_simulation() {
    print_header "TESTE 4: Simulação Completa (Entrada → Saída)"
    
    print_info "Etapa 1: Publicar snapshot inicial"
    publish_snapshot 20 10 10
    sleep 2
    
    print_warning "Etapa 2: ENTRADA - Ativar sensor IR de entrada"
    print_info "→ Coloque objeto no IR de entrada por 3 segundos"
    read -p "Pressione ENTER..."
    sleep 5
    print_success "Entrada concluída!"
    
    sleep(2)
    
    print_warning "Etapa 3: SAÍDA - Ativar sensor IR de saída"
    print_info "→ Coloque objeto no IR de saída por 3 segundos"
    read -p "Pressione ENTER..."
    sleep 5
    print_success "Saída concluída!"
    
    print_info "Esperado no MQTT:"
    print_info "  1️⃣  parking/entry"
    print_info "  2️⃣  parking/exit"
    print_info "  3️⃣  parking/device/status (a cada 15s)"
    
    read -p "Pressione ENTER para continuar..."
    print_success "Teste 4 Concluído!"
}

test_custom_snapshot() {
    print_header "TESTE: Publicar Snapshot Customizado"
    
    echo ""
    echo -e "${YELLOW}Configuração de Vagas${NC}"
    read -p "Total de vagas (padrão 20): " total
    total=${total:-20}
    
    read -p "Vagas ocupadas (padrão 15): " occupied
    occupied=${occupied:-15}
    
    local available=$((total - occupied))
    
    print_info "Total: $total"
    print_info "Ocupadas: $occupied"
    print_info "Livres: $available"
    
    read -p "Confirma (S/n)? " confirm
    if [[ "$confirm" != "n" && "$confirm" != "N" ]]; then
        publish_snapshot $total $occupied $available
    else
        print_warning "Cancelado"
    fi
}

# ============================================================
# MAIN LOOP
# ============================================================

main() {
    print_header "Smart Gate Control — MQTT Test Automation"
    
    print_info "MQTT Broker: $MQTT_BROKER:$MQTT_PORT"
    print_info "Parking Lot ID: $PARKING_LOT_ID"
    
    # Verificar conectividade
    print_info "Verificando conectividade ao broker..."
    if ! mosquitto_pub -h "$MQTT_BROKER" -p "$MQTT_PORT" -t "test" -m "ping" 2>/dev/null; then
        print_error "Não consegui conectar ao broker MQTT!"
        print_error "Verifique se mosquitto está instalado e o broker está rodando"
        exit 1
    fi
    print_success "Conectado ao broker!"
    
    while true; do
        show_menu
        read -p "Escolha uma opção: " choice
        
        case $choice in
            1)
                monitor_mqtt
                ;;
            2)
                test_entry_with_spots
                ;;
            3)
                test_entry_without_spots
                ;;
            4)
                test_exit
                ;;
            5)
                test_full_simulation
                ;;
            6)
                test_custom_snapshot
                ;;
            0)
                print_success "Encerrando..."
                exit 0
                ;;
            *)
                print_error "Opção inválida"
                ;;
        esac
        
        echo ""
    done
}

# ============================================================
# Executar
# ============================================================

main "$@"
