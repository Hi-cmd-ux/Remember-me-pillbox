#include <WiFi.h>
#include <HTTPClient.h>

// Fill these values before uploading to the ESP32.
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_BASE_URL = "https://YOUR_DEPLOYED_APP_DOMAIN.com";
const char* DEVICE_API_KEY = "PASTE_DEVICE_API_KEY_HERE";

// Change these pins to match your wiring.
const int COMPARTMENT_1_SENSOR_PIN = 27;
const int BATTERY_SENSOR_PIN = 34;

const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long EVENT_DEBOUNCE_MS = 1500;

unsigned long lastHeartbeatAt = 0;
unsigned long lastCompartmentEventAt = 0;
int lastCompartmentState = HIGH;

void connectToWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Wi-Fi connected. IP: ");
  Serial.println(WiFi.localIP());
}

int readBatteryPercentage() {
  // Replace this conversion with the divider/calibration for your battery circuit.
  int raw = analogRead(BATTERY_SENSOR_PIN);
  return constrain(map(raw, 2800, 4095, 0, 100), 0, 100);
}

bool postJson(const String& path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWifi();
  }

  HTTPClient http;
  http.begin(String(API_BASE_URL) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_API_KEY);

  int statusCode = http.POST(body);
  String response = http.getString();

  Serial.print("POST ");
  Serial.print(path);
  Serial.print(" -> ");
  Serial.println(statusCode);
  if (response.length() > 0) {
    Serial.println(response);
  }

  http.end();
  return statusCode >= 200 && statusCode < 300;
}

void sendHeartbeat() {
  String body = "{";
  body += "\"batteryPercentage\":" + String(readBatteryPercentage());
  body += ",\"rssiSignal\":" + String(WiFi.RSSI());
  body += ",\"firmwareVersion\":\"v1.0.0\"";
  body += "}";

  postJson("/api/esp32/heartbeat", body);
}

void sendCompartmentOpened(int compartmentNumber) {
  String body = "{";
  body += "\"eventType\":\"COMPARTMENT_OPENED\"";
  body += ",\"compartmentNumber\":" + String(compartmentNumber);
  body += "}";
  postJson("/api/esp32/events", body);
}

void setup() {
  Serial.begin(115200);
  pinMode(COMPARTMENT_1_SENSOR_PIN, INPUT_PULLUP);
  analogReadResolution(12);
  connectToWifi();
  sendHeartbeat();
}

void loop() {
  unsigned long now = millis();

  if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatAt = now;
    sendHeartbeat();
  }

  int compartmentState = digitalRead(COMPARTMENT_1_SENSOR_PIN);
  bool opened = lastCompartmentState == HIGH && compartmentState == LOW;
  if (opened && now - lastCompartmentEventAt >= EVENT_DEBOUNCE_MS) {
    lastCompartmentEventAt = now;
    sendCompartmentOpened(1);
  }
  lastCompartmentState = compartmentState;

  delay(50);
}
