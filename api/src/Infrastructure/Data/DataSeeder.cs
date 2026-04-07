using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Infrastructure.Data;

namespace ParkingSystem.Infrastructure.Data;

public static class DataSeeder
{
    private static readonly Guid DevelopmentParkingLotId = Guid.Parse("45fc18f2-bdd8-4b11-b964-f8face1147f0");
    private const int TotalSeedSpots = 22;

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        try
        {
            await context.Database.MigrateAsync();

            if (!await context.Users.AnyAsync())
            {
                var adminUser = new User
                {
                    Name = "Administrador",
                    Email = "admin@parkingsystem.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    Role = "Admin",
                    IsActive = true
                };

                context.Users.Add(adminUser);
                await context.SaveChangesAsync();

                logger.LogInformation("Usuário admin padrão criado: admin@parkingsystem.com / Admin@123");
            }

            var lot = await context.ParkingLots
                .Include(x => x.ParkingSpots)
                .FirstOrDefaultAsync(x => x.Id == DevelopmentParkingLotId);

            if (lot == null)
            {
                lot = new ParkingLot
                {
                    Id = DevelopmentParkingLotId,
                    Name = "Estacionamento Central",
                    Address = "Rua Principal, 100 - Centro",
                    TotalSpots = TotalSeedSpots,
                    HourlyRate = 5.00m,
                    IsActive = true
                };

                context.ParkingLots.Add(lot);
            }
            else
            {
                lot.TotalSpots = TotalSeedSpots;
                lot.IsActive = true;
                lot.UpdatedAt = DateTime.UtcNow;
            }

            var existingSpots = lot.ParkingSpots
                .Where(x => !x.IsDeleted)
                .Select(x => x.SpotNumber)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            for (int i = 1; i <= TotalSeedSpots; i++)
            {
                var spotNumber = i.ToString("D3");
                if (existingSpots.Contains(spotNumber))
                {
                    continue;
                }

                lot.ParkingSpots.Add(new ParkingSpot
                {
                    SpotNumber = spotNumber,
                    ParkingLotId = lot.Id
                });
            }

            await context.SaveChangesAsync();
            logger.LogInformation("Estacionamento {LotId} sincronizado com {Total} vagas", lot.Id, TotalSeedSpots);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro durante o seeding da base de dados.");
        }
    }
}
