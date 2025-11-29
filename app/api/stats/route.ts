// app/api/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fallbackDate = new Date().toISOString().split("T")[0];
    const rawStart = searchParams.get("startDate");
    const rawEnd = searchParams.get("endDate");
    const legacyDate = searchParams.get("date");

    const normalizedStart = normalizeDate(
      rawStart || legacyDate || fallbackDate
    );
    const normalizedEnd = normalizeDate(rawEnd || legacyDate || fallbackDate);

    if (!normalizedStart || !normalizedEnd) {
      return NextResponse.json(
        { error: "startDate/endDate must use YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    let rangeStart = normalizedStart;
    let rangeEnd = normalizedEnd;
    if (rangeStart > rangeEnd) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }

    const rangeDays = calculateRangeDays(rangeStart, rangeEnd);
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd + "T23:59:59");

    // 1. General statistics
    const [
      totalPersons,
      totalStudents,
      totalTeachers,
      totalStaff,
      totalVisitors,
    ] = await Promise.all([
      prisma.person.count(),
      prisma.person.count({ where: { type: "student" } }),
      prisma.person.count({ where: { type: "teacher" } }),
      prisma.person.count({ where: { type: "staff" } }),
      prisma.person.count({ where: { type: "visitor" } }),
    ]);

    // 2. Attendance statistics for selected range
    const rangeAttendanceRecords = await prisma.attendance.findMany({
      where: {
        attendance_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const rangeAttendance = {
      total: rangeAttendanceRecords.length,
      success: rangeAttendanceRecords.filter((r) => r.status === "success").length,
      failed: rangeAttendanceRecords.filter((r) => r.status === "failed").length,
      entries: rangeAttendanceRecords.filter((r) => r.action === "in").length,
      exits: rangeAttendanceRecords.filter((r) => r.action === "out").length,
    };

    // 3. Attendance statistics by person type
    const attendanceByTypeData = await prisma.attendance.findMany({
      where: {
        attendance_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        person: {
          select: {
            type: true,
          },
        },
      },
    });

    const typeMap = new Map<string, { count: number; success: number; failed: number }>();
    attendanceByTypeData.forEach((record) => {
      const type = record.person.type;
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, success: 0, failed: 0 });
      }
      const stats = typeMap.get(type)!;
      stats.count++;
      if (record.status === "success") stats.success++;
      if (record.status === "failed") stats.failed++;
    });

    const attendanceByType = Array.from(typeMap.entries()).map(([type, stats]) => ({
      type,
      ...stats,
    }));

    // 4. Payment statistics
    const currentTrimester = getCurrentTrimester();
    const totalStudentsCount = await prisma.person.count({
      where: { type: "student" },
    });
    const studentsPaid = await prisma.studentPayment.findMany({
      where: {
        trimester: currentTrimester,
      },
      select: {
        student_id: true,
      },
    });
    const uniqueStudentIds = new Set(studentsPaid.map((sp) => sp.student_id));
    const studentsPaidCount = uniqueStudentIds.size;

    const paymentStats = {
      total_students: totalStudentsCount,
      students_paid: studentsPaidCount,
    };

    const paymentRate =
      paymentStats.total_students > 0
        ? (
            (paymentStats.students_paid / paymentStats.total_students) *
            100
          ).toFixed(2)
        : 0;

    // 5. Top 10 persons with the most entrances this month
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    const topAttendanceData = await prisma.attendance.groupBy({
      by: ["person_id"],
      where: {
        attendance_date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    const topAttendance = await Promise.all(
      topAttendanceData.map(async (item) => {
        const person = await prisma.person.findUnique({
          where: { id: item.person_id },
        });
        return {
          id: person?.id,
          nom: person?.nom,
          prenom: person?.prenom,
          type: person?.type,
          attendance_count: item._count.id,
        };
      })
    );

    // 6. Latest entries/exits activity
    const recentActivityData = await prisma.attendance.findMany({
      include: {
        person: {
          select: {
            nom: true,
            prenom: true,
            type: true,
          },
        },
      },
      orderBy: {
        attendance_date: "desc",
      },
      take: 20,
    });

    const recentActivity = recentActivityData.map((record) => ({
      id: record.id,
      action: record.action,
      status: record.status,
      attendance_date: record.attendance_date.toISOString(),
      nom: record.person.nom,
      prenom: record.person.prenom,
      type: record.person.type,
    }));

    // 7. Attendance trend for the selected range
    const trendRecords = await prisma.attendance.findMany({
      where: {
        attendance_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const trendMap = new Map<string, {
      total: number;
      success: number;
      failed: number;
      entries: number;
      exits: number;
    }>();

    trendRecords.forEach((record) => {
      const dateKey = record.attendance_date.toISOString().split("T")[0];
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          total: 0,
          success: 0,
          failed: 0,
          entries: 0,
          exits: 0,
        });
      }
      const day = trendMap.get(dateKey)!;
      day.total++;
      if (record.status === "success") day.success++;
      if (record.status === "failed") day.failed++;
      if (record.action === "in") day.entries++;
      if (record.action === "out") day.exits++;
    });

    const attendanceTrend = buildTrend(rangeStart, rangeEnd, trendMap);

    const stats = {
      range: {
        start: rangeStart,
        end: rangeEnd,
        days: rangeDays,
      },
      general: {
        total_persons: totalPersons,
        total_students: totalStudents,
        total_teachers: totalTeachers,
        total_staff: totalStaff,
        total_visitors: totalVisitors,
      },
      attendance_summary: {
        total: rangeAttendance.total || 0,
        success: rangeAttendance.success || 0,
        failed: rangeAttendance.failed || 0,
        entries: rangeAttendance.entries || 0,
        exits: rangeAttendance.exits || 0,
      },
      attendance_by_type: attendanceByType,
      payments: {
        current_trimester: currentTrimester,
        total_students: paymentStats.total_students,
        students_paid: paymentStats.students_paid,
        students_unpaid:
          paymentStats.total_students - paymentStats.students_paid,
        payment_rate: `${paymentRate}%`,
      },
      top_attendance: topAttendance,
      recent_activity: recentActivity,
      attendance_trend: attendanceTrend,
    };

    console.log("📊 Statistics generated");
    return NextResponse.json(stats);
  } catch (error) {
    console.error("❌ Error while generating statistics:", error);
    return NextResponse.json(
      { error: "Error while generating statistics" },
      { status: 500 }
    );
  }
}

function getCurrentTrimester(): number {
  const month = new Date().getMonth() + 1;
  if (month >= 10 || month <= 1) return 1;
  if (month >= 2 && month <= 5) return 2;
  return 3;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

function calculateRangeDays(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY_IN_MS) + 1;
}

function buildTrend(
  start: string,
  end: string,
  trendMap: Map<
    string,
    {
      total: number;
      success: number;
      failed: number;
      entries: number;
      exits: number;
    }
  >
) {
  const points: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
    entries: number;
    exits: number;
  }> = [];

  const cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  while (cursor.getTime() <= endDate.getTime()) {
    const iso = cursor.toISOString().split("T")[0];
    const entry = trendMap.get(iso);
    points.push({
      date: iso,
      total: entry?.total ?? 0,
      success: entry?.success ?? 0,
      failed: entry?.failed ?? 0,
      entries: entry?.entries ?? 0,
      exits: entry?.exits ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return points;
}
