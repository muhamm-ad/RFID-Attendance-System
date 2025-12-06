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

struct ApiResponse;

// ---------- WIFI CONFIG ----------
const char* WIFI_SSID = "A&A";
const char* WIFI_PASSWORD = "Muhawwad19";

// ---------- API CONFIG ----------
const char* API_BASE_URL = "https://rfid-attendance-system-git-master-muhamm-ads-projects.vercel.app";
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
byte lastUID_in [4] = {0,0,0,0};
byte lastUID_out[4] = {0,0,0,0};
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
bool uidEquals4(const byte *a, const byte *b){
  for (int i=0;i<4;i++) if (a[i]!=b[i]) return false;
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
    Serial.println("[API] WiFi non connecté!");
    response.message = "WiFi Error";
    return response;
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + String(API_SCAN_ENDPOINT);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["rfid_uuid"] = rfidUUID;
  doc["action"] = action;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.printf("[API] POST %s\n", url.c_str());
  Serial.printf("[API] Payload: %s\n", jsonPayload.c_str());
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    Serial.printf("[API] Response code: %d\n", httpCode);
    String payload = http.getString();
    Serial.printf("[API] Response: %s\n", payload.c_str());
    
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
      Serial.printf("[API] JSON parse error: %s\n", error.c_str());
      response.message = "Parse Error";
    }
  } else {
    Serial.printf("[API] HTTP Error: %s\n", http.errorToString(httpCode).c_str());
    response.message = "HTTP Error";
  }
  
  http.end();
  return response;
}

void connectWiFi() {
  Serial.print("[WiFi] Connexion à ");
  Serial.println(WIFI_SSID);
  lcdShowConnecting();
  
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
    lcdShowConnected();
    delay(2000);
    lcdStandby();
  } else {
    Serial.println("\n[WiFi] Échec de connexion!");
    lcd.clear();
    lcd.setCursor(0,0); lcd.print("WiFi ERREUR!");
    delay(3000);
    lcdStandby();
  }
}

void handleReader(MFRC522& r,
                  byte lastUID[4], unsigned long& lastScan,
                  const char* label, const char* action)
{
  unsigned long nowMs = millis();
  if (showState != IDLE) return;

  if (r.PICC_IsNewCardPresent() && r.PICC_ReadCardSerial()) {
    if (r.uid.size >= 4) {
      byte uid4[4]; 
      for (int i=0;i<4;i++) uid4[i] = r.uid.uidByte[i];

      if ( !(uidEquals4(uid4, lastUID) && (nowMs - lastScan) < ANTI_PASS_MS) ) {
        for (int i=0;i<4;i++) lastUID[i] = uid4[i];
        lastScan = nowMs;

        String rfidUUID = uidToString(uid4);
        Serial.printf("\n[SCAN] %s -> UUID: %s\n", label, rfidUUID.c_str());

        // Send to API
        ApiResponse apiResp = sendScanToAPI(rfidUUID, action);

        if (apiResp.success && apiResp.accessGranted) {
          // Access granted
          Serial.printf("[ACCES] %s -> %s AUTORISE (%s)\n", 
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
          Serial.printf("[ACCES] %s -> REFUSE: %s\n", 
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
  Serial.begin(115200);
  delay(1000);

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
  rfidIn.PCD_Init(IN_SS, IN_RST);
  rfidOut.PCD_Init(OUT_SS, OUT_RST);
  delay(60);

  // Servo
  servoLock.attach(SERVO_PIN, 500, 2500);
  servoLock.write(SERVO_POS_FERME);

  Serial.println("[OK] Système prêt.");
  lcdStandby();
}

// ---------- LOOP ----------
void loop() {
  unsigned long nowMs = millis();

  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connexion perdue, reconnexion...");
    connectWiFi();
  }

  // Fin d'affichage LED/LCD ?
  if (showState != IDLE && (long)(nowMs - showUntil) >= 0) {
    showState = IDLE;
    ledsIdle();
    lcdStandby();
  }

  // Lecture des deux lecteurs avec actions différentes
  handleReader(rfidIn,  lastUID_in,  lastScan_in,  "ENTREE", "in");
  handleReader(rfidOut, lastUID_out, lastScan_out, "SORTIE", "out");

  // Gestion servo & buzzer
  servoCloseIfDue();
  buzzerHandle();
}