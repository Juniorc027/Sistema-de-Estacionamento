using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Application.DTOs.Payment;

public record ProcessPaymentDto(Guid SessionId, string PaymentMethod);

public record PaymentResponseDto(
    Guid Id,
    Guid SessionId,
    string LicensePlate,
    decimal Amount,
    DateTime PaidAt,
    PaymentStatus Status,
    string PaymentMethod);
