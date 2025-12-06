// sketch_pontons.ino

// ESP32 — 2x RC522 + 2 LEDs partagées + LCD 16x2 (parallèle) + SERVO
// (ESP32Servo) + BUZZER (tone) LEDs: rouge=GPIO16, verte=GPIO17 RC522 ENTREE :
// SS=5,  RST=13 RC522 SORTIE : SS=21, RST=22 SPI partagé : SCK=18, MISO=19,
// MOSI=23 LCD (4 bits): RS=14, E=27, D4=26, D5=25, D6=33, D7=32  (RW->GND, V0
// via potar) SERVO: signal=GPIO4  (alim 5V externe conseillée, GND commun)
// BUZZER: GPIO2 (piloté par tone/noTone)

#include <Arduino.h>
#include <ESP32Servo.h> // lib servo pour ESP32
#include <LiquidCrystal.h>
#include <MFRC522.h>
#include <SPI.h>

// ---------- PINS ----------
#define LED_ROUGE 16
#define LED_VERTE 17

#define SPI_SCK 18
#define SPI_MISO 19
#define SPI_MOSI 23

#define IN_SS 5
#define IN_RST 13
#define OUT_SS 21
#define OUT_RST 22

// LCD (parallèle 4 bits)
#define LCD_RS 14
#define LCD_E 27
#define LCD_D4 26
#define LCD_D5 25
#define LCD_D6 33
#define LCD_D7 32

// SERVO
#define SERVO_PIN 4 // <-- remis sur GPIO4

// BUZZER
#define BUZZER_PIN 2

// ---------- PARAMETRES ----------
const unsigned long BADGE_HOLD_MS = 3000; // durée affichage LED/LCD
const unsigned long ANTI_PASS_MS = 5000;  // anti-doublon par lecteur

// Servo (ajuste selon ta mécanique)
const int SERVO_POS_FERME = 0;   // 0..180
const int SERVO_POS_OUVERT = 90; // 0..180
const unsigned long SERVO_OPEN_MS = 2500;

// Son
const uint32_t BUZZ_FREQ = 2000;            // 2 kHz
const unsigned long BEEP_OK_ON_MS = 200;    // 0.2s (accès autorisé)
const unsigned long BEEP_FAIL_ON_MS = 5000; // 5 s (accès refusé)
const unsigned long BEEP_GAP_MS = 500;      // pause entre 2 bips

// ---------- UTILISATEURS ----------
struct Utilisateur {
    const char *nom;
    byte uid[4];
};
Utilisateur users[] = {
    {"Etudiant1", {0x83, 0xC5, 0x8C, 0x02}}, // carte blanche
    {"Visiteur", {0x13, 0x5F, 0xF8, 0x2C}},  // badge bleu (autorisé)
};
const int userCount = sizeof(users) / sizeof(users[0]);

// ---------- OBJETS ----------
MFRC522 rfidIn(IN_SS, IN_RST);
MFRC522 rfidOut(OUT_SS, OUT_RST);
LiquidCrystal lcd(LCD_RS, LCD_E, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
Servo servoLock; // ESP32Servo

// Anti-passback
byte lastUID_in[4] = {0, 0, 0, 0};
byte lastUID_out[4] = {0, 0, 0, 0};
unsigned long lastScan_in = 0;
unsigned long lastScan_out = 0;

// Affichage partagé
enum ShowState { IDLE, SHOW_OK, SHOW_FAIL };
ShowState showState = IDLE;
unsigned long showUntil = 0;

// Servo état
bool servoIsOpen = false;
unsigned long servoCloseAt = 0;

// ---------- BUZZER STATE MACHINE (tone/noTone) ----------
enum BuzzState { BUZZ_IDLE, BUZZ_ON, BUZZ_GAP };
BuzzState buzzState = BUZZ_IDLE;
unsigned long buzzUntil = 0;
int buzzRepeats = 0;          // bips restants
unsigned long buzzOnDur = 0;  // durée d'un bip
unsigned long buzzGapDur = 0; // durée d'une pause

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
void buzzerOk() { buzzerPattern(1, BEEP_OK_ON_MS, BEEP_GAP_MS); } // 1 bip de 1s
void buzzerFail() {
    buzzerPattern(2, BEEP_FAIL_ON_MS, BEEP_GAP_MS);
} // 2 bips de 5s

void buzzerHandle() {
    if (buzzState == BUZZ_IDLE)
        return;
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
bool uidEquals4(const byte *a, const byte *b) {
    for (int i = 0; i < 4; i++)
        if (a[i] != b[i])
            return false;
    return true;
}

const char *findUserName(const byte *uid) {
    for (int i = 0; i < userCount; i++) {
        if (uidEquals4(uid, users[i].uid))
            return users[i].nom;
    }
    return nullptr;
}

void ledsIdle() {
    digitalWrite(LED_VERTE, LOW);
    digitalWrite(LED_ROUGE, LOW);
}
void ledsOK() {
    digitalWrite(LED_VERTE, HIGH);
    digitalWrite(LED_ROUGE, LOW);
}
void ledsFAIL() {
    digitalWrite(LED_VERTE, LOW);
    digitalWrite(LED_ROUGE, HIGH);
}

void lcdStandby() {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Badge ENTREE /");
    lcd.setCursor(0, 1);
    lcd.print("SORTIE s.v.p.");
}

void showOnLCD(const char *cote, const char *nom, bool ok) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(cote);
    lcd.setCursor(8, 0);
    lcd.print(ok ? "OK" : "REFUSE");
    lcd.setCursor(0, 1);
    lcd.print(nom ? nom : "Inconnu");
}

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

void handleReader(MFRC522 &r, byte lastUID[4], unsigned long &lastScan,
                  const char *label) {
    unsigned long nowMs = millis();
    if (showState != IDLE)
        return;

    if (r.PICC_IsNewCardPresent() && r.PICC_ReadCardSerial()) {
        if (r.uid.size >= 4) {
            byte uid4[4];
            for (int i = 0; i < 4; i++)
                uid4[i] = r.uid.uidByte[i];

            if (!(uidEquals4(uid4, lastUID) &&
                  (nowMs - lastScan) < ANTI_PASS_MS)) {
                for (int i = 0; i < 4; i++)
                    lastUID[i] = uid4[i];
                lastScan = nowMs;

                const char *nom = findUserName(uid4);

                if (nom != nullptr) {
                    Serial.printf("[ACCES] %s -> %s AUTORISE\n", label, nom);
                    showState = SHOW_OK;
                    showUntil = nowMs + BADGE_HOLD_MS;
                    ledsOK();
                    showOnLCD(label, nom, true);
                    servoOpenNow(); // ouvre la barrière
                    buzzerOk();     // 1 bip de 1s
                } else {
                    Serial.printf("[ACCES] %s -> UID inconnu REFUSE\n", label);
                    showState = SHOW_FAIL;
                    showUntil = nowMs + BADGE_HOLD_MS;
                    ledsFAIL();
                    showOnLCD(label, "Inconnu", false);
                    buzzerFail(); // 2 bips de 5s
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

    pinMode(LED_ROUGE, OUTPUT);
    pinMode(LED_VERTE, OUTPUT);
    ledsIdle();

    // LCD
    lcd.begin(16, 2);
    lcdStandby();

    // SPI + RC522
    SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
    rfidIn.PCD_Init(IN_SS, IN_RST);
    rfidOut.PCD_Init(OUT_SS, OUT_RST);
    delay(60);

    // Servo (ESP32Servo) — impulsions 500..2500 µs (plus compatible)
    servoLock.attach(SERVO_PIN, 500, 2500);
    servoLock.write(SERVO_POS_FERME);

    Serial.println("[OK] Lecteurs, LCD, servo et buzzer prêts.");
}

// ---------- LOOP ----------
void loop() {
    unsigned long nowMs = millis();

    // Fin d'affichage LED/LCD ?
    if (showState != IDLE && (long)(nowMs - showUntil) >= 0) {
        showState = IDLE;
        ledsIdle();
        lcdStandby();
    }

    // Lecture des deux lecteurs
    handleReader(rfidIn, lastUID_in, lastScan_in, "ENTREE");
    handleReader(rfidOut, lastUID_out, lastScan_out, "SORTIE");

    // Gestion servo & buzzer non bloquante
    servoCloseIfDue();
    buzzerHandle();
}
