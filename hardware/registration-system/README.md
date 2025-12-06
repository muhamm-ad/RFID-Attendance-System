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

2. **ArduinoJson** by Benoit Blanchon
   - Tools → Manage Libraries → Search "ArduinoJson"
   - Required for parsing API responses

3. **WiFi** and **HTTPClient** - Built-in ESP32 libraries (no installation needed)

### Arduino IDE Configuration

Same as Door System:
1. Install ESP32 Board Support Package
2. Select your ESP32 board
3. Configure upload settings

### Code Implementation

The complete code is available in `esp32-registration.ino`. The system:

1. ✅ Initializes WiFi connection
2. ✅ Initializes RFID reader
3. ✅ Continuously scans for RFID cards
4. ✅ When a card is detected:
   - Reads the UID
   - Sends POST request to `/api/scan` with only `rfid_uuid` (no `action` parameter)
   - Provides LED feedback
   - Implements anti-passback to prevent duplicate scans
   - Waits before next scan

### Code Configuration

Before uploading, configure these settings in `esp32-registration.ino`:

**WiFi Credentials:**
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
```

**API Server URL:**
```cpp
const char* API_BASE_URL = "http://YOUR_SERVER_IP:3000";
// or for Vercel deployment:
const char* API_BASE_URL = "https://your-deployment.vercel.app";
```

**Pin Configuration (if different):**
```cpp
#define RFID_SS   5   // Chip Select pin
#define RFID_RST  13  // Reset pin
#define LED_PIN   2   // Optional LED feedback
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

1. **System Startup:**
   - ESP32 connects to WiFi (LED blinks 3 times on success)
   - RFID reader initialized and tested
   - System ready message displayed on serial monitor

2. **Badge Scan:**
   - User presents RFID badge to the reader
   - System reads UID and converts to hex string
   - LED turns on during processing
   - Sends POST request to `/api/scan` with UUID (registration mode)
   - **Success:** LED blinks twice quickly
   - **Error:** LED stays on longer
   - Anti-passback prevents same card from being scanned within 3 seconds

3. **Frontend Integration:**
   - User clicks "Scan" button in person registration form
   - Frontend polls `GET /api/scan` endpoint
   - When UUID is received, it populates the form
   - User completes registration with person details

## Features

- ✅ **WiFi Auto-Reconnect:** Automatically reconnects if WiFi is lost
- ✅ **Anti-Passback:** Prevents duplicate scans of the same card
- ✅ **Visual Feedback:** LED indicates scan status
- ✅ **Serial Debugging:** Detailed serial output for troubleshooting
- ✅ **Error Handling:** Graceful handling of network and API errors

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

### Scan Parameters

Adjust these constants in the code:
```cpp
const unsigned long SCAN_DELAY_MS = 1500;  // Delay after each scan
const unsigned long ANTI_PASS_MS = 3000;    // Prevent same card scan window
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

## Usage

1. **Upload Code:**
   - Open `esp32-registration.ino` in Arduino IDE
   - Configure WiFi credentials and API URL
   - Upload to ESP32

2. **Test System:**
   - Open Serial Monitor (115200 baud)
   - Verify WiFi connection
   - Present an RFID badge
   - Check serial output for scan confirmation

3. **Register Badge:**
   - Scan badge with registration system
   - Open frontend registration form
   - Click "Scan" button
   - Badge UUID should appear automatically
   - Complete person information and save

## Next Steps

1. ✅ Code implementation complete
2. ✅ Visual feedback (LED) implemented
3. Test with backend server
4. Integrate with frontend registration form
5. Add optional buzzer for audio feedback (if needed)

## Images

Wiring diagrams and setup photos will be added to the `images/` directory:
- RFID reader wiring diagram
- Complete setup photos
- Integration with frontend workflow

