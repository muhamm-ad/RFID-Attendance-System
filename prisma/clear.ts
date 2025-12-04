import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function clearDatabase() {
  console.log("🗑️  Deleting all data...");

  try {
    // Delete in order to respect foreign key constraints
    // 1. Delete junction table first (student_payments)
    const studentPaymentsCount = await prisma.studentPayment.count();
    if (studentPaymentsCount > 0) {
      await prisma.studentPayment.deleteMany();
      console.log(
        `✅ ${studentPaymentsCount} record(s) deleted from student_payments`
      );
    }

    // 2. Delete attendance records (references persons)
    const attendanceCount = await prisma.attendance.count();
    if (attendanceCount > 0) {
      await prisma.attendance.deleteMany();
      console.log(
        `✅ ${attendanceCount} record(s) deleted from attendance`
      );
    }

    // 3. Delete payments (referenced by student_payments)
    const paymentsCount = await prisma.payment.count();
    if (paymentsCount > 0) {
      await prisma.payment.deleteMany();
      console.log(
        `✅ ${paymentsCount} record(s) deleted from payments`
      );
    }

    // 4. Delete persons (referenced by attendance and student_payments)
    const personsCount = await prisma.person.count();
    if (personsCount > 0) {
      await prisma.person.deleteMany();
      console.log(
        `✅ ${personsCount} record(s) deleted from persons`
      );
    }

    console.log("✅ All data has been successfully deleted!");
  } catch (error) {
    console.error("❌ Error while deleting data:", error);
    throw error;
  }
}

async function main() {
  await clearDatabase();
}

// Only run main if this file is executed directly (not imported)
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
