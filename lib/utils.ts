// lib/utils.ts
import prisma from "./db";
import { PersonWithPayments, Person } from "./types";

/**
 * Determines the current trimester based on the month
 * Trimester 1: October to January
 * Trimester 2: February to May
 * Trimester 3: June to September
 */
export function getCurrentTrimester(): number {
  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 10 || month <= 1) return 1;
  if (month >= 2 && month <= 5) return 2;
  return 3;
}

/**
 * Checks if a student has paid for a given trimester
 */
export async function hasStudentPaid(
  studentId: number,
  trimester: number
): Promise<boolean> {
  const payment = await prisma.studentPayment.findFirst({
    where: {
      student_id: studentId,
      trimester: trimester,
    },
  });

  return payment !== null;
}

/**
 * Retrieves a person along with their payment information
 */
export async function getPersonWithPayments(
  rfidUuid: string
): Promise<PersonWithPayments | null> {
  const person = await prisma.person.findUnique({
    where: {
      rfid_uuid: rfidUuid,
    },
  });

  if (!person) return null;

  // If the person is a student, retrieve their payment info
  if (person.type === "student") {
    const [trimester1_paid, trimester2_paid, trimester3_paid] = await Promise.all([
      hasStudentPaid(person.id, 1),
      hasStudentPaid(person.id, 2),
      hasStudentPaid(person.id, 3),
    ]);

    return {
      ...person,
      created_at: person.created_at.toISOString(),
      updated_at: person.updated_at.toISOString(),
      trimester1_paid,
      trimester2_paid,
      trimester3_paid,
    };
  }

  // For other types (teacher, staff, visitor), payment is not required
  return {
    ...person,
    created_at: person.created_at.toISOString(),
    updated_at: person.updated_at.toISOString(),
    trimester1_paid: true,
    trimester2_paid: true,
    trimester3_paid: true,
  };
}

/**
 * Logs an access attempt in the Attendance table
 */
export async function logAccess(
  personId: number,
  action: "in" | "out",
  status: "success" | "failed"
): Promise<number> {
  const result = await prisma.attendance.create({
    data: {
      person_id: personId,
      action: action,
      status: status,
    },
  });

  return result.id;
}
