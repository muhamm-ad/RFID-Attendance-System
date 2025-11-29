// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { Payment, StudentPayment } from "@/lib/types";

// POST: Register a payment for a student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, trimester, amount, payment_method } = body;

    // Validation
    if (!student_id || !trimester || !amount || !payment_method) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (student_id, trimester, amount, payment_method)",
        },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(trimester)) {
      return NextResponse.json(
        { error: "Invalid trimester. Allowed values: 1, 2, 3" },
        { status: 400 }
      );
    }

    if (!["cash", "card", "bank_transfer"].includes(payment_method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Check that the student exists and is of type student
    const personResult = await sql`
      SELECT * FROM Persons WHERE id = ${student_id} AND type = 'student'
    `;
    if (personResult.rows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if a payment already exists for this trimester
    const existingPaymentResult = await sql`
      SELECT * FROM student_payments WHERE student_id = ${student_id} AND trimester = ${trimester}
    `;

    if (existingPaymentResult.rows.length > 0) {
      return NextResponse.json(
        { error: `Payment for trimester ${trimester} already exists` },
        { status: 409 }
      );
    }

    // Create the payment
    const paymentResult = await sql`
      INSERT INTO Payments (amount, payment_method)
      VALUES (${amount}, ${payment_method})
      RETURNING *
    `;

    const paymentId = paymentResult.rows[0].id;

    // Link the payment to the student
    const studentPaymentResult = await sql`
      INSERT INTO student_payments (student_id, payment_id, trimester)
      VALUES (${student_id}, ${paymentId}, ${trimester})
      RETURNING *
    `;

    const newPayment = paymentResult.rows[0] as Payment;
    const newStudentPayment = studentPaymentResult.rows[0] as StudentPayment;

    console.log(
      `✅ Payment registered for student ${student_id}, trimester ${trimester}`
    );

    return NextResponse.json(
      {
        payment: newPayment,
        student_payment: newStudentPayment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error while registering payment:", error);
    return NextResponse.json(
      { error: "Error while registering payment" },
      { status: 500 }
    );
  }
}

// GET: Retrieve payments for a student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get("student_id");

    if (!student_id) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT 
        sp.id,
        sp.student_id,
        sp.trimester,
        p.id as payment_id,
        p.amount,
        p.payment_method,
        p.payment_date
      FROM student_payments sp
      JOIN Payments p ON sp.payment_id = p.id
      WHERE sp.student_id = ${parseInt(student_id)}
      ORDER BY sp.trimester
    `;

    const payments = result.rows;

    return NextResponse.json(payments);
  } catch (error) {
    console.error("❌ Error while retrieving payments:", error);
    return NextResponse.json(
      { error: "Error while retrieving payments" },
      { status: 500 }
    );
  }
}
