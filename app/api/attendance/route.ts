// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
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

    let query = `
      SELECT 
        a.id,
        a.person_id,
        a.action,
        a.status,
        a.attendance_date as timestamp,
        p.nom || ' ' || p.prenom as person_name,
        p.type as person_type,
        p.rfid_uuid
      FROM Attendance a
      JOIN Persons p ON a.person_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate && endDate) {
      query += " AND DATE(a.attendance_date) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else if (startDate) {
      query += " AND DATE(a.attendance_date) >= ?";
      params.push(startDate);
    } else if (endDate) {
      query += " AND DATE(a.attendance_date) <= ?";
      params.push(endDate);
    } else if (date) {
      query += " AND DATE(a.attendance_date) = ?";
      params.push(date);
    }

    if (status && (status === "success" || status === "failed")) {
      query += " AND a.status = ?";
      params.push(status);
    }

    if (action && (action === "in" || action === "out")) {
      query += " AND a.action = ?";
      params.push(action);
    }

    if (personId) {
      const parsedPersonId = parseInt(personId, 10);
      if (!Number.isNaN(parsedPersonId)) {
        query += " AND a.person_id = ?";
        params.push(parsedPersonId);
      }
    }

    query += " ORDER BY a.attendance_date DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const logs = db.prepare(query).all(...params) as AttendanceLog[];

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
