#pragma once

// ====== Wi-Fi ======
static const char* WIFI_SSID = "VIVOFIBRA-WIFI6-E9D8";
static const char* WIFI_PASSWORD = "03012006Ju";

// ====== MQTT ======
static const char* MQTT_BROKER = "192.168.0.10";
static const int MQTT_PORT = 1883;
static const char* MQTT_CLIENT_ID = "esp32-parking-22";

// IDs / tópicos alinhados com backend atual
static const char* PARKING_LOT_ID = "45fc18f2-bdd8-4b11-b964-f8face1147f0";

static const char* TOPIC_PARKING_ENTRY = "parking/entry";
static const char* TOPIC_PARKING_EXIT = "parking/exit";
static const char* TOPIC_SPOT_SNAPSHOT = "parking/spots/snapshot";
static const char* TOPIC_DEVICE_STATUS = "parking/device/status";
static const char* TOPIC_GATE_COMMAND = "parking/gate/command"; // opcional (futuro)
