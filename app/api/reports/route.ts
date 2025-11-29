// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

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
        const attendanceDataResult = await sql`
          SELECT 
            DATE(a.attendance_date) as date,
            COUNT(*) as total_scans,
            SUM(CASE WHEN a.status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN a.status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN a.action = 'in' THEN 1 ELSE 0 END) as entries,
            SUM(CASE WHEN a.action = 'out' THEN 1 ELSE 0 END) as exits
          FROM attendance a
          WHERE DATE(a.attendance_date) BETWEEN ${startDate} AND ${endDate}
          GROUP BY DATE(a.attendance_date)
          ORDER BY date
        `;
        const attendanceData = attendanceDataResult.rows;

        // Statistics by person
        const personStatsResult = await sql`
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
          FROM attendance a
          JOIN Persons p ON a.person_id = p.id
          WHERE DATE(a.attendance_date) BETWEEN ${startDate} AND ${endDate}
          GROUP BY p.id
          ORDER BY total_scans DESC
        `;
        const personStats = personStatsResult.rows;

        report.type = "attendance";
        report.daily_summary = attendanceData;
        report.person_summary = personStats;
        break;
      }

      case "payments": {
        // Payments report
        const paymentDataResult = await sql`
          SELECT 
            sp.trimester,
            COUNT(DISTINCT sp.student_id) as students_paid,
            SUM(p.amount) as total_amount,
            p.payment_method,
            COUNT(*) as payment_count
          FROM student_payments sp
          JOIN Payments p ON sp.payment_id = p.id
          WHERE DATE(p.payment_date) BETWEEN ${startDate} AND ${endDate}
          GROUP BY sp.trimester, p.payment_method
        `;
        const paymentData = paymentDataResult.rows;

        // Detailed payment list
        const detailedPaymentsResult = await sql`
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
          WHERE DATE(p.payment_date) BETWEEN ${startDate} AND ${endDate}
          ORDER BY p.payment_date DESC
        `;
        const detailedPayments = detailedPaymentsResult.rows;

        report.type = "payments";
        report.summary = paymentData;
        report.details = detailedPayments;
        break;
      }

      case "summary": {
        // Global report (summary)
        const [totalScansResult, successfulScansResult, failedScansResult, uniquePersonsResult, totalPaymentsResult] = await Promise.all([
          sql`SELECT COUNT(*) as count FROM attendance WHERE DATE(attendance_date) BETWEEN ${startDate} AND ${endDate}`,
          sql`SELECT COUNT(*) as count FROM attendance WHERE DATE(attendance_date) BETWEEN ${startDate} AND ${endDate} AND status = 'success'`,
          sql`SELECT COUNT(*) as count FROM attendance WHERE DATE(attendance_date) BETWEEN ${startDate} AND ${endDate} AND status = 'failed'`,
          sql`SELECT COUNT(DISTINCT person_id) as count FROM attendance WHERE DATE(attendance_date) BETWEEN ${startDate} AND ${endDate}`,
          sql`SELECT COUNT(*) as count, SUM(p.amount) as total_amount FROM payments p WHERE DATE(p.payment_date) BETWEEN ${startDate} AND ${endDate}`,
        ]);

        const totalScans = totalScansResult.rows[0] as { count: number };
        const successfulScans = successfulScansResult.rows[0] as { count: number };
        const failedScans = failedScansResult.rows[0] as { count: number };
        const uniquePersons = uniquePersonsResult.rows[0] as { count: number };
        const totalPayments = totalPaymentsResult.rows[0] as any;

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
