using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Domain.Entities;

public class Payment : BaseEntity
{
    public Guid ParkingSessionId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? PaymentMethod { get; set; }

    public ParkingSession ParkingSession { get; set; } = null!;
}
