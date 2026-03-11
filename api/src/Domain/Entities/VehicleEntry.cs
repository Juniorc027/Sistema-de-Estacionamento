using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Domain.Entities;

public class VehicleEntry : BaseEntity
{
    public string LicensePlate { get; set; } = string.Empty;
    public DateTime EntryTime { get; set; } = DateTime.UtcNow;
    public VehicleEntryStatus Status { get; set; } = VehicleEntryStatus.Pending;
    public Guid ParkingLotId { get; set; }

    public ParkingLot ParkingLot { get; set; } = null!;
    public ParkingSession? ParkingSession { get; set; }
}
