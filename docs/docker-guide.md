# Guia Docker — ParkingSystem

## Subir pela primeira vez

```bash
cp .env.example .env    # editar senhas se necessário
./scripts/dev-up.sh
```

Com Adminer (admin do banco):

```bash
./scripts/dev-up.sh --with-tools
```

## URLs

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:3000 |
| Backend / Swagger | http://localhost:5167 |
| Health | http://localhost:5167/health |
| SignalR Hub | http://localhost:5167/hubs/parking |
| MySQL | localhost:3306 |
| MQTT | localhost:1883 |
| Adminer | http://localhost:8080 |

## Rebuild limpo (2 formas)

### Forma 1 — `--no-cache`

```bash
./scripts/dev-up.sh --no-cache
```

### Forma 2 — Rebuild forçado total

```bash
./scripts/rebuild-clean.sh
```

Down → prune builder → build sem cache → up.

## Limpar cache Docker

```bash
# Seguro: builder + imagens dangling (NÃO toca volumes)
./scripts/docker-clean-cache.sh

# Nuclear: remove TUDO incluindo volumes (pede confirmação)
./scripts/docker-clean-cache.sh --prune-all
```

## Logs e Health

```bash
docker compose logs -f              # todos
docker compose logs -f backend      # específico
docker compose ps                   # status
docker inspect --format='{{.State.Health.Status}}' parking-backend
```

## Derrubar

```bash
docker compose down                              # preserva volumes
docker compose down --volumes                    # APAGA dados do banco
docker compose down --rmi local --remove-orphans # + remove imagens
```

## Por que erros antigos persistem (cache)

O Docker cacheia camadas. Se o código mudou mas o hash da camada anterior não foi invalidado, a imagem servida ainda contém o bug antigo.

**Soluções:**

1. `--no-cache` no build
2. `CACHEBUST` build-arg (automatizado nos scripts)
3. `docker builder prune -af` para limpar cache acumulado

Os Dockerfiles deste projeto usam ordem otimizada: copiam `package.json`/`.csproj` primeiro (cache de deps) e código depois (invalida build quando muda).
