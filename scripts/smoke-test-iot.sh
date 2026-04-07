#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5167}"
MQTT_HOST="${MQTT_HOST:-127.0.0.1}"
MQTT_PORT="${MQTT_PORT:-1884}"
MQTT_USER="${MQTT_USER:-parking_iot}"
MQTT_PASS="${MQTT_PASS:-ParkingIot@2026}"
PARKING_LOT_ID="${PARKING_LOT_ID:-45fc18f2-bdd8-4b11-b964-f8face1147f0}"

SPOT_A=7
SPOT_B=22

log() {
  printf '\n[SMOKE] %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[SMOKE][ERRO] Comando obrigatório não encontrado: $1"
    exit 1
  fi
}

get_spot_status() {
  local spot_number
  spot_number=$(printf "%03d" "$1")

  curl -fsS "${API_URL}/api/ParkingSpots/by-lot/${PARKING_LOT_ID}" \
    | python3 -c 'import json,sys
payload=json.load(sys.stdin)
spots=payload.get("data", []) if isinstance(payload, dict) else payload
spot_number=sys.argv[1]
for s in spots:
    if s.get("spotNumber")==spot_number:
        print(str(s.get("status","")))
        break
else:
    print("")' "$spot_number"
}

wait_status() {
  local spot_id="$1"
  local expected="$2"
  local tries=12

  for _ in $(seq 1 "$tries"); do
    current="$(get_spot_status "$spot_id")"
    if [[ "$current" == "$expected" ]]; then
      echo "[SMOKE] Vaga $(printf "%03d" "$spot_id") = $current"
      return 0
    fi
    sleep 1
  done

  echo "[SMOKE][ERRO] Timeout aguardando vaga $(printf "%03d" "$spot_id") = $expected"
  echo "[SMOKE][ERRO] Último status lido: ${current:-<vazio>}"
  return 1
}

publish_mqtt() {
  local topic="$1"
  local payload="$2"

  mosquitto_pub \
    -h "$MQTT_HOST" \
    -p "$MQTT_PORT" \
    -u "$MQTT_USER" \
    -P "$MQTT_PASS" \
    -t "$topic" \
    -m "$payload"
}

main() {
  require_cmd curl
  require_cmd mosquitto_pub
  require_cmd python3

  log "Validando saúde da API"
  curl -fsS "${API_URL}/health" >/dev/null
  echo "[SMOKE] API saudável em ${API_URL}"

  log "Publicando tópico oficial parking/spots/7 -> ocupada"
  publish_mqtt "parking/spots/${SPOT_A}" "{\"vagaId\":${SPOT_A},\"status\":\"ocupada\",\"parkingLotId\":\"${PARKING_LOT_ID}\",\"device\":\"smoke-test\",\"uptime_s\":101}"
  wait_status "$SPOT_A" "Occupied"

  log "Publicando tópico legado parking/exit -> livre (vaga 7)"
  publish_mqtt "parking/exit" "{\"vagaId\":${SPOT_A},\"status\":\"livre\",\"parkingLotId\":\"${PARKING_LOT_ID}\",\"device\":\"smoke-test\",\"uptime_s\":102}"
  wait_status "$SPOT_A" "Free"

  log "Publicando tópico oficial parking/spots/22 -> ocupada"
  publish_mqtt "parking/spots/${SPOT_B}" "{\"vagaId\":${SPOT_B},\"status\":\"ocupada\",\"parkingLotId\":\"${PARKING_LOT_ID}\",\"device\":\"smoke-test\",\"uptime_s\":103}"
  wait_status "$SPOT_B" "Occupied"

  log "Smoke test concluído com sucesso"
}

main "$@"
