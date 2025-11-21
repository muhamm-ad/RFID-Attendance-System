// lib/utils.ts
import db from "./db";
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
export function hasStudentPaid(studentId: number, trimester: number): boolean {
  const payment = db
    .prepare(
      `
    SELECT sp.id 
    FROM student_payments sp
    WHERE sp.student_id = ? AND sp.trimester = ?
  `
    )
    .get(studentId, trimester);

  return !!payment;
}

/**
 * Retrieves a person along with their payment information
 */
export function getPersonWithPayments(
  rfidUuid: string
): PersonWithPayments | null {
  const person = db
    .prepare(
      `
    SELECT * FROM Persons WHERE rfid_uuid = ?
  `
    )
    .get(rfidUuid) as Person | undefined;

  if (!person) return null;

  // If the person is a student, retrieve their payment info
  if (person.type === "student") {
    return {
      ...person,
      trimester1_paid: hasStudentPaid(person.id, 1),
      trimester2_paid: hasStudentPaid(person.id, 2),
      trimester3_paid: hasStudentPaid(person.id, 3),
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
export function logAccess(
  personId: number,
  action: "in" | "out",
  status: "success" | "failed"
): number {
  const result = db
    .prepare(
      `
    INSERT INTO Attendance (person_id, action, status)
    VALUES (?, ?, ?)
  `
    )
    .run(personId, action, status);

  return result.lastInsertRowid as number;
}
