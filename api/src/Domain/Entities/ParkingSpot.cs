using ParkingSystem.Domain.Enums;

namespace ParkingSystem.Domain.Entities;

public class ParkingSpot : BaseEntity
{
    public string SpotNumber { get; set; } = string.Empty;
    public ParkingSpotStatus Status { get; set; } = ParkingSpotStatus.Free;
    public Guid ParkingLotId { get; set; }

    public ParkingLot ParkingLot { get; set; } = null!;
    public ICollection<ParkingSession> ParkingSessions { get; set; } = new List<ParkingSession>();
}
