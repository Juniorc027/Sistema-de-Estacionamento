using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Domain.Entities;

public class ParkingSession : BaseEntity
{
    public Guid VehicleEntryId { get; set; }
    public Guid ParkingSpotId { get; set; }
    public DateTime StartTime { get; set; } = DateTime.UtcNow;
    public DateTime? EndTime { get; set; }
    public TimeSpan? Duration { get; set; }
    public decimal? TotalAmount { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.Active;

    public VehicleEntry VehicleEntry { get; set; } = null!;
    public ParkingSpot ParkingSpot { get; set; } = null!;
    public Payment? Payment { get; set; }
}
