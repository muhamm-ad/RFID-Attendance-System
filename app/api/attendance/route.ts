// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
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

    const where: any = {};

    if (startDate && endDate) {
      where.attendance_date = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59"),
      };
    } else if (startDate) {
      where.attendance_date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.attendance_date = {
        lte: new Date(endDate + "T23:59:59"),
      };
    } else if (date) {
      const dateStart = new Date(date);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      where.attendance_date = {
        gte: dateStart,
        lte: dateEnd,
      };
    }

    if (status && (status === "success" || status === "failed")) {
      where.status = status;
    }

    if (action && (action === "in" || action === "out")) {
      where.action = action;
    }

    if (personId) {
      const parsedPersonId = parseInt(personId, 10);
      if (!Number.isNaN(parsedPersonId)) {
        where.person_id = parsedPersonId;
      }
    }

    const logs = await prisma.attendance.findMany({
      where,
      include: {
        person: {
          select: {
            nom: true,
            prenom: true,
            type: true,
            rfid_uuid: true,
          },
        },
      },
      orderBy: {
        attendance_date: "desc",
      },
      take: limit,
      skip: offset,
    });

    const formattedLogs: AttendanceLog[] = logs.map((log) => ({
      id: log.id,
      person_id: log.person_id,
      action: log.action,
      status: log.status,
      timestamp: log.attendance_date.toISOString(),
      person_name: `${log.person.nom} ${log.person.prenom}`,
      person_type: log.person.type,
      rfid_uuid: log.person.rfid_uuid,
    }));

    console.log(`📋 ${formattedLogs.length} attendance records retrieved`);
    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("❌ Error while retrieving attendance logs:", error);
    return NextResponse.json(
      { error: "Error while retrieving attendance logs" },
      { status: 500 }
    );
  }
}
