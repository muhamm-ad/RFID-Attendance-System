// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
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
    const person = db
      .prepare("SELECT * FROM Persons WHERE id = ? AND type = ?")
      .get(student_id, "student");
    if (!person) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if a payment already exists for this trimester
    const existingPayment = db
      .prepare(
        `
      SELECT * FROM student_payments WHERE student_id = ? AND trimester = ?
    `
      )
      .get(student_id, trimester);

    if (existingPayment) {
      return NextResponse.json(
        { error: `Payment for trimester ${trimester} already exists` },
        { status: 409 }
      );
    }

    // Create the payment
    const paymentResult = db
      .prepare(
        `
      INSERT INTO Payments (amount, payment_method)
      VALUES (?, ?)
    `
      )
      .run(amount, payment_method);

    // Link the payment to the student
    const studentPaymentResult = db
      .prepare(
        `
      INSERT INTO student_payments (student_id, payment_id, trimester)
      VALUES (?, ?, ?)
    `
      )
      .run(student_id, paymentResult.lastInsertRowid, trimester);

    const newPayment = db
      .prepare("SELECT * FROM Payments WHERE id = ?")
      .get(paymentResult.lastInsertRowid) as Payment;
    const newStudentPayment = db
      .prepare("SELECT * FROM student_payments WHERE id = ?")
      .get(studentPaymentResult.lastInsertRowid) as StudentPayment;

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

    const payments = db
      .prepare(
        `
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
      WHERE sp.student_id = ?
      ORDER BY sp.trimester
    `
      )
      .all(student_id);

    return NextResponse.json(payments);
  } catch (error) {
    console.error("❌ Error while retrieving payments:", error);
    return NextResponse.json(
      { error: "Error while retrieving payments" },
      { status: 500 }
    );
  }
}
