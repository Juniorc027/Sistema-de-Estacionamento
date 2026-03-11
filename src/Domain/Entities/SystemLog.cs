namespace ParkingSystem.Domain.Entities;

public class SystemLog : BaseEntity
{
    public string Event { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Source { get; set; }
    public string? Payload { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
