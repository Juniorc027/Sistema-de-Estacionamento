#!/usr/bin/env bash
# ============================================================
#  dev-up.sh — Sobe todos os serviços do ParkingSystem
#
#  Uso:
#    ./scripts/dev-up.sh              # build normal + up
#    ./scripts/dev-up.sh --no-cache   # build sem cache + up
#    ./scripts/dev-up.sh --with-tools # inclui Adminer
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# ── Cores ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERRO]${NC}  $*"; }

# ── Carregar .env ────────────────────────────────────────────
if [[ -f .env ]]; then
    info "Carregando .env"
    set -a; source .env; set +a
else
    warn ".env não encontrado — usando defaults."
    warn "Copie: cp .env.example .env"
fi

# ── Argumentos ───────────────────────────────────────────────
NO_CACHE=false; WITH_TOOLS=false
for arg in "$@"; do
    case "$arg" in
        --no-cache)   NO_CACHE=true ;;
        --with-tools) WITH_TOOLS=true ;;
        -h|--help)
            echo "Uso: $0 [--no-cache] [--with-tools]"
            echo "  --no-cache    Build completo sem cache Docker"
            echo "  --with-tools  Inclui Adminer (profile tools)"
            exit 0 ;;
        *) error "Argumento desconhecido: $arg"; exit 1 ;;
    esac
done

# ── Detectar docker compose ─────────────────────────────────
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    DC="docker compose"
elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
else
    error "Docker Compose não encontrado. Instale Docker Desktop ou compose plugin v2."
    exit 1
fi
info "Usando: $DC"

PROFILES=""
[[ "$WITH_TOOLS" == true ]] && PROFILES="--profile tools" && info "Perfil: tools (Adminer)"

# ── Build ────────────────────────────────────────────────────
echo ""
info "========================================="
info "  ParkingSystem — Docker Up"
info "========================================="
echo ""

if [[ "$NO_CACHE" == true ]]; then
    warn "Modo --no-cache: rebuild completo"
    $DC $PROFILES build --no-cache --build-arg CACHEBUST="$(date +%s)"
    ok "Build sem cache concluído"
else
    info "Build padrão (com cache)..."
fi

# ── Up ───────────────────────────────────────────────────────
info "Subindo serviços..."
$DC $PROFILES up --build -d --remove-orphans

echo ""
ok "========================================="
ok "  Serviços iniciando!"
ok "========================================="
echo ""
info "Backend   → http://localhost:${BACKEND_PORT:-5167}"
info "Frontend  → http://localhost:${FRONTEND_PORT:-3000}"
info "Swagger   → http://localhost:${BACKEND_PORT:-5167}/swagger"
info "MySQL     → localhost:${MYSQL_PORT:-3306}"
info "MQTT      → localhost:${MQTT_PORT:-1883}"
[[ "$WITH_TOOLS" == true ]] && info "Adminer   → http://localhost:${ADMINER_PORT:-8080}"
echo ""
info "Logs:       $DC logs -f"
info "Status:     $DC ps"
info "Derrubar:   $DC down"
echo ""
