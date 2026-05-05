# Smart Parking IoT System - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART PARKING SYSTEM v1.0                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   IoT Layer  │────▶│   MQTT Broker    │────▶│  Backend Service │
│              │     │   (Mosquitto)    │     │   (.NET 8)       │
│  ESP32 x 1   │     │   192.168.0.10   │     │                  │
│              │     │   Port: 1883     │     │ Clean Architecture│
└──────────────┘     └──────────────────┘     └──────────────────┘
                                                       │
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │   MySQL Database     │
                                            │   (EF Core Migrations)
                                            └──────────────────────┘

                            ▲─────────────────────────────────────▲
                            │  Real-time Updates (SignalR)        │
                            │  WebSocket: /parkingHub             │
                            │                                      │
                    ┌───────────────────────────────────────────────┐
                    │      Frontend (Next.js 14)                    │
                    │  - React 18 with TypeScript                  │
                    │  - React Three Fiber 3D Visualization        │
                    │  - Framer Motion Animations                  │
                    │  - Tailwind CSS Dark Theme                   │
                    └───────────────────────────────────────────────┘
```

## Component Hierarchy

### IoT Layer (ESP32)
- **Microcontroller**: ESP32-WROOM-32
- **Firmware**: PlatformIO + Arduino Framework
- **Sensors**:
  - IR Detectors: MCP23017 I2C expander (2 channels)
  - Occupancy Sensors: 20 magnetic switches (4 MCP23017 modules)
- **Actuators**:
  - Entry Gate Servo: GPIO 18 (PWM)
  - Exit Gate Servo: GPIO 19 (PWM)
- **Communication**: WiFi 2.4GHz → MQTT over TCP (port 1883)

### MQTT Broker (Mosquitto)
- **Host**: 192.168.0.10
- **Port**: 1883
- **Topics**:
  - `parking/entry`: Entry event messages
  - `parking/exit`: Exit event messages
  - `parking/spots/snapshot`: Spot status broadcast
  - `parking/commands/gate`: Gate control commands from backend
- **Security**: ACL file-based (local network)

### Backend (.NET 8)
- **Framework**: ASP.NET Core 8
- **Architecture Pattern**: Clean Architecture (Domain → Application → Infrastructure → API)
- **Database**: MySQL (EF Core with migrations)
- **Real-time**: SignalR WebSocket hub at `/parkingHub`
- **Services**:
  - DashboardService: KPI aggregation (occupancy, entries, peak hours, ranking)
  - SessionManagementService: Parking session lifecycle
  - ReportingService: Historical data & CSV exports
  - GateControlService: Entry/exit gate logic
  - SpotStatisticsService: Per-spot analytics

### Frontend (Next.js 14)
- **Framework**: Next.js 14 (App Router, SSR disabled for 3D)
- **3D Rendering**: React Three Fiber + Drei
- **Styling**: Tailwind CSS (dark theme: zinc/slate)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **UI Panels**:
  - Dashboard: KPI cards, donut charts, peak hours analysis
  - Flow Management: Hourly occupancy timeline (bar chart)
  - Spot Audit: Per-spot ranking with utilization metrics
  - Reports: Historical entry/exit data, CSV export
  - History: Raw event logs

### Database Schema
```
Parking Lot (1:N)
├── ParkingSpots (20 spots)
│   ├── SpotNumber: "001"-"020"
│   ├── LocationRow: 1-5 (organized in rows)
│   ├── Status: Free|Occupied|Reserved|Maintenance
│   └── HardwareMapping: MCP index & pin address
│
├── Sessions
│   ├── EntryTime, ExitTime
│   ├── LicensePlate, Duration
│   └── SpotAssignment
│
├── OccupancyTimeline
│   ├── Hour: 0-23
│   ├── AverageOccupancy: %
│   └── EntryCount, ExitCount
│
└── SpotStatistics
    ├── UtilizationRate: %
    ├── AverageOccupancyMinutes
    └── EntryCount (lifetime)
```

## Data Flow

### Entry Gate Sequence
1. **Trigger**: IR sensor detects vehicle at entry gate
2. **ESP32 Logic**:
   - Debounce sensor for 120ms
   - Check `vagas_livres > 0` (free spots available)
   - If available: Open entry servo (90°) for 3 seconds
   - If full: Keep gate closed (0°)
3. **MQTT Publish**: `parking/entry` message with timestamp
4. **Backend**:
   - Create SessionManagement record
   - Decrement `vagas_livres` count
   - Broadcast update via SignalR
5. **Frontend**: Real-time dashboard updates show new occupancy

### Exit Gate Sequence
1. **Trigger**: IR sensor detects vehicle at exit gate
2. **ESP32 Logic**:
   - Debounce sensor for 120ms
   - Open exit servo immediately (90°) for 3 seconds
3. **MQTT Publish**: `parking/exit` message with timestamp
4. **Backend**:
   - Calculate session duration
   - Increment `vagas_livres` count
   - Update SpotStatistics
   - Broadcast update via SignalR
5. **Frontend**: KPI cards refresh, occupancy decreases

### Real-time Updates (SignalR)
- **Connection Endpoint**: `https://<backend>/parkingHub`
- **Events**:
  - `UpdateDashboardStats`: KPI update (occupancy, entries, peak)
  - `UpdateSpotStatus`: Individual spot status change (Green→Red)
  - `UpdateOccupancyTimeline`: Hourly aggregates
- **Frequency**: Sub-second updates on entry/exit

## Hardware Mapping

### GPIO Assignments
```
GPIO 18 ─── Servo PWM ─── Entry Gate Servo
GPIO 19 ─── Servo PWM ─── Exit Gate Servo
GPIO 21 ─── SDA ─────────── I2C (MCP23017 modules)
GPIO 22 ─── SCL ─────────── I2C (MCP23017 modules)
```

### MCP23017 I2C Expander Addressing
```
MCP0 (Address 0x20)
├─ Pins 0-15: Occupancy sensors (Spots 1-16)

MCP1 (Address 0x21)
├─ Pins 0-3: Occupancy sensors (Spots 17-20)
├─ Pin 6: Entry Gate IR Sensor
└─ Pin 7: Exit Gate IR Sensor
```

## Configuration Files

- **Frontend**: `.env.local` (API_URL, Parking Lot ID)
- **Backend**: `appsettings.json` (Database, MQTT connection strings)
- **IoT**: `Config.h` (WiFi SSID, MQTT broker IP, credentials)
- **IoT**: `ParkingConfig.h` (GPIO pins, sensor debounce timing)

## Deployment Architecture

### Docker Compose Stack
```yaml
Services:
- API (.NET 8): Port 5000 (HTTP), 5001 (HTTPS)
- MySQL: Port 3306 (internal)
- Mosquitto MQTT: Port 1883 (internal + remote)
- Next.js Frontend: Port 3000 (HTTP)
```

### Environment
- **Network**: Local LAN + Remote MQTT access (via VPN/reverse proxy)
- **Database**: MySQL 8.0+
- **Node.js**: v18+ (frontend build)
- **.NET Runtime**: .NET 8.0 SDK

## Key Integrations

1. **ESP32 → MQTT**: Publishes entry/exit events and spot snapshots
2. **MQTT → Backend**: Consumes events, validates business logic
3. **Backend → Database**: Persists sessions, statistics, snapshots
4. **Backend → SignalR**: Broadcasts real-time updates to all connected clients
5. **Frontend → SignalR**: Receives updates, re-renders dashboards instantly

## Performance Targets

- **Entry/Exit Recognition**: < 200ms (IR sensor to UI update)
- **Real-time Dashboard Update**: < 1 second (MQTT → Backend → SignalR → Frontend)
- **3D Visualization**: 60 FPS (Three.js rendering on modern browsers)
- **API Response Time**: < 500ms (dashboard, reports, statistics)
- **Database Query**: < 200ms (occupancy timeline, spot statistics)

## Security Considerations

- **MQTT**: ACL file-based authentication (local network)
- **API**: Optional JWT/API key (configurable in appsettings.json)
- **Frontend**: No sensitive data stored client-side (stateless React app)
- **Database**: Parameterized EF Core queries (SQL injection prevention)
- **3D Assets**: None (procedurally generated with Three.js)

---

**Last Updated**: 2025
**Version**: 1.0
**Status**: Production Ready
