// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
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
    const person = await prisma.person.findFirst({
      where: {
        id: student_id,
        type: "student",
      },
    });

    if (!person) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if a payment already exists for this trimester
    const existingPayment = await prisma.studentPayment.findFirst({
      where: {
        student_id: student_id,
        trimester: trimester,
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: `Payment for trimester ${trimester} already exists` },
        { status: 409 }
      );
    }

    // Create the payment and link it to the student in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          amount: amount,
          payment_method: payment_method as any,
        },
      });

      const studentPayment = await tx.studentPayment.create({
        data: {
          student_id: student_id,
          payment_id: payment.id,
          trimester: trimester,
        },
      });

      return { payment, studentPayment };
    });

    console.log(
      `✅ Payment registered for student ${student_id}, trimester ${trimester}`
    );

    return NextResponse.json(
      {
        payment: result.payment,
        student_payment: result.studentPayment,
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

    const payments = await prisma.studentPayment.findMany({
      where: {
        student_id: parseInt(student_id),
      },
      include: {
        payment: true,
      },
      orderBy: {
        trimester: "asc",
      },
    });

    const formattedPayments = payments.map((sp) => ({
      id: sp.id,
      student_id: sp.student_id,
      trimester: sp.trimester,
      payment_id: sp.payment.id,
      amount: sp.payment.amount,
      payment_method: sp.payment.payment_method,
      payment_date: sp.payment.payment_date.toISOString(),
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("❌ Error while retrieving payments:", error);
    return NextResponse.json(
      { error: "Error while retrieving payments" },
      { status: 500 }
    );
  }
}
