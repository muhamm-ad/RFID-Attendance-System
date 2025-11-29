// app/api/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fallbackDate = new Date().toISOString().split("T")[0];
    const rawStart = searchParams.get("startDate");
    const rawEnd = searchParams.get("endDate");
    const legacyDate = searchParams.get("date");

    const normalizedStart = normalizeDate(rawStart || legacyDate || fallbackDate);
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

    // 1. General statistics
    const [totalPersonsResult, totalStudentsResult, totalTeachersResult, totalStaffResult, totalVisitorsResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM Persons`,
      sql`SELECT COUNT(*) as count FROM Persons WHERE type = 'student'`,
      sql`SELECT COUNT(*) as count FROM Persons WHERE type = 'teacher'`,
      sql`SELECT COUNT(*) as count FROM Persons WHERE type = 'staff'`,
      sql`SELECT COUNT(*) as count FROM Persons WHERE type = 'visitor'`,
    ]);

    const totalPersons = totalPersonsResult.rows[0] as { count: number };
    const totalStudents = totalStudentsResult.rows[0] as { count: number };
    const totalTeachers = totalTeachersResult.rows[0] as { count: number };
    const totalStaff = totalStaffResult.rows[0] as { count: number };
    const totalVisitors = totalVisitorsResult.rows[0] as { count: number };

    // 2. Attendance statistics for selected range
    const rangeAttendanceResult = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN action = 'in' THEN 1 ELSE 0 END) as entries,
        SUM(CASE WHEN action = 'out' THEN 1 ELSE 0 END) as exits
      FROM Attendance
      WHERE DATE(attendance_date) BETWEEN DATE(${rangeStart}) AND DATE(${rangeEnd})
    `;
    const rangeAttendance = rangeAttendanceResult.rows[0] as any;

    // 3. Attendance statistics by person type
    const attendanceByTypeResult = await sql`
      SELECT 
        p.type,
        COUNT(*) as count,
        SUM(CASE WHEN a.status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN a.status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM Attendance a
      JOIN Persons p ON a.person_id = p.id
      WHERE DATE(a.attendance_date) BETWEEN DATE(${rangeStart}) AND DATE(${rangeEnd})
      GROUP BY p.type
    `;
    const attendanceByType = attendanceByTypeResult.rows;

    // 4. Payment statistics
    const currentTrimester = getCurrentTrimester();
    const paymentStatsResult = await sql`
      SELECT 
        COUNT(DISTINCT p.id) as total_students,
        COUNT(DISTINCT sp.student_id) as students_paid
      FROM Persons p
      LEFT JOIN student_payments sp ON p.id = sp.student_id AND sp.trimester = ${currentTrimester}
      WHERE p.type = 'student'
    `;
    const paymentStats = paymentStatsResult.rows[0] as any;

    const paymentRate =
      paymentStats.total_students > 0
        ? (
            (paymentStats.students_paid / paymentStats.total_students) *
            100
          ).toFixed(2)
        : 0;

    // 5. Top 10 persons with the most entrances this month
    const topAttendanceResult = await sql`
      SELECT 
        p.id,
        p.nom,
        p.prenom,
        p.type,
        COUNT(*) as attendance_count
      FROM Attendance a
      JOIN Persons p ON a.person_id = p.id
      WHERE DATE_TRUNC('month', a.attendance_date) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY p.id
      ORDER BY attendance_count DESC
      LIMIT 10
    `;
    const topAttendance = topAttendanceResult.rows;

    // 6. Latest entries/exits activity
    const recentActivityResult = await sql`
      SELECT 
        a.id,
        a.action,
        a.status,
        a.attendance_date,
        p.nom,
        p.prenom,
        p.type
      FROM Attendance a
      JOIN Persons p ON a.person_id = p.id
      ORDER BY a.attendance_date DESC
      LIMIT 20
    `;
    const recentActivity = recentActivityResult.rows;

    // 7. Attendance trend for the selected range
    const rawTrendResult = await sql`
      SELECT 
        DATE(attendance_date) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN action = 'in' THEN 1 ELSE 0 END) as entries,
        SUM(CASE WHEN action = 'out' THEN 1 ELSE 0 END) as exits
      FROM Attendance
      WHERE DATE(attendance_date) BETWEEN DATE(${rangeStart}) AND DATE(${rangeEnd})
      GROUP BY DATE(attendance_date)
      ORDER BY DATE(attendance_date)
    `;
    const rawTrend = rawTrendResult.rows as Array<{
      date: string;
      total: number;
      success: number;
      failed: number;
      entries: number;
      exits: number;
    }>;

    const trendMap = new Map(rawTrend.map((point) => [point.date, point]));
    const attendanceTrend = buildTrend(rangeStart, rangeEnd, trendMap);

    const stats = {
      range: {
        start: rangeStart,
        end: rangeEnd,
        days: rangeDays,
      },
      general: {
        total_persons: totalPersons.count,
        total_students: totalStudents.count,
        total_teachers: totalTeachers.count,
        total_staff: totalStaff.count,
        total_visitors: totalVisitors.count,
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
      date: string;
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
