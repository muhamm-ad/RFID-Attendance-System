// ESP32 — Registration System - Single RC522 RFID Reader
// Used for scanning badges when registering new persons

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Enable/disable Serial debug output (set to 0 for production without serial monitor)
#define ENABLE_SERIAL_DEBUG 1

#if ENABLE_SERIAL_DEBUG
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(...)
#endif

// ---------- WIFI CONFIG ----------
const char* WIFI_SSID = "Your Wifi SSID";
const char* WIFI_PASSWORD = "Your Wifi Password";

// ---------- API CONFIG ----------
const char* API_BASE_URL = "https://rfid-attendance-system-one.vercel.app";
const char* API_SCAN_ENDPOINT = "/api/scan";

// ---------- PINS ----------
// SPI Bus
#define SPI_SCK   18
#define SPI_MISO  19
#define SPI_MOSI  23

// RFID Reader (MFRC522)
#define RFID_SS   5
#define RFID_RST  13

// Optional: LED for feedback
#define LED_PIN   2

// ---------- PARAMETRES ----------
const unsigned long SCAN_DELAY_MS = 1500;  // Delay between scans to prevent duplicates
const unsigned long ANTI_PASS_MS = 3000;    // Prevent same card from being scanned multiple times

// ---------- OBJETS ----------
MFRC522 rfid(RFID_SS, RFID_RST);

// Anti-passback
byte lastUID[10] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
int lastUIDSize = 0;
unsigned long lastScanTime = 0;

// ---------- UTILS ----------
bool uidEquals(const byte *a, const byte *b, int size) {
  for (int i = 0; i < size; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

String uidToString(const byte *uid, int size) {
  String result = "";
  for (int i = 0; i < size; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

// ---------- API FUNCTIONS ----------
bool sendRegistrationToAPI(String rfidUUID) {
  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("[API] WiFi non connecté!");
    return false;
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + String(API_SCAN_ENDPOINT);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload (registration mode - no action parameter)
  StaticJsonDocument<200> doc;
  doc["rfid_uuid"] = rfidUUID;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  DEBUG_PRINTF("[API] POST %s\n", url.c_str());
  DEBUG_PRINTF("[API] Payload: %s\n", jsonPayload.c_str());
  
  int httpCode = http.POST(jsonPayload);
  
  bool success = false;
  
  if (httpCode > 0) {
    DEBUG_PRINTF("[API] Response code: %d\n", httpCode);
    String payload = http.getString();
    DEBUG_PRINTF("[API] Response: %s\n", payload.c_str());
    
    // Parse JSON response
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, payload);
    
    if (!error) {
      success = responseDoc["success"] | false;
      if (success) {
        String uuid = responseDoc["rfid_uuid"] | "";
        DEBUG_PRINTF("[API] Badge enregistré: %s\n", uuid.c_str());
      } else {
        String errorMsg = responseDoc["error"] | "Unknown error";
        DEBUG_PRINTF("[API] Erreur: %s\n", errorMsg.c_str());
      }
    } else {
      DEBUG_PRINTF("[API] JSON parse error: %s\n", error.c_str());
    }
  } else {
    DEBUG_PRINTF("[API] HTTP Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
  return success;
}

void connectWiFi() {
  DEBUG_PRINT("[WiFi] Connexion à ");
  DEBUG_PRINTLN(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    DEBUG_PRINT(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    DEBUG_PRINTLN("\n[WiFi] Connecté!");
    DEBUG_PRINT("[WiFi] IP: ");
    DEBUG_PRINTLN(WiFi.localIP());
    
    // Blink LED to indicate WiFi connected
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  } else {
    DEBUG_PRINTLN("\n[WiFi] Échec de connexion!");
    // Long blink to indicate error
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  }
}

void handleRFIDScan() {
  unsigned long nowMs = millis();
  
  // Check if a new card is present
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  
  // Try to read the card
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Check if we have a valid UID (at least 1 byte)
  if (rfid.uid.size < 1 || rfid.uid.size > 10) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  // Extract full UID
  int uidSize = rfid.uid.size;
  byte uid[10];
  for (int i = 0; i < uidSize; i++) {
    uid[i] = rfid.uid.uidByte[i];
  }
  
  // Anti-passback: prevent same card from being scanned multiple times quickly
  if (uidSize == lastUIDSize && uidEquals(uid, lastUID, uidSize) && (nowMs - lastScanTime) < ANTI_PASS_MS) {
    DEBUG_PRINTLN("[SCAN] Carte déjà scannée récemment, ignorée.");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  // Update last scan info
  for (int i = 0; i < uidSize; i++) {
    lastUID[i] = uid[i];
  }
  lastUIDSize = uidSize;
  lastScanTime = nowMs;
  
  // Convert full UID to string
  String rfidUUID = uidToString(uid, uidSize);
  DEBUG_PRINTF("\n[SCAN] Carte détectée - UUID: %s (size: %d bytes)\n", rfidUUID.c_str(), uidSize);
  
  // Visual feedback: blink LED
  digitalWrite(LED_PIN, HIGH);
  
  // Send to API
  bool success = sendRegistrationToAPI(rfidUUID);
  
  if (success) {
    DEBUG_PRINTLN("[SCAN] ✅ Badge enregistré avec succès!");
    // Success: 2 quick blinks
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
  } else {
    DEBUG_PRINTLN("[SCAN] ❌ Erreur lors de l'enregistrement");
    // Error: long blink
    delay(500);
  }
  
  digitalWrite(LED_PIN, LOW);
  
  // Halt and stop
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  // Delay before next scan
  delay(SCAN_DELAY_MS);
}

// ---------- SETUP ----------
void setup() {
#if ENABLE_SERIAL_DEBUG
  Serial.begin(115200);
  delay(1000);
#endif
  
  DEBUG_PRINTLN("\n=================================");
  DEBUG_PRINTLN("  RFID Registration System");
  DEBUG_PRINTLN("=================================\n");
  
  // LED setup
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // WiFi connection
  connectWiFi();
  
  // SPI + RFID initialization
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  rfid.PCD_Init();
  delay(100);
  
  // Check if RFID reader is working
  if (!rfid.PCD_PerformSelfTest()) {
    DEBUG_PRINTLN("[ERREUR] Lecteur RFID non détecté!");
    DEBUG_PRINTLN("Vérifiez les connexions SPI.");
  } else {
    DEBUG_PRINTLN("[OK] Lecteur RFID initialisé.");
  }
  
  DEBUG_PRINTLN("\n[SYSTEME] Prêt à scanner des badges...");
  DEBUG_PRINTLN("Présentez un badge RFID pour l'enregistrer.\n");
}

// ---------- LOOP ----------
void loop() {
  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("[WiFi] Connexion perdue, reconnexion...");
    connectWiFi();
  }
  
  // Handle RFID scanning
  handleRFIDScan();
  
  // Small delay to prevent CPU overload
  delay(50);
}

