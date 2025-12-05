// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma, type AttendanceLog } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
    const level = searchParams.get("level"); // License_1, License_2, etc.
    const classFilter = searchParams.get("class"); // Class name

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

    if (level || classFilter) {
      where.person = {};
      if (level) {
        where.person.level = level;
      }
      if (classFilter) {
        where.person.class = { contains: classFilter, mode: "insensitive" };
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
            photo_path: true,
            level: true,
            class: true,
          },
        },
      },
      orderBy: {
        attendance_date: "desc",
      },
      take: limit,
      skip: offset,
    });

    type AttendanceWithPerson = Prisma.AttendanceGetPayload<{
      include: {
        person: {
          select: {
            nom: true;
            prenom: true;
            type: true;
            rfid_uuid: true;
            photo_path: true;
            level: true;
            class: true;
          };
        };
      };
    }>;

    const formattedLogs: AttendanceLog[] = logs.map((log: AttendanceWithPerson) => ({
      id: log.id,
      person_id: log.person_id,
      action: log.action,
      status: log.status,
      timestamp: log.attendance_date.toISOString(),
      person_name: `${log.person.nom} ${log.person.prenom}`,
      person_type: log.person.type,
      rfid_uuid: log.person.rfid_uuid,
      photo_path: log.person.photo_path,
      level: log.person.level,
      class: log.person.class,
    }));

    // console.log(`📋 ${formattedLogs.length} attendance records retrieved`);
    return NextResponse.json(formattedLogs);
    
  } catch (error) {
    console.error("❌ Error while retrieving attendance logs:", error);
    return NextResponse.json(
      { error: "Error while retrieving attendance logs" },
      { status: 500 }
    );
  }
}
