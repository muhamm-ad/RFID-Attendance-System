# 🚪 Door System - Entry/Exit RFID Control

This system controls entry and exit through a door using two RFID readers, with visual and audio feedback, and automatic door lock control.

## Overview

The door system uses an ESP32 microcontroller to manage:
- **2 RFID Readers** (MFRC522) - one for entry, one for exit
- **LCD Display** (16x2) - shows access status and user information
- **LEDs** - Red (denied) and Green (granted) visual feedback
- **Servo Motor** - controls door lock mechanism
- **Buzzer** - audio feedback for access attempts

## Hardware Components

### Required Components

| Component | Quantity | Notes |
|-----------|----------|-------|
| ESP32 Development Board | 1 | Any ESP32 variant |
| MFRC522 RFID Reader | 2 | Entry and Exit readers |
| 16x2 LCD Display | 1 | Parallel interface (4-bit mode) |
| Servo Motor | 1 | Standard servo (SG90 or similar) |
| LED (Red) | 1 | Access denied indicator |
| LED (Green) | 1 | Access granted indicator |
| Buzzer | 1 | Piezo buzzer |
| Resistors | Various | For LEDs (220Ω recommended) |
| Potentiometer | 1 | For LCD contrast (10kΩ) |
| Jumper Wires | Many | For connections |
| Breadboard | 1-2 | For prototyping |

### Power Requirements

- **ESP32**: 3.3V (can be powered via USB or external 3.3V supply)
- **MFRC522**: 3.3V (can share ESP32 3.3V)
- **LCD**: 5V (can use ESP32 5V pin if available, or external supply)
- **Servo**: 5V external supply recommended (servos can draw significant current)
- **LEDs/Buzzer**: Can use ESP32 3.3V

**Important:** Use a common ground (GND) for all components.

## Pin Configuration

### RFID Readers (MFRC522)

Both readers share the SPI bus but have separate chip select (SS) and reset (RST) pins:

| Component | Pin | ESP32 GPIO |
|-----------|-----|------------|
| **SPI Bus (Shared)** |
| SPI Clock (SCK) | SCK | GPIO 18 |
| SPI MISO | MISO | GPIO 19 |
| SPI MOSI | MOSI | GPIO 23 |
| **Entry Reader** |
| Entry SS | SDA | GPIO 5 |
| Entry RST | RST | GPIO 13 |
| **Exit Reader** |
| Exit SS | SDA | GPIO 21 |
| Exit RST | RST | GPIO 22 |

### LCD Display (16x2, 4-bit mode)

| LCD Pin | ESP32 GPIO | Notes |
|---------|------------|-------|
| VSS | GND | Ground |
| VDD | 5V | Power (or 3.3V if LCD supports) |
| V0 | Potentiometer | Contrast control |
| RS | GPIO 14 | Register Select |
| E | GPIO 27 | Enable |
| D4 | GPIO 26 | Data bit 4 |
| D5 | GPIO 25 | Data bit 5 |
| D6 | GPIO 33 | Data bit 6 |
| D7 | GPIO 32 | Data bit 7 |
| RW | GND | Read/Write (grounded for write-only) |
| A | 5V/3.3V | Backlight anode (if applicable) |
| K | GND | Backlight cathode (if applicable) |

### LEDs

| LED | ESP32 GPIO | Resistor |
|-----|------------|----------|
| Red LED | GPIO 16 | 220Ω to GND |
| Green LED | GPIO 17 | 220Ω to GND |

### Servo Motor

| Servo Pin | ESP32 GPIO | Notes |
|-----------|------------|-------|
| Signal (Orange/Yellow) | GPIO 4 | PWM signal |
| Power (Red) | 5V External | Use external 5V supply |
| Ground (Brown/Black) | GND | Common ground |

### Buzzer

| Buzzer Pin | ESP32 GPIO | Notes |
|------------|------------|-------|
| Positive | GPIO 2 | Direct connection |
| Negative | GND | Ground |

## Wiring Diagram

> **Note:** A detailed wiring diagram will be added in the `images/` directory.

### Quick Wiring Guide

1. **SPI Bus Setup:**
   - Connect SCK, MISO, MOSI from both MFRC522 readers to the same ESP32 pins (18, 19, 23)
   - Connect Entry reader SS to GPIO 5, RST to GPIO 13
   - Connect Exit reader SS to GPIO 21, RST to GPIO 22
   - Connect 3.3V and GND to both readers

2. **LCD Setup:**
   - Connect LCD pins according to the pin configuration table
   - Use a potentiometer for V0 (contrast) control
   - Connect RW to GND

3. **Servo Setup:**
   - Connect signal wire to GPIO 4
   - **Important:** Use an external 5V power supply for the servo
   - Connect servo ground to ESP32 GND

4. **LEDs and Buzzer:**
   - Connect through current-limiting resistors (220Ω for LEDs)
   - Connect to respective GPIO pins

## Software Setup

### Required Libraries

Install these libraries in Arduino IDE:

1. **MFRC522** by GithubCommunity
   - Tools → Manage Libraries → Search "MFRC522"

2. **LiquidCrystal** (usually included with Arduino IDE)

3. **ESP32Servo** by Kevin Harrington
   - Tools → Manage Libraries → Search "ESP32Servo"

### Arduino IDE Configuration

1. Install ESP32 Board Support:
   - File → Preferences → Additional Board Manager URLs
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install

2. Select Board:
   - Tools → Board → ESP32 Arduino → Select your ESP32 board

3. Configure Settings:
   - Upload Speed: 115200
   - CPU Frequency: 240MHz (WiFi/BT)
   - Flash Frequency: 80MHz
   - Flash Size: 4MB (or match your board)

### Code Configuration

Before uploading, you need to modify the code to:

1. **Add WiFi Configuration:**
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

2. **Add Backend Server URL:**
   ```cpp
   const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/scan";
   ```

3. **Add HTTP Client Code:**
   The current code has local user checking. You'll need to add WiFi and HTTP client code to send API requests.

### Example WiFi and HTTP Integration

Add these includes at the top:
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
```

Add WiFi setup in `setup()`:
```cpp
WiFi.begin(ssid, password);
while (WiFi.status() != WL_CONNECTED) {
  delay(500);
  Serial.print(".");
}
Serial.println("WiFi connected");
```

Modify `handleReader()` to send API requests instead of local checking.

## Operation

### Normal Operation Flow

1. **Standby State:**
   - LCD displays "Badge ENTREE / SORTIE s.v.p."
   - LEDs are off
   - Servo is in closed position

2. **Badge Scan (Entry):**
   - User presents badge to Entry reader
   - System reads RFID UID
   - Sends POST request to `/api/scan` with `action: "in"`
   - Based on response:
     - **Access Granted:** Green LED, LCD shows "ENTREE OK [Name]", servo opens, short beep
     - **Access Denied:** Red LED, LCD shows "ENTREE REFUSE [Reason]", long beeps

3. **Badge Scan (Exit):**
   - Same process but with `action: "out"`

4. **Anti-Passback:**
   - Prevents same badge from being scanned twice within 5 seconds on the same reader

### Servo Control

- **Closed Position:** 0° (configurable)
- **Open Position:** 90° (configurable)
- **Open Duration:** 2.5 seconds (configurable)
- Servo automatically closes after the duration

### Audio Feedback

- **Access Granted:** 1 short beep (200ms)
- **Access Denied:** 2 long beeps (5 seconds each with 500ms gap)

## API Integration

The system sends HTTP POST requests to the backend:

**Entry Scan:**
```json
POST http://YOUR_SERVER:3000/api/scan
Content-Type: application/json

{
  "rfid_uuid": "A1B2C3D4",
  "action": "in"
}
```

**Exit Scan:**
```json
POST http://YOUR_SERVER:3000/api/scan
Content-Type: application/json

{
  "rfid_uuid": "A1B2C3D4",
  "action": "out"
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "access_granted": true,
  "person": {
    "nom": "Diallo",
    "prenom": "Amadou"
  },
  "message": "✅ Access granted - Student"
}
```

**Expected Response (Denied):**
```json
{
  "success": true,
  "access_granted": false,
  "message": "❌ Payment required for trimester 2"
}
```

## Configuration Parameters

You can adjust these constants in the code:

```cpp
const unsigned long BADGE_HOLD_MS = 3000;  // Display duration
const unsigned long ANTI_PASS_MS = 5000;  // Anti-passback window
const int SERVO_POS_FERME = 0;            // Closed position
const int SERVO_POS_OUVERT = 90;          // Open position
const unsigned long SERVO_OPEN_MS = 2500; // Door open duration
const unsigned long BEEP_OK_ON_MS = 200;  // Success beep duration
const unsigned long BEEP_FAIL_ON_MS = 5000; // Failure beep duration
```

## Troubleshooting

### RFID Readers Not Working

- **Check SPI connections:** Ensure SCK, MISO, MOSI are correctly connected
- **Verify SS pins:** Each reader must have a unique SS pin
- **Check power:** MFRC522 requires 3.3V (not 5V)
- **Test individually:** Try connecting one reader at a time
- **Check serial output:** Look for initialization messages

### LCD Not Displaying

- **Check contrast:** Adjust potentiometer on V0
- **Verify connections:** Especially RS, E, and data pins
- **Check power:** LCD may need 5V
- **Test with simple sketch:** Use LiquidCrystal example

### Servo Not Moving

- **Check power:** Servo needs external 5V supply (ESP32 5V may not be sufficient)
- **Verify signal pin:** Ensure GPIO 4 is connected
- **Check library:** Use ESP32Servo (not standard Servo library)
- **Test range:** Try different angles (0-180)

### WiFi Connection Issues

- **Check credentials:** Verify SSID and password
- **2.4GHz only:** ESP32 doesn't support 5GHz networks
- **Signal strength:** Ensure good WiFi signal
- **Check serial monitor:** Look for connection status

### API Requests Failing

- **Verify server URL:** Check IP address and port
- **Test connectivity:** Ping server from another device
- **Check firewall:** Ensure port 3000 is accessible
- **Review serial output:** Check for HTTP error codes

## Testing

### Initial Testing (Without Backend)

1. Upload code with local user list
2. Test with known RFID cards
3. Verify LEDs, LCD, servo, and buzzer work
4. Check serial monitor output

### Integration Testing (With Backend)

1. Configure WiFi and server URL
2. Ensure backend is running
3. Test with registered badges
4. Verify API responses
5. Check database logs

## Next Steps

1. Complete WiFi and HTTP client integration in the code
2. Test with actual backend server
3. Calibrate servo positions for your door mechanism
4. Adjust timing parameters as needed
5. Add error handling and retry logic for API calls

## Images

Wiring diagrams and photos will be added to the `images/` directory:
- Complete wiring diagram
- Component placement photos
- Servo mounting examples
- Final installation photos

