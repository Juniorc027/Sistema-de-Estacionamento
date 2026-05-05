# Parking IoT System Documentation

Complete reference documentation for the Smart Parking IoT System.

## Getting Started

- **[INSTALL.md](INSTALL.md)** - Setup, Docker deployment, development environment configuration
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, data flow, component architecture
- **[HARDWARE.md](HARDWARE.md)** - ESP32 pinout, I2C expanders, servo configuration, wiring diagrams
- **[API_REFERENCE.md](API_REFERENCE.md)** - REST endpoints, SignalR events, error responses

## Quick Reference

### System Stack
- **IoT**: ESP32 (PlatformIO) → MQTT (Mosquitto 1883)
- **Backend**: .NET 8 (Clean Architecture) → MySQL
- **Frontend**: Next.js 14 (React + Three.js) with Tailwind CSS

### Default Configuration
- Parking Lot ID: `45fc18f2-bdd8-4b11-b964-f8face1147f0`
- Total Spots: 20 (16 + 4 additional)
- API Base: `http://localhost:5000`
- Frontend Base: `http://localhost:3000`
- MQTT Broker: `192.168.0.10:1883`

### Key Endpoints

| Service | URL | Status Check |
|---------|-----|--------------|
| API | http://localhost:5000 | `/health` |
| Frontend | http://localhost:3000 | `GET /` |
| MQTT | 192.168.0.10:1883 | N/A |
| Database | localhost:3306 | MySQL port |

## Documentation Index

### Installation & Deployment
- Docker Compose quick start
- Local development setup
- Database initialization
- MQTT configuration
- Network & firewall setup
- Production deployment checklist

### Architecture & Design
- System component diagram
- Data flow (entry/exit gates)
- Real-time update architecture (SignalR)
- Database schema
- Hardware-to-firmware integration

### Hardware & Configuration
- ESP32 GPIO pinout
- I2C expander mapping (MCP23017)
- Servo control (entry/exit gates)
- Magnetic reed switches (occupancy)
- IR beam sensors (gate triggers)
- Wiring diagrams

### API & Integration
- RESTful endpoints (Dashboard, Reports, Parking Spots, Gates)
- SignalR real-time events
- Authentication & authorization
- Error handling
- Rate limiting & pagination
- cURL examples for all endpoints

## Common Tasks

### Start Development Environment
```bash
docker-compose up -d
npm --prefix app run dev
```

### Monitor Logs
```bash
docker-compose logs -f api
docker-compose logs -f mosquitto
```

### Access Database
```bash
docker-compose exec mysql mysql -u parking_user -ppassword parking_db
```

### Test MQTT Connection
```bash
docker-compose exec mosquitto mosquitto_pub -h localhost -t "test/ping" -m "pong"
```

### Seed Test Data
```bash
docker-compose exec api dotnet run --seed
```

### Export Data
```bash
curl -X GET "http://localhost:5000/api/reports/export?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0" --output report.csv
```

## Troubleshooting

See **[INSTALL.md](INSTALL.md#troubleshooting)** for common issues and solutions.

## File Structure

```
docs/
├── README.md                  (this file)
├── INSTALL.md                 (setup & deployment)
├── ARCHITECTURE.md            (system design)
├── HARDWARE.md                (ESP32 & sensors)
└── API_REFERENCE.md           (REST & SignalR)
```

## Key Concepts

### Parking Spot Statuses
- **Free**: Spot is available
- **Occupied**: Vehicle detected via magnetic switch
- **Reserved**: Spot reserved for maintenance or special use
- **Maintenance**: Spot temporarily disabled

### Gate Logic
- **Entry Gate**: Opens if `vagas_livres > 0` (free spots available)
- **Exit Gate**: Opens immediately for all exit requests
- **Control**: Servo-driven gates with 3-second opening duration

### Real-time Dashboard Updates
- Triggered by MQTT entry/exit events
- Broadcast via SignalR to all connected clients
- Sub-second latency (ESP32 → MQTT → API → SignalR → Frontend)

### Reports & Analytics
- Historical entry/exit logs with license plates
- Hourly occupancy breakdown (0-23h)
- Per-spot utilization ranking
- CSV export capability

## Performance Metrics

- **Entry/Exit Response**: < 200ms (IR sensor to UI update)
- **API Response Time**: < 500ms (median)
- **Dashboard Update**: < 1 second (MQTT to frontend)
- **Database Query**: < 200ms (occupancy timeline)
- **3D Rendering**: 60 FPS (modern browsers)

## Support & Contributions

For issues or questions:
1. Check [INSTALL.md](INSTALL.md#troubleshooting)
2. Review [ARCHITECTURE.md](ARCHITECTURE.md)
3. Check API responses in [API_REFERENCE.md](API_REFERENCE.md)
4. Review hardware setup in [HARDWARE.md](HARDWARE.md)

## Version Information

- **System Version**: 1.0
- **Last Updated**: 2025
- **Status**: Production Ready
- **Tested Platforms**: 
  - Backend: .NET 8.0
  - Frontend: Node.js 18+, Chrome/Firefox/Safari
  - IoT: ESP32-WROOM-32
  - Database: MySQL 8.0+

---

**Need help?** Start with [INSTALL.md](INSTALL.md) or check the [ARCHITECTURE.md](ARCHITECTURE.md) for system overview.
