// lib/types.ts

export interface Person {
  id: number;
  rfid_uuid: string;
  type: "student" | "teacher" | "staff" | "visitor";
  nom: string;
  prenom: string;
  photo_path: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: number;
  person_id: number;
  action: "in" | "out";
  status: "success" | "failed";
  attendance_date: string;
}

export interface Payment {
  id: number;
  amount: number;
  payment_method: "cash" | "card" | "bank_transfer";
  payment_date: string;
}

export interface StudentPayment {
  id: number;
  student_id: number;
  payment_id: number;
  trimester: 1 | 2 | 3;
}

// Extended types for API responses
export interface PersonWithPayments extends Person {
  trimester1_paid: boolean;
  trimester2_paid: boolean;
  trimester3_paid: boolean;
}

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
}
