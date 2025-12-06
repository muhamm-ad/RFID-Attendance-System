// ESP32 — 2x RC522 + API Attendance Integration
// LEDs: rouge=GPIO16, verte=GPIO17
// RC522 ENTREE : SS=5,  RST=13
// RC522 SORTIE : SS=21, RST=22
// SPI partagé : SCK=18, MISO=19, MOSI=23
// LCD (4 bits): RS=14, E=27, D4=26, D5=25, D6=33, D7=32
// SERVO: signal=GPIO4
// BUZZER: GPIO2

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>
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

struct ApiResponse;

// ---------- WIFI CONFIG ----------
const char* WIFI_SSID = "Your Wifi SSID";
const char* WIFI_PASSWORD = "Your Wifi Password";

// ---------- API CONFIG ----------
const char* API_BASE_URL = "https://rfid-attendance-system-one.vercel.app";
const char* API_SCAN_ENDPOINT = "/api/scan";

// ---------- PINS ----------
#define LED_ROUGE   16
#define LED_VERTE   17

#define SPI_SCK   18
#define SPI_MISO  19
#define SPI_MOSI  23

#define IN_SS   5
#define IN_RST  13
#define OUT_SS  21
#define OUT_RST 22

// LCD (parallèle 4 bits)
#define LCD_RS 14
#define LCD_E  27
#define LCD_D4 26
#define LCD_D5 25
#define LCD_D6 33
#define LCD_D7 32

// SERVO
#define SERVO_PIN 4

// BUZZER
#define BUZZER_PIN 2

// ---------- PARAMETRES ----------
const unsigned long BADGE_HOLD_MS = 3000;
const unsigned long ANTI_PASS_MS  = 5000;

// Servo
const int SERVO_POS_FERME  = 0;
const int SERVO_POS_OUVERT = 90;
const unsigned long SERVO_OPEN_MS = 2500;

// Son
const uint32_t BUZZ_FREQ = 2000;
const unsigned long BEEP_OK_ON_MS   = 200;
const unsigned long BEEP_FAIL_ON_MS = 1000;
const unsigned long BEEP_GAP_MS     = 500;

// ---------- OBJETS ----------
MFRC522 rfidIn(IN_SS, IN_RST);
MFRC522 rfidOut(OUT_SS, OUT_RST);
LiquidCrystal lcd(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
Servo servoLock;

// Anti-passback
byte lastUID_in [10] = {0,0,0,0,0,0,0,0,0,0};
byte lastUID_out[10] = {0,0,0,0,0,0,0,0,0,0};
int lastUIDSize_in  = 0;
int lastUIDSize_out = 0;
unsigned long lastScan_in  = 0;
unsigned long lastScan_out = 0;

// Affichage partagé
enum ShowState { IDLE, SHOW_OK, SHOW_FAIL };
ShowState showState = IDLE;
unsigned long showUntil = 0;

// Servo état
bool servoIsOpen = false;
unsigned long servoCloseAt = 0;

// ---------- BUZZER STATE MACHINE ----------
enum BuzzState { BUZZ_IDLE, BUZZ_ON, BUZZ_GAP };
BuzzState buzzState = BUZZ_IDLE;
unsigned long buzzUntil = 0;
int buzzRepeats = 0;
unsigned long buzzOnDur = 0;
unsigned long buzzGapDur = 0;

inline void buzzerStart(uint32_t freq) { tone(BUZZER_PIN, freq); }
inline void buzzerStop() { noTone(BUZZER_PIN); }

void buzzerPattern(int repeats, unsigned long onMs, unsigned long gapMs) {
  buzzRepeats = repeats;
  buzzOnDur = onMs;
  buzzGapDur = gapMs;
  if (buzzRepeats > 0) {
    buzzerStart(BUZZ_FREQ);
    buzzState = BUZZ_ON;
    buzzUntil = millis() + buzzOnDur;
  }
}

void buzzerOk()   { buzzerPattern(1, BEEP_OK_ON_MS, BEEP_GAP_MS); }
void buzzerFail() { buzzerPattern(2, BEEP_FAIL_ON_MS, BEEP_GAP_MS); }

void buzzerHandle() {
  if (buzzState == BUZZ_IDLE) return;
  unsigned long now = millis();
  if ((long)(now - buzzUntil) >= 0) {
    if (buzzState == BUZZ_ON) {
      buzzerStop();
      buzzRepeats--;
      if (buzzRepeats > 0) {
        buzzState = BUZZ_GAP;
        buzzUntil = now + buzzGapDur;
      } else {
        buzzState = BUZZ_IDLE;
      }
    } else if (buzzState == BUZZ_GAP) {
      buzzerStart(BUZZ_FREQ);
      buzzState = BUZZ_ON;
      buzzUntil = now + buzzOnDur;
    }
  }
}

// ---------- UTILS ----------
bool uidEquals(const byte *a, const byte *b, int size){
  for (int i=0;i<size;i++) if (a[i]!=b[i]) return false;
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

void ledsIdle() { digitalWrite(LED_VERTE, LOW); digitalWrite(LED_ROUGE, LOW); }
void ledsOK()   { digitalWrite(LED_VERTE, HIGH); digitalWrite(LED_ROUGE, LOW); }
void ledsFAIL() { digitalWrite(LED_VERTE, LOW);  digitalWrite(LED_ROUGE, HIGH); }

void lcdStandby() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Badge ENTREE /");
  lcd.setCursor(0,1); lcd.print("SORTIE s.v.p.");
}

void showOnLCD(const char* cote, const char* nom, bool ok) {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print(cote);
  lcd.setCursor(8,0); lcd.print(ok ? "OK" : "REFUSE");
  lcd.setCursor(0,1); 
  if (nom) {
    lcd.print(nom);
  } else {
    lcd.print("Inconnu");
  }
}

void lcdShowConnecting() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Connexion WiFi");
  lcd.setCursor(0,1); lcd.print("...");
}

void lcdShowConnected() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("WiFi OK!");
  lcd.setCursor(0,1); lcd.print("Pret...");
}

// ---------- API FUNCTIONS ----------
struct ApiResponse {
  bool success;
  bool accessGranted;
  String message;
  String personName;
  String personType;
};

// Servo helpers
void servoOpenNow() {
  servoLock.write(SERVO_POS_OUVERT);
  servoIsOpen = true;
  servoCloseAt = millis() + SERVO_OPEN_MS;
}

void servoCloseIfDue() {
  if (servoIsOpen && (long)(millis() - servoCloseAt) >= 0) {
    servoLock.write(SERVO_POS_FERME);
    servoIsOpen = false;
  }
}

ApiResponse sendScanToAPI(String rfidUUID, String action) {
  ApiResponse response;
  response.success = false;
  response.accessGranted = false;
  
  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("[API] WiFi non connecté!");
    response.message = "WiFi Error";
    return response;
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + String(API_SCAN_ENDPOINT);
  
  http.begin(url);
  http.setTimeout(5000);  // 5 second timeout to prevent blocking
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["rfid_uuid"] = rfidUUID;
  doc["action"] = action;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  DEBUG_PRINTF("[API] POST %s\n", url.c_str());
  DEBUG_PRINTF("[API] Payload: %s\n", jsonPayload.c_str());
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    DEBUG_PRINTF("[API] Response code: %d\n", httpCode);
    String payload = http.getString();
    DEBUG_PRINTF("[API] Response: %s\n", payload.c_str());
    
    // Parse JSON response
    StaticJsonDocument<1024> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, payload);
    
    if (!error) {
      response.success = responseDoc["success"] | false;
      response.accessGranted = responseDoc["access_granted"] | false;
      response.message = responseDoc["message"] | "";
      
      if (responseDoc.containsKey("person") && !responseDoc["person"].isNull()) {
        JsonObject person = responseDoc["person"];
        String nom = person["nom"] | "";
        String prenom = person["prenom"] | "";
        response.personName = prenom + " " + nom;
        response.personType = person["type"] | "";
      }
    } else {
      DEBUG_PRINTF("[API] JSON parse error: %s\n", error.c_str());
      response.message = "Parse Error";
    }
  } else {
    DEBUG_PRINTF("[API] HTTP Error: %s\n", http.errorToString(httpCode).c_str());
    response.message = "HTTP Error";
  }
  
  http.end();
  return response;
}

void connectWiFi() {
  DEBUG_PRINT("[WiFi] Connexion à ");
  DEBUG_PRINTLN(WIFI_SSID);
  lcdShowConnecting();
  
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
    lcdShowConnected();
    delay(2000);
    lcdStandby();
  } else {
    DEBUG_PRINTLN("\n[WiFi] Échec de connexion!");
    lcd.clear();
    lcd.setCursor(0,0); lcd.print("WiFi ERREUR!");
    delay(3000);
    lcdStandby();
  }
}

void handleReader(MFRC522& r,
                  byte lastUID[10], int& lastUIDSize, unsigned long& lastScan,
                  const char* label, const char* action)
{
  unsigned long nowMs = millis();
  if (showState != IDLE) return;

  // Try to detect card
  if (!r.PICC_IsNewCardPresent()) {
    return;  // No card present, exit early
  }

  DEBUG_PRINTF("[DEBUG] %s: Card detected, reading...\n", label);

  if (r.PICC_ReadCardSerial()) {
    if (r.uid.size >= 1 && r.uid.size <= 10) {
      int uidSize = r.uid.size;
      byte uid[10]; 
      for (int i=0;i<uidSize;i++) uid[i] = r.uid.uidByte[i];

      if ( !(uidSize == lastUIDSize && uidEquals(uid, lastUID, uidSize) && (nowMs - lastScan) < ANTI_PASS_MS) ) {
        for (int i=0;i<uidSize;i++) lastUID[i] = uid[i];
        lastUIDSize = uidSize;
        lastScan = nowMs;

        String rfidUUID = uidToString(uid, uidSize);
        DEBUG_PRINTF("\n[SCAN] %s -> UUID: %s (size: %d bytes)\n", label, rfidUUID.c_str(), uidSize);

        // Send to API
        ApiResponse apiResp = sendScanToAPI(rfidUUID, action);

        if (apiResp.success && apiResp.accessGranted) {
          // Access granted
          DEBUG_PRINTF("[ACCES] %s -> %s AUTORISE (%s)\n", 
                       label, 
                       apiResp.personName.c_str(),
                       apiResp.personType.c_str());
          
          showState = SHOW_OK; 
          showUntil = nowMs + BADGE_HOLD_MS;
          ledsOK(); 
          showOnLCD(label, apiResp.personName.c_str(), true);
          servoOpenNow();
          buzzerOk();
        } else {
          // Access denied
          DEBUG_PRINTF("[ACCES] %s -> REFUSE: %s\n", 
                       label, 
                       apiResp.message.c_str());
          
          showState = SHOW_FAIL; 
          showUntil = nowMs + BADGE_HOLD_MS;
          ledsFAIL(); 
          
          const char* displayName = apiResp.personName.length() > 0 ? 
                                   apiResp.personName.c_str() : 
                                   "Inconnu";
          showOnLCD(label, displayName, false);
          buzzerFail();
        }
      }
    }
    r.PICC_HaltA();
    r.PCD_StopCrypto1();
  }
}

// ---------- SETUP ----------
void setup() {
#if ENABLE_SERIAL_DEBUG
  Serial.begin(115200);
  delay(1000);
#endif

  pinMode(LED_ROUGE, OUTPUT);
  pinMode(LED_VERTE, OUTPUT);
  ledsIdle();

  // LCD
  lcd.begin(16, 2);
  lcd.clear();
  lcd.print("Demarrage...");

  // WiFi
  connectWiFi();

  // SPI + RC522
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  delay(100);  // Give SPI time to stabilize after WiFi
  
  // Initialize RFID readers - IN first
  DEBUG_PRINTLN("[INIT] Initializing rfidIn...");
  rfidIn.PCD_Init(IN_SS, IN_RST);
  delay(50);  // Small delay between initializations
  
  // Verify rfidIn is working
  byte versionIn = rfidIn.PCD_ReadRegister(rfidIn.VersionReg);
  DEBUG_PRINTF("[INIT] rfidIn version: 0x%02X\n", versionIn);
  if (versionIn == 0x00 || versionIn == 0xFF) {
    DEBUG_PRINTLN("[WARN] rfidIn may not be properly initialized!");
  }
  
  // Initialize OUT reader
  DEBUG_PRINTLN("[INIT] Initializing rfidOut...");
  rfidOut.PCD_Init(OUT_SS, OUT_RST);
  delay(50);
  
  // Verify rfidOut is working
  byte versionOut = rfidOut.PCD_ReadRegister(rfidOut.VersionReg);
  DEBUG_PRINTF("[INIT] rfidOut version: 0x%02X\n", versionOut);
  if (versionOut == 0x00 || versionOut == 0xFF) {
    DEBUG_PRINTLN("[WARN] rfidOut may not be properly initialized!");
  }
  
  delay(60);

  // Servo
  servoLock.attach(SERVO_PIN, 500, 2500);
  servoLock.write(SERVO_POS_FERME);

  DEBUG_PRINTLN("[OK] Système prêt.");
  lcdStandby();
}

// ---------- LOOP ----------
void loop() {
  unsigned long nowMs = millis();

  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("[WiFi] Connexion perdue, reconnexion...");
    connectWiFi();
  }

  // Fin d'affichage LED/LCD ?
  if (showState != IDLE && (long)(nowMs - showUntil) >= 0) {
    showState = IDLE;
    ledsIdle();
    lcdStandby();
  }

  // Lecture des deux lecteurs avec actions différentes
  // Process "in" reader first
  handleReader(rfidIn,  lastUID_in,  lastUIDSize_in,  lastScan_in,  "ENTREE", "in");
  
  // Small delay to prevent SPI bus conflicts
  delay(10);
  
  // Then process "out" reader
  handleReader(rfidOut, lastUID_out, lastUIDSize_out, lastScan_out, "SORTIE", "out");

  // Gestion servo & buzzer
  servoCloseIfDue();
  buzzerHandle();
}