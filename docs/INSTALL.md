# Installation & Setup Guide

## Prerequisites

- **Docker & Docker Compose** (v20.10+)
- **Node.js** (v18+ for frontend build)
- **.NET 8 SDK** (optional, for local development without Docker)
- **Git** (for cloning repository)
- **MySQL Client** (optional, for manual database administration)

## Quick Start (Docker Compose)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/parking-iot-system.git
cd parking-iot-system
```

### 2. Configure Environment

Copy environment files:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# API Configuration
API_PORT=5000
API_ASPNETCORE_ENVIRONMENT=Development

# Database
MYSQL_ROOT_PASSWORD=root_password_here
MYSQL_DATABASE=parking_db
MYSQL_USER=parking_user
MYSQL_PASSWORD=user_password_here

# MQTT Broker
MQTT_HOST=mosquitto
MQTT_PORT=1883
MQTT_USER=mqtt_user
MQTT_PASSWORD=mqtt_password

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_PARKING_LOT_ID=45fc18f2-bdd8-4b11-b964-f8face1147f0
```

### 3. Build and Start Services

```bash
docker-compose up -d
```

This will start:
- **MySQL**: Port 3306 (internal)
- **Mosquitto MQTT**: Port 1883 (internal + 8883 for external)
- **Backend API**: Port 5000 (HTTP), 5001 (HTTPS)
- **Frontend**: Port 3000

### 4. Initialize Database

Run migrations:
```bash
docker-compose exec api dotnet ef database update
```

Seed test data (20 parking spots):
```bash
docker-compose exec api dotnet run --seed
```

### 5. Verify Installation

Check logs:
```bash
docker-compose logs -f api
docker-compose logs -f mqtt
```

Access dashboard:
- **Frontend**: http://localhost:3000
- **API Health**: http://localhost:5000/health

---

## Development Setup (Local)

### Backend (.NET 8)

#### Prerequisites
- .NET 8.0 SDK
- MySQL 8.0+

#### Setup

```bash
cd api

# Restore NuGet packages
dotnet restore

# Configure connection string in appsettings.Development.json
cat <<EOF > src/API/appsettings.Development.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=parking_db;User=parking_user;Password=user_password;"
  },
  "Mqtt": {
    "Host": "192.168.0.10",
    "Port": 1883,
    "Username": "mqtt_user",
    "Password": "mqtt_password"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
EOF

# Run migrations
dotnet ef database update

# Start backend
dotnet run
```

Backend runs on `http://localhost:5000`

### Frontend (Next.js 14)

#### Prerequisites
- Node.js v18+
- npm or yarn

#### Setup

```bash
cd app

# Install dependencies
npm install

# Configure environment
cat <<EOF > .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_PARKING_LOT_ID=45fc18f2-bdd8-4b11-b964-f8face1147f0
EOF

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000`

### ESP32 Firmware

#### Prerequisites
- PlatformIO CLI or VS Code extension
- Arduino IDE (optional)

#### Setup

```bash
cd iot/parking_mqtt_test

# Configure WiFi credentials in Config.h
cat <<EOF > Config.h
#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASSWORD "YOUR_PASSWORD"
#define MQTT_BROKER_IP "192.168.0.10"
#define MQTT_BROKER_PORT 1883
EOF

# Build and upload to ESP32
platformio run --target upload --upload-port /dev/ttyUSB0
```

Monitor firmware:
```bash
platformio device monitor --port /dev/ttyUSB0 --baud 115200
```

---

## Docker Compose Structure

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}

  mosquitto:
    image: eclipse-mosquitto:2.0
    ports:
      - "1883:1883"
      - "8883:8883"
    volumes:
      - ./infra/mqtt/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./infra/mqtt/aclfile:/mosquitto/config/aclfile
      - ./infra/mqtt/passwordfile_local:/mosquitto/config/passwordfile

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "5000:80"
      - "5001:443"
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      ConnectionStrings__DefaultConnection: "Server=mysql;Database=${MYSQL_DATABASE};User=${MYSQL_USER};Password=${MYSQL_PASSWORD};"
      Mqtt__Host: mosquitto
      Mqtt__Port: 1883
      Mqtt__Username: ${MQTT_USER}
      Mqtt__Password: ${MQTT_PASSWORD}
    depends_on:
      - mysql
      - mosquitto

  app:
    build:
      context: ./app
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:80
      NEXT_PUBLIC_PARKING_LOT_ID: ${NEXT_PUBLIC_PARKING_LOT_ID}
    depends_on:
      - api

volumes:
  mysql_data:
```

---

## Database Initialization

### Manual Migration

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Create user
mysql -u root -p -e "CREATE USER 'parking_user'@'%' IDENTIFIED BY 'user_password'; GRANT ALL PRIVILEGES ON parking_db.* TO 'parking_user'@'%'; FLUSH PRIVILEGES;"

# Run migrations (from .NET backend)
dotnet ef database update
```

### Seeding Data

Insert 20 parking spots:
```bash
docker-compose exec mysql mysql -u parking_user -puser_password parking_db <<EOF
INSERT INTO ParkingSpots (SpotNumber, LocationRow, LocationColumn, Status, CreatedAt, UpdatedAt)
VALUES
  ('001', 1, 1, 'Free', NOW(), NOW()),
  ('002', 1, 2, 'Free', NOW(), NOW()),
  -- ... (up to 020)
EOF
```

Or use backend seeder:
```bash
docker-compose exec api dotnet run --seed
```

---

## MQTT Configuration

### ACL File (aclfile)

```
user mqtt_user
topic readwrite parking/#

user esp32
topic readwrite parking/entry
topic readwrite parking/exit
topic readwrite parking/spots/snapshot
```

### Mosquitto Configuration (mosquitto.conf)

```conf
# Local network access
listener 1883
protocol mqtt

# Remote access (TLS)
listener 8883
protocol mqtt
cafile /mosquitto/config/ca.crt
certfile /mosquitto/config/server.crt
keyfile /mosquitto/config/server.key
require_certificate false

# Authentication
password_file /mosquitto/config/passwordfile
acl_file /mosquitto/config/aclfile

# Allow anonymous for local network
allow_anonymous true
```

### Create MQTT User

```bash
docker-compose exec mosquitto mosquitto_passwd -b /mosquitto/config/passwordfile mqtt_user mqtt_password
```

---

## Network Configuration

### Local Network

- **API**: Accessible from any device on LAN at `http://<host-ip>:5000`
- **Frontend**: Accessible from any device on LAN at `http://<host-ip>:3000`
- **MQTT**: Accessible at `192.168.0.10:1883`

### Remote Access (Optional)

For remote MQTT and API access, consider:

1. **VPN**: Set up WireGuard or OpenVPN
2. **Reverse Proxy**: Use Nginx with SSL certificates
3. **Cloud Tunnel**: Use Cloudflare Tunnel or ngrok (development only)

Example Nginx reverse proxy:
```nginx
server {
    listen 443 ssl;
    server_name api.parking.example.com;

    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Health Checks

### API Health
```bash
curl -s http://localhost:5000/health | jq
```

Expected response:
```json
{
  "status": "Healthy",
  "checks": {
    "database": "Healthy",
    "mqtt": "Healthy"
  }
}
```

### Database Connection
```bash
docker-compose exec mysql mysql -u parking_user -puser_password -e "SELECT 1;"
```

### MQTT Connectivity
```bash
docker-compose exec mosquitto mosquitto_pub -h localhost -t "test/ping" -m "pong"
```

### Frontend Page Load
```bash
curl -s http://localhost:3000 | head -20
```

---

## Troubleshooting

### Database Connection Failed
```
Error: Connection refused at 127.0.0.1:3306
```
**Solution**: Ensure MySQL container is running:
```bash
docker-compose ps
docker-compose logs mysql
```

### MQTT Connection Failed
```
Error: Failed to connect to MQTT broker at 192.168.0.10:1883
```
**Solution**: 
- Verify Mosquitto is running: `docker-compose logs mosquitto`
- Check firewall allows port 1883
- Verify MQTT credentials in `.env`

### Frontend API Errors
```
Error: Failed to fetch from http://localhost:5000
```
**Solution**:
- Ensure backend is running: `docker-compose logs api`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is enabled in `Program.cs`

### 3D Visualization Not Loading
```
Error: WebGL context not available
```
**Solution**:
- Use modern browser (Chrome, Firefox, Safari, Edge)
- Disable hardware acceleration issues: Check browser console
- Try in private/incognito mode to rule out extensions

---

## Production Deployment

### Environment Variables

Set for production:
```bash
export ASPNETCORE_ENVIRONMENT=Production
export ConnectionStrings__DefaultConnection="Server=prod-mysql-host;Database=parking_db;User=parking_user;Password=<secure-password>;"
```

### SSL Certificates

Generate self-signed certificate:
```bash
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365
```

### Database Backups

```bash
# Daily backup script
docker-compose exec mysql mysqldump -u parking_user -puser_password parking_db > backup_$(date +%Y%m%d).sql
```

### Monitoring

Set up with Prometheus + Grafana:
- Monitor API response times
- Track database query performance
- Alert on MQTT connection failures
- Monitor disk usage for logs

---

## Uninstall

Stop and remove all containers:
```bash
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker rmi parking-iot-system_api parking-iot-system_app
```

---

**Last Updated**: 2025
**Version**: 1.0
**Status**: Production Ready
