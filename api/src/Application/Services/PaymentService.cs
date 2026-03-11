using Microsoft.Extensions.Logging;
using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Payment;
using ParkingSystem.Application.Services.Interfaces;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Domain.Enums;
using ParkingSystem.Domain.Interfaces;

namespace ParkingSystem.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(IUnitOfWork uow, ILogger<PaymentService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<ApiResponse<PaymentResponseDto>> ProcessPaymentAsync(ProcessPaymentDto request)
    {
        var session = await _uow.ParkingSessions.GetWithDetailsAsync(request.SessionId);
        if (session is null || session.IsDeleted)
            return ApiResponse<PaymentResponseDto>.NotFound("Sessão não encontrada.");

        if (session.Status != SessionStatus.Completed)
            return ApiResponse<PaymentResponseDto>.Fail("O pagamento só pode ser realizado após o encerramento da sessão.", 409);

        var existingPayment = await _uow.Payments.GetBySessionIdAsync(request.SessionId);
        if (existingPayment is not null)
            return ApiResponse<PaymentResponseDto>.Fail("Esta sessão já foi paga.", 409);

        if (session.TotalAmount is null)
            return ApiResponse<PaymentResponseDto>.Fail("Valor da sessão não calculado.", 400);

        var payment = new Payment
        {
            ParkingSessionId = session.Id,
            Amount = session.TotalAmount.Value,
            PaidAt = DateTime.UtcNow,
            Status = PaymentStatus.Paid,
            PaymentMethod = request.PaymentMethod
        };

        await _uow.Payments.AddAsync(payment);

        await _uow.SystemLogs.AddAsync(new SystemLog
        {
            Event = "PAYMENT_PROCESSED",
            Description = $"Pagamento de R${payment.Amount:F2} processado. Método: {payment.PaymentMethod}",
            Source = "PaymentService"
        });

        await _uow.CommitAsync();

        _logger.LogInformation("Pagamento processado: Sessão {SessionId}, Valor {Amount}", session.Id, payment.Amount);

        return ApiResponse<PaymentResponseDto>.Created(MapToDto(payment, session.VehicleEntry?.LicensePlate ?? ""));
    }

    public async Task<ApiResponse<IEnumerable<PaymentResponseDto>>> GetByPeriodAsync(DateTime from, DateTime to)
    {
        var payments = await _uow.Payments.GetByPeriodAsync(from, to);
        var result = payments.Select(p => MapToDto(p, p.ParkingSession?.VehicleEntry?.LicensePlate ?? ""));
        return ApiResponse<IEnumerable<PaymentResponseDto>>.Ok(result);
    }

    public async Task<ApiResponse<PaymentResponseDto>> GetBySessionAsync(Guid sessionId)
    {
        var payment = await _uow.Payments.GetBySessionIdAsync(sessionId);
        if (payment is null)
            return ApiResponse<PaymentResponseDto>.NotFound("Pagamento não encontrado.");

        return ApiResponse<PaymentResponseDto>.Ok(
            MapToDto(payment, payment.ParkingSession?.VehicleEntry?.LicensePlate ?? ""));
    }

    private static PaymentResponseDto MapToDto(Payment p, string plate) => new(
        p.Id, p.ParkingSessionId, plate, p.Amount, p.PaidAt, p.Status, p.PaymentMethod ?? "");
}
