# Arquitetura — ParkingSystem IoT

## Visão Geral

```
ESP32 (sensores) → MQTT (Mosquitto) → Backend .NET 8 → SignalR → Frontend Next.js 14 (3D)
```

## Camadas do Backend (Clean Architecture)

```
src/
├── API/              → Controllers, Hubs, Middleware (entrada HTTP/SignalR)
├── Application/      → Services, DTOs, Validators (lógica de negócio)
├── Domain/           → Entities, Enums, Interfaces (núcleo do domínio)
└── Infrastructure/   → Repositories, Data, Migrations, MQTT (acesso a dados)
```

## Fluxo de Dados

1. **ESP32** publica status da vaga via MQTT (`parking/spots/{id}`)
2. **Mosquitto** broker recebe e distribui
3. **Backend** (`MqttService`) escuta e processa a mensagem
4. **MqttToSignalRHandler** repassa em tempo real via SignalR
5. **Frontend** (React Three Fiber) atualiza a vaga 3D instantaneamente

## Tecnologias

| Camada | Stack |
|--------|-------|
| IoT | ESP32, MQTT |
| Broker | Eclipse Mosquitto 2 |
| Backend | .NET 8, EF Core, SignalR, FluentValidation |
| Frontend | Next.js 14, React Three Fiber, TailwindCSS |
| Database | MySQL 8 |
| Deploy | Docker Compose |
