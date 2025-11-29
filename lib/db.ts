// lib/db.ts
import { sql } from "@vercel/postgres";

// Function to initialize the tables
export async function initDatabase() {
  console.log("🔧 Initializing the database...");

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS Persons (
        id SERIAL PRIMARY KEY,
        rfid_uuid TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('student', 'teacher', 'staff', 'visitor')),
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        photo_path TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Attendance (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('in', 'out')),
        status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
        attendance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (person_id) REFERENCES Persons(id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS Payments (
        id SERIAL PRIMARY KEY,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer')),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS student_payments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        payment_id INTEGER NOT NULL,
        trimester INTEGER NOT NULL CHECK (trimester IN (1, 2, 3)),
        FOREIGN KEY (student_id) REFERENCES Persons(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES Payments(id)
      )
    `;

    console.log("✅ Database initialized successfully!");
  } catch (error: any) {
    // Tables already exist, ignore error
    if (!error.message?.includes("already exists")) {
      console.error("❌ Database initialization error:", error);
    }
  }
}

export { sql };
export default sql;
