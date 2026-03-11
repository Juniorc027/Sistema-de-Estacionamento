using ParkingSystem.Application.Common;
using ParkingSystem.Application.DTOs.Payment;

namespace ParkingSystem.Application.Services.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<PaymentResponseDto>> ProcessPaymentAsync(ProcessPaymentDto request);
    Task<ApiResponse<IEnumerable<PaymentResponseDto>>> GetByPeriodAsync(DateTime from, DateTime to);
    Task<ApiResponse<PaymentResponseDto>> GetBySessionAsync(Guid sessionId);
}
