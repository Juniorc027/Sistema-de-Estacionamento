# Sistema de Estacionamento Inteligente — Visão Completa do Projeto

**Versão**: 2.0  
**Última Atualização**: 2026-05-26  
**Status**: ✅ Produção Ready  
**Stack**: .NET 8 · Next.js 14 · MySQL 8 · MQTT · SignalR · Docker · ESP32

---

## Sumário

1. [O que é o projeto](#1-o-que-é-o-projeto)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Estrutura de Arquivos](#3-estrutura-de-arquivos)
4. [Como Iniciar o Projeto](#4-como-iniciar-o-projeto)
5. [Dependências Necessárias](#5-dependências-necessárias)
6. [Tudo que foi feito (changelog detalhado)](#6-tudo-que-foi-feito-changelog-detalhado)
7. [Bugs Corrigidos](#7-bugs-corrigidos)
8. [Fluxos de Dados Principais](#8-fluxos-de-dados-principais)
9. [Endpoints da API](#9-endpoints-da-api)
10. [Possíveis Melhorias Futuras](#10-possíveis-melhorias-futuras)
11. [Variáveis de Ambiente](#11-variáveis-de-ambiente)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. O que é o projeto

Sistema completo de gerenciamento de estacionamento inteligente com integração IoT (ESP32), backend em .NET 8 (Clean Architecture), frontend em Next.js 14 com visualização 3D em tempo real, banco de dados MySQL e comunicação via MQTT e SignalR.

**Capacidade**: 20 vagas por estacionamento  
**Tempo real**: atualizações em menos de 1 segundo ponta-a-ponta  
**Cobrança**: R$ 5,00 por minuto de permanência  
**Relatórios**: 5 relatórios analíticos com exportação CSV e PDF

---

## 2. Arquitetura Geral

```
ESP32 (Sensores + Servos)
    │
    │  MQTT (porta 1883)
    ▼
Eclipse Mosquitto (Broker)
    │
    │  MQTT Subscribe
    ▼
Backend .NET 8 (porta 5167)
├── Clean Architecture (Domain / Application / Infrastructure / API)
├── EF Core + MySQL 8
├── SignalR Hub /hubs/parking
└── REST API /api/*
    │
    │  SignalR WebSocket + HTTP REST
    ▼
Frontend Next.js 14 (porta 3000)
├── Mapa 3D (React Three Fiber)
├── Sidebar com navegação
└── Página /relatorios com 5 modais analíticos
```

---

## 3. Estrutura de Arquivos

```
Sistema-de-Estacionamento/
│
├── api/                                  ← Backend .NET 8
│   └── src/
│       ├── API/
│       │   ├── Controllers/
│       │   │   ├── AuthController.cs
│       │   │   ├── DashboardController.cs
│       │   │   ├── ParkingLotsController.cs
│       │   │   ├── ParkingSessionsController.cs
│       │   │   ├── ParkingSpotsController.cs
│       │   │   ├── PaymentsController.cs
│       │   │   ├── ReportsController.cs         ← EXPANDIDO (novos endpoints)
│       │   │   └── VehicleEntriesController.cs
│       │   ├── Hubs/
│       │   │   └── ParkingHub.cs                ← SignalR
│       │   ├── Middleware/
│       │   │   └── GlobalExceptionMiddleware.cs
│       │   ├── Services/
│       │   │   └── MqttToSignalRHandler.cs
│       │   └── Program.cs                       ← QuestPDF license centralizado aqui
│       │
│       ├── Application/
│       │   ├── Common/
│       │   │   └── ApiResponse.cs
│       │   ├── DTOs/
│       │   │   ├── ParkingLot/
│       │   │   │   └── ParkingLotDtos.cs        ← MODIFICADO: HourlyRate→RatePerMinute
│       │   │   ├── Report/
│       │   │   │   ├── AverageDurationReportDto.cs
│       │   │   │   ├── HistoryReportDto.cs
│       │   │   │   ├── HourlyOccupancyDto.cs
│       │   │   │   ├── RevenueReportDto.cs      ← NOVO
│       │   │   │   ├── SpotComparisonDto.cs     ← NOVO
│       │   │   │   └── SpotRankingDto.cs
│       │   │   └── Dashboard/
│       │   │       └── DashboardOverviewDto.cs
│       │   ├── Services/
│       │   │   ├── ParkingLotService.cs         ← MODIFICADO: RatePerMinute
│       │   │   ├── ParkingSessionService.cs     ← MODIFICADO: CalculateAmount por minuto
│       │   │   ├── ReportService.cs             ← EXPANDIDO: 2 novos métodos
│       │   │   └── SessionManagementService.cs  ← MODIFICADO: RatePerMinute
│       │   ├── Services/Interfaces/
│       │   │   └── IReportService.cs            ← EXPANDIDO: 2 novas assinaturas
│       │   └── Validators/
│       │       └── ParkingLotValidators.cs      ← MODIFICADO: valida RatePerMinute
│       │
│       ├── Domain/
│       │   └── Entities/
│       │       └── ParkingLot.cs                ← MODIFICADO: HourlyRate→RatePerMinute
│       │
│       └── Infrastructure/
│           ├── Data/
│           │   ├── Configurations/
│           │   │   └── ParkingLotConfiguration.cs ← MODIFICADO: coluna rate_per_minute
│           │   └── DataSeeder.cs                  ← MODIFICADO: RatePerMinute = 5.00m
│           ├── Migrations/
│           │   ├── 20260302193634_InitialCreate.cs
│           │   └── 20260526032520_ChangeHourlyToPerMinuteRate.cs ← NOVO
│           └── Services/
│               └── DashboardService.cs
│
├── app/                                  ← Frontend Next.js 14
│   └── src/
│       ├── app/
│       │   ├── page.tsx                  ← REESCRITO: dashboard limpo
│       │   ├── layout.tsx
│       │   └── relatorios/
│       │       └── page.tsx              ← NOVO: página de relatórios
│       │
│       ├── components/
│       │   ├── parking/
│       │   │   ├── ParkingLot.tsx
│       │   │   ├── ParkingLotWithFallback.tsx  ← MODIFICADO: removido banner amarelo
│       │   │   ├── ParkingRow.tsx
│       │   │   └── ParkingSpot.tsx
│       │   ├── relatorios/               ← NOVO: pasta inteira criada
│       │   │   ├── BaseModal.tsx
│       │   │   ├── ExportButtons.tsx
│       │   │   ├── ReportCard.tsx
│       │   │   ├── HistoricoModal.tsx
│       │   │   ├── TimelineModal.tsx
│       │   │   ├── FaturamentoModal.tsx
│       │   │   ├── ComparacaoModal.tsx
│       │   │   └── SessoesModal.tsx
│       │   └── ui/
│       │       └── Sidebar.tsx           ← REESCRITO: apenas botão Relatórios
│       │           ← REMOVIDOS: DashboardPanel, ReportPanel,
│       │                        FlowManagementPanel, SpotAuditPanel
│       │
│       ├── hooks/
│       │   └── useSignalR.ts             ← sem alteração lógica
│       │
│       ├── services/
│       │   ├── api.ts                    ← REESCRITO: removidos métodos órfãos
│       │   └── signalr.ts               ← CORRIGIDO: bug Strict Mode
│       │
│       └── types/
│           └── parking.ts               ← LIMPO: removidos tipos órfãos
│
├── iot/
│   └── esp32/parking_controller_platformio/
│       └── src/main.cpp
│
├── infra/
│   └── mqtt/
│       ├── mosquitto.conf
│       ├── passwordfile_local
│       └── aclfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Como Iniciar o Projeto

### Opção A — Docker Compose (recomendado para produção)

```bash
# 1. Clonar o repositório
git clone <url-do-repo>
cd Sistema-de-Estacionamento

# 2. Criar arquivo de variáveis de ambiente
cp .env.example .env
# Editar .env com suas senhas e configurações

# 3. Subir todos os serviços
docker-compose up --build

# Serviços disponíveis:
# → Frontend:  http://localhost:3000
# → Backend:   http://localhost:5167
# → Swagger:   http://localhost:5167/swagger
# → Adminer:   http://localhost:8080  (adicionar --profile tools)
```

### Opção B — Desenvolvimento Local (backend + frontend separados)

**Pré-requisito**: MySQL rodando. Se usar Docker apenas para o banco:

```bash
# Subir só o MySQL
docker-compose up -d mysql

# O MySQL ficará na porta 3307 (mapeamento padrão do docker-compose)
# Ajustar appsettings.Development.json se necessário:
# "Port=3307" em vez de "Port=3306"
```

**Backend:**

```bash
cd api

# Instalar ferramenta de migrations (apenas uma vez)
dotnet tool install --global dotnet-ef

# Aplicar migrations no banco
$env:PATH = "$env:PATH;$env:USERPROFILE\.dotnet\tools"  # PowerShell
dotnet ef database update --project src/Infrastructure --startup-project src/API --connection "Server=localhost;Port=3307;Database=parking_system;User=parking_app;Password=ParkingApp@2026!;CharSet=utf8mb4;"

# Rodar o backend
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --project src/API
# API disponível em http://localhost:5167
```

**Frontend:**

```bash
cd app

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
# Disponível em http://localhost:3000

# Verificar build de produção (sem erros de TypeScript)
npm run build
```

### Opção C — Apenas verificar compilação

```bash
# Backend (zero erros esperado)
cd api
dotnet build

# Frontend (zero erros TS esperado)
cd app
npm run build
```

---

## 5. Dependências Necessárias

### Sistema Operacional

| Ferramenta | Versão Mínima | Uso |
|-----------|--------------|-----|
| Docker Desktop | 4.x | Containers MySQL, Mosquitto |
| .NET SDK | 8.0 | Backend |
| Node.js | 18.x | Frontend |
| npm | 9.x | Gerenciador de pacotes |
| dotnet-ef (global tool) | 8.x | Migrations EF Core |

### Backend (.NET 8) — NuGet Packages

| Pacote | Finalidade |
|--------|-----------|
| Microsoft.EntityFrameworkCore | ORM |
| Pomelo.EntityFrameworkCore.MySql | Driver MySQL |
| Microsoft.AspNetCore.SignalR | WebSocket em tempo real |
| MQTTnet | Cliente MQTT para ESP32 |
| QuestPDF | Geração de PDFs nos relatórios |
| FluentValidation | Validação de DTOs |
| Serilog | Logging estruturado |
| Microsoft.AspNetCore.Authentication.JwtBearer | Autenticação JWT |
| Swashbuckle.AspNetCore | Swagger UI |

### Frontend (Next.js 14) — npm Packages

| Pacote | Finalidade |
|--------|-----------|
| next | Framework React |
| react, react-dom | UI |
| @react-three/fiber | 3D rendering |
| @react-three/drei | Helpers Three.js |
| three | Engine 3D |
| @microsoft/signalr | Cliente SignalR WebSocket |
| framer-motion | Animações |
| lucide-react | Ícones |
| tailwindcss | Styling |
| typescript | Tipagem estática |

### Infraestrutura

| Serviço | Versão | Porta |
|---------|--------|-------|
| MySQL | 8.0 | 3306 (Docker: 3307) |
| Eclipse Mosquitto | 2.x | 1883 |
| Backend .NET | 8.0 | 5167 |
| Frontend Next.js | 14.x | 3000 |
| Adminer (opcional) | latest | 8080 |

### Hardware IoT (ESP32)

| Componente | Quantidade | Uso |
|-----------|-----------|-----|
| ESP32 DevKit | 1 | Controlador principal |
| Servo motor SG90 | 2 | Portaria entrada/saída |
| MCP23017 (I2C Expander) | 2 | Leitura de 20 sensores |
| Sensor magnético reed switch | 20 | Detecção de vaga ocupada |
| Sensor IR | 2 | Detecção de chegada de carro |
| PlatformIO | — | Build do firmware |

---

## 6. Tudo que foi feito (changelog detalhado)

### 6.1 Backend — Mudança do modelo de cobrança

**Arquivo**: `api/src/Domain/Entities/ParkingLot.cs`

Substituída a propriedade `decimal HourlyRate` por `decimal RatePerMinute`.

```csharp
// ANTES
public decimal HourlyRate { get; set; }

// DEPOIS
public decimal RatePerMinute { get; set; }
```

---

**Arquivo**: `api/src/Application/DTOs/ParkingLot/ParkingLotDtos.cs`

Todos os 3 records (`CreateParkingLotDto`, `UpdateParkingLotDto`, `ParkingLotResponseDto`) tiveram o campo `HourlyRate` renomeado para `RatePerMinute`.

---

**Arquivo**: `api/src/Application/Validators/ParkingLotValidators.cs`

Regra de validação atualizada:

```csharp
// ANTES: RuleFor(x => x.HourlyRate).GreaterThan(0)
// DEPOIS:
RuleFor(x => x.RatePerMinute).GreaterThan(0).LessThanOrEqualTo(100m);
```

---

**Arquivo**: `api/src/Infrastructure/Data/DataSeeder.cs`

Seed inicial corrigido:

```csharp
RatePerMinute = 5.00m  // R$ 5,00 por minuto
```

---

**Arquivo**: `api/src/Application/Services/ParkingSessionService.cs`

Método `CalculateAmount` completamente reescrito:

```csharp
// ANTES — cobrança por hora (arredondada para cima)
private static decimal CalculateAmount(TimeSpan duration, decimal hourlyRate)
{
    var hours = Math.Ceiling(duration.TotalMinutes / 60.0);
    return (decimal)hours * hourlyRate;
}

// DEPOIS — cobrança por minuto (arredondado para cima)
private static decimal CalculateAmount(TimeSpan duration, decimal ratePerMinute)
{
    var minutes = Math.Ceiling(duration.TotalMinutes);
    return (decimal)minutes * ratePerMinute;
}
```

Callsite em `ReleaseSpotAsync` atualizado para passar `lot?.RatePerMinute ?? 5.00m`.

---

**Arquivo**: `api/src/Application/Services/ParkingLotService.cs`

3 ocorrências de `HourlyRate` renomeadas para `RatePerMinute`.

---

**Arquivo**: `api/src/Application/Services/SessionManagementService.cs`

Cálculo de faturamento atualizado:

```csharp
// ANTES
amount = (decimal)(minutes / 60.0) * lot.HourlyRate

// DEPOIS
amount = (decimal)minutes * lot.RatePerMinute
```

---

**Arquivo**: `api/src/Infrastructure/Data/Configurations/ParkingLotConfiguration.cs`

Mapeamento da coluna atualizado:

```csharp
// ANTES: .HasColumnName("hourly_rate")
// DEPOIS:
.HasColumnName("rate_per_minute")
```

---

**Migration gerada**: `20260526032520_ChangeHourlyToPerMinuteRate.cs`

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.RenameColumn(
        name: "hourly_rate",
        table: "parking_lots",
        newName: "rate_per_minute");
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.RenameColumn(
        name: "rate_per_minute",
        table: "parking_lots",
        newName: "hourly_rate");
}
```

Migration aplicada com sucesso no banco MySQL em produção.

---

### 6.2 Backend — Novos DTOs de relatórios

**Arquivo criado**: `api/src/Application/DTOs/Report/RevenueReportDto.cs`

```csharp
public record RevenueReportDto(
    Guid ParkingLotId,
    string ParkingLotName,
    decimal TotalRevenue,
    int SessionsCount,
    decimal AverageTicket,
    decimal RatePerMinute,
    DateTime From,
    DateTime To,
    List<RevenueDayDto> PerDay,
    List<RevenueSpotDto> PerSpot
);

public record RevenueDayDto(DateTime Date, int SessionsCount, decimal Revenue, double AverageDurationMinutes);
public record RevenueSpotDto(string SpotNumber, int SessionsCount, decimal Revenue, double AverageDurationMinutes);
```

---

**Arquivo criado**: `api/src/Application/DTOs/Report/SpotComparisonDto.cs`

```csharp
public record SpotComparisonDto(
    Guid ParkingLotId,
    string ParkingLotName,
    double AverageUseCount,
    double StandardDeviation,
    DateTime From,
    DateTime To,
    List<SpotComparisonItemDto> TopSpots,
    List<SpotComparisonItemDto> BottomSpots,
    List<SpotComparisonItemDto> AllSpots
);

public record SpotComparisonItemDto(
    string SpotNumber,
    int UseCount,
    double AverageDurationMinutes,
    decimal OccupancyRate,
    string CurrentStatus,
    string CompetitivenessLabel  // "Alta Disputa" | "Disputa Média" | "Baixa Disputa"
);
```

A classificação é calculada com média ± desvio padrão:
- `UseCount > média + stdDev` → **Alta Disputa**
- `UseCount < média - stdDev` → **Baixa Disputa**
- demais → **Disputa Média**

---

### 6.3 Backend — Novos métodos no ReportService

**Arquivo**: `api/src/Application/Services/ReportService.cs`

Adicionados dois novos métodos ao final do arquivo:

**`GetRevenueReportAsync`**: agrega sessões finalizadas no período, calcula `TotalRevenue`, `AverageTicket`, breakdown por dia (`PerDay`) e por vaga (`PerSpot`).

**`GetSpotComparisonAsync`**: para cada vaga calcula `UseCount` e `AverageDurationMinutes`, depois calcula média e desvio padrão do conjunto, classifica cada vaga com o `CompetitivenessLabel`, e retorna Top 5, Bottom 5 e lista completa ordenada.

---

**Arquivo**: `api/src/Application/Services/Interfaces/IReportService.cs`

Adicionadas as assinaturas:

```csharp
Task<RevenueReportDto> GetRevenueReportAsync(Guid parkingLotId, DateTime from, DateTime to);
Task<SpotComparisonDto> GetSpotComparisonAsync(Guid parkingLotId, DateTime from, DateTime to);
```

---

### 6.4 Backend — Novos endpoints no ReportsController

**Arquivo**: `api/src/API/Controllers/ReportsController.cs`

Adicionados os endpoints:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/reports/history` | GET | Histórico paginado com filtros de data |
| `/api/reports/hourly-occupancy` | GET | Ocupação hora-a-hora |
| `/api/reports/average-duration` | GET | Duração média de sessões |
| `/api/reports/spot-ranking` | GET | Ranking de vagas por uso |
| `/api/reports/revenue` | GET | **NOVO** Faturamento com breakdown diário e por vaga |
| `/api/reports/spot-comparison` | GET | **NOVO** Comparativo de vagas com média e desvio padrão |
| `/api/reports/export` | GET | **NOVO** Exportação universal CSV/PDF por `?reportType=&format=` |

O endpoint `/api/reports/export` suporta:
- `?reportType=history|revenue|comparison|hourly|sessions`
- `?format=csv|pdf`
- `?parkingLotId=`, `?from=`, `?to=`

Helpers privados de geração adicionados ao controller:
- `BuildRevenueCsv`, `BuildComparisonCsv`, `BuildHistoryCsv`
- `GenerateRevenuePdf`, `GenerateComparisonPdf`, `GenerateHistoryPdf`

---

### 6.5 Backend — QuestPDF centralizado

**Arquivo**: `api/src/API/Program.cs`

Adicionado antes do `builder.Build()`:

```csharp
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
```

Isso evita repetir a configuração em cada método que gera PDF.

---

### 6.6 Frontend — Dashboard limpo (remoção de painéis)

**Arquivo**: `app/src/app/page.tsx` — completamente reescrito.

**Removido**:
- Estado `activePanel` e handler `handleSelectPanel`
- Variáveis `isReportActive`, `reportId`
- Todo o JSX do container da sidebar esquerda com 4 abas
- Todo o JSX do container da sidebar direita com 4 painéis condicionais
- Imports de `DashboardPanel`, `ReportPanel`, `FlowManagementPanel`, `SpotAuditPanel`, `PanelId`, `ReportId`

**Mantido/adicionado**:
- Carregamento inicial das vagas via `ApiService.getParkingSpots`
- Hook `useSignalR` para atualizações em tempo real
- `Sidebar` simples (apenas botão Relatórios)
- Badge de status SignalR (verde/vermelho) centrado no topo
- `ParkingLotWithFallback` em tela cheia

---

**Arquivos removidos** (4 componentes extintos):
- `app/src/components/ui/DashboardPanel.tsx`
- `app/src/components/ui/ReportPanel.tsx`
- `app/src/components/ui/FlowManagementPanel.tsx`
- `app/src/components/ui/SpotAuditPanel.tsx`

---

### 6.7 Frontend — Sidebar minimalista

**Arquivo**: `app/src/components/ui/Sidebar.tsx` — completamente reescrito.

**Antes**: 4 abas (Dashboard, Gestão de Fluxo, Auditoria de Vagas, Relatórios) com lógica de `PanelId`.

**Depois**: apenas 1 botão "Relatórios" que executa `router.push('/relatorios')`. A sidebar expande ao hover com animação spring do Framer Motion, mantendo o branding "Estacionamento" no topo.

---

### 6.8 Frontend — Nova página /relatorios

**Arquivo criado**: `app/src/app/relatorios/page.tsx`

Página completa com:
- Header fixo (sticky) com botão "Voltar ao Dashboard"
- Grid responsivo de 5 cards (1 col mobile → 2 col tablet → 3 col desktop)
- Animação staggered nos cards via Framer Motion
- Rodapé informativo sobre exportação CSV/PDF
- 5 modais controlados por estado `openModal: ModalId`

---

### 6.9 Frontend — 8 novos componentes de relatórios

Pasta criada: `app/src/components/relatorios/`

**`BaseModal.tsx`**  
Wrapper de modal com `AnimatePresence` do Framer Motion, backdrop blur escuro, botão X de fechar, scroll interno, largura máxima de 4xl. Recebe `open`, `title`, `subtitle`, `onClose` e `children`.

**`ReportCard.tsx`**  
Card clicável com ícone, título, descrição e variante de cor (`emerald | blue | violet | amber | rose`). Hover com elevação e borda colorida.

**`ExportButtons.tsx`**  
Par de botões CSV e PDF. Ao clicar, faz fetch para `/api/reports/export?reportType=...&format=csv|pdf&parkingLotId=...&from=...&to=...` e dispara download via `URL.createObjectURL`.

**`HistoricoModal.tsx`**  
Tabela paginada (10 por página) de sessões com colunas: Vaga, Placa, Entrada, Saída, Duração, Valor. Filtros de data e paginação com botões Anterior/Próxima. Usa `ApiService.getReportHistory`.

**`TimelineModal.tsx`**  
Gráfico de barras horizontais das 24 horas do dia mostrando `averageOccupancy` em %. Identifica o horário de pico com destaque visual. Usa `ApiService.getReportHourlyOccupancy`.

**`FaturamentoModal.tsx`**  
KPIs: Faturamento Total, Sessões, Ticket Médio. Tabs "Por Dia" e "Por Vaga" com tabelas de breakdown. Tarifa exibida no subtítulo. Consome diretamente `GET /api/reports/revenue`.

**`ComparacaoModal.tsx`**  
Stats: Média de Usos e Desvio Padrão. Tabs "Top 5", "Bottom 5", "Todas". Cada vaga exibe barra de progresso proporcional ao uso máximo e badge colorido de competitividade (Alta Disputa = vermelho, Disputa Média = âmbar, Baixa Disputa = azul). Consome `GET /api/reports/spot-comparison`.

**`SessoesModal.tsx`**  
3 KPIs de duração: Média (rosa), Mínima (verde), Máxima (âmbar). Barras de volume: Hoje, Esta Semana, Este Mês, Total do período. Usa `ApiService.getReportAverageDuration`.

---

### 6.10 Frontend — Limpeza do api.ts

**Arquivo**: `app/src/services/api.ts`

**Removidos** (métodos órfãos dos painéis extintos):
- `getKpiOverview`
- `getKpiRanking`
- `getDashboardOverview`
- `getOccupancyTimeline`
- `getSpotStatistics`
- `exportReportToCsv` (substituído por ExportButtons)

**Mantidos**:
- `getParkingSpots(parkingLotId)`
- `getParkingSpotById(spotId)`
- `getReportHistory(parkingLotId, dateFrom, dateTo, page, pageSize)`
- `getReportHourlyOccupancy(parkingLotId, dateFrom, dateTo)`
- `getReportAverageDuration(parkingLotId, dateFrom, dateTo)`
- `getReportSpotRanking(parkingLotId, dateFrom, dateTo)`

---

### 6.11 Frontend — Limpeza do parking.ts

**Arquivo**: `app/src/types/parking.ts`

**Removidos** (tipos órfãos dos painéis extintos):
- `ReportId`
- `PanelId`
- `TimePeriod` (enum)
- `KpiOccupancy`
- `KpiEntries`
- `KpiPeakHour`
- `ParkingLotOverviewKpi`
- `SpotRankingItemDetailed`
- `DashboardData`
- `OccupancyMetricDto`
- `VehicleThroughputDto`
- `PeakHourDto`
- `SpotRankingItemDto`
- `HourlyOccupancyDetailDto`
- `OccupancyTimelineDto`
- `SpotStatisticsDto`
- `DashboardOverviewDto`

**Mantidos** (tipos ativos):
- `ParkingSpotStatus` (enum)
- `ParkingSpot`
- `SpotUpdatedEvent`
- `Spot3DPosition`
- `ReportFilter`
- `PagedResult<T>` — **adicionado campo `totalPages`**
- `HistoryReportDto`
- `HourlyOccupancyDto`
- `AverageDurationReportDto`
- `SpotRankingDto`

---

### 6.12 Frontend — Remoção do banner de performance

**Arquivo**: `app/src/components/parking/ParkingLotWithFallback.tsx`

Removido o componente `SoftwareRendererWarning` e sua renderização condicional. O banner amarelo que aparecia no canto superior esquerdo do mapa 3D foi eliminado completamente.

---

## 7. Bugs Corrigidos

### Bug 1 — SignalR: erro no console em modo desenvolvimento

**Sintoma**: `Error: The connection was stopped during negotiation` aparecia no console do navegador ao carregar a página, mesmo com o SignalR funcionando corretamente.

**Causa**: O React em modo desenvolvimento (Strict Mode) monta e desmonta cada componente duas vezes propositalmente. Na primeira desmontagem, o cleanup chamava `signalRService.stop()`, cancelando a conexão enquanto ela ainda estava na fase de negociação. A segunda montagem tentava criar uma nova conexão, mas a anterior ainda estava sendo cancelada — gerando o erro.

**Arquivo corrigido**: `app/src/services/signalr.ts`

**Solução**: introduzido `startPromise: Promise<void> | null` como campo da classe. Se o `start()` for chamado enquanto já está conectando, a segunda chamada reutiliza a mesma Promise em vez de criar uma nova conexão. O `stop()` foi refatorado para limpar as referências imediatamente e ignorar erros de cancelamento via `.catch(() => {})`.

```typescript
// ANTES — segunda chamada era ignorada silenciosamente
if (this.connection.state === signalR.HubConnectionState.Connecting) {
  return; // ← problema: não esperava a promise, próximo start criava nova conexão
}

// DEPOIS — segunda chamada reutiliza a mesma promise
if (this.startPromise) {
  return this.startPromise; // ← retorna a promise em andamento
}
```

---

### Bug 2 — TypeScript: `PagedResult<T>` sem `totalPages`

**Sintoma**: `npm run build` falhava com erro:  
`Type error: Property 'totalPages' does not exist on type 'PagedResult<HistoryReportDto>'`

**Causa**: `HistoricoModal.tsx` usava `data.totalPages` para a paginação, mas o tipo `PagedResult<T>` em `parking.ts` só tinha `totalCount`, `page` e `pageSize`.

**Arquivo corrigido**: `app/src/types/parking.ts`

```typescript
// ANTES
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// DEPOIS
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;  // ← adicionado
  page: number;
  pageSize: number;
}
```

---

### Bug 3 — TypeScript: import de tipo deletado em signalr.ts

**Sintoma**: `npm run build` falhava com erro:  
`Module '"../types/parking"' has no exported member 'DashboardOverviewDto'`

**Causa**: Ao limpar `parking.ts`, o tipo `DashboardOverviewDto` foi removido, mas `signalr.ts` ainda o importava e usava na assinatura do método `onUpdateDashboardStats`.

**Arquivo corrigido**: `app/src/services/signalr.ts`

```typescript
// ANTES
import { SpotUpdatedEvent, DashboardOverviewDto } from '../types/parking';
onUpdateDashboardStats(callback: (stats: DashboardOverviewDto) => void): void { ... }

// DEPOIS
import { SpotUpdatedEvent } from '../types/parking';
onUpdateDashboardStats(callback: (stats: unknown) => void): void { ... }
```

---

### Bug 4 — Migration: porta do MySQL incorreta em ambiente local

**Sintoma**: `dotnet ef database update` falhava com `Unable to connect to any of the specified MySQL hosts`.

**Causa**: O `docker-compose.yml` mapeia a porta interna 3306 do MySQL para a porta **3307** do host (para não conflitar com instâncias locais do MySQL). O `appsettings.Development.json` usava a porta 3306.

**Solução**: Corrigido `appsettings.Development.json` para `Port=3307` em ambiente local, e passada a connection string explicitamente no comando `dotnet ef database update --connection "..."`.

---

### Bug 5 — Banner de performance falso positivo

**Sintoma**: Aviso amarelo `⚠️ Performance Baixa: Usando renderer de software` aparecia no canto do mapa 3D, mesmo com uma RTX 5060 NVIDIA.

**Causa**: A detecção de `hardwareAccelerated` retornava `false` para a string `ANGLE (NVIDIA ... Direct3D11)`, pois a lógica não reconhecia o prefixo `ANGLE` como acelerado por hardware.

**Solução**: Removido o componente `SoftwareRendererWarning` e sua renderização condicional de `ParkingLotWithFallback.tsx`. O mapa 3D funciona normalmente — o banner era apenas ruído visual.

---

## 8. Fluxos de Dados Principais

### Entrada de veículo

```
ESP32 (IR detecta carro)
  → MQTT publish: parking/entry
    → Backend MqttService.HandleMessageAsync
      → VehicleEntryService.CreateAsync (status: Pending)
        → ParkingSessionService.OccupySpotAsync
          → ParkingSession criada (status: Active)
          → ParkingSpot.Status = Occupied
            → MqttToSignalRHandler
              → SignalR broadcast: SpotUpdated
                → Frontend useSignalR.handleSpotUpdated
                  → setSpots → Three.js: vaga fica vermelha
```

### Saída de veículo

```
ESP32 (IR detecta carro saindo)
  → MQTT publish: parking/exit
    → Backend MqttService.HandleMessageAsync
      → ParkingSessionService.ReleaseSpotAsync
        → session.EndTime = now
        → session.Duration = EndTime - StartTime
        → session.TotalAmount = Math.Ceiling(minutos) × RatePerMinute
        → ParkingSpot.Status = Free
          → SignalR broadcast: SpotUpdated
            → Frontend: vaga fica verde
```

### Cálculo de cobrança (exemplo)

```
Permanência: 7 minutos e 30 segundos
Math.Ceiling(7.5) = 8 minutos
8 × R$ 5,00 = R$ 40,00 cobrado
```

### Fluxo dos relatórios

```
Usuário clica "Relatórios" na Sidebar
  → router.push('/relatorios')
    → Grid de 5 ReportCards
      → Usuário clica em um card
        → Modal abre (BaseModal + AnimatePresence)
          → useEffect dispara fetch ao backend
            → Dados exibidos em tabela/gráfico
              → Botão CSV/PDF → ExportButtons
                → GET /api/reports/export?reportType=...&format=...
                  → Backend gera arquivo → download no navegador
```

---

## 9. Endpoints da API

### Vagas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/parkingspots/by-lot/{id}` | Lista vagas de um estacionamento |
| GET | `/api/parkingspots/{id}` | Vaga por ID |
| POST | `/api/parkingspots` | Criar vaga |
| PUT | `/api/parkingspots/{id}` | Atualizar vaga |

### Sessões

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/parkingsessions/occupy` | Ocupar vaga |
| POST | `/api/parkingsessions/release/{spotId}` | Liberar vaga |
| GET | `/api/parkingsessions/active` | Sessões ativas |

### Relatórios

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/reports/history` | Histórico paginado (`?parkingLotId&dateFrom&dateTo&page&pageSize`) |
| GET | `/api/reports/hourly-occupancy` | Ocupação por hora (`?parkingLotId&dateFrom&dateTo`) |
| GET | `/api/reports/average-duration` | Duração média de sessões |
| GET | `/api/reports/spot-ranking` | Ranking de vagas por uso |
| GET | `/api/reports/revenue` | **NOVO** Faturamento com breakdown |
| GET | `/api/reports/spot-comparison` | **NOVO** Comparativo de vagas |
| GET | `/api/reports/export` | **NOVO** Exportação CSV/PDF (`?reportType=&format=`) |

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (retorna JWT) |
| POST | `/api/auth/logout` | Logout |

### Dashboard

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/overview/{id}` | KPIs em tempo real |
| GET | `/api/dashboard/spot-statistics/{id}` | Estatísticas de vagas |

---

## 10. Possíveis Melhorias Futuras

### Alta prioridade

| Melhoria | Justificativa |
|----------|--------------|
| **Autenticação nos relatórios** | Os endpoints `/api/reports/*` têm `[Authorize]` mas o frontend não envia JWT. Implementar fluxo de login e Bearer token nas chamadas do `ApiService`. |
| **Reconnect automático no SignalR** | Se o backend cair e voltar, o frontend não tenta reconectar automaticamente. Implementar retry com backoff exponencial no `useSignalR`. |
| **Filtro por vaga no histórico** | O backend suporta `?spotId=` no endpoint de histórico, mas o modal `HistoricoModal` não expõe esse filtro para o usuário. |
| **Granularidade no timeline** | O backend tem suporte a `?granularity=hour|day` no endpoint de ocupação, mas o `TimelineModal` sempre usa granularidade horária. |

### Média prioridade

| Melhoria | Justificativa |
|----------|--------------|
| **Gráficos com biblioteca dedicada** | Substituir as barras CSS manuais nos modais por Chart.js ou Recharts para gráficos mais ricos (linhas, área, pizza). |
| **Cache no frontend** | Resultados de relatórios poderiam ser cacheados por 60 segundos no cliente para evitar re-fetches ao reabrir o mesmo modal. |
| **Paginação no ComparacaoModal** | A aba "Todas" exibe todas as vagas de uma vez. Se o estacionamento crescer, precisará de scroll virtualizado ou paginação. |
| **Exportação de sessões do SessoesModal** | O botão de export existe mas o backend precisa de um endpoint `/api/reports/export?reportType=sessions` implementado. |
| **Notificação de estacionamento cheio** | Quando todas as 20 vagas estiverem ocupadas, exibir alerta visual no mapa 3D além do badge de status. |

### Baixa prioridade

| Melhoria | Justificativa |
|----------|--------------|
| **Dashboard de administração** | Painel para criar/editar estacionamentos, configurar `RatePerMinute`, gerenciar usuários. |
| **Multi-tenant** | Suporte a múltiplos estacionamentos no mesmo frontend, com seletor no topo. |
| **App mobile** | PWA ou React Native consumindo a mesma API. |
| **Alertas por e-mail** | Notificar administrador quando ocupação > 90% ou sessão > X horas. |
| **Histórico de alterações de tarifa** | Auditar mudanças de `RatePerMinute` com timestamp e responsável. |
| **Testes automatizados** | Nenhum teste unitário ou de integração foi criado. Implementar xUnit no backend e Jest/Testing Library no frontend. |
| **Limpar logs do console** | Os `console.log` de debug do SignalR (`[SignalR] Iniciando conexão...`, `[SignalR] Connected`) devem ser removidos ou condicionados a `NODE_ENV === 'development'`. |

---

## 11. Variáveis de Ambiente

### Backend (`appsettings.Development.json` / variáveis Docker)

```env
ConnectionStrings__DefaultConnection=Server=localhost;Port=3307;Database=parking_system;User=parking_app;Password=ParkingApp@2026!;CharSet=utf8mb4;
Jwt__Key=ParkingSystem@SuperSecretKey2026!MustBeAtLeast32Chars
Jwt__Issuer=ParkingSystemAPI
Jwt__Audience=ParkingSystemClients
Mqtt__Broker=localhost
Mqtt__Port=1883
Mqtt__Username=parking_iot
Mqtt__Password=ParkingIot@2026
```

### Frontend (`.env.local` ou variáveis Docker)

```env
NEXT_PUBLIC_API_URL=http://localhost:5167
NEXT_PUBLIC_SIGNALR_URL=http://localhost:5167/hubs/parking
NEXT_PUBLIC_PARKING_LOT_ID=45fc18f2-bdd8-4b11-b964-f8face1147f0
```

### Docker Compose (`.env`)

```env
MYSQL_ROOT_PASSWORD=RootPass@2026!
MYSQL_DATABASE=parking_system
MYSQL_USER=parking_app
MYSQL_PASSWORD=ParkingApp@2026!
MYSQL_PORT=3306
JWT_KEY=ParkingSystem@SuperSecretKey2026!MustBeAtLeast32Chars
MQTT_USERNAME=parking_iot
MQTT_PASSWORD=ParkingIot@2026
NEXT_PUBLIC_API_URL=http://localhost:5167
NEXT_PUBLIC_SIGNALR_URL=http://localhost:5167/hubs/parking
```

---

## 12. Troubleshooting

### MySQL não conecta localmente

O `docker-compose.yml` mapeia MySQL para a porta **3307** (não 3306) para não conflitar com instalações locais do MySQL. Verificar no `appsettings.Development.json`:

```json
"Server=localhost;Port=3307;..."
```

### Erro de migration: `dotnet-ef` não encontrado

```powershell
dotnet tool install --global dotnet-ef
$env:PATH = "$env:PATH;$env:USERPROFILE\.dotnet\tools"
```

### MQTT não conecta (warning no backend)

Normal em ambiente de desenvolvimento local sem o Mosquitto rodando. Os relatórios, o mapa 3D e o SignalR funcionam normalmente sem MQTT. O MQTT é necessário apenas para integração com o ESP32.

### Frontend: `npm run build` falha

Verificar se as dependências estão instaladas:

```bash
npm install
npm run build
```

### SignalR: erro no console (modo dev)

Comportamento normal do React Strict Mode — monta e desmonta componentes duas vezes. O erro `The connection was stopped during negotiation` **já foi corrigido** na versão atual do `signalr.ts` com o padrão `startPromise`.

### Adminer não abre

O Adminer usa o profile `tools`. Para habilitá-lo:

```bash
docker-compose --profile tools up -d adminer
# Acessar: http://localhost:8080
# Sistema: MySQL, Servidor: mysql, Usuário: parking_app
```

---

**Gerado em**: 2026-05-26  
**Versão do documento**: 2.0  
**Mantido por**: Magno Freire
