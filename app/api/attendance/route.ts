// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { AttendanceLog } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const date = searchParams.get("date"); // Format: YYYY-MM-DD
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status"); // success or failed
    const action = searchParams.get("action"); // in or out
    const personId = searchParams.get("personId");

    // Build query parts
    // Note: PostgreSQL table names are case-sensitive when quoted
    // We use unquoted names which are case-insensitive and converted to lowercase
    let queryText = `
      SELECT 
        a.id,
        a.person_id,
        a.action,
        a.status,
        a.attendance_date as timestamp,
        p.nom || ' ' || p.prenom as person_name,
        p.type as person_type,
        p.rfid_uuid
      FROM attendance a
      JOIN persons p ON a.person_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      queryText += ` AND DATE(a.attendance_date) BETWEEN $${paramIndex} AND $${
        paramIndex + 1
      }`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      queryText += ` AND DATE(a.attendance_date) >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    } else if (endDate) {
      queryText += ` AND DATE(a.attendance_date) <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    } else if (date) {
      queryText += ` AND DATE(a.attendance_date) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (status && (status === "success" || status === "failed")) {
      queryText += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (action && (action === "in" || action === "out")) {
      queryText += ` AND a.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (personId) {
      const parsedPersonId = parseInt(personId, 10);
      if (!Number.isNaN(parsedPersonId)) {
        queryText += ` AND a.person_id = $${paramIndex}`;
        params.push(parsedPersonId);
        paramIndex++;
      }
    }

    queryText += ` ORDER BY a.attendance_date DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    params.push(limit, offset);

    const { dbQuery } = await import("@/lib/db");
    const result = await dbQuery(queryText, params);
    const logs = result.rows as AttendanceLog[];

    console.log(`📋 ${logs.length} attendance records retrieved`);
    return NextResponse.json(logs);
  } catch (error) {
    console.error("❌ Error while retrieving attendance logs:", error);
    return NextResponse.json(
      { error: "Error while retrieving attendance logs" },
      { status: 500 }
    );
  }
}
