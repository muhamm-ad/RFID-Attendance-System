// lib/utils.ts
import sql from "./db";
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
export async function hasStudentPaid(studentId: number, trimester: number): Promise<boolean> {
  const result = await sql`
    SELECT sp.id 
    FROM student_payments sp
    WHERE sp.student_id = ${studentId} AND sp.trimester = ${trimester}
  `;

  return result.rows.length > 0;
}

/**
 * Retrieves a person along with their payment information
 */
export async function getPersonWithPayments(
  rfidUuid: string
): Promise<PersonWithPayments | null> {
  const result = await sql`
    SELECT * FROM persons WHERE rfid_uuid = ${rfidUuid}
  `;

  const person = result.rows[0] as Person | undefined;

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
      trimester1_paid,
      trimester2_paid,
      trimester3_paid,
    };
  }

  // For other types (teacher, staff, visitor), payment is not required
  return {
    ...person,
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
  const result = await sql`
    INSERT INTO attendance (person_id, action, status)
    VALUES (${personId}, ${action}, ${status})
    RETURNING id
  `;

  return result.rows[0].id as number;
}
