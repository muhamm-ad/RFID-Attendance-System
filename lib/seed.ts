import type Database from "better-sqlite3";

type PersonType = "student" | "teacher" | "staff" | "visitor";

type PersonSeed = {
  rfid_uuid: string;
  type: PersonType;
  nom: string;
  prenom: string;
  photo_path: string;
};

type AttendanceSeed = {
  rfid_uuid: string;
  action: "in" | "out";
  status: "success" | "failed";
  attendance_date: string;
};

type PaymentSeed = {
  rfid_uuid: string;
  trimester: 1 | 2 | 3;
  amount: number;
  payment_method: "cash" | "card" | "bank_transfer";
};

const PERSONS_SEED: PersonSeed[] = [
  // Students
  {
    rfid_uuid: "STU-0001",
    type: "student",
    nom: "Diallo",
    prenom: "Amadou",
    photo_path: "/photos/amadou_diallo.jpg",
  },
  {
    rfid_uuid: "STU-0002",
    type: "student",
    nom: "Sow",
    prenom: "Fatou",
    photo_path: "/photos/fatou_sow.jpg",
  },
  {
    rfid_uuid: "STU-0003",
    type: "student",
    nom: "Ba",
    prenom: "Ousmane",
    photo_path: "/photos/ousmane_ba.jpg",
  },
  {
    rfid_uuid: "STU-0004",
    type: "student",
    nom: "Ndiaye",
    prenom: "Khady",
    photo_path: "/photos/khady_ndiaye.jpg",
  },
  {
    rfid_uuid: "STU-0005",
    type: "student",
    nom: "Kane",
    prenom: "Mamadou",
    photo_path: "/photos/mamadou_kane.jpg",
  },
  {
    rfid_uuid: "STU-0006",
    type: "student",
    nom: "Diop",
    prenom: "Aicha",
    photo_path: "/photos/aicha_diop.jpg",
  },
  {
    rfid_uuid: "STU-0007",
    type: "student",
    nom: "Sy",
    prenom: "Cheikh",
    photo_path: "/photos/cheikh_sy.jpg",
  },
  {
    rfid_uuid: "STU-0008",
    type: "student",
    nom: "Barry",
    prenom: "Mariam",
    photo_path: "/photos/mariam_barry.jpg",
  },
  {
    rfid_uuid: "STU-0009",
    type: "student",
    nom: "Traoré",
    prenom: "Ibrahim",
    photo_path: "/photos/ibrahim_traore.jpg",
  },
  {
    rfid_uuid: "STU-0010",
    type: "student",
    nom: "Cissé",
    prenom: "Aminata",
    photo_path: "/photos/aminata_cisse.jpg",
  },
  {
    rfid_uuid: "STU-0011",
    type: "student",
    nom: "Fall",
    prenom: "Modou",
    photo_path: "/photos/modou_fall.jpg",
  },
  {
    rfid_uuid: "STU-0012",
    type: "student",
    nom: "Thiam",
    prenom: "Rokhaya",
    photo_path: "/photos/rokhaya_thiam.jpg",
  },
  {
    rfid_uuid: "STU-0013",
    type: "student",
    nom: "Sarr",
    prenom: "Papa",
    photo_path: "/photos/papa_sarr.jpg",
  },
  {
    rfid_uuid: "STU-0014",
    type: "student",
    nom: "Gueye",
    prenom: "Aissatou",
    photo_path: "/photos/aissatou_gueye.jpg",
  },
  {
    rfid_uuid: "STU-0015",
    type: "student",
    nom: "Mbaye",
    prenom: "Samba",
    photo_path: "/photos/samba_mbaye.jpg",
  },
  // Teachers
  {
    rfid_uuid: "TCH-0001",
    type: "teacher",
    nom: "Ndiaye",
    prenom: "Mariama",
    photo_path: "/photos/mariama_ndiaye.jpg",
  },
  {
    rfid_uuid: "TCH-0002",
    type: "teacher",
    nom: "Diagne",
    prenom: "Ibrahima",
    photo_path: "/photos/ibrahima_diagne.jpg",
  },
  {
    rfid_uuid: "TCH-0003",
    type: "teacher",
    nom: "Seck",
    prenom: "Awa",
    photo_path: "/photos/awa_seck.jpg",
  },
  {
    rfid_uuid: "TCH-0004",
    type: "teacher",
    nom: "Camara",
    prenom: "Boubacar",
    photo_path: "/photos/boubacar_camara.jpg",
  },
  {
    rfid_uuid: "TCH-0005",
    type: "teacher",
    nom: "Dia",
    prenom: "Fatou",
    photo_path: "/photos/fatou_dia.jpg",
  },
  // Staff
  {
    rfid_uuid: "STF-0001",
    type: "staff",
    nom: "Faye",
    prenom: "Astou",
    photo_path: "/photos/astou_faye.jpg",
  },
  {
    rfid_uuid: "STF-0002",
    type: "staff",
    nom: "Gaye",
    prenom: "Moussa",
    photo_path: "/photos/moussa_gaye.jpg",
  },
  {
    rfid_uuid: "STF-0003",
    type: "staff",
    nom: "Sall",
    prenom: "Omar",
    photo_path: "/photos/omar_sall.jpg",
  },
  {
    rfid_uuid: "STF-0004",
    type: "staff",
    nom: "Diouf",
    prenom: "Khadija",
    photo_path: "/photos/khadija_diouf.jpg",
  },
  // Visitors
  {
    rfid_uuid: "VIS-0001",
    type: "visitor",
    nom: "Dupont",
    prenom: "Jean",
    photo_path: "/photos/jean_dupont.jpg",
  },
  {
    rfid_uuid: "VIS-0002",
    type: "visitor",
    nom: "Lopez",
    prenom: "Clara",
    photo_path: "/photos/clara_lopez.jpg",
  },
  {
    rfid_uuid: "VIS-0003",
    type: "visitor",
    nom: "Martin",
    prenom: "Sophie",
    photo_path: "/photos/sophie_martin.jpg",
  },
  {
    rfid_uuid: "VIS-0004",
    type: "visitor",
    nom: "Bernard",
    prenom: "Pierre",
    photo_path: "/photos/pierre_bernard.jpg",
  },
];

// Helper function to generate attendance entries for a date range
function generateAttendanceEntries(
  rfid_uuid: string,
  startDate: string,
  endDate: string,
  days: number[],
  inTime: string,
  outTime: string
): AttendanceSeed[] {
  const entries: AttendanceSeed[] = [];
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T23:59:59Z");
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday) unless specified
    if (days.includes(dayOfWeek)) {
      const dateStr = current.toISOString().split("T")[0];
      entries.push({
        rfid_uuid,
        action: "in",
        status: "success",
        attendance_date: `${dateStr}T${inTime}:00Z`,
      });
      entries.push({
        rfid_uuid,
        action: "out",
        status: "success",
        attendance_date: `${dateStr}T${outTime}:00Z`,
      });
    }
    // Move to next day
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return entries;
}

const ATTENDANCE_SEED: AttendanceSeed[] = [
  // November 2024 - Regular students (Monday to Friday)
  ...generateAttendanceEntries("STU-0001", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:55", "16:05"),
  ...generateAttendanceEntries("STU-0002", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "08:10", "15:50"),
  ...generateAttendanceEntries("STU-0003", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "08:15", "16:00"),
  ...generateAttendanceEntries("STU-0004", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "08:00", "16:20"),
  ...generateAttendanceEntries("STU-0005", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:50", "16:10"),
  ...generateAttendanceEntries("STU-0006", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "08:05", "15:45"),
  ...generateAttendanceEntries("STU-0007", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:45", "16:30"),
  ...generateAttendanceEntries("STU-0008", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "08:00", "16:15"),
  
  // December 2024 - Regular students
  ...generateAttendanceEntries("STU-0001", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:55", "16:05"),
  ...generateAttendanceEntries("STU-0002", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "08:10", "15:50"),
  ...generateAttendanceEntries("STU-0003", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "08:15", "16:00"),
  ...generateAttendanceEntries("STU-0004", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "08:00", "16:20"),
  ...generateAttendanceEntries("STU-0005", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:50", "16:10"),
  ...generateAttendanceEntries("STU-0006", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "08:05", "15:45"),
  ...generateAttendanceEntries("STU-0007", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:45", "16:30"),
  ...generateAttendanceEntries("STU-0008", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "08:00", "16:15"),
  
  // January 2025 - Regular students (current month)
  ...generateAttendanceEntries("STU-0001", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:55", "16:05"),
  ...generateAttendanceEntries("STU-0002", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "08:10", "15:50"),
  ...generateAttendanceEntries("STU-0003", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "08:15", "16:00"),
  ...generateAttendanceEntries("STU-0004", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "08:00", "16:20"),
  ...generateAttendanceEntries("STU-0005", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:50", "16:10"),
  ...generateAttendanceEntries("STU-0006", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "08:05", "15:45"),
  ...generateAttendanceEntries("STU-0007", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:45", "16:30"),
  ...generateAttendanceEntries("STU-0008", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "08:00", "16:15"),
  
  // Additional students with varied attendance
  ...generateAttendanceEntries("STU-0009", "2024-11-15", "2025-01-31", [1, 2, 3, 4, 5], "08:20", "16:00"),
  ...generateAttendanceEntries("STU-0010", "2024-11-01", "2025-01-31", [1, 2, 3, 4], "08:05", "15:55"), // No Friday
  ...generateAttendanceEntries("STU-0011", "2024-12-01", "2025-01-31", [1, 2, 3, 4, 5], "08:00", "16:10"),
  ...generateAttendanceEntries("STU-0012", "2024-11-20", "2025-01-31", [1, 2, 3, 4, 5], "07:50", "16:20"),
  ...generateAttendanceEntries("STU-0013", "2024-12-10", "2025-01-31", [1, 2, 3, 4, 5], "08:10", "15:50"),
  ...generateAttendanceEntries("STU-0014", "2024-11-01", "2025-01-31", [1, 2, 3, 4, 5], "08:15", "16:05"),
  ...generateAttendanceEntries("STU-0015", "2024-12-15", "2025-01-31", [1, 2, 3, 4, 5], "07:55", "16:15"),
  
  // Teachers - November 2024
  ...generateAttendanceEntries("TCH-0001", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:30", "17:05"),
  ...generateAttendanceEntries("TCH-0002", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:40", "16:40"),
  ...generateAttendanceEntries("TCH-0003", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:35", "17:00"),
  ...generateAttendanceEntries("TCH-0004", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:45", "16:50"),
  ...generateAttendanceEntries("TCH-0005", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:50", "17:10"),
  
  // Teachers - December 2024
  ...generateAttendanceEntries("TCH-0001", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:30", "17:05"),
  ...generateAttendanceEntries("TCH-0002", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:40", "16:40"),
  ...generateAttendanceEntries("TCH-0003", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:35", "17:00"),
  ...generateAttendanceEntries("TCH-0004", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:45", "16:50"),
  ...generateAttendanceEntries("TCH-0005", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:50", "17:10"),
  
  // Teachers - January 2025
  ...generateAttendanceEntries("TCH-0001", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:30", "17:05"),
  ...generateAttendanceEntries("TCH-0002", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:40", "16:40"),
  ...generateAttendanceEntries("TCH-0003", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:35", "17:00"),
  ...generateAttendanceEntries("TCH-0004", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:45", "16:50"),
  ...generateAttendanceEntries("TCH-0005", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:50", "17:10"),
  
  // Staff - November 2024
  ...generateAttendanceEntries("STF-0001", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:20", "18:10"),
  ...generateAttendanceEntries("STF-0002", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:15", "18:00"),
  ...generateAttendanceEntries("STF-0003", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:25", "18:15"),
  ...generateAttendanceEntries("STF-0004", "2024-11-01", "2024-11-30", [1, 2, 3, 4, 5], "07:30", "18:20"),
  
  // Staff - December 2024
  ...generateAttendanceEntries("STF-0001", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:20", "18:10"),
  ...generateAttendanceEntries("STF-0002", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:15", "18:00"),
  ...generateAttendanceEntries("STF-0003", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:25", "18:15"),
  ...generateAttendanceEntries("STF-0004", "2024-12-01", "2024-12-20", [1, 2, 3, 4, 5], "07:30", "18:20"),
  
  // Staff - January 2025
  ...generateAttendanceEntries("STF-0001", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:20", "18:10"),
  ...generateAttendanceEntries("STF-0002", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:15", "18:00"),
  ...generateAttendanceEntries("STF-0003", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:25", "18:15"),
  ...generateAttendanceEntries("STF-0004", "2025-01-01", "2025-01-31", [1, 2, 3, 4, 5], "07:30", "18:20"),
  
  // Some failed attempts and retries
  { rfid_uuid: "STU-0003", action: "in", status: "failed", attendance_date: "2024-11-05T08:12:00Z" },
  { rfid_uuid: "STU-0003", action: "in", status: "success", attendance_date: "2024-11-05T08:25:00Z" },
  { rfid_uuid: "STU-0006", action: "in", status: "failed", attendance_date: "2024-12-10T08:05:00Z" },
  { rfid_uuid: "STU-0006", action: "in", status: "success", attendance_date: "2024-12-10T08:15:00Z" },
  { rfid_uuid: "STU-0010", action: "in", status: "failed", attendance_date: "2025-01-15T08:10:00Z" },
  { rfid_uuid: "STU-0010", action: "in", status: "success", attendance_date: "2025-01-15T08:20:00Z" },
  
  // Visitors - scattered dates
  { rfid_uuid: "VIS-0001", action: "in", status: "success", attendance_date: "2024-11-05T09:00:00Z" },
  { rfid_uuid: "VIS-0001", action: "out", status: "success", attendance_date: "2024-11-05T11:45:00Z" },
  { rfid_uuid: "VIS-0002", action: "in", status: "success", attendance_date: "2024-11-12T10:10:00Z" },
  { rfid_uuid: "VIS-0002", action: "out", status: "success", attendance_date: "2024-11-12T12:30:00Z" },
  { rfid_uuid: "VIS-0003", action: "in", status: "success", attendance_date: "2024-12-03T09:30:00Z" },
  { rfid_uuid: "VIS-0003", action: "out", status: "success", attendance_date: "2024-12-03T11:00:00Z" },
  { rfid_uuid: "VIS-0004", action: "in", status: "success", attendance_date: "2024-12-15T10:00:00Z" },
  { rfid_uuid: "VIS-0004", action: "out", status: "success", attendance_date: "2024-12-15T13:00:00Z" },
  { rfid_uuid: "VIS-0001", action: "in", status: "success", attendance_date: "2025-01-08T09:15:00Z" },
  { rfid_uuid: "VIS-0001", action: "out", status: "success", attendance_date: "2025-01-08T12:00:00Z" },
  { rfid_uuid: "VIS-0002", action: "in", status: "success", attendance_date: "2025-01-20T10:30:00Z" },
  { rfid_uuid: "VIS-0002", action: "out", status: "success", attendance_date: "2025-01-20T14:00:00Z" },
];

const PAYMENT_SEED: PaymentSeed[] = [
  // Trimester 1 payments
  { rfid_uuid: "STU-0001", trimester: 1, amount: 55000, payment_method: "cash" },
  { rfid_uuid: "STU-0002", trimester: 1, amount: 50000, payment_method: "bank_transfer" },
  { rfid_uuid: "STU-0003", trimester: 1, amount: 45000, payment_method: "cash" },
  { rfid_uuid: "STU-0004", trimester: 1, amount: 55000, payment_method: "bank_transfer" },
  { rfid_uuid: "STU-0005", trimester: 1, amount: 50000, payment_method: "cash" },
  { rfid_uuid: "STU-0006", trimester: 1, amount: 48000, payment_method: "bank_transfer" },
  { rfid_uuid: "STU-0007", trimester: 1, amount: 52000, payment_method: "card" },
  { rfid_uuid: "STU-0008", trimester: 1, amount: 47000, payment_method: "cash" },
  { rfid_uuid: "STU-0009", trimester: 1, amount: 53000, payment_method: "card" },
  { rfid_uuid: "STU-0010", trimester: 1, amount: 49000, payment_method: "bank_transfer" },
  { rfid_uuid: "STU-0011", trimester: 1, amount: 51000, payment_method: "cash" },
  { rfid_uuid: "STU-0012", trimester: 1, amount: 54000, payment_method: "card" },
  { rfid_uuid: "STU-0013", trimester: 1, amount: 46000, payment_method: "bank_transfer" },
  { rfid_uuid: "STU-0014", trimester: 1, amount: 50000, payment_method: "cash" },
  { rfid_uuid: "STU-0015", trimester: 1, amount: 48000, payment_method: "card" },
  
  // Trimester 2 payments (some students paid, some not)
  { rfid_uuid: "STU-0001", trimester: 2, amount: 55000, payment_method: "card" },
  { rfid_uuid: "STU-0002", trimester: 2, amount: 50000, payment_method: "cash" },
  { rfid_uuid: "STU-0003", trimester: 2, amount: 45000, payment_method: "bank_transfer" },
  { rfid_uuid: "STU-0004", trimester: 2, amount: 55000, payment_method: "card" },
  { rfid_uuid: "STU-0005", trimester: 2, amount: 50000, payment_method: "cash" },
  { rfid_uuid: "STU-0006", trimester: 2, amount: 48000, payment_method: "card" },
  { rfid_uuid: "STU-0007", trimester: 2, amount: 52000, payment_method: "bank_transfer" },
  { rfid_uuid: "STU-0008", trimester: 2, amount: 47000, payment_method: "card" },
  { rfid_uuid: "STU-0009", trimester: 2, amount: 53000, payment_method: "cash" },
  { rfid_uuid: "STU-0010", trimester: 2, amount: 49000, payment_method: "bank_transfer" },
  // STU-0011, STU-0012, STU-0013, STU-0014, STU-0015 haven't paid trimester 2
  
  // Trimester 3 payments (fewer students)
  { rfid_uuid: "STU-0002", trimester: 3, amount: 50000, payment_method: "card" },
  { rfid_uuid: "STU-0008", trimester: 3, amount: 47000, payment_method: "card" },
  { rfid_uuid: "STU-0011", trimester: 3, amount: 51000, payment_method: "cash" },
  { rfid_uuid: "STU-0013", trimester: 3, amount: 46000, payment_method: "bank_transfer" },
];

export function seedDatabase(db: any) {
  console.log("🌱 Ajout des données de test...");

  const personsCount = db
    .prepare("SELECT COUNT(*) as count FROM Persons")
    .get() as { count: number };

  if (personsCount.count > 0) {
    console.log("ℹ️ La base contient déjà des données, aucune action nécessaire.");
    return;
  }

  const runSeed = db.transaction(() => {
    const insertPerson = db.prepare(`
      INSERT INTO Persons (rfid_uuid, type, nom, prenom, photo_path)
      VALUES (?, ?, ?, ?, ?)
    `);

    const personIndex = new Map<
      string,
      { id: number; type: PersonSeed["type"] }
    >();

    for (const person of PERSONS_SEED) {
      const result = insertPerson.run(
        person.rfid_uuid,
        person.type,
        person.nom,
        person.prenom,
        person.photo_path
      );

      personIndex.set(person.rfid_uuid, {
        id: Number(result.lastInsertRowid),
        type: person.type,
      });
    }

    const insertAttendance = db.prepare(`
      INSERT INTO Attendance (person_id, action, status, attendance_date)
      VALUES (?, ?, ?, ?)
    `);

    for (const entry of ATTENDANCE_SEED) {
      const personMeta = personIndex.get(entry.rfid_uuid);
      if (!personMeta) {
        continue;
      }

      insertAttendance.run(
        personMeta.id,
        entry.action,
        entry.status,
        entry.attendance_date
      );
    }

    const insertPayment = db.prepare(
      "INSERT INTO Payments (amount, payment_method) VALUES (?, ?)"
    );
    const insertStudentPayment = db.prepare(
      "INSERT INTO student_payments (student_id, payment_id, trimester) VALUES (?, ?, ?)"
    );

    for (const payment of PAYMENT_SEED) {
      const personMeta = personIndex.get(payment.rfid_uuid);
      if (!personMeta || personMeta.type !== "student") {
        continue;
      }

      const paymentResult = insertPayment.run(
        payment.amount,
        payment.payment_method
      );

      insertStudentPayment.run(
        personMeta.id,
        Number(paymentResult.lastInsertRowid),
        payment.trimester
      );
    }
  });

  runSeed();

  console.log("✅ Données de test ajoutées avec succès !");
}

