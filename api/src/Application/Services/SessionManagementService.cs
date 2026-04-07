using Microsoft.Extensions.Logging;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

/// <summary>
/// Implementação para gerenciar ciclo de vida de sessões de estacionamento
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

    public async Task HandleSpotStatusChangeAsync(
        Guid spotId,
        Guid parkingLotId,
        string spotNumber,
        ParkingSpotStatus oldStatus,
        ParkingSpotStatus newStatus)
    {
        try
        {
            // Transição: Libre → Ocupada
            if (oldStatus == ParkingSpotStatus.Free && newStatus == ParkingSpotStatus.Occupied)
            {
                await CreateSessionAsync(spotId, parkingLotId, spotNumber);
            }
            // Transição: Ocupada → Libre
            else if (oldStatus == ParkingSpotStatus.Occupied && newStatus == ParkingSpotStatus.Free)
            {
                await CloseSessionAsync(spotId, parkingLotId, spotNumber);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SessionMgmt] Error handling spot status change for {Spot}", spotNumber);
        }
    }

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

            // STEP 1: Gerar placa curta (máximo 7 caracteres para caber no banco)
            // Formato: "VG-{spotNumber:000}" ou versão aleatória se backup
            var licensePlate = GenerateShortLicensePlate(spotNumber);
            _logger.LogInformation("[SessionMgmt] │  Generated license plate: {Plate} (length: {Length}/10 max)", licensePlate, licensePlate.Length);

            // STEP 2: Criar VehicleEntry com placa curta
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

            // STEP 3: CommitAsync com tratamento específico de erro de BD
            try
            {
                _logger.LogInformation("[SessionMgmt] │  [1/2] Committing VehicleEntry to database...");
                await _uow.CommitAsync();
                _logger.LogInformation("[SessionMgmt] │  [1/2] ✓ VehicleEntry created and saved (id={EntryId})", vehicleEntry.Id);
            }
            catch (Exception dbEx)
            {
                _logger.LogError("[SessionMgmt] │  [1/2] ✗ DATABASE ERROR saving VehicleEntry");
                _logger.LogError("[SessionMgmt] │    Exception Type: {ExceptionType}", dbEx.GetType().Name);
                _logger.LogError("[SessionMgmt] │    Message: {Message}", dbEx.Message);
                
                if (dbEx.InnerException != null)
                    _logger.LogError("[SessionMgmt] │    InnerException: {InnerMessage}", dbEx.InnerException.Message);
                
                _logger.LogError("[SessionMgmt] │    VehicleEntry Data - ID: {Id}, Plate: {Plate}, Length: {Length}",
                    vehicleEntry.Id, vehicleEntry.LicensePlate, vehicleEntry.LicensePlate?.Length ?? 0);
                
                _logger.LogError(dbEx, "[SessionMgmt] └─ ✗✗✗ CreateSession FAILED at VehicleEntry CommitAsync");
                throw; // Re-throw para não continuar
            }

            // STEP 4: Criar ParkingSession - SÓ APÓS sucesso da VehicleEntry
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

            // STEP 5: CommitAsync da ParkingSession com tratamento de erro
            try
            {
                _logger.LogInformation("[SessionMgmt] │  [2/2] Committing ParkingSession to database...");
                await _uow.CommitAsync();
                _logger.LogInformation("[SessionMgmt] │  [2/2] ✓ ParkingSession created and saved (id={SessionId})", parkingSession.Id);
            }
            catch (Exception dbEx)
            {
                _logger.LogError("[SessionMgmt] │  [2/2] ✗ DATABASE ERROR saving ParkingSession");
                _logger.LogError("[SessionMgmt] │    Exception Type: {ExceptionType}", dbEx.GetType().Name);
                _logger.LogError("[SessionMgmt] │    Message: {Message}", dbEx.Message);
                
                if (dbEx.InnerException != null)
                    _logger.LogError("[SessionMgmt] │    InnerException: {InnerMessage}", dbEx.InnerException.Message);
                
                _logger.LogError("[SessionMgmt] │    ParkingSession Data - ID: {Id}, SpotId: {SpotId}, EntryId: {EntryId}",
                    parkingSession.Id, parkingSession.ParkingSpotId, parkingSession.VehicleEntryId);
                
                _logger.LogError(dbEx, "[SessionMgmt] └─ ✗✗✗ CreateSession FAILED at ParkingSession CommitAsync");
                throw; // Re-throw para notificar quem chamou
            }

            _logger.LogInformation(
                "[SessionMgmt] └─ ✓✓✓ CreateSession SUCCESS for spot {Spot}: " +
                "VehicleEntry(id={EntryId}, plate={Plate}), ParkingSession(id={SessionId}, status=Active), StartTime={StartTime}",
                spotNumber, vehicleEntry.Id, licensePlate, parkingSession.Id, parkingSession.StartTime);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SessionMgmt] └─ ✗✗✗ CreateSession FAILED for spot {Spot} - OUTER catch block", spotNumber);
            throw;
        }
    }

    /// <summary>
    /// Gera uma placa curta e única (máximo 10 caracteres) para evitar erro de banco de dados
    /// </summary>
    private string GenerateShortLicensePlate(string spotNumber)
    {
        try
        {
            // Formato: "VG-{spotNumber}" - Ex: "VG-001" (6 caracteres)
            // Cabe confortavelmente em colunas de 7-10 caracteres
            var plate = $"VG-{spotNumber}";
            
            // Validação de segurança - se ainda assim não couber, usar backup
            if (plate.Length <= 10)
            {
                return plate;
            }

            // Fallback: usar timestamp curto last 8 digits + random 2
            var timestamp = DateTime.UtcNow.Ticks.ToString().Substring(Math.Max(0, DateTime.UtcNow.Ticks.ToString().Length - 6));
            var random = new Random(DateTime.UtcNow.Millisecond).Next(0, 99).ToString("D2");
            var fallbackPlate = $"VG{timestamp[^2..]}{random}"; // Últimos 2 do timestamp + 2 aleatórios
            
            _logger.LogWarning("[SessionMgmt] │  License plate fallback used: {Plate} (length was {Length})", fallbackPlate, plate.Length);
            return fallbackPlate;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SessionMgmt] │  Error generating license plate, using default");
            // Último recurso: marcador genérico muito curto
            return "VG000";
        }
    }

    private async Task CloseSessionAsync(Guid spotId, Guid parkingLotId, string spotNumber)
    {
        try
        {
            // Busca a sessão ativa mais recente para esta vaga
            var sessions = await _uow.ParkingSessions
                .FindAsync(x => x.ParkingSpotId == spotId && x.Status == SessionStatus.Active);

            var activeSession = sessions.FirstOrDefault();
            if (activeSession is null)
            {
                _logger.LogWarning("[SessionMgmt] No active session found to close for spot {Spot}", spotNumber);
                return;
            }

            // Preenche dados de saída
            activeSession.EndTime = DateTime.UtcNow;
            activeSession.Duration = activeSession.EndTime.Value - activeSession.StartTime;
            activeSession.Status = SessionStatus.Completed;
            activeSession.UpdatedAt = DateTime.UtcNow;

            // Calcula valor (simples: duração em horas * taxa horária)
            var lot = await _uow.ParkingLots.GetByIdAsync(parkingLotId);
            if (lot != null && activeSession.Duration.HasValue)
            {
                var durationHours = activeSession.Duration.Value.TotalHours;
                activeSession.TotalAmount = (decimal)Math.Ceiling(durationHours) * lot.HourlyRate;
            }

            _uow.ParkingSessions.Update(activeSession);
            await _uow.CommitAsync();

            _logger.LogInformation("[SessionMgmt] ✓ Session CLOSED for spot {Spot}: duration={Duration}, amount={Amount}, status=Completed",
                spotNumber, activeSession.Duration, activeSession.TotalAmount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SessionMgmt] Failed to close session for spot {Spot}", spotNumber);
            throw;
        }
    }
}
