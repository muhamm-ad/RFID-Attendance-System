// lib/db.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { seedDatabase } from "./seed";

// Create the database directory if it doesn't exist
const dbDir = path.join(process.cwd(), "database");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "attendance.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Function to initialize the tables
export function initDatabase() {
  console.log("🔧 Initializing the database...");

  db.exec(`
    CREATE TABLE IF NOT EXISTS Persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rfid_uuid TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('student', 'teacher', 'staff', 'visitor')),
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      photo_path TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS Attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('in', 'out')),
      status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
      attendance_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,

      FOREIGN KEY (person_id) REFERENCES Persons(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS Payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer')),
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS student_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      payment_id INTEGER NOT NULL,
      trimester INTEGER NOT NULL CHECK (trimester IN (1, 2, 3)),

      FOREIGN KEY (student_id) REFERENCES Persons(id) ON DELETE CASCADE -- TODO: Consider enforcing student type at application level
      FOREIGN KEY (payment_id) REFERENCES Payments(id)
    )
  `);

  console.log("✅ Database initialized successfully !");
}
initDatabase();

export default db;

seedDatabase(db);
