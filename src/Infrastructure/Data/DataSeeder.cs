using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ParkingSystem.Domain.Entities;
using ParkingSystem.Infrastructure.Data;

namespace ParkingSystem.Infrastructure.Data;

public static class DataSeeder
{
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

            if (!await context.ParkingLots.AnyAsync())
            {
                var lot = new ParkingLot
                {
                    Name = "Estacionamento Central",
                    Address = "Rua Principal, 100 - Centro",
                    TotalSpots = 20,
                    HourlyRate = 5.00m,
                    IsActive = true
                };

                for (int i = 1; i <= lot.TotalSpots; i++)
                {
                    lot.ParkingSpots.Add(new ParkingSpot
                    {
                        SpotNumber = i.ToString("D3"),
                        ParkingLotId = lot.Id
                    });
                }

                context.ParkingLots.Add(lot);
                await context.SaveChangesAsync();

                logger.LogInformation("Estacionamento inicial criado com {Total} vagas", lot.TotalSpots);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro durante o seeding da base de dados.");
        }
    }
}
