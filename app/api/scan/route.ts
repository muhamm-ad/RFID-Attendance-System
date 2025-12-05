// app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ScanResult } from "@/lib/db";
import {
  getCurrentTrimester,
  getPersonWithPayments,
  logAccess,
} from "@/lib/utils";

// In-memory store for latest registration scan (UUID only, no attendance logging)
// In production, consider using Redis or a database for this
interface LatestScan {
  rfid_uuid: string;
  timestamp: string;
}

let latestRegistrationScan: LatestScan | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rfid_uuid, action } = body; // action can be 'in', 'out', or undefined/null for registration

    // Validation
    if (!rfid_uuid || typeof rfid_uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing RFID UUID" },
        { status: 400 }
      );
    }

    // If action is provided, it must be 'in' or 'out'
    // If action is not provided (undefined/null), we're in registration mode (just return UUID)
    const isRegistrationMode = action === undefined || action === null;
    
    if (!isRegistrationMode && action !== "in" && action !== "out") {
      return NextResponse.json(
        { error: 'Action must be "in" or "out"' },
        { status: 400 }
      );
    }

    // console.log(`🔍 Badge scan: ${rfid_uuid} | Action: ${action}`);

    // Registration mode: just return the UUID without checking person or logging attendance
    if (isRegistrationMode) {
      const timestamp = new Date().toISOString();
      // Store the latest scan for retrieval by the frontend
      latestRegistrationScan = {
        rfid_uuid: rfid_uuid,
        timestamp: timestamp,
      };
      return NextResponse.json({
        success: true,
        rfid_uuid: rfid_uuid,
        timestamp: timestamp,
      });
    }

    // Attendance mode: check person, verify access, and log attendance
    const person = await getPersonWithPayments(rfid_uuid);

    if (!person) {
      // console.log(`⚠️ No person found for badge: ${rfid_uuid}`);

      const result: ScanResult = {
        success: true,
        access_granted: false,
        person: null,
        message: "❌ Unrecognized badge",
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(result);
    }

    let accessGranted = false;
    let message = "";
    const currentTrimester = getCurrentTrimester();

    // Access logic based on person type
    switch (person.type) {
      case "student": {
        // Check if current trimester is paid
        const trimesterKey =
          `trimester${currentTrimester}_paid` as keyof typeof person;
        const isPaid = person[trimesterKey];

        accessGranted = isPaid === true;
        message = accessGranted
          ? `✅ Access granted - Student`
          : `❌ Payment required for trimester ${currentTrimester}`;

        // console.log(
        //   `👨‍🎓 Student: ${person.prenom} ${person.nom} | ` +
        //     `Trimester ${currentTrimester}: ${
        //       isPaid ? "PAID" : "NOT PAID"
        //     } | ` +
        //     `Access: ${accessGranted ? "GRANTED" : "DENIED"}`
        // );
        break;
      }

      case "teacher":
      case "staff": {
        // Teachers and staff always have access
        accessGranted = true;
        message = `✅ Access granted - ${
          person.type === "teacher" ? "Teacher" : "Staff"
        }`;
        // console.log(`👨‍🏫 ${person.type}: ${person.prenom} ${person.nom} | Access: GRANTED`);
        break;
      }

      case "visitor": {
        // Visitors have access (you can add temporal validation logic if needed)
        accessGranted = true;
        message = "✅ Access granted - Visitor";
        // console.log(`👥 Visitor: ${person.prenom} ${person.nom} | Access: GRANTED`);
        break;
      }
    }

    // Record in Attendance table
    await logAccess(person.id, action, accessGranted ? "success" : "failed");

    const result: ScanResult = {
      success: true,
      access_granted: accessGranted,
      person: person,
      message: message,
      timestamp: new Date().toISOString(),
      current_trimester: currentTrimester,
      action: action,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error during scan:", error);
    return NextResponse.json(
      { error: "Server error during scan" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve the latest registration scan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since"); // Optional timestamp to get scans after this time

    if (!latestRegistrationScan) {
      return NextResponse.json({
        success: true,
        rfid_uuid: null,
        timestamp: null,
      });
    }

    // If since parameter is provided, only return if scan is newer
    if (since) {
      const sinceTime = new Date(since).getTime();
      const scanTime = new Date(latestRegistrationScan.timestamp).getTime();
      if (scanTime <= sinceTime) {
        return NextResponse.json({
          success: true,
          rfid_uuid: null,
          timestamp: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      rfid_uuid: latestRegistrationScan.rfid_uuid,
      timestamp: latestRegistrationScan.timestamp,
    });
  } catch (error) {
    console.error("❌ Error retrieving latest scan:", error);
    return NextResponse.json(
      { error: "Server error retrieving latest scan" },
      { status: 500 }
    );
  }
}
