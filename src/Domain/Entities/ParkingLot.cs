namespace ParkingSystem.Domain.Entities;

public class ParkingLot : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public int TotalSpots { get; set; }
    public decimal HourlyRate { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ParkingSpot> ParkingSpots { get; set; } = new List<ParkingSpot>();
}
