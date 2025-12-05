// lib/db.ts

import {
  Person as PrismaPerson,
  Attendance as PrismaAttendance,
  Payment as PrismaPayment,
  StudentPayment as PrismaStudentPayment,
  PrismaClient
} from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const globalForPrisma = global as unknown as { prisma: typeof prisma };
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma };
export default prisma;


// ---------------------------------- TYPES ----------------------------------


/**
 Utility type to convert Date fields to ISO strings for JSON serialization
 */
type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

/**
 * Base Person type - Prisma Person with dates serialized to strings
 * This is what we send over the API (JSON doesn't support Date objects)
 */
export type Person = SerializeDates<
  Omit<PrismaPerson, "attendance" | "student_payments">
>;

/**
 * Base Attendance type - Prisma Attendance with dates serialized to strings
 */
export type Attendance = SerializeDates<Omit<PrismaAttendance, "person">>;

/**
 * Base Payment type - Prisma Payment with dates serialized to strings
 */
export type Payment = SerializeDates<Omit<PrismaPayment, "student_payments">>;

/**
 * Base StudentPayment type - matches Prisma StudentPayment
 */
export type StudentPayment = Omit<PrismaStudentPayment, "student" | "payment">;

// Extended types for API responses
export type PersonWithPayments = Person & {
  trimester1_paid: boolean;
  trimester2_paid: boolean;
  trimester3_paid: boolean;
};

export interface ScanResult {
  success: boolean;
  access_granted: boolean;
  person: PersonWithPayments | null;
  message: string;
  timestamp: string;
  current_trimester?: number;
  action?: "in" | "out";
}

export interface AttendanceLog {
  id: number;
  person_id: number;
  action: "in" | "out";
  status: "success" | "failed";
  timestamp: string; // API returns this as timestamp (aliased from attendance_date)
  person_name: string;
  person_type: string;
  rfid_uuid: string;
  photo_path?: string;
  level?: string | null;
  class?: string | null;
}
