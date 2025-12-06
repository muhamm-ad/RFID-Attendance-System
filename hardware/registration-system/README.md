# 📝 Registration System - Badge Registration

This system is used for registering new RFID badges in the system. It consists of a single ESP32 with one RFID reader.

## Overview

The registration system provides a simple interface for scanning RFID badges when adding new persons to the system. When a badge is scanned, it sends the UUID to the backend server in registration mode (without an `action` parameter).

## Hardware Components

### Required Components

| Component | Quantity | Notes |
|-----------|----------|-------|
| ESP32 Development Board | 1 | Any ESP32 variant |
| MFRC522 RFID Reader | 1 | For scanning badges |
| LED (Optional) | 1 | Visual feedback when badge is scanned |
| Buzzer (Optional) | 1 | Audio feedback |
| Jumper Wires | Several | For connections |
| Breadboard | 1 | For prototyping |

### Power Requirements

- **ESP32**: 3.3V (can be powered via USB or external 3.3V supply)
- **MFRC522**: 3.3V (can share ESP32 3.3V)

## Pin Configuration

### RFID Reader (MFRC522)

| Component | Pin | ESP32 GPIO | Notes |
|-----------|-----|------------|-------|
| SPI Clock | SCK | GPIO 18 | |
| SPI MISO | MISO | GPIO 19 | |
| SPI MOSI | MOSI | GPIO 23 | |
| Chip Select | SS/SDA | GPIO 5 | |
| Reset | RST | GPIO 13 | |
| Power | 3.3V | 3.3V | |
| Ground | GND | GND | |

### Optional Components

If you want visual/audio feedback:

| Component | ESP32 GPIO | Notes |
|-----------|------------|-------|
| LED | GPIO 2 | Through 220Ω resistor |
| Buzzer | GPIO 4 | Direct connection |

> **Note:** Pin assignments can be changed based on your needs. The code will need to be updated accordingly.

## Wiring Diagram

> **Note:** A detailed wiring diagram will be added in the `images/` directory.

### Quick Wiring Guide

1. **RFID Reader:**
   - Connect SCK to GPIO 18
   - Connect MISO to GPIO 19
   - Connect MOSI to GPIO 23
   - Connect SS to GPIO 5
   - Connect RST to GPIO 13
   - Connect 3.3V and GND

2. **Optional LED:**
   - Connect anode through 220Ω resistor to GPIO 2
   - Connect cathode to GND

3. **Optional Buzzer:**
   - Connect positive to GPIO 4
   - Connect negative to GND

## Software Setup

### Required Libraries

Install these libraries in Arduino IDE:

1. **MFRC522** by GithubCommunity
   - Tools → Manage Libraries → Search "MFRC522"

### Arduino IDE Configuration

Same as Door System:
1. Install ESP32 Board Support Package
2. Select your ESP32 board
3. Configure upload settings

### Code Structure

The registration system code should:

1. Initialize WiFi connection
2. Initialize RFID reader
3. Continuously scan for RFID cards
4. When a card is detected:
   - Read the UID
   - Send POST request to `/api/scan` with only `rfid_uuid` (no `action`)
   - Provide feedback (LED/buzzer)
   - Wait before next scan

### Example Code Structure

```cpp
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Pin definitions
#define SS_PIN 5
#define RST_PIN 13

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server URL
const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/scan";

// RFID reader
MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  
  // Initialize WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Initialize RFID
  SPI.begin();
  rfid.PCD_Init();
  
  Serial.println("Registration system ready");
}

void loop() {
  // Scan for RFID cards
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    // Read UID
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) uid += "0";
      uid += String(rfid.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    
    // Send to server
    sendRegistration(uid);
    
    // Halt and stop
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    
    delay(1000); // Prevent multiple scans
  }
}

void sendRegistration(String uid) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  String json = "{\"rfid_uuid\":\"" + uid + "\"}";
  
  int httpResponseCode = http.POST(json);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
```

## API Integration

The registration system sends HTTP POST requests in **registration mode** (without `action` parameter):

**Registration Request:**
```json
POST http://YOUR_SERVER:3000/api/scan
Content-Type: application/json

{
  "rfid_uuid": "A1B2C3D4"
}
```

**Expected Response:**
```json
{
  "success": true,
  "rfid_uuid": "A1B2C3D4",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

The frontend can then retrieve this UUID using `GET /api/scan` to populate the registration form.

## Operation Flow

1. **System Ready:**
   - ESP32 connects to WiFi
   - RFID reader initialized
   - System waits for badge scan

2. **Badge Scan:**
   - User presents RFID badge
   - System reads UID
   - Sends UUID to backend (registration mode)
   - Provides feedback (LED blink or beep)
   - Waits for next scan

3. **Frontend Integration:**
   - User clicks "Scan" button in person registration form
   - Frontend polls `GET /api/scan` endpoint
   - When UUID is received, it populates the form
   - User completes registration

## Configuration

### WiFi Settings

Update these in the code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### Server URL

Update the backend server address:
```cpp
const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/scan";
```

### Scan Delay

Adjust the delay between scans to prevent multiple reads:
```cpp
delay(1000); // 1 second delay (adjust as needed)
```

## Troubleshooting

### RFID Reader Not Working

- Check SPI connections (SCK, MISO, MOSI)
- Verify SS and RST pins
- Ensure 3.3V power supply
- Check serial monitor for initialization messages

### WiFi Connection Issues

- Verify SSID and password
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Check signal strength
- Review serial monitor for connection status

### API Requests Failing

- Verify server URL and port
- Ensure backend server is running
- Check network connectivity
- Review HTTP response codes in serial monitor

### Multiple Scans

- Increase delay between scans
- Add debouncing logic
- Check for card removal before next scan

## Testing

1. **Hardware Test:**
   - Upload code
   - Open serial monitor
   - Scan a badge
   - Verify UID is printed

2. **Network Test:**
   - Verify WiFi connection
   - Check server reachability
   - Test API endpoint manually

3. **Integration Test:**
   - Scan badge with registration system
   - Check backend receives request
   - Verify frontend can retrieve UUID

## Next Steps

1. Implement the complete registration system code
2. Add visual/audio feedback
3. Test with backend server
4. Integrate with frontend registration form
5. Add error handling and retry logic

## Images

Wiring diagrams and setup photos will be added to the `images/` directory:
- RFID reader wiring diagram
- Complete setup photos
- Integration with frontend workflow

