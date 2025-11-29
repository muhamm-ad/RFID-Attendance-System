// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

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

    const start = new Date(startDate);
    const end = new Date(endDate + "T23:59:59");

    let report: any = {
      start_date: startDate,
      end_date: endDate,
      generated_at: new Date().toISOString(),
    };

    switch (reportType) {
      case "attendance": {
        // Attendance report
        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            attendance_date: {
              gte: start,
              lte: end,
            },
          },
        });

        // Group by date
        const dailyMap = new Map<string, any>();
        attendanceRecords.forEach((record) => {
          const dateKey = record.attendance_date.toISOString().split("T")[0];
          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, {
              date: dateKey,
              total_scans: 0,
              successful: 0,
              failed: 0,
              entries: 0,
              exits: 0,
            });
          }
          const day = dailyMap.get(dateKey)!;
          day.total_scans++;
          if (record.status === "success") day.successful++;
          if (record.status === "failed") day.failed++;
          if (record.action === "in") day.entries++;
          if (record.action === "out") day.exits++;
        });

        const attendanceData = Array.from(dailyMap.values()).sort(
          (a, b) => a.date.localeCompare(b.date)
        );

        // Statistics by person
        const personStatsData = await prisma.attendance.groupBy({
          by: ["person_id"],
          where: {
            attendance_date: {
              gte: start,
              lte: end,
            },
          },
          _count: {
            id: true,
          },
        });

        const personStats = await Promise.all(
          personStatsData.map(async (stat) => {
            const person = await prisma.person.findUnique({
              where: { id: stat.person_id },
            });

            const records = await prisma.attendance.findMany({
              where: {
                person_id: stat.person_id,
                attendance_date: {
                  gte: start,
                  lte: end,
                },
              },
            });

            const successful = records.filter((r) => r.status === "success").length;
            const entries = records.filter((r) => r.action === "in").length;
            const dates = records.map((r) => r.attendance_date);

            return {
              id: person?.id,
              nom: person?.nom,
              prenom: person?.prenom,
              type: person?.type,
              photo_path: person?.photo_path,
              total_scans: stat._count.id,
              successful_scans: successful,
              entries: entries,
              first_scan: dates.length > 0 ? Math.min(...dates.map((d) => d.getTime())) : null,
              last_scan: dates.length > 0 ? Math.max(...dates.map((d) => d.getTime())) : null,
            };
          })
        );

        // Format dates
        personStats.forEach((stat: any) => {
          if (stat.first_scan) stat.first_scan = new Date(stat.first_scan).toISOString();
          if (stat.last_scan) stat.last_scan = new Date(stat.last_scan).toISOString();
        });

        personStats.sort((a: any, b: any) => b.total_scans - a.total_scans);

        report.type = "attendance";
        report.daily_summary = attendanceData;
        report.person_summary = personStats;
        break;
      }

      case "payments": {
        // Payments report
        const payments = await prisma.payment.findMany({
          where: {
            payment_date: {
              gte: start,
              lte: end,
            },
          },
          include: {
            student_payments: {
              include: {
                student: true,
              },
            },
          },
        });

        // Group by trimester and payment method
        const summaryMap = new Map<string, any>();
        payments.forEach((payment) => {
          payment.student_payments.forEach((sp) => {
            const key = `${sp.trimester}-${payment.payment_method}`;
            if (!summaryMap.has(key)) {
              summaryMap.set(key, {
                trimester: sp.trimester,
                payment_method: payment.payment_method,
                students_paid: new Set(),
                total_amount: 0,
                payment_count: 0,
              });
          }
            const summary = summaryMap.get(key)!;
            summary.students_paid.add(sp.student_id);
            summary.total_amount += payment.amount;
            summary.payment_count++;
          });
        });

        const paymentData = Array.from(summaryMap.values()).map((item) => ({
          trimester: item.trimester,
          students_paid: item.students_paid.size,
          total_amount: item.total_amount,
          payment_method: item.payment_method,
          payment_count: item.payment_count,
        }));

        // Detailed payment list
        const detailedPayments = payments.flatMap((payment) =>
          payment.student_payments.map((sp) => ({
            nom: sp.student.nom,
            prenom: sp.student.prenom,
            photo_path: sp.student.photo_path,
            trimester: sp.trimester,
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_date: payment.payment_date.toISOString(),
          }))
        );

        detailedPayments.sort(
          (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        );

        report.type = "payments";
        report.summary = paymentData;
        report.details = detailedPayments;
        break;
      }

      case "summary": {
        // Global report (summary)
        const [
          totalScans,
          successfulScans,
          failedScans,
          uniquePersons,
          paymentsData,
        ] = await Promise.all([
          prisma.attendance.count({
            where: {
              attendance_date: {
                gte: start,
                lte: end,
              },
            },
          }),
          prisma.attendance.count({
            where: {
              attendance_date: {
                gte: start,
                lte: end,
              },
              status: "success",
            },
          }),
          prisma.attendance.count({
            where: {
              attendance_date: {
                gte: start,
                lte: end,
              },
              status: "failed",
            },
          }),
          prisma.attendance.findMany({
            where: {
              attendance_date: {
                gte: start,
                lte: end,
              },
            },
            select: {
              person_id: true,
            },
            distinct: ["person_id"],
          }),
          prisma.payment.aggregate({
            where: {
              payment_date: {
                gte: start,
                lte: end,
              },
            },
            _count: {
              id: true,
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        report.type = "summary";
        report.attendance = {
          total_scans: totalScans,
          successful: successfulScans,
          failed: failedScans,
          unique_persons: uniquePersons.length,
          success_rate:
            totalScans > 0
              ? `${((successfulScans / totalScans) * 100).toFixed(2)}%`
              : "0%",
        };
        report.payments = {
          total_payments: paymentsData._count.id || 0,
          total_amount: paymentsData._sum.amount || 0,
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

    // console.log(`📊 Report generated: ${reportType} (${startDate} to ${endDate})`);
    return NextResponse.json(report);
  } catch (error) {
    console.error("❌ Error while generating report:", error);
    return NextResponse.json(
      { error: "Error while generating report" },
      { status: 500 }
    );
  }
}
