# 🔧 Hardware Setup Guide

This directory contains all documentation and code for the RFID attendance system hardware components.

## Overview

The RFID attendance system uses **3 RFID readers** connected to **2 ESP32 microcontrollers**:

1. **Door System** (Entry/Exit) - 2 RFID readers on one ESP32
   - Entry reader for scanning badges when entering
   - Exit reader for scanning badges when leaving
   - Controls door lock (servo), LEDs, LCD display, and buzzer
   - Sends API requests to the backend server

2. **Registration System** - 1 RFID reader on another ESP32
   - Used for registering new badges
   - Sends scan data to the backend for badge registration

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server (Next.js)                  │
│                  http://your-server-ip:3000                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│  Door System   │            │  Registration   │
│    (ESP32)     │            │  System (ESP32) │
│                │            │                 │
│  ┌──────────┐  │            │  ┌──────────┐  │
│  │ RFID IN  │  │            │  │   RFID   │  │
│  └──────────┘  │            │  └──────────┘  │
│  ┌──────────┐  │            │                 │
│  │ RFID OUT │  │            │                 │
│  └──────────┘  │            │                 │
│  ┌──────────┐  │            │                 │
│  │  Servo   │  │            │                 │
│  └──────────┘  │            │                 │
│  ┌──────────┐  │            │                 │
│  │   LCD    │  │            │                 │
│  └──────────┘  │            │                 │
│  ┌──────────┐  │            │                 │
│  │  LEDs    │  │            │                 │
│  └──────────┘  │            │                 │
│  ┌──────────┐  │            │                 │
│  │  Buzzer  │  │            │                 │
│  └──────────┘  │            │                 │
└────────────────┘            └─────────────────┘
```

> **Note:** Architecture diagrams will be added in the `images/` directory.

## Components

### Required Hardware

#### Door System (ESP32 #1)
- 1x ESP32 Development Board
- 2x MFRC522 RFID Reader Modules
- 1x 16x2 LCD Display (parallel interface)
- 1x Servo Motor (for door lock)
- 2x LEDs (Red and Green)
- 1x Buzzer
- Resistors, jumper wires, breadboard
- Power supply (5V for servo, 3.3V for ESP32)

#### Registration System (ESP32 #2)
- 1x ESP32 Development Board
- 1x MFRC522 RFID Reader Module
- Jumper wires, breadboard
- Power supply (3.3V for ESP32)

### Software Requirements

- [Arduino IDE](https://www.arduino.cc/en/software) or [PlatformIO](https://platformio.org/)
- ESP32 Board Support Package
- Required Arduino Libraries:
  - `MFRC522` - RFID reader library
  - `LiquidCrystal` - LCD display library
  - `ESP32Servo` - Servo control for ESP32
  - `WiFi` - Built-in ESP32 library
  - `HTTPClient` - Built-in ESP32 library

## Setup Instructions

### 1. Door System Setup

See the [Door System Documentation](./door-system/README.md) for detailed setup instructions, wiring diagrams, and code.

**Quick Start:**
1. Wire the components according to the pin configuration
2. Upload the code from `door-system/esp32-door.ino`
3. Configure WiFi credentials in the code
4. Set the backend server URL
5. Test the system

### 2. Registration System Setup

See the [Registration System Documentation](./registration-system/README.md) for setup instructions.

**Quick Start:**
1. Wire the RFID reader to the ESP32
2. Upload the registration system code
3. Configure WiFi credentials
4. Set the backend server URL
5. Test badge scanning

## API Integration

Both ESP32 systems communicate with the backend via HTTP POST requests to the `/api/scan` endpoint.

### Door System API Calls

**Entry/Exit Scans:**
```json
POST /api/scan
{
  "rfid_uuid": "A1B2C3D4",
  "action": "in"  // or "out"
}
```

### Registration System API Calls

**Badge Registration:**
```json
POST /api/scan
{
  "rfid_uuid": "A1B2C3D4"
  // No "action" parameter for registration mode
}
```

## Network Configuration

Both ESP32 devices need to be connected to the same WiFi network as the backend server.

**Important:**
- Ensure the ESP32 devices can reach the backend server IP address
- If running on localhost, use the computer's local IP address (not `127.0.0.1`)
- For production, use a static IP or configure proper network routing

## Troubleshooting

### Common Issues

1. **ESP32 cannot connect to WiFi**
   - Check WiFi credentials
   - Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
   - Check signal strength

2. **API requests failing**
   - Verify backend server is running
   - Check server IP address in ESP32 code
   - Ensure firewall allows connections
   - Check serial monitor for error messages

3. **RFID readers not detecting cards**
   - Verify wiring connections
   - Check power supply (3.3V for MFRC522)
   - Ensure SPI connections are correct
   - Try different RFID cards

4. **Servo not working**
   - Check power supply (servo may need external 5V)
   - Verify signal pin connection
   - Check servo library compatibility

## Next Steps

1. Follow the [Door System Setup Guide](./door-system/README.md)
2. Follow the [Registration System Setup Guide](./registration-system/README.md)
3. Test each system independently
4. Integrate with the backend server
5. Configure and calibrate hardware components

## Support

For hardware-related issues:
- Check the specific system documentation
- Review wiring diagrams in the `images/` directories
- Check serial monitor output for debugging information
- Refer to component datasheets

## Images Directory

Architecture diagrams, wiring schematics, and photos will be added to:
- `images/` - General system architecture
- `door-system/images/` - Door system specific diagrams
- `registration-system/images/` - Registration system diagrams

