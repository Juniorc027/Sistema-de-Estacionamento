namespace ParkingSystem.Application.Common;

/// <summary>
/// Fornece a hora atual no fuso horário de São Paulo (America/Sao_Paulo, UTC-3 / UTC-2 no horário de verão).
/// O banco continua armazenando tudo em UTC — este helper converte apenas para cálculos de
/// "hoje", "este mês", etc., que dependem do dia local do cliente.
/// </summary>
public static class BrazilClock
{
    private static readonly TimeZoneInfo Tz =
        TimeZoneInfo.FindSystemTimeZoneById(
            OperatingSystem.IsWindows()
                ? "E. South America Standard Time"
                : "America/Sao_Paulo");

    /// <summary>Data e hora atual em São Paulo.</summary>
    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz);

    /// <summary>Somente a data atual em São Paulo (sem hora).</summary>
    public static DateTime Today => Now.Date;

    /// <summary>
    /// Converte um instante UTC para DateTime em São Paulo.
    /// Útil para exibição de timestamps nos DTOs de resposta.
    /// </summary>
    public static DateTime ToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(utc, DateTimeKind.Utc), Tz);

    /// <summary>
    /// Converte um DateTime de São Paulo de volta para UTC.
    /// Útil ao construir ranges de filtro para queries EF Core.
    /// </summary>
    public static DateTime ToUtc(DateTime local) =>
        TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(local, DateTimeKind.Unspecified), Tz);
}
