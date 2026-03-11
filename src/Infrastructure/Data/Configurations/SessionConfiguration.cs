using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ParkingSystem.Domain.Entities;

namespace ParkingSystem.Infrastructure.Data.Configurations;

public class VehicleEntryConfiguration : IEntityTypeConfiguration<VehicleEntry>
{
    public void Configure(EntityTypeBuilder<VehicleEntry> builder)
    {
        builder.ToTable("vehicle_entries");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.LicensePlate).HasColumnName("license_plate").HasMaxLength(10).IsRequired();
        builder.Property(x => x.EntryTime).HasColumnName("entry_time");
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<int>();
        builder.Property(x => x.ParkingLotId).HasColumnName("parking_lot_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.IsDeleted).HasColumnName("is_deleted");

        builder.HasOne(x => x.ParkingLot)
            .WithMany()
            .HasForeignKey(x => x.ParkingLotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ParkingSession)
            .WithOne(s => s.VehicleEntry)
            .HasForeignKey<ParkingSession>(s => s.VehicleEntryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ParkingSessionConfiguration : IEntityTypeConfiguration<ParkingSession>
{
    public void Configure(EntityTypeBuilder<ParkingSession> builder)
    {
        builder.ToTable("parking_sessions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.VehicleEntryId).HasColumnName("vehicle_entry_id");
        builder.Property(x => x.ParkingSpotId).HasColumnName("parking_spot_id");
        builder.Property(x => x.StartTime).HasColumnName("start_time");
        builder.Property(x => x.EndTime).HasColumnName("end_time");
        builder.Property(x => x.Duration).HasColumnName("duration");
        builder.Property(x => x.TotalAmount).HasColumnName("total_amount").HasPrecision(10, 2);
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<int>();
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.Property(x => x.IsDeleted).HasColumnName("is_deleted");

        builder.HasOne(x => x.ParkingSpot)
            .WithMany(s => s.ParkingSessions)
            .HasForeignKey(x => x.ParkingSpotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Payment)
            .WithOne(p => p.ParkingSession)
            .HasForeignKey<Payment>(p => p.ParkingSessionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
