# API Reference

## Base URLs

- **Local Development**: `http://localhost:5000`
- **Production**: `https://parking-api.example.com`
- **Real-time Hub**: `/parkingHub` (SignalR WebSocket)

## Authentication

Currently uses optional Bearer token authentication. Set `Authorization: Bearer <token>` header if configured.

---

## Dashboard Controller

### GET /api/dashboard/overview

Get KPI overview: occupancy, entries, peak hours, spot ranking.

**Parameters:**
```
parkingLotId (query, required): string - Parking lot identifier
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/dashboard/overview?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "totalSpots": 20,
  "occupiedSpots": 7,
  "freeSpots": 13,
  "occupancyPercentage": 35.0,
  "totalEntries": 142,
  "peakHour": {
    "hour": 14,
    "occupancyPercentage": 85.0,
    "entryCount": 12
  },
  "topUtilizedSpots": [
    {
      "spotNumber": "001",
      "utilizationRate": 92.5,
      "entryCount": 45
    },
    {
      "spotNumber": "002",
      "utilizationRate": 88.3,
      "entryCount": 38
    }
  ],
  "lastUpdate": "2025-01-15T14:30:22Z"
}
```

---

### GET /api/dashboard/occupancy-timeline

Get hourly occupancy data for the past 24 hours.

**Parameters:**
```
parkingLotId (query, required): string
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/dashboard/occupancy-timeline?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0"
```

**Response (200 OK):**
```json
{
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "generatedAt": "2025-01-15T14:30:22Z",
  "hours": [
    {
      "hour": 0,
      "averageOccupancy": 15.0,
      "entryCount": 2,
      "exitCount": 3
    },
    {
      "hour": 1,
      "averageOccupancy": 12.0,
      "entryCount": 1,
      "exitCount": 2
    },
    {
      "hour": 14,
      "averageOccupancy": 85.0,
      "entryCount": 12,
      "exitCount": 5
    }
    // ... hours 2-23
  ]
}
```

---

### GET /api/dashboard/spot-statistics

Get per-spot ranking, utilization, and duration metrics.

**Parameters:**
```
parkingLotId (query, required): string
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/dashboard/spot-statistics?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0"
```

**Response (200 OK):**
```json
{
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "generatedAt": "2025-01-15T14:30:22Z",
  "spots": [
    {
      "spotNumber": "001",
      "utilizationRate": 92.5,
      "averageOccupancyMinutes": 87.5,
      "entryCount": 45,
      "lastUpdated": "2025-01-15T14:28:00Z"
    },
    {
      "spotNumber": "002",
      "utilizationRate": 88.3,
      "averageOccupancyMinutes": 72.0,
      "entryCount": 38,
      "lastUpdated": "2025-01-15T14:27:00Z"
    }
    // ... spots 3-20
  ]
}
```

---

## Reports Controller

### GET /api/reports/history

Get raw entry/exit event history.

**Parameters:**
```
parkingLotId (query, required): string
limit (query, optional): integer - Default: 100, Max: 1000
offset (query, optional): integer - Default: 0
startDate (query, optional): ISO 8601 datetime
endDate (query, optional): ISO 8601 datetime
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/reports/history?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0&limit=50&offset=0"
```

**Response (200 OK):**
```json
{
  "total": 342,
  "offset": 0,
  "limit": 50,
  "data": [
    {
      "id": "uuid-1",
      "spotNumber": "001",
      "licensePlate": "VG-001",
      "entryTime": "2025-01-15T14:23:00Z",
      "exitTime": "2025-01-15T15:10:00Z",
      "durationMinutes": 47,
      "entryEventId": "mqtt-event-001"
    },
    {
      "id": "uuid-2",
      "spotNumber": "002",
      "licensePlate": "VG-002",
      "entryTime": "2025-01-15T14:25:00Z",
      "exitTime": null,
      "durationMinutes": null,
      "entryEventId": "mqtt-event-002"
    }
  ]
}
```

---

### GET /api/reports/occupancy-by-hour

Get hourly occupancy breakdown.

**Parameters:**
```
parkingLotId (query, required): string
date (query, optional): ISO 8601 date (default: today)
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/reports/occupancy-by-hour?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0&date=2025-01-15"
```

**Response (200 OK):**
```json
{
  "date": "2025-01-15",
  "hours": [
    { "hour": 0, "occupancy": 15.0, "entries": 2, "exits": 3 },
    { "hour": 1, "occupancy": 12.0, "entries": 1, "exits": 2 },
    // ... 2-23
    { "hour": 14, "occupancy": 85.0, "entries": 12, "exits": 5 }
  ]
}
```

---

### GET /api/reports/export

Export reports as CSV file.

**Parameters:**
```
parkingLotId (query, required): string
format (query, optional): "csv" | "json" - Default: "csv"
startDate (query, optional): ISO 8601 datetime
endDate (query, optional): ISO 8601 datetime
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/reports/export?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0&format=csv" \
  --output report.csv
```

**Response:**
```
Spot,License Plate,Entry Time,Exit Time,Duration (min)
001,VG-001,2025-01-15T14:23:00Z,2025-01-15T15:10:00Z,47
002,VG-002,2025-01-15T14:25:00Z,2025-01-15T15:08:00Z,43
003,VG-003,2025-01-15T14:28:00Z,2025-01-15T15:15:00Z,47
```

---

## Parking Spots Controller

### GET /api/parking-spots

Get list of all parking spots with current status.

**Parameters:**
```
parkingLotId (query, required): string
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/parking-spots?parkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0"
```

**Response (200 OK):**
```json
{
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "totalSpots": 20,
  "spots": [
    {
      "id": "spot-001",
      "spotNumber": "001",
      "status": "occupied",
      "occupiedAt": "2025-01-15T14:23:00Z",
      "location": { "row": 1, "column": 1 }
    },
    {
      "id": "spot-002",
      "spotNumber": "002",
      "status": "free",
      "occupiedAt": null,
      "location": { "row": 1, "column": 2 }
    }
    // ... spots 3-20
  ],
  "summary": {
    "occupied": 7,
    "free": 13,
    "reserved": 0,
    "maintenance": 0
  }
}
```

---

### GET /api/parking-spots/{spotId}

Get details for a specific parking spot.

**Parameters:**
```
spotId (path, required): string - Spot identifier
```

**Request:**
```bash
curl -X GET "http://localhost:5000/api/parking-spots/spot-001"
```

**Response (200 OK):**
```json
{
  "id": "spot-001",
  "spotNumber": "001",
  "status": "occupied",
  "occupiedAt": "2025-01-15T14:23:00Z",
  "location": { "row": 1, "column": 1 },
  "statistics": {
    "utilizationRate": 92.5,
    "averageOccupancyMinutes": 87.5,
    "entryCount": 45
  },
  "lastUpdate": "2025-01-15T14:28:00Z"
}
```

---

## Gates Controller

### POST /api/gates/command

Send command to entry or exit gate (for manual overrides).

**Parameters:**
```
Body (JSON):
{
  "gateId": "entry" | "exit",
  "command": "open" | "close",
  "durationSeconds": 3
}
```

**Request:**
```bash
curl -X POST "http://localhost:5000/api/gates/command" \
  -H "Content-Type: application/json" \
  -d '{
    "gateId": "entry",
    "command": "open",
    "durationSeconds": 3
  }'
```

**Response (200 OK):**
```json
{
  "gateId": "entry",
  "command": "open",
  "status": "executed",
  "executedAt": "2025-01-15T14:30:22Z",
  "durationMs": 3000
}
```

---

## Real-time Events (SignalR)

Connect to WebSocket hub at `/parkingHub` to receive real-time updates.

### Connection

```javascript
const connection = new HubConnectionBuilder()
  .withUrl("http://localhost:5000/parkingHub")
  .withAutomaticReconnect()
  .build();

await connection.start();
```

### Events

#### UpdateDashboardStats
Fired when KPI metrics change (occupancy, entries, peak hours).

```javascript
connection.on("UpdateDashboardStats", (data) => {
  console.log("New dashboard stats:", data);
  // data.occupancyPercentage: number
  // data.totalEntries: number
  // data.peakHour: { hour, occupancy }
});
```

#### UpdateSpotStatus
Fired when individual parking spot status changes.

```javascript
connection.on("UpdateSpotStatus", (data) => {
  console.log("Spot status updated:", data);
  // data.spotNumber: string
  // data.status: "free" | "occupied" | "reserved" | "maintenance"
  // data.timestamp: ISO 8601
});
```

#### UpdateOccupancyTimeline
Fired every hour or when significant occupancy change detected.

```javascript
connection.on("UpdateOccupancyTimeline", (data) => {
  console.log("Occupancy timeline updated:", data);
  // data.hours: [{ hour, averageOccupancy, entryCount, exitCount }]
  // data.updatedAt: ISO 8601
});
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid parking lot ID",
  "details": "parkingLotId must be a valid UUID"
}
```

### 404 Not Found
```json
{
  "error": "Parking lot not found",
  "details": "No parking lot with ID: 45fc18f2-bdd8-4b11-b964-f8face1147f0"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Database connection failed",
  "traceId": "0HN5RHOIOFN3M:00000001"
}
```

---

## Rate Limiting

- **Dashboard Overview**: 1 request per second per IP
- **Reports**: 5 requests per minute per IP
- **Real-time Hub**: No limit (unlimited WebSocket connections)

---

## Pagination

List endpoints support cursor-based pagination:

```bash
curl -X GET "http://localhost:5000/api/reports/history?limit=50&offset=0"
```

- `limit`: Maximum 1000 (default 100)
- `offset`: Zero-based page offset

---

**Last Updated**: 2025
**Version**: 1.0
**Status**: Stable
