# 🧪 MQTT Testing Commands - Copy & Paste Ready

## Quick Test Commands

### Test 1: Verify Mosquitto is Receiving Messages

```bash
# Subscribe to all parking topics (run in Terminal 1)
docker exec parking-mosquitto mosquitto_sub \
  -h localhost \
  -p 1883 \
  -u parking_iot \
  -P ParkingIot@2026 \
  -v \
  -t \"parking/#\"
```

**Expected Output**:
```
parking/spots/1 {\"vagaId\":1,\"status\":\"ocupada\",\"parkingLotId\":\"45fc18f2-bdd8-4b11-b964-f8face1147f0\",\"device\":\"esp32-parking-01\",\"uptime_s\":120}
```

---

### Test 2: Watch Backend Processing Logs

```bash
# Monitor backend logs (run in Terminal 2)
docker logs -f parking-backend | grep -E \"\\[MQTT\\]|\\[MqttHandler\\]|\\[Dashboard RT\\]|\\[SessionMgmt\\]\"
```

**Expected Output** (when ESP32 publishes):
```
[MQTT] ╔═════════════════════════════════════════════════════════════╗
[MQTT] ║  MQTT MESSAGE RECEIVED - PROCESSING START                  ║
[MQTT] Topic:   parking/spots/1
[MQTT] [Step 1/7] Deserializing JSON payload...
[MQTT]   ✅ JSON deserialized successfully
[MQTT] [Step 6/7] Updating spot status in database (Free → Occupied)...
[MQTT]   ✅ Spot updated successfully in database
[MqttHandler] 📡 Broadcasting #1: SpotUpdated (2D Map Update)
[MqttHandler] ✅ Broadcast #1 sent successfully
[MQTT] ║  MQTT MESSAGE PROCESSED SUCCESSFULLY ✅
```

---

### Test 3: Manual MQTT Publish Test

Simulate ESP32 publishing a message manually to test backend processing:

```bash
# Publish a test message (run in Terminal 3)
docker exec parking-mosquitto mosquitto_pub \
  -h localhost \
  -p 1883 \
  -u parking_iot \
  -P ParkingIot@2026 \
  -t \"parking/spots/1\" \
  -m '{\"vagaId\":1,\"status\":\"ocupada\",\"parkingLotId\":\"45fc18f2-bdd8-4b11-b964-f8face1147f0\",\"device\":\"esp32-parking-01\",\"uptime_s\":120,\"timestamp\":1702470765123}'
```

**Expected**:
- Terminal 1: Message appears
- Terminal 2: Full 7-step pipeline logs appear
- 3D Dashboard: Spot 1 turns RED
- Database: Status changes to Occupied

---

### Test 4: Database Update Verification

Check if spot status was updated in the database:

```bash
# Query the parking_spots table (run in Terminal 4)
docker exec parking-mysql mysql \
  -u parking_app \
  -p\"ParkingApp@2026!\" \
  -e \"SELECT spot_number, status, updated_at FROM parking_system.parking_spots WHERE parking_lot_id='45fc18f2-bdd8-4b11-b964-f8face1147f0' ORDER BY spot_number LIMIT 5;\"
```

**Expected Output**:
```
+-------------+----------+---------------------+
| spot_number | status   | updated_at          |
+-------------+----------+---------------------+
| 001         | Occupied | 2024-12-13 14:32:45 |
| 002         | Free     | 2024-12-01 08:15:20 |
| 003         | Free     | 2024-12-01 08:15:20 |
+-------------+----------+---------------------+
```

---

### Test 5: ParkingSession Verification

Check if parking session was created when vehicle entered:

```bash
# Query parking_sessions table
docker exec parking-mysql mysql \
  -u parking_app \
  -p\"ParkingApp@2026!\" \
  -e \"SELECT id, parking_lot_id, entry_time, exit_time FROM parking_system.parking_sessions ORDER BY entry_time DESC LIMIT 3;\"
```

**Expected Output**:
```
+------+------+---------------------+----------+
| id   | parking_lot_id                       | entry_time          | exit_time |
+------+------+---------------------+----------+
| 123  | 45fc18f2-... | 2024-12-13 14:32:45 | NULL      |
+------+------+---------------------+----------+
```

---

### Test 6: Check Backend Connection Status

Verify that backend is connected to MQTT:

```bash
# Check if backend is connected and subscribed
docker logs parking-backend | grep -E \"MQTT conectado|SUBSCRIPTION COMPLETE\"
```

**Expected Output**:
```
[INFO] MQTT conectado com sucesso.
[MQTT Service] 🎉 SUBSCRIPTION COMPLETE: 6/6 topics subscribed successfully
```

---

### Test 7: Test All 20 Spots Sequentially

Simulate ESP32 publishing updates for all 20 spots:

```bash
# Script to test all 20 spots (save as test_all_spots.sh)
for i in {1..20}; do
  docker exec parking-mosquitto mosquitto_pub \
    -h localhost \
    -p 1883 \
    -u parking_iot \
    -P ParkingIot@2026 \
    -t \"parking/spots/$i\" \
    -m "{\"vagaId\":$i,\"status\":\"ocupada\",\"parkingLotId\":\"45fc18f2-bdd8-4b11-b964-f8face1147f0\",\"device\":\"esp32-parking-01\",\"uptime_s\":$((120+i)),\"timestamp\":$((1702470765123+i*1000))}"
  
  echo \"Published to spot $i\"
  sleep 0.5  # 500ms delay between publishes
done
```

**Run it**:
```bash
chmod +x test_all_spots.sh
./test_all_spots.sh
```

**Expected in Dashboard**: All 20 spots turn RED, Occupancy: 100% (20/20)

---

### Test 8: Test Entry/Exit Cycle

Test vehicle entry and exit (spot transitions Free → Occupied → Free):

```bash
# Entry: Spot 1 occupied
docker exec parking-mosquitto mosquitto_pub \
  -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t \"parking/spots/1\" \
  -m '{\"vagaId\":1,\"status\":\"ocupada\",\"parkingLotId\":\"45fc18f2-bdd8-4b11-b964-f8face1147f0\",\"device\":\"esp32-parking-01\",\"uptime_s\":120,\"timestamp\":1702470765123}'

echo \"Vehicle entered spot 1 - Waiting 3 seconds...\"
sleep 3

# Exit: Spot 1 freed
docker exec parking-mosquitto mosquitto_pub \
  -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 \
  -t \"parking/spots/1\" \
  -m '{\"vagaId\":1,\"status\":\"livre\",\"parkingLotId\":\"45fc18f2-bdd8-4b11-b964-f8face1147f0\",\"device\":\"esp32-parking-01\",\"uptime_s\":125,\"timestamp\":1702470768123}'

echo \"Vehicle exited spot 1\"
```

**Expected**:
- Backend logs show 2 transitions (Free → Occupied → Free)
- 2 ParkingSessions created (one completed, one in progress)
- Dashboard: Spot 1 goes RED then BLUE
- Occupancy: 5% → 10% → 5%

---

### Test 9: Monitor 3D Dashboard in Real-Time

Watch the 3D dashboard while publishing messages:

```bash
# 1. Open browser: http://localhost:3000
# 2. Navigate to 3D Dashboard
# 3. In another terminal, publish messages:

for i in 1 2 3 4 5; do
  docker exec parking-mosquitto mosquitto_pub \
    -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 \
    -t \"parking/spots/$i\" \
    -m \"{\\\"vagaId\\\":$i,\\\"status\\\":\\\"ocupada\\\",\\\"parkingLotId\\\":\\\"45fc18f2-bdd8-4b11-b964-f8face1147f0\\\",\\\"device\\\":\\\"esp32-parking-01\\\",\\\"uptime_s\\\":$((120+i))}"
  
  echo \"Spot $i occupied - Watch dashboard update...\"
  sleep 1  # 1 second between updates for visual confirmation
done
```

**Watch For**:
- Each spot turns RED immediately after publish
- Occupancy percentage updates (5% → 10% → 15% → 20% → 25%)
- No lag or delay in 3D rendering

---

### Test 10: Check Health Endpoints

Verify system health:

```bash
# Backend health
curl http://localhost:5167/health

# Expected: 200 OK with health status

# Frontend health (check if running)
curl http://localhost:3000

# Expected: 200 OK with HTML content (dashboard)
```

---

### Test 11: Monitor Mosquitto ACL

Check if ACL rules are being enforced:

```bash
# View ACL file
docker exec parking-mosquitto cat /mosquitto/config/aclfile

# Expected: Should show ESP32 permissions
```

---

### Test 12: Check MQTT Credentials

Verify MQTT user exists and password is correct:

```bash
# Try connecting with wrong password (should fail)
docker exec parking-mosquitto mosquitto_pub \
  -h localhost \
  -p 1883 \
  -u parking_iot \
  -P WRONG_PASSWORD \
  -t \"parking/test\" \
  -m \"test\"

# Expected: Connection refused

# Try with correct password (should succeed)
docker exec parking-mosquitto mosquitto_pub \
  -h localhost \
  -p 1883 \
  -u parking_iot \
  -P ParkingIot@2026 \
  -t \"parking/test\" \
  -m \"test\"

# Expected: Success
```

---

## 📊 Full End-to-End Test Procedure

**Time Required**: ~5 minutes

### Step 1: Terminal Setup (2 minutes)
```bash
# Terminal 1: Watch MQTT messages
docker exec parking-mosquitto mosquitto_sub -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 -v -t \"parking/#\"

# Terminal 2: Watch backend logs
docker logs -f parking-backend | grep -E \"\\[MQTT\\]\"

# Terminal 3: Watch database changes
watch -n 1 'docker exec parking-mysql mysql -u parking_app -p\"ParkingApp@2026!\" -e \"SELECT spot_number, status, updated_at FROM parking_system.parking_spots WHERE parking_lot_id=\\\"45fc18f2-bdd8-4b11-b964-f8face1147f0\\\" ORDER BY spot_number LIMIT 5;\"'

# Terminal 4: Browser
# Open http://localhost:3000 and navigate to 3D Dashboard
```

### Step 2: Trigger Events (1 minute)
```bash
# Terminal 5: Run test script
for i in 1 2 3 4 5; do
  docker exec parking-mosquitto mosquitto_pub \
    -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 \
    -t \"parking/spots/$i\" \
    -m \"{\\\"vagaId\\\":$i,\\\"status\\\":\\\"ocupada\\\",\\\"parkingLotId\\\":\\\"45fc18f2-bdd8-4b11-b964-f8face1147f0\\\",\\\"device\\\":\\\"esp32-parking-01\\\",\\\"uptime_s\\\":$((120+i))\"
  sleep 1
done
```

### Step 3: Observe (2 minutes)
- **Terminal 1**: MQTT messages appearing ✅
- **Terminal 2**: Full 7-step pipeline visible ✅
- **Terminal 3**: Database status changes ✅
- **Terminal 4**: 3D dashboard spots turning RED ✅

### Success Criteria
```
✅ MQTT messages received in Mosquitto
✅ Backend processes all 7 steps
✅ No [MQTT] ❌ INVALID or ❌ FAILED logs
✅ Database spot_number reflects status change
✅ 3D dashboard updates in real-time
✅ Occupancy percentage increases correctly
```

---

## 🐛 Debugging Tips

### If nothing works:

1. **Restart all containers**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Check container health**:
   ```bash
   docker ps
   # All containers should be \"Up\"
   ```

3. **Check logs for errors**:
   ```bash
   docker logs parking-backend | grep -i error
   docker logs parking-mosquitto | grep -i error
   docker logs parking-mysql | grep -i error
   ```

4. **Verify connectivity**:
   ```bash
   docker exec parking-backend curl -s http://mosquitto:1883
   # Should show connection attempt
   ```

5. **Test manually**:
   ```bash
   docker exec parking-mosquitto mosquitto_pub \
     -h localhost -p 1883 -u parking_iot -P ParkingIot@2026 \
     -t \"parking/test\" -m \"test\"
   ```

