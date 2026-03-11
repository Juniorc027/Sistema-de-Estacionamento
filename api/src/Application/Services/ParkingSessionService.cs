using Microsoft.Extensions.Logging;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.ParkingSession;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

public class ParkingSessionService : IParkingSessionService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ParkingSessionService> _logger;

    public ParkingSessionService(IUnitOfWork uow, ILogger<ParkingSessionService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<ApiResponse<ParkingSessionResponseDto>> OccupySpotAsync(Guid parkingLotId)
    {
        await _uow.BeginTransactionAsync();
        try
        {
            // Get oldest pending entry
            var pendingEntry = await _uow.VehicleEntries.GetOldestPendingAsync(parkingLotId);
            if (pendingEntry is null)
                return ApiResponse<ParkingSessionResponseDto>.Fail("Nenhum veículo pendente na fila.", 409);

            // Get first free spot
            var freeSpot = await _uow.ParkingSpots.GetFirstFreeSpotAsync(parkingLotId);
            if (freeSpot is null)
                return ApiResponse<ParkingSessionResponseDto>.Fail("Nenhuma vaga disponível.", 409);

            // Validate consistency
            var activeSessions = await _uow.ParkingSessions.CountActiveSessionsAsync(parkingLotId);
            var availableSpots = await _uow.ParkingSpots.CountByStatusAsync(parkingLotId, ParkingSpotStatus.Free);
            if (availableSpots == 0)
                return ApiResponse<ParkingSessionResponseDto>.Fail("Inconsistência: sem vagas livres.", 409);

            // Occupy spot
            freeSpot.Status = ParkingSpotStatus.Occupied;
            freeSpot.UpdatedAt = DateTime.UtcNow;
            _uow.ParkingSpots.Update(freeSpot);

            // Update entry status
            pendingEntry.Status = VehicleEntryStatus.Assigned;
            pendingEntry.UpdatedAt = DateTime.UtcNow;
            _uow.VehicleEntries.Update(pendingEntry);

            // Create session
            var session = new ParkingSession
            {
                VehicleEntryId = pendingEntry.Id,
                ParkingSpotId = freeSpot.Id,
                StartTime = DateTime.UtcNow,
                Status = SessionStatus.Active
            };
            await _uow.ParkingSessions.AddAsync(session);

            await _uow.SystemLogs.AddAsync(new SystemLog
            {
                Event = "SPOT_OCCUPIED",
                Description = $"Vaga {freeSpot.SpotNumber} ocupada pelo veículo {pendingEntry.LicensePlate}",
                Source = "ParkingSessionService"
            });

            await _uow.CommitAsync();
            await _uow.CommitTransactionAsync();

            _logger.LogInformation("Vaga {Spot} ocupada por {Plate}", freeSpot.SpotNumber, pendingEntry.LicensePlate);

            var response = MapToDto(session, pendingEntry.LicensePlate, freeSpot.SpotNumber);
            return ApiResponse<ParkingSessionResponseDto>.Created(response, "Vaga ocupada com sucesso.");
        }
        catch
        {
            await _uow.RollbackTransactionAsync();
            throw;
        }
    }

    public async Task<ApiResponse<CloseSessionResponseDto>> ReleaseSpotAsync(Guid spotId)
    {
        await _uow.BeginTransactionAsync();
        try
        {
            var spot = await _uow.ParkingSpots.GetByIdAsync(spotId);
            if (spot is null || spot.IsDeleted)
                return ApiResponse<CloseSessionResponseDto>.NotFound("Vaga não encontrada.");

            if (spot.Status != ParkingSpotStatus.Occupied)
                return ApiResponse<CloseSessionResponseDto>.Fail("A vaga não está ocupada.", 409);

            var session = await _uow.ParkingSessions.GetActiveBySpotAsync(spotId);
            if (session is null)
                return ApiResponse<CloseSessionResponseDto>.Fail("Nenhuma sessão ativa encontrada para essa vaga.", 404);

            var lot = await _uow.ParkingLots.GetByIdAsync(spot.ParkingLotId);

            // Close session
            session.EndTime = DateTime.UtcNow;
            session.Duration = session.EndTime.Value - session.StartTime;
            session.Status = SessionStatus.Completed;
            session.TotalAmount = CalculateAmount(session.Duration.Value, lot?.HourlyRate ?? 0);
            session.UpdatedAt = DateTime.UtcNow;
            _uow.ParkingSessions.Update(session);

            // Free spot
            spot.Status = ParkingSpotStatus.Free;
            spot.UpdatedAt = DateTime.UtcNow;
            _uow.ParkingSpots.Update(spot);

            // Update vehicle entry
            var entry = await _uow.VehicleEntries.GetByIdAsync(session.VehicleEntryId);
            if (entry is not null)
            {
                entry.Status = VehicleEntryStatus.Exited;
                entry.UpdatedAt = DateTime.UtcNow;
                _uow.VehicleEntries.Update(entry);
            }

            await _uow.SystemLogs.AddAsync(new SystemLog
            {
                Event = "SPOT_RELEASED",
                Description = $"Vaga {spot.SpotNumber} liberada. Duração: {session.Duration.Value.TotalMinutes:F1} min. Valor: R${session.TotalAmount:F2}",
                Source = "ParkingSessionService"
            });

            await _uow.CommitAsync();
            await _uow.CommitTransactionAsync();

            _logger.LogInformation("Vaga {Spot} liberada. Sessão {Id}. Valor: {Amount}", spot.SpotNumber, session.Id, session.TotalAmount);

            var response = new CloseSessionResponseDto(
                session.Id,
                entry?.LicensePlate ?? "",
                spot.SpotNumber,
                session.StartTime,
                session.EndTime.Value,
                session.Duration.Value.TotalMinutes,
                session.TotalAmount.Value);

            return ApiResponse<CloseSessionResponseDto>.Ok(response, "Vaga liberada com sucesso.");
        }
        catch
        {
            await _uow.RollbackTransactionAsync();
            throw;
        }
    }

    public async Task<ApiResponse<IEnumerable<ParkingSessionResponseDto>>> GetActiveSessionsAsync(Guid parkingLotId)
    {
        var sessions = await _uow.ParkingSessions.GetActiveSessionsWithDetailsAsync(parkingLotId);

        var result = sessions.Select(s => MapToDto(s,
            s.VehicleEntry?.LicensePlate ?? "",
            s.ParkingSpot?.SpotNumber ?? ""));

        return ApiResponse<IEnumerable<ParkingSessionResponseDto>>.Ok(result);
    }

    public async Task<ApiResponse<ParkingSessionResponseDto>> GetByIdAsync(Guid id)
    {
        var session = await _uow.ParkingSessions.GetWithDetailsAsync(id);
        if (session is null || session.IsDeleted)
            return ApiResponse<ParkingSessionResponseDto>.NotFound("Sessão não encontrada.");

        return ApiResponse<ParkingSessionResponseDto>.Ok(MapToDto(session,
            session.VehicleEntry?.LicensePlate ?? "",
            session.ParkingSpot?.SpotNumber ?? ""));
    }

    private static decimal CalculateAmount(TimeSpan duration, decimal hourlyRate)
    {
        var hours = Math.Ceiling(duration.TotalMinutes / 60.0);
        return (decimal)hours * hourlyRate;
    }

    private static ParkingSessionResponseDto MapToDto(ParkingSession s, string plate, string spotNumber) => new(
        s.Id, s.VehicleEntryId, plate, s.ParkingSpotId, spotNumber,
        s.StartTime, s.EndTime, s.Duration?.TotalMinutes, s.TotalAmount,
        s.Status, s.Status.ToString());
}
