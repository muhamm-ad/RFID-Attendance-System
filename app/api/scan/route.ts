// app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ScanResult } from "@/lib/db";
import {
  getCurrentTrimester,
  getPersonWithPayments,
  logAccess,
} from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rfid_uuid, action = "in" } = body; // action can be 'in' or 'out'

    // Validation
    if (!rfid_uuid || typeof rfid_uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing RFID UUID" },
        { status: 400 }
      );
    }

    if (action !== "in" && action !== "out") {
      return NextResponse.json(
        { error: 'Action must be "in" or "out"' },
        { status: 400 }
      );
    }

    // console.log(`🔍 Badge scan: ${rfid_uuid} | Action: ${action}`);

    // Retrieve the person and their payment info directly by rfid_uuid
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
