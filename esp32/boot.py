import network
import urequests
import time
import ujson
from machine import Pin
from mfrc522 import MFRC522  # RFID module

# WiFi Configuration
SSID = "SSID"
PASSWORD = "MOT_DE_PASSE"
SERVER_URL = "http://192.168.1.X:3000/pointage"  # Node.js Server

# Connect to WiFi
wifi = network.WLAN(network.STA_IF)
wifi.active(True)
wifi.connect(SSID, PASSWORD)

while not wifi.isconnected():
    time.sleep(1)

print("Connected to WiFi:", wifi.ifconfig()[0])

# Define RFID Reader (Modify pins if needed)
reader = MFRC522(sck=18, mosi=23, miso=19, rst=22, cs=21)

# Define LEDs
green_led = Pin(13, Pin.OUT)  # Green LED for success
red_led = Pin(14, Pin.OUT)    # Red LED for failure

# Turn off LEDs initially
green_led.off()
red_led.off()

while True:
    stat, tag_type = reader.request(reader.REQIDL)
    if stat == reader.OK:
        stat, uid = reader.anticoll()
        if stat == reader.OK:
            uid_str = "-".join(str(i) for i in uid)
            print("Badge detected:", uid_str)

            # Send the UID to the server
            data = ujson.dumps({"uid": uid_str})
            try:
                response = urequests.post(SERVER_URL, data=data, headers={
                                          'Content-Type': 'application/json'})
                server_response = response.json()  # Convert server response to JSON
                # print("Server response:", server_response)
                response.close()

                # Check server response
                if server_response.get("success"):  # If UID is valid
                    green_led.on()
                    red_led.off()
                    print(server_response.get("message"))
                    print("")
                else:  # If UID is unknown
                    red_led.on()
                    green_led.off()
                    print(server_response.get("message"))
                    print("")

            except Exception as e:
                print("Error sending data:", str(e))
                # Indicate failure to communicate with the server
                # by making both LEDs blink
                red_led.on()
                green_led.on()

            # Keep the LED on for 2 seconds, then turn both off
            time.sleep(2)
            green_led.off()
            red_led.off()

            time.sleep(1)  # Avoid duplicate scans
