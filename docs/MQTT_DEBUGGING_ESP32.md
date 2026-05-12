# 🔧 MQTT Debugging Guide — ESP32 → Backend Pipeline

**Objective**: Verify complete end-to-end ESP32 sensor data flow through MQTT to 3D dashboard updates.

**Current Issue**: ESP32 publishes to `parking/spots/{id}`, but backend doesn't process (manual mosquitto_pub works).

---

## Phase 1: Verify Mosquitto is Receiving Messages

### Terminal 1: Subscribe to all MQTT topics
```bash
docker exec parking-mosquitto mosquitto_sub \
  -h localhost \
  -p 1883 \
  -u parking_iot \
  -P ParkingIot@2026 \
  -v \
  -t "parking/#"
```

**Expected Output** (messages appearing in real-time):
```
parking/spots/1 {"vagaId":1,"status":"ocupada","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":120,"timestamp":1234567890}
parking/spots/2 {"vagaId":2,"status":"livre","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":121,"timestamp":1234567891}
```

If messages are NOT appearing:
- ❌ ESP32 is NOT publishing to MQTT
- ❌ Check ESP32 Serial Monitor: Look for `[MQTT TX]` logs
- ❌ Check ESP32 WiFi connection: Should show "WiFi conectada"

---

## Phase 2: Trigger ESP32 Sensor & Monitor Backend Logs

### Step 1: Start monitoring backend logs

**Terminal 2: Watch backend container logs**
```bash
docker logs -f parking-backend | grep -E "\[MQTT\]|\[MqttHandler\]|\[Dashboard RT\]|\[SessionMgmt\]"
```

### Step 2: Trigger a sensor change on ESP32

**On ESP32**: Block IR sensor on parking spot #1 (or use Serial command if available)

**Expected Backend Log Output** (watch Terminal 2):

```
[MQTT] ╔═══════════════════════════════════════════════════════════╗
[MQTT] ║  MQTT MESSAGE RECEIVED - PROCESSING START                  ║
[MQTT] ╚═══════════════════════════════════════════════════════════╝
[MQTT] Topic:   parking/spots/1
[MQTT] Payload: {"vagaId":1,"status":"ocupada","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":120,"timestamp":1234567890}
[MQTT] Timestamp: 2024-12-13 14:32:45.123

[MQTT] ⤴ Matched: parking/spots/{id} pattern - Processing as individual spot update

[MQTT] [Step 1/7] Deserializing JSON payload...
[MQTT]   ✅ JSON deserialized successfully
[MQTT]   VagaId=1, Status=ocupada, ParkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0

[MQTT] [Step 2/7] Validating parkingLotId...
[MQTT]   ✅ ParkingLotId valid: 45fc18f2-bdd8-4b11-b964-f8face1147f0

[MQTT] [Step 3/7] Resolving vagaId from topic and payload...
[MQTT]   ✅ VagaId resolved: 1

[MQTT] [Step 4/7] Resolving spot status from topic and payload...
[MQTT]   ✅ Status resolved: Occupied (SpotNumber=001)

[MQTT] [Step 5/7] Querying database for current spot status...
[MQTT]   ✅ Current status: Free

[MQTT] [Step 6/7] Updating spot status in database (Free → Occupied)...
[MQTT]   ✅ Spot updated successfully in database

[MQTT] [Step 7/7] Session management - Detecting entry/exit transitions...
[MQTT]   🚗 TRANSITION DETECTED: Free → Occupied (Entry/Exit event)
[MQTT] [SessionMgmt] CreateSession START for spot 001
[MQTT] [SessionMgmt] ✓✓✓ CreateSession SUCCESS for spot 001

[MQTT] ═══════════════════════════════════════════════════════════════════════
[MqttHandler] 📡 Broadcasting #1: SpotUpdated (2D Map Update)
[MqttHandler]    SpotNumber=001, Status=Occupied, ParkingLotId=45fc18f2-bdd8-4b11-b964-f8face1147f0
[MqttHandler] ✅ Broadcast #1 sent successfully

[MQTT] ═══════════════════════════════════════════════════════════════════════
[Dashboard RT] 📡 Broadcasting #2: UpdateDashboardStats (3D Occupancy Update)
[Dashboard RT]    Transition: Free → Occupied (Entry/Exit)
[Dashboard RT] ✅ Broadcast #2 sent successfully
[Dashboard RT]    Occupancy: 5.0% (1/20)

[MQTT] ╔═══════════════════════════════════════════════════════════╗
[MQTT] ║  MQTT MESSAGE PROCESSED SUCCESSFULLY ✅                    ║
[MQTT] ║  Spot 001: Free → Occupied                                ║
[MQTT] ║  Backend → SignalR → Frontend (3D) → Complete! 🎉          ║
[MQTT] ╚═══════════════════════════════════════════════════════════╝
```

---

## Phase 3: Troubleshooting Log Analysis

### ❌ Error Scenarios & Solutions

#### Scenario 1: **NO LOGS APPEAR IN BACKEND**
- **Problem**: Message never reaches backend handler
- **Diagnosis**:
  ```bash
  docker exec parking-mosquitto mosquitto_sub \
    -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 \
    -v -t "parking/#"
  ```
  - If NO messages appear: ESP32 not publishing ❌
  - If messages appear: Backend not subscribed ❌

- **Fix 1**: Verify MqttService subscriptions
  ```bash
  docker logs parking-backend | grep -i "subscribed to"
  ```
  Should show:
  ```
  [INFO] MQTT subscribed to: parking/spots, parking/spots/+, parking/events, parking/entry, parking/exit, parking/device/+/status
  ```

- **Fix 2**: Restart backend to re-subscribe
  ```bash
  docker restart parking-backend
  ```

---

#### Scenario 2: **[Step 1/7] FAILS: JSON Deserialization**
- **Problem**: 
  ```
  [MQTT]   ❌ JSON DESERIALIZATION FAILED: Unexpected character
  ```

- **Cause**: ESP32 payload malformed (missing field, wrong format)

- **Check**: 
  ```bash
  # Monitor what's actually being published
  docker exec parking-mosquitto mosquitto_sub \
    -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 \
    -v -t "parking/spots/1"
  ```

- **Expected Payload**:
  ```json
  {
    "vagaId": 1,
    "status": "ocupada",
    "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
    "device": "esp32-parking-01",
    "uptime_s": 120,
    "timestamp": 1234567890
  }
  ```

- **Fix**: Update ESP32 firmware to ensure JSON is correct format

---

#### Scenario 3: **[Step 2/7] FAILS: parkingLotId is Guid.Empty**
- **Problem**:
  ```
  [MQTT]   ❌ INVALID: parkingLotId is Guid.Empty
  ```

- **Cause**: ESP32 publishing with wrong/empty ParkingLotId

- **Fix**: Update ESP32 firmware with correct ParkingLotId:
  ```cpp
  const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";
  ```

---

#### Scenario 4: **[Step 6/7] FAILS: UPDATE FAILED**
- **Problem**:
  ```
  [MQTT]   ❌ UPDATE FAILED: Spot not found or database error
  ```

- **Cause**: Parking lot or spot doesn't exist in database

- **Fix**: Verify in MySQL
  ```bash
  docker exec parking-mysql mysql -u parking_app -p"ParkingApp@2026!" -e \
    "SELECT * FROM parking_system.parking_spots WHERE parking_lot_id='45fc18f2-bdd8-4b11-b964-f8face1147f0' LIMIT 5;"
  ```

---

#### Scenario 5: **[Step 7/7] FAILS: Session Management**
- **Problem**:
  ```
  [MQTT] [SessionMgmt] CreateSession START for spot 001
  [MQTT] [SessionMgmt] ❌ Error in session management
  ```

- **Cause**: Database constraint or business logic error

- **Fix**: Check full error message:
  ```bash
  docker logs parking-backend | grep -A5 "SessionMgmt"
  ```

---

## Phase 4: Manual Test with mosquitto_pub

### Simulate ESP32 publishing manually

```bash
docker exec parking-mosquitto mosquitto_pub \
  -h localhost \
  -p 1883 \
  -u parking_iot \
  -P ParkingIot@2026 \
  -t "parking/spots/1" \
  -m '{"vagaId":1,"status":"ocupada","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":120,"timestamp":1234567890}'
```

**Expected**: Backend logs should show complete processing (same as Phase 2).

If manual pub works but ESP32 doesn't:
- 🔍 ESP32 JSON format issue
- 🔍 ESP32 ClientID not matching ACL
- 🔍 ESP32 credentials wrong

---

## Phase 5: Verify Frontend Receives Updates

### Terminal 3: Monitor frontend WebSocket connection

Open browser console while on dashboard:
```javascript
// In VS Code Debug Console or Browser DevTools
// Check if SpotUpdated messages are being received
window.hubConnection.on('SpotUpdated', (spot) => {
  console.log('🎉 SpotUpdated received:', spot);
});

window.hubConnection.on('UpdateDashboardStats', (stats) => {
  console.log('🎉 UpdateDashboardStats received:', stats);
});
```

**Expected**: Logs appear when ESP32 publishes.

---

## Phase 6: End-to-End Validation

### Complete Test Sequence

1. **Terminal 1**: Watch MQTT broker
   ```bash
   docker exec parking-mosquitto mosquitto_sub -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 -v -t "parking/#"
   ```

2. **Terminal 2**: Watch backend logs
   ```bash
   docker logs -f parking-backend | grep -E "\[MQTT\]|\[MqttHandler\]"
   ```

3. **Terminal 3**: Watch MySQL updates
   ```bash
   watch -n 1 'docker exec parking-mysql mysql -u parking_app -p"ParkingApp@2026!" -e \
     "SELECT spot_number, status, updated_at FROM parking_system.parking_spots \
     WHERE parking_lot_id=\"45fc18f2-bdd8-4b11-b964-f8face1147f0\" \
     ORDER BY spot_number;"'
   ```

4. **Browser**: Navigate to http://localhost:3000 3D dashboard

5. **On ESP32**: Trigger sensor (block IR on spot 1)

6. **Observe**:
   - ✅ Terminal 1: MQTT message appears
   - ✅ Terminal 2: Full 7-step processing visible
   - ✅ Terminal 3: Database `spot 1` status changes to `Occupied`
   - ✅ Browser: 3D spot turns red
   - ✅ Dashboard: Occupancy updates (1/20)
   - ✅ Reports: "Entradas 24h" increments

---

## Phase 7: Performance & Validation

### Expected Response Times
- **MQTT publish → Backend log**: < 100ms
- **Backend processing**: < 500ms
- **SignalR broadcast**: < 100ms
- **Frontend 3D update**: < 200ms
- **Total E2E**: **< 1 second**

### Log Checklist
- [ ] Step 1: JSON deserialization ✅
- [ ] Step 2: ParkingLotId valid ✅
- [ ] Step 3: VagaId resolved ✅
- [ ] Step 4: Status resolved ✅
- [ ] Step 5: Current status queried ✅
- [ ] Step 6: Database updated ✅
- [ ] Step 7: Session management done ✅
- [ ] Broadcast #1: SpotUpdated sent ✅
- [ ] Broadcast #2: UpdateDashboardStats sent ✅

---

## Additional Debugging Tools

### 1. Check MQTT Credentials
```bash
docker exec parking-mosquitto mosquitto_passwd -c /tmp/test parking_iot
# Enter password: ParkingIot@2026
```

### 2. View ACL Rules
```bash
docker exec parking-mosquitto cat /mosquitto/config/aclfile
```

### 3. Test Backend Health
```bash
curl http://localhost:5167/health
```

### 4. View Backend Configuration
```bash
docker exec parking-backend env | grep -i mqtt
```

Should show:
```
Mqtt__Broker=mosquitto
Mqtt__Port=1883
Mqtt__ClientId=parking-backend-docker
Mqtt__Username=parking_iot
Mqtt__Password=ParkingIot@2026
```

---

## 🎯 Success Indicators

When everything is working:

1. **ESP32 Serial Monitor**: 
   ```
   [MQTT TX] ✅ Publicado: parking/spots/1 = OCUPADA
   ```

2. **Backend Logs**:
   ```
   [MQTT] [Step 6/7] Updating spot status in database...
   [MQTT]   ✅ Spot updated successfully in database
   ```

3. **Dashboard**:
   - Spot changes color immediately
   - Occupancy percentage updates
   - Reports show entry

4. **Database**:
   ```sql
   SELECT * FROM parking_spots WHERE spot_number = '001';
   -- Status: Occupied
   -- Updated: 2024-12-13 14:32:45
   ```

---

## 📋 Debugging Checklist

- [ ] Mosquitto container running: `docker ps | grep mosquitto`
- [ ] Backend container running: `docker ps | grep backend`
- [ ] ESP32 connected to WiFi ✅
- [ ] ESP32 connected to MQTT ✅
- [ ] ESP32 publishing to correct topic ✅
- [ ] Backend subscribed to topic ✅
- [ ] Credentials correct in ACL file ✅
- [ ] ParkingLotId in ESP32 matches database ✅
- [ ] SignalR client connected in frontend ✅
- [ ] 3D dashboard visible in browser ✅

