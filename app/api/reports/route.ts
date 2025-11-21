// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date"); // YYYY-MM-DD
    const endDate = searchParams.get("end_date"); // YYYY-MM-DD
    const reportType = searchParams.get("type") || "attendance"; // attendance, payments, summary

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    let report: any = {
      start_date: startDate,
      end_date: endDate,
      generated_at: new Date().toISOString(),
    };

    switch (reportType) {
      case "attendance": {
        // Attendance report
        const attendanceData = db
          .prepare(
            `
          SELECT 
            DATE(a.attendance_date) as date,
            COUNT(*) as total_scans,
            SUM(CASE WHEN a.status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN a.status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN a.action = 'in' THEN 1 ELSE 0 END) as entries,
            SUM(CASE WHEN a.action = 'out' THEN 1 ELSE 0 END) as exits
          FROM Attendance a
          WHERE DATE(a.attendance_date) BETWEEN ? AND ?
          GROUP BY DATE(a.attendance_date)
          ORDER BY date
        `
          )
          .all(startDate, endDate);

        // Statistics by person
        const personStats = db
          .prepare(
            `
          SELECT 
            p.id,
            p.nom,
            p.prenom,
            p.type,
            COUNT(*) as total_scans,
            SUM(CASE WHEN a.status = 'success' THEN 1 ELSE 0 END) as successful_scans,
            SUM(CASE WHEN a.action = 'in' THEN 1 ELSE 0 END) as entries,
            MIN(a.attendance_date) as first_scan,
            MAX(a.attendance_date) as last_scan
          FROM Attendance a
          JOIN Persons p ON a.person_id = p.id
          WHERE DATE(a.attendance_date) BETWEEN ? AND ?
          GROUP BY p.id
          ORDER BY total_scans DESC
        `
          )
          .all(startDate, endDate);

        report.type = "attendance";
        report.daily_summary = attendanceData;
        report.person_summary = personStats;
        break;
      }

      case "payments": {
        // Payments report
        const paymentData = db
          .prepare(
            `
          SELECT 
            sp.trimester,
            COUNT(DISTINCT sp.student_id) as students_paid,
            SUM(p.amount) as total_amount,
            p.payment_method,
            COUNT(*) as payment_count
          FROM student_payments sp
          JOIN Payments p ON sp.payment_id = p.id
          WHERE DATE(p.payment_date) BETWEEN ? AND ?
          GROUP BY sp.trimester, p.payment_method
        `
          )
          .all(startDate, endDate);

        // Detailed payment list
        const detailedPayments = db
          .prepare(
            `
          SELECT 
            per.nom,
            per.prenom,
            sp.trimester,
            p.amount,
            p.payment_method,
            p.payment_date
          FROM student_payments sp
          JOIN Payments p ON sp.payment_id = p.id
          JOIN Persons per ON sp.student_id = per.id
          WHERE DATE(p.payment_date) BETWEEN ? AND ?
          ORDER BY p.payment_date DESC
        `
          )
          .all(startDate, endDate);

        report.type = "payments";
        report.summary = paymentData;
        report.details = detailedPayments;
        break;
      }

      case "summary": {
        // Global report (summary)
        const totalScans = db
          .prepare(
            `
          SELECT COUNT(*) as count FROM Attendance
          WHERE DATE(attendance_date) BETWEEN ? AND ?
        `
          )
          .get(startDate, endDate) as { count: number };

        const successfulScans = db
          .prepare(
            `
          SELECT COUNT(*) as count FROM Attendance
          WHERE DATE(attendance_date) BETWEEN ? AND ? AND status = 'success'
        `
          )
          .get(startDate, endDate) as { count: number };

        const failedScans = db
          .prepare(
            `
          SELECT COUNT(*) as count FROM Attendance
          WHERE DATE(attendance_date) BETWEEN ? AND ? AND status = 'failed'
        `
          )
          .get(startDate, endDate) as { count: number };

        const uniquePersons = db
          .prepare(
            `
          SELECT COUNT(DISTINCT person_id) as count FROM Attendance
          WHERE DATE(attendance_date) BETWEEN ? AND ?
        `
          )
          .get(startDate, endDate) as { count: number };

        const totalPayments = db
          .prepare(
            `
          SELECT 
            COUNT(*) as count,
            SUM(p.amount) as total_amount
          FROM Payments p
          WHERE DATE(p.payment_date) BETWEEN ? AND ?
        `
          )
          .get(startDate, endDate) as any;

        report.type = "summary";
        report.attendance = {
          total_scans: totalScans.count,
          successful: successfulScans.count,
          failed: failedScans.count,
          unique_persons: uniquePersons.count,
          success_rate:
            totalScans.count > 0
              ? `${((successfulScans.count / totalScans.count) * 100).toFixed(
                  2
                )}%`
              : "0%",
        };
        report.payments = {
          total_payments: totalPayments.count || 0,
          total_amount: totalPayments.total_amount || 0,
        };
        break;
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid report type. Use: attendance, payments, or summary",
          },
          { status: 400 }
        );
    }

    console.log(
      `📊 Report generated: ${reportType} (${startDate} to ${endDate})`
    );
    return NextResponse.json(report);
  } catch (error) {
    console.error("❌ Error while generating report:", error);
    return NextResponse.json(
      { error: "Error while generating report" },
      { status: 500 }
    );
  }
}
