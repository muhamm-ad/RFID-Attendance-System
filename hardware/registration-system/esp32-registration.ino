// ESP32 — Registration System - Single RC522 RFID Reader
// Used for scanning badges when registering new persons

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---------- WIFI CONFIG ----------
const char* WIFI_SSID = "A&A";
const char* WIFI_PASSWORD = "Muhawwad19";

// ---------- API CONFIG ----------
const char* API_BASE_URL = "https://rfid-attendance-system-git-master-muhamm-ads-projects.vercel.app";
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
byte lastUID[4] = {0, 0, 0, 0};
unsigned long lastScanTime = 0;

// ---------- UTILS ----------
bool uidEquals4(const byte *a, const byte *b) {
  for (int i = 0; i < 4; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

String uidToString(const byte *uid) {
  String result = "";
  for (int i = 0; i < 4; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

// ---------- API FUNCTIONS ----------
bool sendRegistrationToAPI(String rfidUUID) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] WiFi non connecté!");
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
  
  Serial.printf("[API] POST %s\n", url.c_str());
  Serial.printf("[API] Payload: %s\n", jsonPayload.c_str());
  
  int httpCode = http.POST(jsonPayload);
  
  bool success = false;
  
  if (httpCode > 0) {
    Serial.printf("[API] Response code: %d\n", httpCode);
    String payload = http.getString();
    Serial.printf("[API] Response: %s\n", payload.c_str());
    
    // Parse JSON response
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, payload);
    
    if (!error) {
      success = responseDoc["success"] | false;
      if (success) {
        String uuid = responseDoc["rfid_uuid"] | "";
        Serial.printf("[API] Badge enregistré: %s\n", uuid.c_str());
      } else {
        String errorMsg = responseDoc["error"] | "Unknown error";
        Serial.printf("[API] Erreur: %s\n", errorMsg.c_str());
      }
    } else {
      Serial.printf("[API] JSON parse error: %s\n", error.c_str());
    }
  } else {
    Serial.printf("[API] HTTP Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
  return success;
}

void connectWiFi() {
  Serial.print("[WiFi] Connexion à ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connecté!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
    
    // Blink LED to indicate WiFi connected
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  } else {
    Serial.println("\n[WiFi] Échec de connexion!");
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
  
  // Check if we have a valid UID (at least 4 bytes)
  if (rfid.uid.size < 4) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  // Extract UID
  byte uid4[4];
  for (int i = 0; i < 4; i++) {
    uid4[i] = rfid.uid.uidByte[i];
  }
  
  // Anti-passback: prevent same card from being scanned multiple times quickly
  if (uidEquals4(uid4, lastUID) && (nowMs - lastScanTime) < ANTI_PASS_MS) {
    Serial.println("[SCAN] Carte déjà scannée récemment, ignorée.");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  // Update last scan info
  for (int i = 0; i < 4; i++) {
    lastUID[i] = uid4[i];
  }
  lastScanTime = nowMs;
  
  // Convert UID to string
  String rfidUUID = uidToString(uid4);
  Serial.printf("\n[SCAN] Carte détectée - UUID: %s\n", rfidUUID.c_str());
  
  // Visual feedback: blink LED
  digitalWrite(LED_PIN, HIGH);
  
  // Send to API
  bool success = sendRegistrationToAPI(rfidUUID);
  
  if (success) {
    Serial.println("[SCAN] ✅ Badge enregistré avec succès!");
    // Success: 2 quick blinks
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
  } else {
    Serial.println("[SCAN] ❌ Erreur lors de l'enregistrement");
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
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=================================");
  Serial.println("  RFID Registration System");
  Serial.println("=================================\n");
  
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
    Serial.println("[ERREUR] Lecteur RFID non détecté!");
    Serial.println("Vérifiez les connexions SPI.");
  } else {
    Serial.println("[OK] Lecteur RFID initialisé.");
  }
  
  Serial.println("\n[SYSTEME] Prêt à scanner des badges...");
  Serial.println("Présentez un badge RFID pour l'enregistrer.\n");
}

// ---------- LOOP ----------
void loop() {
  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connexion perdue, reconnexion...");
    connectWiFi();
  }
  
  // Handle RFID scanning
  handleRFIDScan();
  
  // Small delay to prevent CPU overload
  delay(50);
}

