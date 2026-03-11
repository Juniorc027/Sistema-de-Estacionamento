using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ParkingSystem.Infrastructure.Data;

/// <summary>Permite que o dotnet-ef gere migrations sem precisar de um servidor MySQL rodando.</summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

        // Fallback connection string used only at design time (migrations)
        var connectionString = "Server=localhost;Port=3306;Database=parking_system;User=parking_app;Password=ParkingApp@2026!;CharSet=utf8mb4;";

        optionsBuilder.UseMySql(connectionString, ServerVersion.Parse("8.0.45-mysql"),
            mysql => mysql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));

        return new AppDbContext(optionsBuilder.Options);
    }
}
