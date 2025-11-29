// lib/db.ts
import { createClient } from "@vercel/postgres";
import { Pool } from "pg";

// Create client with pooled connection string
// @vercel/postgres requires POSTGRES_URL (pooled connection)
// For Vercel deployment, POSTGRES_URL is automatically injected
// For local development, set POSTGRES_URL in .env.local
const client = createClient({
  connectionString: process.env.POSTGRES_URL,
});

// Export sql template tag from the client
export const sql = client.sql;

// Create a pg Pool for dynamic queries that need parameterized queries
// Use POSTGRES_URL_NON_POOLING or DATABASE_URL for direct connection
const pool = new Pool({
  connectionString:
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL,
});

// Helper function for dynamic queries with parameters
// Named export to avoid conflict with variable names
export async function dbQuery(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Function to initialize the tables
export async function initDatabase() {
  console.log("🔧 Initializing the database...");

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS persons (
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
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('in', 'out')),
        status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
        attendance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (person_id) REFERENCES persons(id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payments (
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
        FOREIGN KEY (student_id) REFERENCES persons(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
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

export default sql;
