const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let scanning = false;
let lastScannedUID = "";

const databasePath = path.resolve(__dirname, "attendance.db");

const database = new sqlite3.Database(databasePath, (err) => {
    if (err) {
        console.error("❌ Error opening database:", err.message);
    } else {
        console.log("✅ Connected to SQLite database:", databasePath);
    }
});

// Create tables if they do not exist
database.serialize(() => {
    database.run("CREATE TABLE IF NOT EXISTS badges (uid TEXT PRIMARY KEY, first_name TEXT, last_name TEXT, registration_date TEXT)");
    database.run("CREATE TABLE IF NOT EXISTS attendance (uid TEXT, date TEXT, time TEXT, type TEXT)");
    database.run("CREATE INDEX IF NOT EXISTS idx_attendance_uid_date ON attendance(uid, date)");
});

// Handling badge scanning
app.post("/attendance", (req, res) => {
    const { uid } = req.body;
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0];

    if (scanning) {
        lastScannedUID = uid;
        console.log("Badge scanned for registration:", uid);
        return res.json({ success: true, message: "RFID scanner active" });
    }

    database.get("SELECT * FROM badges WHERE uid = ?", [uid], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Server error" });
        if (!row) return res.json({ success: false, message: "Unknown badge" });

        database.get("SELECT * FROM attendance WHERE uid = ? AND date = ? ORDER BY time DESC LIMIT 1", [uid, date], (err, lastEntry) => {
            const type = (!lastEntry || lastEntry.type === "exit") ? "entry" : "exit";
            database.run("INSERT INTO attendance (uid, date, time, type) VALUES (?, ?, ?, ?)",
                [uid, date, time, type], (insertErr) => {
                    if (insertErr) return res.status(500).json({ success: false, message: "Error saving attendance" });
                    res.json({ success: true, message: `${row.first_name} ${type} recorded at ${time}` });
                });
        });
    });
});

// Start and stop scanning
app.post("/scan/start", (req, res) => {
    console.log("Starting RFID scanner...");
    scanning = true;
    lastScannedUID = "";
    res.json({ message: "RFID scanner started!" });
});

app.post("/scan/stop", (req, res) => {
    console.log("Stopping RFID scanner...");
    scanning = false;
    lastScannedUID = "";
    res.json({ message: "RFID scanner stopped!" });
});

// Get last scanned UID
app.get("/scan/lastUid", (req, res) => {
    console.log("Last scanned UID requested:", lastScannedUID);
    res.json({ lastScannedUID });
});

// Add a new badge
app.post("/addBadge", (req, res) => {
    const { uid, first_name, last_name } = req.body;
    const registration_date = new Date().toISOString().split("T")[0];

    database.get("SELECT uid FROM badges WHERE uid = ?", [uid], (err, row) => {
        if (row) {
            return res.json({ success: false, message: "Badge already registered" });
        }

        database.run("INSERT INTO badges (uid, first_name, last_name, registration_date) VALUES (?, ?, ?, ?)",
            [uid, first_name, last_name, registration_date], (err) => {
                if (err) return res.status(500).json({ success: false, message: "Error adding badge" });
                res.json({ success: true, message: "Badge added successfully!" });
            }
        );
    });
});

// Delete a badge
app.post("/deleteBadge", (req, res) => {
    const { uid } = req.body;

    // delete badge and attendance records from the database
    database.run("DELETE FROM badges WHERE uid = ?", [uid], (err) => {
        if (err) return res.status(500).json({ success: false, message: "Error deleting badge" });

        database.run("DELETE FROM attendance WHERE uid = ?", [uid], (err) => {
            if (err) return res.status(500).json({ success: false, message: "Error deleting attendance records" });
            res.json({ success: true, message: "Badge and associated attendance records deleted successfully!" });
        });
    });
});

// Get attendance history
app.get("/history", (req, res) => {
    database.all(
        "SELECT badges.first_name, badges.last_name, attendance.date, attendance.time, attendance.type FROM attendance JOIN badges ON attendance.uid = badges.uid",
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "Server error" });
            res.json(rows);
        }
    );
});

app.listen(3000, () => console.log("API server running at http://localhost:3000"));
