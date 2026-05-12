# 🧹 Implementação de Limpeza - Backend .NET

**Documento de Ação**: Mudanças específicas e prontas para aplicar

---

## 1️⃣ REMOVER ARQUIVO DUPLICADO

### Ação: Delete `Report/HourlyOccupancyDto.cs`

**Arquivo a Deletar**: 
```
/home/junior/Documentos/coder/parking-iot-system/api/src/Application/DTOs/Report/HourlyOccupancyDto.cs
```

**Conteúdo Atual** (será removido integralmente):
```csharp
namespace ParkingSystem.Application.DTOs.Report;

/// <summary>
/// Ocupação agregada por hora (quantas vagas estavam ocupadas em cada hora)
/// </summary>
public record HourlyOccupancyDto(
    DateTime Hour,              // Ex: 2026-04-07 10:00:00
    decimal AverageOccupancy,   // Percentual (0-100)
    int PeakOccupiedCount,      // Máximo de vagas ocupadas
    int TotalSpots              // Total de vagas disponíveis
);
```

**Por Quê**: 
- Duplica `HourlyOccupancyDto` da classe `DashboardOverviewDto.cs` (que é mais completa)
- A versão em Dashboard tem XMLDoc e é usada em tempo real
- A versão em Report nunca é realmente instanciada

---

## 2️⃣ REMOVER DTOs NÃO UTILIZADOS

### Ação: Remover 2 Records de `ParkingSpot/ParkingSpotDtos.cs`

**Arquivo a Editar**:
```
/home/junior/Documentos/coder/parking-iot-system/api/src/Application/DTOs/ParkingSpot/ParkingSpotDtos.cs
```

**ANTES**:
```csharp
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.DTOs.ParkingSpot;

public record CreateParkingSpotDto(string SpotNumber, Guid ParkingLotId);

public record ParkingSpotResponseDto(
    Guid Id,
    string SpotNumber,
    ParkingSpotStatus Status,
    string StatusDescription,
    Guid ParkingLotId,
    string ParkingLotName,
    DateTime CreatedAt);

public record OccupySpotRequestDto(Guid ParkingLotId);              // ❌ REMOVER

public record ReleaseSpotRequestDto(string? Notes);                 // ❌ REMOVER
```

**DEPOIS**:
```csharp
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.DTOs.ParkingSpot;

public record CreateParkingSpotDto(string SpotNumber, Guid ParkingLotId);

public record ParkingSpotResponseDto(
    Guid Id,
    string SpotNumber,
    ParkingSpotStatus Status,
    string StatusDescription,
    Guid ParkingLotId,
    string ParkingLotName,
    DateTime CreatedAt);
```

**Por Quê**:
- `OccupySpotRequestDto`: Nunca usado. Controller `ParkingSessionsController.OccupySpot()` recebe GUID diretamente da URL
- `ReleaseSpotRequestDto`: Nunca usado. Controller `ParkingSessionsController.ReleaseSpot()` não aceita body

---

## 3️⃣ AJUSTAR IMPORTS

### Ação: Limpar e Corrigir Imports em `DashboardController.cs`

**Arquivo a Editar**:
```
/home/junior/Documentos/coder/parking-iot-system/api/src/API/Controllers/DashboardController.cs
```

**ANTES** (linhas 1-6):
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.DTOs.Dashboard;
using ParkingSystem.Application.Services.Interfaces;
using System;                           // ❌ Não usa diretamente
using System.Threading.Task;            // ❌ Erro: namespace não existe (deveria ser System.Threading.Tasks)
```

**DEPOIS** (linhas 1-6):
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ParkingSystem.Application.DTOs.Dashboard;
using ParkingSystem.Application.Services.Interfaces;
using System.Threading.Tasks;           // ✅ Correto para async/await
```

**Por Quê**:
- `using System;` - Não há uso de tipos raros (ex: `System.DateTime`, `System.Guid`), tipos base usam `global::`)
- `using System.Threading.Task;` - Namespace inválido (não existe)
- `using System.Threading.Tasks;` - Correto para `Task<T>` e `async/await`

**Verificação de Uso em DashboardController.cs**:
```csharp
// Linhas que usam System:
- DateTime.UtcNow ❌ (implícito)
- Guid parkingLotId ❌ (implícito)
- Task<IActionResult> ❌ (de System.Threading.Tasks)

// Resultado: Nenhum uso explícito de "System." → seguro remover
```

---

## 4️⃣ ATUALIZAR INTERFACES - Resolver Duplicação de HourlyOccupancyDto

### Ação: Atualizar `IReportService.cs`

**Arquivo a Editar**:
```
/home/junior/Documentos/coder/parking-iot-system/api/src/Application/Services/Interfaces/IReportService.cs
```

**ANTES** (linhas 20-25):
```csharp
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Report;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IReportService
{
    // ...
    
    /// <summary>
    /// Ocupação agregada por hora
    /// </summary>
    Task<List<HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter);
    //                    ^^^^^^^^ Ambíguo: qual HourlyOccupancyDto?
```

**DEPOIS** (linhas 20-27):
```csharp
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Report;
using ParkingSystem.Application.DTOs.Dashboard;  // ✅ Adicionar

namespace ParkingSystem.Application.Services.Interfaces;

public interface IReportService
{
    // ...
    
    /// <summary>
    /// Ocupação agregada por hora
    /// </summary>
    Task<List<DashboardOverviewDto.HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter);
    //           ^^^^^^^^^^^^^^^^^^^^^^^^ Explícito: usa classe nested
```

**Alternativa Melhor** (usando alias):
```csharp
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Report;
using ParkingSystem.Application.DTOs.Dashboard;
using HourlyOccupancyMetrics = ParkingSystem.Application.DTOs.Dashboard.HourlyOccupancyDto;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IReportService
{
    // ...
    
    /// <summary>
    /// Ocupação agregada por hora (pode usar HourlyOccupancyMetrics como alias)
    /// </summary>
    Task<List<DashboardOverviewDto.HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter);
```

---

### Ação: Atualizar `ReportService.cs` (Implementação)

**Arquivo a Editar**:
```
/home/junior/Documentos/coder/parking-iot-system/api/src/Infrastructure/Services/ReportService.cs
```

**Buscar**:
```csharp
public async Task<List<HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter)
```

**Trocar Para**:
```csharp
public async Task<List<DashboardOverviewDto.HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter)
```

**Localização Esperada**: ~linha 200-250 (buscar método `GetHourlyOccupancyAsync` no arquivo)

**Nota**: Adicionar import:
```csharp
using ParkingSystem.Application.DTOs.Dashboard;
```

---

## 5️⃣ EXECUTAR VALIDAÇÃO

### Build & Test

```bash
# Terminal 1: Build
cd /home/junior/Documentos/coder/parking-iot-system/api
dotnet build

# Terminal 2: Run
dotnet run --project src/API/ParkingSystem.API.csproj

# Terminal 3: Test (se houver)
dotnet test
```

**Erros Esperados após aplicar mudanças SEM correções**:
```
CS0101: The namespace already contains a definition for 'HourlyOccupancyDto'
CS0246: The type or namespace name 'HourlyOccupancyDto' could not be found
```

**Após aplicar TODAS as mudanças acima**:
```
✅ Build succeeds
✅ No runtime errors related to DTOs
```

---

## 6️⃣ TESTAR VIA SWAGGER

### URLs para Testar (após aplicar mudanças)

```
# Dashboard still works
GET http://localhost:5000/api/dashboard/overview/{parkingLotId}

# Reports still work (com HourlyOccupancyDto correto)
GET http://localhost:5000/api/reports/hourly-occupancy?parkingLotId={id}

# Verificar que OccupySpotRequestDto/ReleaseSpotRequestDto desapareceu
# (não será nem mostrado no Swagger)
GET http://localhost:5000/swagger/ui
```

---

## 📋 RESUMO DE MUDANÇAS

| # | Arquivo | Ação | Linhas | Impacto |
|---|---------|------|--------|---------|
| 1 | `Report/HourlyOccupancyDto.cs` | **DELETE** | -13 | Alto ✅ |
| 2 | `ParkingSpot/ParkingSpotDtos.cs` | **EDIT** Remove 2 records | -3 | Alto ✅ |
| 3 | `DashboardController.cs` | **EDIT** Remove 2 usings | -2 | Baixo ✅ |
| 4 | `IReportService.cs` | **EDIT** + IMPORT | +1 import | Médio ✅ |
| 5 | `ReportService.cs` | **EDIT** 1 return type | 0 linhas | Médio ✅ |
| **TOTAL** | — | — | **-18 linhas** | **Limpeza: 100%** |

---

## ⚠️ CONSIDERAÇÕES

### O Que NÃO Mudar

- ✅ Controllers - todos em uso, nenhum obsoleto
- ✅ Services - todos registrados e utilizados
- ✅ Namespaces - bem organizados
- ✅ Resto dos DTOs - todos têm propósito

### Compatibilidade

- ✅ Frontend: **NÃO será afetado** (mesmos endpoints, mesmos contratos)
- ✅ Mobile: **NÃO será afetado**
- ✅ Testes: **PODEM falhar** se testarem `OccupySpotRequestDto` diretamente (improvável)
- ✅ MQTT Handlers: **NÃO será afetado**

### Rollback

Se algo der errado:
```bash
git checkout HEAD -- api/src/Application/DTOs/Report/HourlyOccupancyDto.cs
git checkout HEAD -- api/src/Application/DTOs/ParkingSpot/ParkingSpotDtos.cs
# etc...
```

---

## 🎯 PRÓXIMOS PASSOS (Opcional - Não Urgente)

### Refatorações Sugeridas (Para Futuro)

1. **Renomear DTOs de Ranking** para maior clareza:
   - `SpotRankingItemDto` → `SpotUsageRankingItemDto` (visão geral para dashboard)
   - `SpotRankingDto` → `SpotUsageMetricDto` (métrica para relatórios)

2. **Considerar Consolidar DTOs similares**:
   - `DailyReportDto`, `MonthlyReportDto` poderiam herdar de `BaseReportDto`

3. **Adicionar Validators para todos os DTOs**:
   - Atualmente: Auth e ParkingLot têm validators
   - Considerar: Payment, ParkingSession, VehicleEntry

---

## 📞 DÚVIDAS FREQUENTES

**P: E se remover `HourlyOccupancyDto` de Report/ e quebrar algo?**
A: Não quebra. O `DashboardService` retorna a versão do Dashboard que está em `DashboardOverviewDto.cs`. A versão em Report/ foi criada por erro de design.

**P: Os DTOs `OccupySpotRequestDto` e `ReleaseSpotRequestDto` aparecem no Swagger?**
A: Não. Controller não os usa, então Swagger não os detecta como tipos necessários.

**P: Preciso redeployar docker?**
A: Sim. Seu `docker-compose.yml` constrói a imagem a cada `docker compose up --build`. A mudança será incluída automaticamente.

---

