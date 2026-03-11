# ============================================================
#  Backend Dockerfile — .NET 8 (multi-stage)
#  Context: ./api  (docker-compose build context)
# ============================================================

# ── Stage 1: Build ──────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# 1) Copiar apenas .csproj + .sln (cache de restore)
COPY ParkingSystem.sln .
COPY src/API/ParkingSystem.API.csproj                src/API/
COPY src/Application/ParkingSystem.Application.csproj src/Application/
COPY src/Domain/ParkingSystem.Domain.csproj          src/Domain/
COPY src/Infrastructure/ParkingSystem.Infrastructure.csproj src/Infrastructure/

# 2) Restore (camada cacheável — só invalida se .csproj mudar)
RUN dotnet restore ParkingSystem.sln

# 3) Copiar todo o código
COPY src/ src/

# 4) CACHEBUST — forçar rebuild quando necessário
ARG CACHEBUST=1

# 5) Publish
RUN dotnet publish src/API/ParkingSystem.API.csproj \
    -c Release \
    -o /app/publish

# ── Stage 2: Runtime ────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# curl para healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_URLS=http://+:5167
ENV ASPNETCORE_URLS=http://+:5167

EXPOSE 5167

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5167/health || exit 1

ENTRYPOINT ["dotnet", "ParkingSystem.API.dll"]
