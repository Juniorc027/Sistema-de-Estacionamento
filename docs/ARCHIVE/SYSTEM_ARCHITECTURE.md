# Parking System — Análise Completa de Arquitetura

**Data:** 7 de abril de 2026  
**Status:** Em produção com atualizações recentes  
**Branch:** feat/checkpoint-alteracoes-2026-04-07

---

## 1. VISÃO GERAL DA ARQUITETURA

### Fluxo de Dados Completo
```
ESP32 (IoT, MCP23017) 
  ↓ MQTT (TLS opcional)
  ↓
Mosquitto Broker (1883 + WebSocket 9001)
  ↓ Autenticado (parking_iot / ParkingIot@2026)
  ↓
Backend .NET 8 (Clean Architecture)
  ├─ MqttService (MQTTnet client)
  ├─ MqttToSignalRHandler (processamento de eventos)
  ├─ ParkingHub (SignalR)
  └─ MySQL 8 (persistência)
  ↓ SignalR (WebSocket)
  ↓
Frontend Next.js 14
  ├─ React Three Fiber (3D Canvas)
  ├─ SignalR Client
  ├─ Sidebar colapsável (relatórios)
  └─ Dashboard 2D/3D
```

### Tecnologias por Camada

| Camada | Tecnologia | Versão | Responsabilidade |
|--------|-----------|--------|-----------------|
| **IoT** | ESP32, MCP23017 | Arduino | Leitura de sensores IR, publicação MQTT |
| **Messaging** | Mosquitto, MQTT | 2.x / 3.1.1 | Broker seguro com autenticação ACL |
| **Backend** | .NET 8, ASP.NET Core, SignalR | 8.0 | API REST, processamento MQTT, tempo real |
| **Database** | MySQL | 8.0 | Persistência de estacionamento, histórico |
| **Frontend** | Next.js 14, React, TypeScript | 14.2.5 / 18.3.1 | UI 3D/2D, tempo real, relatórios |

---

## 2. BACKEND .NET 8 (Clean Architecture)

### Estrutura de Pastas

```
api/
├── src/
│   ├── API/
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs           # Autenticação JWT
│   │   │   ├── ParkingSpotsController.cs   # CRUD vagas
│   │   │   ├── ParkingLotsController.cs    # CRUD estacionamentos
│   │   │   ├── ParkingSessionsController.cs
│   │   │   ├── PaymentsController.cs
│   │   │   ├── ReportsController.cs
│   │   │   └── VehicleEntriesController.cs
│   │   ├── Hubs/
│   │   │   └── ParkingHub.cs               # SignalR hub (grupos por lote)
│   │   ├── Services/
│   │   │   └── MqttToSignalRHandler.cs     # Handler MQTT → SignalR
│   │   ├── Middleware/
│   │   │   └── GlobalExceptionMiddleware.cs
│   │   ├── Program.cs                       # DI, middlewares, SignalR config
│   │   └── appsettings*.json
│   ├── Application/
│   │   ├── Services/
│   │   │   ├── Interfaces/
│   │   │   │   └── IParkingSpotService.cs
│   │   │   └── ParkingSpotService.cs
│   │   ├── DTOs/
│   │   │   ├── ParkingSpot/
│   │   │   ├── ParkingLot/
│   │   │   ├── ParkingSession/
│   │   │   ├── Payment/
│   │   │   ├── Report/
│   │   │   ├── VehicleEntry/
│   │   │   └── Auth/
│   │   ├── Validators/
│   │   │   └── OtherValidators.cs          # FluentValidation
│   │   ├── Common/
│   │   │   └── ApiResponse.cs              # Wrapper padrão
│   │   ├── DependencyInjection.cs
│   │   └── ParkingSystem.Application.csproj
│   ├── Domain/
│   │   ├── Entities/
│   │   │   ├── BaseEntity.cs
│   │   │   ├── ParkingLot.cs
│   │   │   ├── ParkingSpot.cs
│   │   │   ├── ParkingSession.cs
│   │   │   ├── VehicleEntry.cs
│   │   │   ├── Payment.cs
│   │   │   ├── User.cs
│   │   │   └── SystemLog.cs
│   │   ├── Enums/
│   │   │   ├── ParkingSpotStatus.cs
│   │   │   ├── SessionStatus.cs
│   │   │   ├── PaymentStatus.cs
│   │   │   └── VehicleEntryStatus.cs
│   │   ├── Interfaces/
│   │   ├── ParkingSystem.Domain.csproj
│   │   └── bin/obj/
│   ├── Infrastructure/
│   │   ├── Services/
│   │   │   └── MqttService.cs              # Cliente MQTT com reconnect
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs             # EF Core DbContext
│   │   │   ├── DataSeeder.cs               # Seed inicial
│   │   │   └── Configurations/
│   │   ├── Repositories/
│   │   ├── Migrations/
│   │   ├── UnitOfWork.cs
│   │   ├── DependencyInjection.cs
│   │   └── ParkingSystem.Infrastructure.csproj
│   └── ParkingSystem.sln
├── Dockerfile
└── .dockerignore
```

### Principais Classes e Responsabilidades

#### **Program.cs** (Startup + DI)
- Configura Serilog (logs console + arquivo rollers)
- Registra serviços de Application + Infrastructure
- Configura JWT Bearer authentication
- Adiciona CORS permitindo `http://localhost:3000` com credenciais (SignalR)
- Mapeia SignalR Hub em `/hubs/parking`
- Registra `MqttToSignalRHandler` como `IMqttMessageHandler`
- Executa `DataSeeder.SeedAsync()` na inicialização
- Inicia `IMqttService.StartAsync()` em background

#### **MqttService.cs** (Infrastructure/Services)
**Responsabilidades:**
- Conexão permanente com Mosquitto via MQTTnet
- Reconexão automática com lock (SemaphoreSlim) para evitar race conditions
- Inscrição em tópicos:
  - `parking/spots/+` (padrão oficial)
  - `parking/entry` (compatibilidade legada)
  - `parking/exit` (compatibilidade legada)
- Construcción de opções com suporte a autenticação e TLS
- Callback `HandleMessageAsync` que delega para `IMqttMessageHandler`

**Métodos Principais:**
- `StartAsync()` — Inicia conexão e loop de reconexão
- `StopAsync()` — Desconecta gracefully
- `PublishAsync(topic, payload)` — Publica mensagem com QoS 1
- `EnsureConnectedAsync()` — Loop de reconnect com backoff 3s
- `SubscribeTopicsAsync()` — Inscreve em todos os tópicos

**Configuração MQTT:**
```csharp
broker: mosquitto (nome DNS do container)
port: 1883
clientId: parking-backend-docker
username: parking_iot
password: ParkingIot@2026
keepAlivePeriod: 20s
timeout: 10s
```

#### **MqttToSignalRHandler.cs** (API/Services)
**Responsabilidades:**
- Parse de mensagens MQTT em JSON
- Resolução de `vagaId` (ID da vaga) via regex no tópico ou payload
- Normalização de status (`ocupada/occupied` → `Occupied`, etc)
- Chamada para `IParkingSpotService.UpdateStatusAsync()` para persistência DB
- Broadcast via SignalR para grupo específico do estacionamento

**Fluxo:**
1. Recebe `topic` e `payload` (JSON)
2. Deserializa `MqttSpotMessage`:
   - `vagaId: int`
   - `status: string`
   - `parkingLotId: Guid`
   - `device: string`
   - `uptime_s: int`
3. Regex match em `parking/spots/(?<id>\d+)` para extrair ID
4. Atualiza status no DB via `spotService.UpdateStatusAsync(parkingLotId, spotNumber, newStatus)`
5. Envia evento `SpotUpdated` para SignalR hub (grupo específico do lote)

#### **ParkingHub.cs** (API/Hubs)
**Métodos SignalR:**
- `JoinParkingLot(Guid parkingLotId)` — Cliente se une ao grupo `parking-lot:{parkingLotId}`
- `LeaveParkingLot(Guid parkingLotId)` — Cliente sai do grupo
- `NotifySpotUpdated(SpotUpdatedDto)` — Broadcast para o grupo (chamado pelo handler MQTT)
- `OnConnectedAsync()` / `OnDisconnectedAsync()` — Lifecycle hooks

**Grupo Format:** `parking-lot:{parkingLotId}` (ex: `parking-lot:45fc18f2-bdd8-4b11-b964-f8face1147f0`)

**DTO Enviado (SpotUpdatedDto):**
```csharp
record SpotUpdatedDto(
    Guid ParkingLotId,
    Guid SpotId,
    string SpotNumber,      // "001", "002", etc
    ParkingSpotStatus Status, // Free, Occupied, Reserved, Maintenance
    DateTime Timestamp
);
```

#### **ParkingSpotService.cs** (Application/Services)
**Métodos:**

| Método | Descrição |
|--------|-----------|
| `GetByParkingLotAsync(parkingLotId)` | Retorna todas as vagas de um lote (não deletadas) |
| `GetByIdAsync(spotId)` | Retorna vaga por ID |
| `GetByLotAndSpotNumberAsync(parkingLotId, spotNumber)` | Busca por lote + número (ex: "001") |
| `UpdateStatusAsync(parkingLotId, spotNumber, status)` | **Usado pelo MQTT Handler** — atualiza e persiste |
| `CreateAsync(request)` | Cria novo vaga |
| `DeleteAsync(spotId)` | Soft delete |

**Persistência:**
- Normaliza `SpotNumber` para 3 dígitos (`"1"` → `"001"`)
- Atualiza `UpdatedAt = DateTime.UtcNow`
- Log de mudança de status

#### **ParkingSpotsController.cs** (API/Controllers)
- `GET /api/parkingspots/by-lot/{parkingLotId}` — **Público (AllowAnonymous)** — usado pelo frontend
- `GET /api/parkingspots/{id}` — Requer autenticação
- `POST /api/parkingspots` — Criar vaga (Requer `Admin`)
- `DELETE /api/parkingspots/{id}` — Deletar vaga (Requer `Admin`)

### DTOs Principais

#### **ParkingSpotResponseDto**
```csharp
public record ParkingSpotResponseDto(
    Guid Id,
    string SpotNumber,           // "001", "002", etc
    ParkingSpotStatus Status,    // Free, Occupied, Reserved, Maintenance
    string StatusDescription,    // "Livre", "Ocupada", etc
    Guid ParkingLotId,
    string ParkingLotName,
    DateTime CreatedAt
);
```

#### **CreateParkingSpotDto**
```csharp
public class CreateParkingSpotDto
{
    public string SpotNumber { get; set; }
    public Guid ParkingLotId { get; set; }
}
// Validação: SpotNumber deve estar entre "001" e "022"
```

#### **MqttSpotMessage** (interno)
```csharp
public sealed class MqttSpotMessage
{
    public int VagaId { get; set; }
    public string Status { get; set; }
    public Guid ParkingLotId { get; set; }
    public string Device { get; set; }
    public int Uptime_s { get; set; }
}
```

---

## 3. BANCO DE DADOS (MySQL)

### Tabelas Principais

#### **parking_lots**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CHAR(36) | UUID primária |
| name | VARCHAR(255) | Nome do estacionamento |
| address | TEXT | Endereço |
| total_spots | INT | Total de vagas |
| hourly_rate | DECIMAL(10,2) | Taxa por hora |
| is_active | BOOLEAN | Ativo ou não |
| created_at | DATETIME | Criação |
| updated_at | DATETIME | Última atualização |
| is_deleted | BOOLEAN | Soft delete |

**Exemplo de seed:**
- `id`: `45fc18f2-bdd8-4b11-b964-f8face1147f0`
- `name`: `Estacionamento Central`
- `total_spots`: `20` (NOTA: DataSeeder usa `TotalSeedSpots = 20`, mas firmware ESP32 usa 22)
- `hourly_rate`: `5.00`

#### **parking_spots**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CHAR(36) | UUID primária |
| spot_number | VARCHAR(10) | "001", "002", etc |
| status | INT | 0=Free, 1=Occupied, 2=Reserved, 3=Maintenance |
| parking_lot_id | CHAR(36) | FK → parking_lots |
| created_at | DATETIME | Criação |
| updated_at | DATETIME | Última atualização (atualizado pelo MQTT) |
| is_deleted | BOOLEAN | Soft delete |

**Índices:**
- `(parking_lot_id, spot_number)` — Busca rápida por lote + número
- `(status)` — Filtro por status

**Alinhamento:** Seeding cria 20 vagas (001-020), mas ESP32 tenta enviar 22 (001-022). **INCONSISTÊNCIA CRÍTICA**.

#### **parking_sessions**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CHAR(36) | UUID |
| vehicle_entry_id | CHAR(36) | FK → vehicle_entries |
| parking_spot_id | CHAR(36) | FK → parking_spots |
| start_time | DATETIME | Entrada |
| end_time | DATETIME | Saída (NULL se ativo) |
| duration | TIME | Tempo de permanência |
| total_amount | DECIMAL(10,2) | Valor cobrado |
| status | INT | 0=Active, 1=Completed, 2=Cancelled |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| is_deleted | BOOLEAN | |

**Histórico de Ocupação:**
- Cada sessão é um registro com inicio/fim
- Permite análise de tempo médio de permanência, ocupação por hora, etc

#### **vehicle_entries**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CHAR(36) | UUID |
| license_plate | VARCHAR(20) | Placa do veículo |
| entry_time | DATETIME | Hora de entrada |
| status | INT | 0=Pending, 1=Confirmed, 2=Exited |
| parking_lot_id | CHAR(36) | FK → parking_lots |
| parking_session_id | CHAR(36) | FK → parking_sessions (1-to-1) |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| is_deleted | BOOLEAN | |

#### **payments**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CHAR(36) | UUID |
| parking_session_id | CHAR(36) | FK → parking_sessions |
| amount | DECIMAL(10,2) | Valor pago |
| payment_method | VARCHAR(50) | "credit_card", "debit", "cash", etc |
| status | INT | 0=Pending, 1=Completed, 2=Failed |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| is_deleted | BOOLEAN | |

#### **users**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CHAR(36) | UUID |
| name | VARCHAR(255) | Nome |
| email | VARCHAR(255) | Email (unique) |
| password_hash | VARCHAR(255) | BCrypt hash |
| role | VARCHAR(50) | "Admin", "Operator", "User" |
| is_active | BOOLEAN | Ativo |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| is_deleted | BOOLEAN | |

**Seed:**
- Email: `admin@parkingsystem.com`
- Password: `Admin@123` (hashed)

#### **system_logs$
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CHAR(36) | UUID |
| action | VARCHAR(255) | "SPOT_UPDATED", etc |
| description | TEXT | Detalhes |
| created_at | DATETIME | |
| is_deleted | BOOLEAN | |

### Query Filter Global (Soft Delete)
```csharp
// AppDbContext.OnModelCreating
modelBuilder.Entity<ParkingSpot>().HasQueryFilter(e => !e.IsDeleted);
// Todas as queries automáticamente excluem registros onde IsDeleted = true
```

### Histórico de Movimentação
- **ParkingSessions** armazena cada ocupação com timestamp de entrada/saída
- **VehicleEntries** liga placa do veículo à sessão
- **Payments** registra cobrança
- Permite análise:
  - Tempo médio de permanência (Duration)
  - Ocupação por hora (StartTime, EndTime)
  - Vagas mais utilizadas (aggregação por ParkingSpotId)
  - Receita por período

---

## 4. MQTT E FLUXO DE DADOS

### Tópicos MQTT

#### **Tópico Oficial**
```
parking/spots/{vagaId}
```
- `{vagaId}` = ID numérico da vaga (1-22)
- **QoS:** 1 (At Least Once)
- **Retain:** true (snapshot da última leitura por vaga)
- **Exemplo:** `parking/spots/9`

#### **Tópicos Legados (Compatibilidade)**
```
parking/entry   — Tópico de entrada (status = Occupied)
parking/exit    — Tópico de saída (status = Free)
```

#### **Tópico de Status do Dispositivo**
```
parking/device/{clientId}/status
```
- **Exemplo:** `parking/device/esp32-parking-01/status`
- Publica `"online"` com retain = true na conexão (Last Will)
- Publica `"offline"` como Last Will se desconectar abruptamente

#### **Tópico de Comando (Futuro)**
```
parking/status   — Healthcheck (backend pode publicar respostas)
```

### Formato JSON do Payload (Oficial)

```json
{
  "vagaId": 9,
  "status": "ocupada",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "device": "esp32-parking-01",
  "uptime_s": 12345
}
```

| Campo | Tipo | Exemplo | Descrição |
|-------|------|---------|-----------|
| `vagaId` | int | `9` | ID da vaga (1-22) |
| `status` | string | `"ocupada"` ou `"livre"` | Status ("ocupada", "livre") |
| `parkingLotId` | UUID | `45fc18f2-bdd8-4b11-b964-f8face1147f0` | ID do estacionamento |
| `device` | string | `"esp32-parking-01"` | ID do dispositivo ESP32 |
| `uptime_s` | int | `3600` | Uptime do ESP32 em segundos |

### Fluxo: MQTT → Backend → SignalR

```
1. ESP32 (MCP23017)
   └─> Lê 22 sensores IR (ativa-baixo)
       └─> Publica MQTT em `parking/spots/{id}` com JSON

2. Mosquitto Broker
   └─> Valida autenticação (parking_iot / ParkingIot@2026)
       └─> Valida ACL (permite publish em parking/spots/#)
           └─> Roteia para backend subscriber

3. Backend MqttService
   └─> Recebe via HandleMessageAsync callback
       └─> Delega para MqttToSignalRHandler.HandleAsync()

4. MqttToSignalRHandler
   └─> Deserializa JSON em MqttSpotMessage
       └─> Resolve vagaId (regex do tópico ou payload)
           └─> Resolve status (normaliza ocupada/livre)
               └─> Chama spotService.UpdateStatusAsync()
                   └─> Persiste no DB (ParkingSpots.status, UpdatedAt)
                       └─> Envia SpotUpdatedDto via SignalR hub
                           └─> Broadcast para grupo `parking-lot:45fc18f2-bdd8...`

5. Frontend SignalR Client
   └─> Recebe evento "SpotUpdated"
       └─> Atualiza estado React (setSpots)
           └─> Re-renderiza componente 3D (ParkingLot3D)
               └─> Atualiza cor da vaga (verde/vermelho)
```

### Configuração de Segurança MQTT

**Arquivo: `infra/mqtt/mosquitto.conf`**
```properties
listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous false
password_file /mosquitto/config/passwordfile_local
acl_file /mosquitto/config/aclfile

persistence true
persistence_location /mosquitto/data/
```

**Arquivo: `infra/mqtt/passwordfile_local`**
```
parking_iot:$7$101$W0X1KTF...  # Hash BCrypt do ParkingIot@2026
```

**Arquivo: `infra/mqtt/aclfile`**
```
# Regras ACL
user parking_iot
  publish parking/spots/#
  publish parking/device/+/status
  subscribe parking/status
  subscribe $SYS/#
```

---

## 5. FRONTEND NEXT.JS 14

### Estrutura Principal

```
app/
├── package.json                # framer-motion, lucide-react, @react-three/fiber
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.mjs
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home 3D (integração Sidebar + ReportPanel)
│   │   ├── dashboard-test/
│   │   │   └── page.tsx        # Teste 2D
│   │   ├── globals.css         # Tailwind + estilos globais
│   │   ├── not-found.tsx
│   │   └── parking/
│   │       └── page.tsx        # (futuro)
│   ├── components/
│   │   ├── Effects.tsx
│   │   ├── ParkingLot3D.tsx    # Canvas 3D principal
│   │   ├── ParkingSpot.tsx
│   │   ├── ParkingSpot3D.tsx
│   │   ├── SceneLights.tsx
│   │   ├── ParkingLot2D.tsx    # Teste 2D
│   │   ├── parking/
│   │   │   └── ParkingLot.tsx  # Wrapper dinâmico
│   │   ├── ui/
│   │   │   ├── Sidebar.tsx     # Sidebar colapsável (NEW)
│   │   │   └── ReportPanel.tsx # Painel lateral (NEW)
│   │   ├── Effects.tsx
│   │   ├── SceneLights.tsx
│   ├── hooks/
│   │   └── useSignalR.ts       # Hook de conexão SignalR
│   ├── services/
│   │   ├── api.ts             # Axios wrapper
│   │   └── signalr.ts         # SignalRService (singleton)
│   └── types/
│       └── parking.ts         # Tipos TypeScript
```

### Página Principal 3D (`app/page.tsx`)

**Estado:**
```typescript
const [spots, setSpots] = useState<ParkingSpot[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [selectedReport, setSelectedReport] = useState<ReportId | null>(null);
```

**Fluxo:**
1. `useEffect` → `ApiService.getParkingSpots(PARKING_LOT_ID)` (endpoint: `/api/parkingspots/by-lot/{id}`)
2. `useSignalR(handleSpotUpdated, PARKING_LOT_ID)` → conecta SignalR, se inscreve no hub, ouça "SpotUpdated"
3. `handleSpotUpdated` → normaliza status e atualiza array de vagas via setSpots
4. Renderiza `<ParkingLot spots={spots} />` (dinâmico, SSR=false)
5. Renderiza `<Sidebar selectedReport={selectedReport} onSelectReport={handleSelectReport} />`
6. Renderiza `<ReportPanel reportId={selectedReport} onClose={handleCloseReport} />`
7. Quando painel abre, mapa 3D reduz opacidade (`opacity-75`)

**PARKING_LOT_ID:** `45fc18f2-bdd8-4b11-b964-f8face1147f0`

### SignalR Service (`services/signalr.ts`)

**Singleton Pattern:**
```typescript
export class SignalRService {
  private connection: HubConnection | null = null;
  private joinedParkingLotId: string | null = null;

  async start(): void
  async joinParkingLot(parkingLotId: string): void
  onSpotUpdated(callback: (event: SpotUpdatedEvent) => void): void
  off(eventName: string): void
  async stop(): void
}

export const signalRService = new SignalRService();
```

**Configuração:**
```typescript
const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL || 'http://localhost:5167/hubs/parking';

this.connection = new HubConnectionBuilder()
  .withUrl(HUB_URL)
  .withAutomaticReconnect()  // Reconnect automático
  .build();
```

**Handlers:**
- `onreconnected` → Re-inscreve no grupo do estacionamento

### Hook SignalR (`hooks/useSignalR.ts`)

```typescript
export function useSignalR(
  onSpotUpdated: (event: SpotUpdatedEvent) => void,
  parkingLotId: string,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conecta ao inicializar
  // Cleanup ao desmontar
  // Retorna { isConnected, error }
}
```

### Canvas 3D (`components/parking/ParkingLot.tsx`)

**Props:**
```typescript
interface ParkingLotProps {
  spots: ParkingSpot[];
}
```

**Renderização:**
- Aceita array de `ParkingSpot`
- Para cada vaga, calcula posição 3D (grid 22 vagas)
- Renderiza `<ParkingSpot3D>` amquiteto com status (cor)
- Atualiza quando props mudam (via `useEffect`)

### Sidebar Colapsável (`components/ui/Sidebar.tsx`)

**Props:**
```typescript
type SidebarProps = {
  selectedReport: ReportId | null;
  onSelectReport: (reportId: ReportId) => void;
};

export type ReportId = 'history' 
  | 'hourly-occupancy' 
  | 'average-duration' 
  | 'spot-ranking';
```

**Comportamento:**
- Largura padrão: 64px (só ícones)
- Hover → expande para 280px (framer-motion spring)
- Menu com 4 itens:
  - `History` (Histórico Completo)
  - `BarChart3` (Ocupação por Hora)
  - `Clock` (Tempo Médio de Permanência)
  - `Trophy` (Ranking de Vagas)
- Clique em item → abre painel correspondente

### Painel de Relatórios (`components/ui/ReportPanel.tsx`)

**Props:**
```typescript
type ReportPanelProps = {
  reportId: ReportId | null;
  onClose: () => void;
};
```

**Comportamento:**
- Desliza da direita para esquerda (enter: `x: 100%` → exit: `x: 0`)
- Largura: 420px (mobile) / 480px (lg)
- Header com título + botão "Fechar"
- Placeholder content com:
  - Card de "Visão Geral" com 2 indicadores
  - Gráfico de barras (pseudo-dados)
  - Tabela fictícia com skeleton bars
- Texto "Dados virão do backend"

### Tipos TypeScript (`types/parking.ts`)

```typescript
export enum ParkingSpotStatus {
  Free = 0,
  Occupied = 1,
  Reserved = 2,
  Maintenance = 3,
}

export interface ParkingSpot {
  id: string;                 // Guid
  spotNumber: string;         // "001", "002", etc
  status: ParkingSpotStatus;
  statusDescription: string;
  parkingLotId: string;       // Guid
  parkingLotName: string;
  createdAt: string;          // ISO date
}

export interface SpotUpdatedEvent {
  parkingLotId: string;       // Guid
  spotId: string;             // Guid
  spotNumber: string;         // "001", etc
  status: ParkingSpotStatus;  // int enum
  timestamp: string;          // ISO date
}

export interface Spot3DPosition {
  spotNumber: string;
  x: number;
  y: number;
  z: number;
  status: ParkingSpotStatus;
}
```

### Status Badge (Tiempo Real Ativo)

Renderizado em `app/page.tsx`:
```tsx
<div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
<span>{isConnected ? 'Tempo Real Ativo' : 'Desconectado'}</span>
```

### Layout Responsivo

- **Desktop:** Sidebar 64px (hover 280px) + Canvas 3D + Painel 480px
- **Tablet:** Sidebar colapsado inicial + Canvas + Painel 420px
- **Mobile:** Sidebar hidden by default (drawer) + Canvas fullwidth

---

## 6. ESTADO ATUAL DOS RELATÓRIOS

### Componentes Implementados

#### **Sidebar.tsx**
- ✅ Colapsável por hover
- ✅ 4 itens de menu (History, BarChart3, Clock, Trophy)
- ✅ Ícones lucide-react
- ✅ Animação framer-motion (spring)
- ✅ Estado ativo/inativo
- ✅ Tema dark emerald

#### **ReportPanel.tsx**
- ✅ Desliza da direita
- ✅ Header com título + botão fechar
- ✅ Placeholder content (3 cards)
- ✅ Gráfico fictício (barras)
- ✅ Tabela fictícia
- ✅ AnimatePresence para enter/exit
- ✅ Backdrop blur

### Integração na Página 3D
- ✅ Estado `selectedReport` centralizado
- ✅ Ao abrir painel, mapa reduz opacidade (opacity-75)
- ✅ Ao fechar, volta ao normal
- ✅ Callbacks handleSelectReport / handleCloseReport

### Dados de Relatórios
- ❌ Ainda são placeholders
- ❌ Sem endpoints de API implementados
- ❌ Sem histórico de moveimentação agregado
- ❌ Sem gráficos reais

---

## 7. PONTOS DE ATENÇÃO / POSSÍVEIS MELHORIAS

### 🔴 **INCONSISTÊNCIAS CRÍTICAS**

#### 1. **Quantidade de Vagas Mismatch**
- **ESP32 Firmware:** Publica 22 vagas (SENSOR_MAP[0..21], `TOTAL_VAGAS = 22`)
- **Backend DataSeeder:** Seed apenas 20 vagas (`TotalSeedSpots = 20`, spots 001-020)
- **Resultado:** Vagas 021-022 do ESP32 tentam atualizar vagas que não existem no DB
- **Impacto:** Avisos de "Vaga não encontrada" no log
- **Solução:** Ajustar `TotalSeedSpots` para 22 em `DataSeeder.cs`

#### 2. **ParkingLotId no Firmware**
- Hardcoded: `45fc18f2-bdd8-4b11-b964-f8face1147f0`
- Se mudar a estrutura de estacionamentos, quebra
- **Solução:** Tornar configurável via EEPROM ou AP web server no ESP32

### ⚠️ **LACUNAS DE FUNCIONALIDADE**

#### 3. **Relatórios (Frontend)**
- Apenas placeholders visuais
- Sem endpoints de API para:
  - Histórico completo de transições
  - Ocupação agregada por hora
  - Tempo médio de permanência
  - Ranking de vagas
- **Solução:** Implementar ReportsController + agregações MySQL

#### 4. **Backend-to-ESP32 Feedback**
- ESP32 inscreve em `parking/status` mas backend não publica
- Sem mecanismo de comando do backend para ESP32
- **Solução:** Implementar `/parking/command/{deviceId}` para enviar instruções

#### 5. **Persistência de Histórico**
- MQTT apenas atualiza status de vaga (Free/Occupied)
- Não registra transições de entrada/saída
- **Solução:** Handler MQTT criar/fechar `ParkingSession` automaticamente

#### 6. **Secrets Management**
- Credentials hardcoded em docker-compose.yml e código
- MQTT password em arquivo de texto (`passwordfile_local`)
- JWT_KEY em texto plano
- **Solução:** Usar Docker Secrets ou HashiCorp Vault

#### 7. **TLS/HTTPS**
- MQTT sem TLS em produção
- API sem HTTPS
- Frontend sem compressão HTTP/2
- **Solução:** Adicionar reverse proxy (nginx) com certificados Let's Encrypt

### ✅ **BEM IMPLEMENTADO**

- ✅ Clean Architecture backend (Domain/Application/Infrastructure)
- ✅ SignalR hub grouping por estacionamento
- ✅ Soft delete global via query filter
- ✅ MQTT autenticado com ACL
- ✅ Reconnect automático MQTT
- ✅ React Three Fiber 3D integrado
- ✅ SignalR real-time frontend
- ✅ Sidebar colapsável com animações suaves
- ✅ Docker Compose com health checks

### 🔧 **MELHORIAS RECOMENDADAS**

1. **Unitários/Integração:**
   - Testar fluxo MQTT → DB → SignalR
   - Mock MQTT para testes

2. **Observability:**
   - Adicionar Application Insights ou Datadog
   - Métricas de ocupação em tempo real

3. **Performance:**
   - Índices no DB para queries de histórico
   - Paginação em relatórios

4. **UX:**
   - Filtro de data/hora em relatórios
   - Export de dados (CSV, PDF)
   - Dashboard com KPIs

---

## Anexo: Variáveis de Ambiente

### `.env` (Development)
```bash
# MySQL
MYSQL_ROOT_PASSWORD=RootPass@2026!
MYSQL_DATABASE=parking_system
MYSQL_USER=parking_app
MYSQL_PASSWORD=ParkingApp@2026!
MYSQL_PORT=3306

# MQTT
MQTT_PORT=1883
MQTT_USERNAME=parking_iot
MQTT_PASSWORD=ParkingIot@2026

# Backend
BACKEND_PORT=5167
JWT_KEY=ParkingSystem@SuperSecretKey2026!MustBeAtLeast32Chars
JWT_ISSUER=ParkingSystemAPI
JWT_AUDIENCE=ParkingSystemClients

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:5167
NEXT_PUBLIC_SIGNALR_URL=http://localhost:5167/hubs/parking
```

---

## Conclusão

O sistema está **estruturalmente robusto** com Clean Architecture aplicada corretamente no backend, autenticação MQTT segura, SignalR para real-time e frontend moderno em Next.js 14 com 3D visualization.  

**Próximas prioridades:**
1. Corrigir mismatch de vagas (20 vs 22)
2. Implementar endpoints de relatórios
3. Adicionar criação automática de ParkingSessions para histórico
4. Hardening de secrets (chaves, credenciais)
5. TLS/HTTPS em produção
