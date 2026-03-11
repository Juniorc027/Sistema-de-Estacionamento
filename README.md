# ParkingSystem IoT

Sistema de estacionamento inteligente com monitoramento em tempo real.

**ESP32** → **MQTT** → **Backend .NET 8** → **SignalR** → **Frontend Next.js 14 (3D)**

## Estrutura

```
├── api/          Backend .NET 8 (Clean Architecture)
├── app/          Frontend Next.js 14 (React Three Fiber)
├── esp32/        ESP32 firmware (MQTT)  
├── infra/        Mosquitto config
├── scripts/      dev-up, rebuild, clean
├── docs/         Documentação
└── docker-compose.yml
```

## Quick Start

```bash
cp .env.example .env
./scripts/dev-up.sh
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5167 |
| Swagger | http://localhost:5167/swagger |

## Comandos úteis

```bash
./scripts/dev-up.sh              # subir tudo
./scripts/dev-up.sh --no-cache   # rebuild sem cache
./scripts/rebuild-clean.sh       # rebuild forçado completo
./scripts/docker-clean-cache.sh  # limpar cache docker
docker compose logs -f           # ver logs
docker compose down              # derrubar
```

## Docs

- [Arquitetura](docs/architecture.md)
- [Guia Docker](docs/docker-guide.md)
