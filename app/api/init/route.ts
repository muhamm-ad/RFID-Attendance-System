// app/api/init/route.ts
// API route to initialize the database
import { NextResponse } from "next/server";
import { seedDatabase } from "../../../prisma/seed";

export async function GET() {
  try {
    await seedDatabase();
    return NextResponse.json({ 
      success: true, 
      message: "Database initialized and seeded successfully" 
    });
  } catch (error: any) {
    console.error("❌ Error initializing database:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to initialize database" 
      },
      { status: 500 }
    );
  }
}

