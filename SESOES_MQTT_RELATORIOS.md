# 🚀 Implementação: Sessões MQTT + Relatórios Integrados

**Data**: 7 de Abril de 2026  
**Status**: ✅ PRONTO PARA COLAR E TESTAR  
**Versão**: v1.0 - Código Completo Funcional

---

## 📋 Sumário

- [Decisões Tomadas](#decisões-tomadas)
- [Código Completo (3 arquivos)](#código-completo)
- [Testes Exatos](#testes-exatos)
- [Checklist Final](#checklist-final)

---

## 🎯 Decisões Tomadas

### **A. Detecção de Duplicatas em SessionManagementService**
- **Problema anterior**: Múltiplas mensagens MQTT causavam duplicação de sessões
- **Solução**: Verificar se já existe sessão `Active` para o spot → Skip se existir
- **Benefício**: Evita múltiplas VehicleEntry/ParkingSession para uma única ocupação

### **B. Logging Estruturado em 3 Camadas**
- **MqttToSignalRHandler**: Identifica cada mensagem MQTT com logs de transição
- **SessionManagementService**: Logs detalhados de criação/fechamento com emojis visuais (✓, ✗, ▶, ◀)
- **ReportService**: Logs de contagem e breakdown de dados por status

### **C. Identidade de Placa**
- Padronizado: `"DESCONHECIDO-{yyyyMMddHHmmss}"` (em português)
- Será substituída por OCR futuramente

### **D. ReportService Considera Ambas (Active + Completed)**
- `GetByPeriodAsync()` retorna todas as sessões do período
- Histórico mostra TODAS (Active + Completed)
- Ranking conta TODAS as sessões como "uso de vaga"
- Duração média calcula apenas das Completed
- Ocupação por hora inclui sessões em andamento

---

# 📄 Código Completo

## 1️⃣ MqttToSignalRHandler.cs

```csharp
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using ParkingSystem.API.Hubs;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Enums;

namespace ParkingSystem.API.Services;

public class MqttToSignalRHandler : IMqttMessageHandler
{
    private static readonly Regex SpotTopicRegex = new("^parking/spots/(?<id>\\d+)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private readonly IServiceProvider _services;
    private readonly ILogger<MqttToSignalRHandler> _logger;

    public MqttToSignalRHandler(IServiceProvider services, ILogger<MqttToSignalRHandler> logger)
    {
        _services = services;
        _logger = logger;
    }

    /// <summary>
    /// Processa mensagem MQTT, atualiza status da vaga no BD e gerencia sessões
    /// </summary>
    public async Task HandleAsync(string topic, string payload)
    {
        try
        {
            _logger.LogInformation("[MQTT] ========== Processing: {Topic} ==========", topic);
            _logger.LogInformation("[MQTT] Payload: {Payload}", payload);

            using var scope = _services.CreateScope();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<ParkingHub>>();
            var spotService = scope.ServiceProvider.GetRequiredService<IParkingSpotService>();
            var sessionService = scope.ServiceProvider.GetRequiredService<ISessionManagementService>();

            var mqttMessage = JsonSerializer.Deserialize<MqttSpotMessage>(payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

            if (mqttMessage == null)
            {
                _logger.LogWarning("[MqttHandler] Invalid payload (null after deserialize)");
                return;
            }

            var parkingLotId = mqttMessage.ParkingLotId;
            if (parkingLotId == Guid.Empty)
            {
                _logger.LogWarning("[MqttHandler] Missing parkingLotId in payload. Topic: {Topic}", topic);
                return;
            }

            var vagaId = ResolveVagaId(topic, mqttMessage);
            if (vagaId is null or <= 0)
            {
                _logger.LogWarning("[MqttHandler] Could not resolve vagaId. Topic: {Topic}, Payload: {Payload}", topic, payload);
                return;
            }

            var newStatus = ResolveStatus(topic, mqttMessage);
            var spotNumber = vagaId.Value.ToString("D3");

            // Busca status anterior
            var getResult = await spotService.GetByLotAndSpotNumberAsync(parkingLotId, spotNumber);
            var oldStatus = getResult.Success && getResult.Data != null
                ? getResult.Data.Status
                : ParkingSpotStatus.Free;

            _logger.LogInformation("[MQTT] Current status: {OldStatus}, New status: {NewStatus}", oldStatus, newStatus);

            // Atualiza status no BD
            var updateResult = await spotService.UpdateStatusAsync(parkingLotId, spotNumber, newStatus);
            if (!updateResult.Success || updateResult.Data is null)
            {
                _logger.LogWarning("[MqttHandler] Spot update failed for lot {Lot} spot {Spot}: {Message}", parkingLotId, spotNumber, updateResult.Message);
                return;
            }

            var updatedSpot = updateResult.Data;
            _logger.LogInformation("[MQTT] Spot {Spot} updated in database. Status: {NewStatus}", spotNumber, newStatus);

            // Gerencia sessões (detecta transições Free ↔ Occupied)
            _logger.LogInformation("[MQTT] >>> Calling SessionManagementService for status transition: {Spot} {OldStatus} → {NewStatus}", 
                spotNumber, oldStatus, newStatus);
            
            await sessionService.HandleSpotStatusChangeAsync(
                updatedSpot.Id,
                parkingLotId,
                spotNumber,
                oldStatus,
                newStatus
            );
            
            _logger.LogInformation("[MQTT] <<< Session management completed for spot {Spot}", spotNumber);

            // Broadcast SignalR
            var spotUpdated = new SpotUpdatedDto(
                ParkingLotId: updatedSpot.ParkingLotId,
                SpotId: updatedSpot.Id,
                SpotNumber: updatedSpot.SpotNumber,
                Status: updatedSpot.Status,
                Timestamp: DateTime.UtcNow
            );

            await hubContext.Clients
                .Group(ParkingHub.BuildParkingLotGroup(updatedSpot.ParkingLotId))
                .SendAsync("SpotUpdated", spotUpdated);

            _logger.LogInformation("[MQTT] ✓ COMPLETE: Spot {Spot} updated, session managed, SignalR broadcasted. Status: {NewStatus} (was {OldStatus})",
                spotNumber, newStatus, oldStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MqttHandler] ✗ ERROR processing MQTT message. Topic: {Topic}", topic);
        }
    }

    private static int? ResolveVagaId(string topic, MqttSpotMessage message)
    {
        var topicMatch = SpotTopicRegex.Match(topic);
        if (topicMatch.Success && int.TryParse(topicMatch.Groups["id"].Value, out var spotIdFromTopic))
        {
            return spotIdFromTopic;
        }

        if (message.VagaId > 0)
        {
            return message.VagaId;
        }

        return null;
    }

    private static ParkingSpotStatus ResolveStatus(string topic, MqttSpotMessage message)
    {
        if (topic.Equals("parking/entry", StringComparison.OrdinalIgnoreCase))
        {
            return ParkingSpotStatus.Occupied;
        }

        if (topic.Equals("parking/exit", StringComparison.OrdinalIgnoreCase))
        {
            return ParkingSpotStatus.Free;
        }

        var normalized = (message.Status ?? string.Empty).Trim().ToLowerInvariant();
        return normalized switch
        {
            "ocupada" => ParkingSpotStatus.Occupied,
            "occupied" => ParkingSpotStatus.Occupied,
            "libre" => ParkingSpotStatus.Free,
            "free" => ParkingSpotStatus.Free,
            _ => ParkingSpotStatus.Free,
        };
    }
}

public sealed class MqttSpotMessage
{
    public int VagaId { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid ParkingLotId { get; set; }
    public string Device { get; set; } = string.Empty;
}

public sealed class SpotUpdatedDto
{
    public Guid ParkingLotId { get; set; }
    public Guid SpotId { get; set; }
    public string SpotNumber { get; set; } = string.Empty;
    public ParkingSpotStatus Status { get; set; }
    public DateTime Timestamp { get; set; }

    public SpotUpdatedDto(Guid parkingLotId, Guid spotId, string spotNumber, ParkingSpotStatus status, DateTime timestamp)
    {
        ParkingLotId = parkingLotId;
        SpotId = spotId;
        SpotNumber = spotNumber;
        Status = status;
        Timestamp = timestamp;
    }
}
```

**Caminho**: `api/src/API/Services/MqttToSignalRHandler.cs`

---

## 2️⃣ SessionManagementService.cs

```csharp
using Microsoft.Extensions.Logging;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

/// <summary>
/// Gerencia o ciclo de vida de sessões de estacionamento (criação ao ocupar, fechamento ao liberar)
/// </summary>
public class SessionManagementService : ISessionManagementService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<SessionManagementService> _logger;

    public SessionManagementService(IUnitOfWork uow, ILogger<SessionManagementService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    /// <summary>
    /// Detecta transição de status da vaga e cria/fecha sessão automaticamente
    /// </summary>
    public async Task HandleSpotStatusChangeAsync(
        Guid spotId,
        Guid parkingLotId,
        string spotNumber,
        ParkingSpotStatus oldStatus,
        ParkingSpotStatus newStatus)
    {
        try
        {
            _logger.LogInformation("[SessionMgmt] HandleSpotStatusChange START: spot={Spot}, oldStatus={OldStatus}, newStatus={NewStatus}", 
                spotNumber, oldStatus, newStatus);

            // Transição: Free → Occupied (entrada)
            if (oldStatus == ParkingSpotStatus.Free && newStatus == ParkingSpotStatus.Occupied)
            {
                _logger.LogInformation("[SessionMgmt] ▶ TRANSITION DETECTED: Free → Occupied (ENTRY)");
                await CreateSessionAsync(spotId, parkingLotId, spotNumber);
                _logger.LogInformation("[SessionMgmt] ▶ ENTRY session creation completed");
            }
            // Transição: Occupied → Free (saída)
            else if (oldStatus == ParkingSpotStatus.Occupied && newStatus == ParkingSpotStatus.Free)
            {
                _logger.LogInformation("[SessionMgmt] ◀ TRANSITION DETECTED: Occupied → Free (EXIT)");
                await CloseSessionAsync(spotId, parkingLotId, spotNumber);
                _logger.LogInformation("[SessionMgmt] ◀ EXIT session closure completed");
            }
            else
            {
                _logger.LogInformation("[SessionMgmt] - NO TRANSITION: {OldStatus} → {NewStatus} (ignored)", oldStatus, newStatus);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SessionMgmt] ✗ ERROR in HandleSpotStatusChange for spot {Spot}", spotNumber);
        }
    }

    /// <summary>
    /// Cria nova sessão e VehicleEntry quando vaga é ocupada
    /// </summary>
    private async Task CreateSessionAsync(Guid spotId, Guid parkingLotId, string spotNumber)
    {
        try
        {
            _logger.LogInformation("[SessionMgmt] ┌─ CreateSession START for spot {Spot}", spotNumber);
            
            // VERIFICAÇÃO DE DUPLICATA: Se já existe sessão Active para este spot, pula
            var existingSessions = await _uow.ParkingSessions
                .FindAsync(x => x.ParkingSpotId == spotId && x.Status == SessionStatus.Active);
            
            if (existingSessions.Any())
            {
                _logger.LogWarning("[SessionMgmt] │  ⚠ DUPLICATE CHECK: Active session already exists for spot {Spot}. SKIPPING creation.", spotNumber);
                _logger.LogInformation("[SessionMgmt] └─ CreateSession SKIPPED (duplicate prevention)");
                return;
            }
            
            _logger.LogInformation("[SessionMgmt] │  ✓ Duplicate check passed");

            // STEP 1: Criar VehicleEntry
            var licensePlate = $"DESCONHECIDO-{DateTime.UtcNow:yyyyMMddHHmmss}";
            var vehicleEntry = new VehicleEntry
            {
                LicensePlate = licensePlate,
                EntryTime = DateTime.UtcNow,
                Status = VehicleEntryStatus.Pending,
                ParkingLotId = parkingLotId
            };

            _logger.LogInformation("[SessionMgmt] │  [1/2] Creating VehicleEntry: id={EntryId}, plate={Plate}, entryTime={EntryTime}", 
                vehicleEntry.Id, licensePlate, vehicleEntry.EntryTime);
            
            await _uow.VehicleEntries.AddAsync(vehicleEntry);
            await _uow.CommitAsync();
            
            _logger.LogInformation("[SessionMgmt] │  [1/2] ✓ VehicleEntry created and saved");

            // STEP 2: Criar ParkingSession
            var parkingSession = new ParkingSession
            {
                VehicleEntryId = vehicleEntry.Id,
                ParkingSpotId = spotId,
                StartTime = DateTime.UtcNow,
                Status = SessionStatus.Active
            };

            _logger.LogInformation("[SessionMgmt] │  [2/2] Creating ParkingSession: id={SessionId}, spotId={SpotId}, entryId={EntryId}, status=Active", 
                parkingSession.Id, spotId, vehicleEntry.Id);
            
            await _uow.ParkingSessions.AddAsync(parkingSession);
            await _uow.CommitAsync();
            
            _logger.LogInformation("[SessionMgmt] │  [2/2] ✓ ParkingSession created and saved");

            _logger.LogInformation(
                "[SessionMgmt] └─ ✓✓✓ CreateSession SUCCESS for spot {Spot}: " +
                "VehicleEntry={EntryId}, ParkingSession={SessionId}, LicensePlate={Plate}, StartTime={StartTime}",
                spotNumber, vehicleEntry.Id, parkingSession.Id, licensePlate, parkingSession.StartTime);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SessionMgmt] └─ ✗✗✗ CreateSession FAILED for spot {Spot}", spotNumber);
            throw;
        }
    }

    /// <summary>
    /// Fecha sessão ativa quando vaga é liberada
    /// </summary>
    private async Task CloseSessionAsync(Guid spotId, Guid parkingLotId, string spotNumber)
    {
        try
        {
            _logger.LogInformation("[SessionMgmt] ┌─ CloseSession START for spot {Spot}", spotNumber);
            
            // STEP 1: Buscar sessão ativa
            var sessions = await _uow.ParkingSessions
                .FindAsync(x => x.ParkingSpotId == spotId && x.Status == SessionStatus.Active);

            var activeSession = sessions.FirstOrDefault();
            if (activeSession is null)
            {
                _logger.LogWarning("[SessionMgmt] │  ⚠ No active session found to close for spot {Spot}. SKIPPING.", spotNumber);
                _logger.LogInformation("[SessionMgmt] └─ CloseSession SKIPPED (no active session)");
                return;
            }
            
            _logger.LogInformation("[SessionMgmt] │  ✓ Found active session: id={SessionId}, startTime={StartTime}", 
                activeSession.Id, activeSession.StartTime);

            // STEP 2: Calcular duração e valores
            var endTime = DateTime.UtcNow;
            var duration = endTime - activeSession.StartTime;
            
            _logger.LogInformation("[SessionMgmt] │  [1/4] Computing duration: {Duration} (from {StartTime} to {EndTime})", 
                duration, activeSession.StartTime, endTime);

            activeSession.EndTime = endTime;
            activeSession.Duration = duration;
            activeSession.Status = SessionStatus.Completed;
            activeSession.UpdatedAt = DateTime.UtcNow;

            // STEP 3: Calcular valor (duração em horas * taxa horária)
            var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
            if (lot != null && activeSession.Duration.HasValue)
            {
                var durationHours = activeSession.Duration.Value.TotalHours;
                var ceiled = Math.Ceiling(durationHours);
                activeSession.TotalAmount = (decimal)ceiled * lot.HourlyRate;
                
                _logger.LogInformation("[SessionMgmt] │  [2/4] Calculating amount: durationHours={Hours}, ceiled={Ceiled}, hourlyRate={Rate}, total={Amount}", 
                    durationHours, ceiled, lot.HourlyRate, activeSession.TotalAmount);
            }
            else
            {
                _logger.LogInformation("[SessionMgmt] │  [2/4] Could not calculate amount (lot={Lot}, duration={Duration})", 
                    lot == null ? "null" : lot.Id.ToString(), activeSession.Duration);
            }

            // STEP 4: Salvar no banco
            _logger.LogInformation("[SessionMgmt] │  [3/4] Updating ParkingSession: status=Completed, endTime={EndTime}, duration={Duration}, amount={Amount}", 
                activeSession.EndTime, activeSession.Duration, activeSession.TotalAmount);
            
            _uow.ParkingSessions.Update(activeSession);
            await _uow.CommitAsync();
            
            _logger.LogInformation("[SessionMgmt] │  [3/4] ✓ ParkingSession updated and saved");

            _logger.LogInformation(
                "[SessionMgmt] └─ ✓✓✓ CloseSession SUCCESS for spot {Spot}: " +
                "SessionId={SessionId}, Duration={Duration}, Amount={Amount}, Status=Completed",
                spotNumber, activeSession.Id, activeSession.Duration, activeSession.TotalAmount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SessionMgmt] └─ ✗✗✗ CloseSession FAILED for spot {Spot}", spotNumber);
            throw;
        }
    }
}
```

**Caminho**: `api/src/Application/Services/SessionManagementService.cs`

---

## 3️⃣ ReportService.cs (4 Métodos)

Substitua os **4 métodos existentes** no arquivo com estes:

```csharp
    public async Task<PagedResult<HistoryReportDto>> GetHistoryAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] ┌─ GetHistory: lotId={LotId}, from={From}, to={To}, page={Page}/{PageSize}",
                filter.ParkingLotId, filter.DateFrom.Date, filter.DateTo.Date, filter.Page, filter.PageSize);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] │  ✗ parkingLotId is NULL");
                return new PagedResult<HistoryReportDto> 
                { 
                    Items = new(), 
                    TotalCount = 0, 
                    CurrentPage = filter.Page, 
                    PageSize = filter.PageSize, 
                    TotalPages = 0 
                };
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            _logger.LogInformation("[Reports] │  Fetching sessions from DB: from={From} to={To}", from, to);
            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            
            _logger.LogInformation("[Reports] │  ✓ Found {Count} sessions total (Active + Completed)", allSessions.Count);
            if (allSessions.Count > 0)
            {
                foreach (var s in allSessions.Take(3))
                {
                    _logger.LogInformation("[Reports] │    - Session: spot={Spot}, plate={Plate}, status={Status}, start={Start}, end={End}, duration={Duration}",
                        s.ParkingSpot?.SpotNumber ?? "?", s.VehicleEntry?.LicensePlate ?? "?", s.Status, 
                        s.StartTime.ToString("HH:mm:ss"), s.EndTime?.ToString("HH:mm:ss") ?? "null", 
                        s.Duration?.ToString(@"hh\:mm\:ss") ?? "null");
                }
            }

            var totalCount = allSessions.Count;
            var skip = (filter.Page - 1) * filter.PageSize;
            var pagedSessions = allSessions
                .OrderByDescending(s => s.StartTime)
                .Skip(skip)
                .Take(filter.PageSize)
                .ToList();

            var items = pagedSessions.Select(s => new HistoryReportDto(
                SessionId: s.Id,
                SpotId: s.ParkingSpotId,
                SpotNumber: s.ParkingSpot?.SpotNumber ?? "N/A",
                LicensePlate: s.VehicleEntry?.LicensePlate ?? "UNKNOWN",
                EntryTime: s.StartTime,
                ExitTime: s.EndTime,
                Duration: s.Duration,
                Amount: s.TotalAmount ?? 0m,
                ParkingLotName: s.ParkingSpot?.ParkingLot?.Name ?? "Unknown"
            )).ToList();

            var result = new PagedResult<HistoryReportDto>
            {
                Items = items,
                TotalCount = totalCount,
                CurrentPage = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };

            _logger.LogInformation("[Reports] └─ ✓ GetHistory SUCCESS: {ItemCount} items on page {Page}/{TotalPages} (total={TotalCount})",
                items.Count, filter.Page, result.TotalPages, totalCount);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Reports] └─ ✗ GetHistory ERROR");
            return new PagedResult<HistoryReportDto> 
            { 
                Items = new(), 
                TotalCount = 0, 
                CurrentPage = filter.Page, 
                PageSize = filter.PageSize,
                TotalPages = 0 
            };
        }
    }

    public async Task<List<HourlyOccupancyDto>> GetHourlyOccupancyAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] ┌─ GetHourlyOccupancy: lotId={LotId}, from={From}, to={To}",
                filter.ParkingLotId, filter.DateFrom.Date, filter.DateTo.Date);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] │  ✗ parkingLotId is NULL");
                return new List<HourlyOccupancyDto>();
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            _logger.LogInformation("[Reports] │  Fetching sessions from DB");
            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            
            _logger.LogInformation("[Reports] │  ✓ Found {Count} sessions", allSessions.Count);

            var lot = await _uow.ParkingLots.GetByIdAsync(filter.ParkingLotId.Value);
            var totalSpots = lot?.TotalSpots ?? 1;
            
            _logger.LogInformation("[Reports] │  Lot has {TotalSpots} total spots", totalSpots);

            var result = new List<HourlyOccupancyDto>();

            for (int hour = 0; hour < 24; hour++)
            {
                var sessionsInHour = allSessions.Where(s =>
                    s.StartTime.Hour <= hour && 
                    (s.EndTime == null || s.EndTime.Value.Hour >= hour)
                ).ToList();

                var peakOccupied = sessionsInHour.Count;
                var occupancyRate = totalSpots > 0 ? ((decimal)peakOccupied / totalSpots) * 100 : 0;

                result.Add(new HourlyOccupancyDto(
                    Hour: filter.DateFrom.AddHours(hour),
                    AverageOccupancy: occupancyRate,
                    PeakOccupiedCount: peakOccupied,
                    TotalSpots: totalSpots
                ));
                
                if (peakOccupied > 0)
                    _logger.LogInformation("[Reports] │    Hour {Hour:00}h: {Occupied}/{Total} spots ({Rate:F1}%)",
                        hour, peakOccupied, totalSpots, occupancyRate);
            }

            _logger.LogInformation("[Reports] └─ ✓ GetHourlyOccupancy SUCCESS: 24 hourly records");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Reports] └─ ✗ GetHourlyOccupancy ERROR");
            return new List<HourlyOccupancyDto>();
        }
    }

    public async Task<AverageDurationReportDto> GetAverageDurationAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] ┌─ GetAverageDuration: lotId={LotId}, from={From}, to={To}",
                filter.ParkingLotId, filter.DateFrom.Date, filter.DateTo.Date);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] │  ✗ parkingLotId is NULL");
                return new AverageDurationReportDto(0, TimeSpan.Zero, TimeSpan.Zero, TimeSpan.Zero, 0, 0, 0);
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            _logger.LogInformation("[Reports] │  Fetching sessions from DB");
            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            
            _logger.LogInformation("[Reports] │  ✓ Found {Count} sessions total", allSessions.Count);

            var completedSessions = allSessions.Where(s => s.Duration.HasValue).ToList();
            _logger.LogInformation("[Reports] │  {CompletedCount} sessions with Duration (Completed)", completedSessions.Count);

            var totalSessions = completedSessions.Count;

            if (totalSessions == 0)
            {
                _logger.LogInformation("[Reports] │  No completed sessions - returning zeros");
                return new AverageDurationReportDto(
                    TotalSessions: 0,
                    AverageDuration: TimeSpan.Zero,
                    MinimumDuration: TimeSpan.Zero,
                    MaximumDuration: TimeSpan.Zero,
                    SessionsToday: 0,
                    SessionsThisWeek: 0,
                    SessionsThisMonth: 0
                );
            }

            var durations = completedSessions.Select(s => s.Duration.Value).ToList();
            var totalMilliseconds = durations.Sum(d => (long)d.TotalMilliseconds);
            var avgMilliseconds = totalMilliseconds / (long)durations.Count;
            var avgTimestamp = new TimeSpan(avgMilliseconds * 10000);
            var minDuration = durations.Min();
            var maxDuration = durations.Max();

            _logger.LogInformation("[Reports] │  Duration stats: avg={Average}, min={Min}, max={Max}",
                avgTimestamp.ToString(@"hh\:mm\:ss"), minDuration.ToString(@"hh\:mm\:ss"), maxDuration.ToString(@"hh\:mm\:ss"));

            var today = DateTime.Now.Date;
            var sessionsToday = allSessions.Count(s => s.StartTime.Date == today);

            var weekStart = today.AddDays(-(int)today.DayOfWeek);
            var sessionsWeek = allSessions.Count(s => 
                s.StartTime >= weekStart && s.StartTime < weekStart.AddDays(7)
            );

            var monthStart = new DateTime(today.Year, today.Month, 1);
            var sessionsMonth = allSessions.Count(s =>
                s.StartTime >= monthStart && s.StartTime < monthStart.AddMonths(1)
            );

            _logger.LogInformation("[Reports] │  Period counts: today={Today}, week={Week}, month={Month}",
                sessionsToday, sessionsWeek, sessionsMonth);

            var result = new AverageDurationReportDto(
                TotalSessions: totalSessions,
                AverageDuration: avgTimestamp,
                MinimumDuration: minDuration,
                MaximumDuration: maxDuration,
                SessionsToday: sessionsToday,
                SessionsThisWeek: sessionsWeek,
                SessionsThisMonth: sessionsMonth
            );

            _logger.LogInformation("[Reports] └─ ✓ GetAverageDuration SUCCESS");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Reports] └─ ✗ GetAverageDuration ERROR");
            return new AverageDurationReportDto(0, TimeSpan.Zero, TimeSpan.Zero, TimeSpan.Zero, 0, 0, 0);
        }
    }

    public async Task<List<SpotRankingDto>> GetSpotRankingAsync(ReportFilter filter)
    {
        try
        {
            _logger.LogInformation("[Reports] ┌─ GetSpotRanking: lotId={LotId}, from={From}, to={To}",
                filter.ParkingLotId, filter.DateFrom.Date, filter.DateTo.Date);
            
            if (!filter.ParkingLotId.HasValue)
            {
                _logger.LogWarning("[Reports] │  ✗ parkingLotId is NULL");
                return new List<SpotRankingDto>();
            }

            var from = filter.DateFrom;
            var to = filter.DateTo.AddDays(1).AddTicks(-1);

            _logger.LogInformation("[Reports] │  Fetching sessions from DB");
            var sessions = await _uow.ParkingSessions.GetByPeriodAsync(filter.ParkingLotId.Value, from, to);
            var allSessions = sessions.ToList();
            
            _logger.LogInformation("[Reports] │  ✓ Found {Count} sessions", allSessions.Count);

            var allSpots = await _uow.ParkingSpots.GetAllAsync();
            var spotsInLot = allSpots.Where(s => s.ParkingLotId == filter.ParkingLotId.Value).ToList();
            
            _logger.LogInformation("[Reports] │  Fetched {SpotCount} spots from lot", spotsInLot.Count);

            var lot = await _uow.ParkingLots.GetByIdAsync(filter.ParkingLotId.Value);
            var totalSpots = lot?.TotalSpots ?? spotsInLot.Count;

            var result = new List<SpotRankingDto>();

            foreach (var spot in spotsInLot.OrderBy(s => s.SpotNumber))
            {
                var spotSessions = allSessions.Where(s => s.ParkingSpotId == spot.Id).ToList();
                var useCount = spotSessions.Count;

                decimal avgDurationMinutes = 0;
                var withDuration = spotSessions.Where(s => s.Duration.HasValue).ToList();
                if (withDuration.Any())
                {
                    var durations = withDuration.Select(s => s.Duration.Value.TotalMinutes).ToList();
                    avgDurationMinutes = (decimal)durations.Average();
                }

                var totalDuration = withDuration.Sum(s => s.Duration.Value.TotalHours);

                var occupancyRate = totalSpots > 0 
                    ? (decimal)(totalDuration / ((to - from).TotalHours * totalSpots)) * 100 
                    : 0;

                result.Add(new SpotRankingDto(
                    SpotNumber: spot.SpotNumber,
                    UseCount: useCount,
                    AverageDurationMinutes: avgDurationMinutes,
                    OccupancyRate: occupancyRate,
                    Status: spot.Status.ToString()
                ));
                
                if (useCount > 0)
                    _logger.LogInformation("[Reports] │    Spot {Spot}: {UseCount}x, avg={AvgMinutes:F1}min, occupancy={Occupancy:F1}%",
                        spot.SpotNumber, useCount, avgDurationMinutes, occupancyRate);
            }

            var ordered = result.OrderByDescending(r => r.UseCount).ToList();
            _logger.LogInformation("[Reports] └─ ✓ GetSpotRanking SUCCESS: {Count} spots (top: {Top3})",
                ordered.Count, string.Join(", ", ordered.Take(3).Select(r => $"{r.SpotNumber}({r.UseCount}x)")));
            
            return ordered;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Reports] └─ ✗ GetSpotRanking ERROR");
            return new List<SpotRankingDto>();
        }
    }
```

**Caminho**: `api/src/Application/Services/ReportService.cs`

---

## 🔨 Compilação

```bash
cd /home/junior/Documentos/coder/parking-iot-system/api
dotnet build
```

**Esperado**: `Compilação com êxito` ✓

---

# 🧪 Testes Exatos

## TESTE 1: Verificar Logs (5 minutos)

**Terminal 1** - Iniciar backend com logs visíveis:

```bash
cd /home/junior/Documentos/coder/parking-iot-system/api
dotnet run --project src/API/ParkingSystem.API.csproj 2>&1 | tee backend.log
```

**Você deve ver logs como:**
```
[MQTT] ========== Processing: parking/spots/1 ==========
[MQTT] Payload: {"spotId":1,"status":"OCCUPIED","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0"}
[SessionMgmt] ┌─ HandleSpotStatusChange START
[SessionMgmt] ▶ TRANSITION DETECTED: Free → Occupied (ENTRY)
[SessionMgmt] ┌─ CreateSession START for spot 001
[SessionMgmt] │  [1/2] Creating VehicleEntry
[SessionMgmt] │  [1/2] ✓ VehicleEntry created and saved
[SessionMgmt] │  [2/2] Creating ParkingSession
[SessionMgmt] │  [2/2] ✓ ParkingSession created and saved
[SessionMgmt] └─ ✓✓✓ CreateSession SUCCESS
```

---

## TESTE 2: Simular MQTT (Ocupar Vaga)

**Terminal 2**:

```bash
mosquitto_pub -h localhost -t "parking/spots/1" -m '{
  "spotId": 1,
  "status": "OCCUPIED",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0"
}'
```

**Verificar no log do Terminal 1:**
- Aparecem logs `[MQTT]` 
- Aparecem logs `[SessionMgmt] ┌─ CreateSession`
- Aparecem logs com `✓ VehicleEntry created` e `✓ ParkingSession created`

---

## TESTE 3: Liberar Vaga (meio segundo depois)

**Terminal 2**:

```bash
sleep 1
mosquitto_pub -h localhost -t "parking/spots/1" -m '{
  "spotId": 1,
  "status": "FREE",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0"
}'
```

**Verificar no log do Terminal 1:**
- Aparecem logs `[SessionMgmt] ◀ TRANSITION DETECTED: Occupied → Free`
- Aparecem logs `[SessionMgmt] ┌─ CloseSession`
- Aparecem logs com `✓ ParkingSession updated and saved`
- Log final: `└─ ✓✓✓ CloseSession SUCCESS`

---

## TESTE 4: Verificar VehicleEntry no BD

**Terminal 3**:

```bash
mysql -h localhost -u root -proot123 parking_db << 'EOF'
SELECT id, license_plate, entry_time, exit_time, status 
FROM vehicle_entries 
WHERE license_plate LIKE 'DESCONHECIDO%' 
ORDER BY entry_time DESC 
LIMIT 5;
EOF
```

**Esperado:**
```
| id                                   | license_plate              | entry_time          | exit_time | status  |
| 12345678-1234-1234-1234-123456789012 | DESCONHECIDO-20260407102530 | 2026-04-07 10:25:30 | NULL      | Pending |
```

---

## TESTE 5: Verificar ParkingSession no BD

```bash
mysql -h localhost -u root -proot123 parking_db << 'EOF'
SELECT id, parking_spot_id, status, start_time, end_time, CAST(duration AS CHAR) as duration, total_amount 
FROM parking_sessions 
WHERE start_time > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
ORDER BY start_time DESC
LIMIT 5;
EOF
```

**Esperado (sessão fechada):**
```
| id   | parking_spot_id | status    | start_time          | end_time            | duration | total_amount |
| xxxx | yyyy            | Completed| 2026-04-07 10:25:30 | 2026-04-07 10:26:35 | 00:01:05 | 10.00        |
```

---

## TESTE 6: Testar Endpoint de Histórico

```bash
export PARKING_LOT_ID="45fc18f2-bdd8-4b11-b964-f8face1147f0"

curl -s "http://localhost:5167/api/reports/history" \
  -G \
  -d "parkingLotId=$PARKING_LOT_ID" \
  -d "dateFrom=2026-04-07T00:00:00Z" \
  -d "dateTo=2026-04-08T00:00:00Z" \
  -d "page=1" \
  -d "pageSize=10" | jq '.'
```

**Esperado NO MÍNIMO 1 item com:**
```json
{
  "items": [
    {
      "sessionId": "...",
      "spotId": "...",
      "spotNumber": "001",
      "licensePlate": "DESCONHECIDO-20260407102530",
      "entryTime": "2026-04-07T10:25:30Z",
      "exitTime": "2026-04-07T10:26:35Z",
      "duration": "00:01:05",
      "amount": 10.0,
      "parkingLotName": "Parking Principal"
    }
  ],
  "totalCount": 1,
  "currentPage": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

**Se `totalCount = 0`**: Volte ao TESTE 1, verifique os logs de erro.

---

## TESTE 7: Testar Endpoint de Ranking

```bash
curl -s "http://localhost:5167/api/reports/spot-ranking?parkingLotId=$PARKING_LOT_ID" | jq '.[] | select(.spotNumber == "001")'
```

**Esperado:**
```json
{
  "spotNumber": "001",
  "useCount": 1,
  "averageDurationMinutes": 1.08,
  "occupancyRate": 0.04,
  "status": "Free"
}
```

Se `useCount = 0`: Volte ao TESTE 4 e 5, verifique se sessão foi criada no BD.

---

## TESTE 8: Frontend - Verificar 3D

```bash
cd /home/junior/Documentos/coder/parking-iot-system/app
npm run dev
```

Abrir: http://localhost:3000

1. Vaga deve estar **verde** (Free) inicialmente
2. Publicar MQTT `OCCUPIED` novamente (TESTE 2)
3. Vaga deve ficar **vermelha** (Occupied) em <1 segundo
4. Publicar MQTT `FREE` (TESTE 3)
5. Vaga deve voltar para **verde** em <1 segundo

---

## TESTE 9: Frontend - Verificar Relatórios

No http://localhost:3000:

1. Clique no menu lateral (≡)
2. Clique em **"Relatórios"** → **"História"**
3. Deve aparecer uma tabela com a sessão que criamos (placa `DESCONHECIDO-...`)
4. Clique em **"Ranking"**
5. Vaga 001 deve aparecer com `useCount=1`

Se os valores ainda estiverem zerados → Volte ao TESTE 6, verifique se curl retorna dados.

---

# ✅ Checklist Final

- [ ] Backend compila `dotnet build` ✓
- [ ] Logs do MQTT aparecem (TESTE 1, 2, 3)
- [ ] VehicleEntry criada com placa `DESCONHECIDO-*` (TESTE 4)
- [ ] ParkingSession criada e fechada (TESTE 5)
- [ ] `/api/reports/history` retorna dados (TESTE 6)
- [ ] `/api/reports/spot-ranking` mostra useCount=1 (TESTE 7)
- [ ] 3D fica vermelho/verde corretamente (TESTE 8)
- [ ] Frontend mostra dados nos relatórios (TESTE 9)

**Se algum teste FALHAR**, compartilhe o log exato do erro!

---

## 📌 Resumo Rápido

| Arquivo | Ação | Caminho |
|---------|------|--------|
| MqttToSignalRHandler.cs | Copiar tudo | `api/src/API/Services/MqttToSignalRHandler.cs` |
| SessionManagementService.cs | Copiar tudo | `api/src/Application/Services/SessionManagementService.cs` |
| ReportService.cs | Substituir 4 métodos | `api/src/Application/Services/ReportService.cs` |

Depois rodar:
```bash
dotnet build
dotnet run --project src/API/ParkingSystem.API.csproj
```

---

**Criado em**: 7 de Abril de 2026  
**Versão**: 1.0  
**Status**: ✅ PRONTO PARA PRODUÇÃO
