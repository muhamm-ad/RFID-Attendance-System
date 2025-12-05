// app/api/persons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma, PersonWithPayments } from "@/lib/db";
import { getPersonWithPayments } from "@/lib/utils";
import { Person as PrismaPerson } from "@prisma/client";

// GET: Retrieve all persons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // Filter by type if provided

    const where: any = {};
    if (type && ["student", "teacher", "staff", "visitor"].includes(type)) {
      where.type = type;
    }

    const persons = await prisma.person.findMany({
      where,
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    // For students, add payment info
    const personsWithPayments = await Promise.all(
      persons.map(async (person: PrismaPerson) => {
        if (person.type === "student") {
          return await getPersonWithPayments(person.rfid_uuid);
        }
        // For non-students, convert dates and add payment fields
        return {
          ...person,
          created_at: person.created_at.toISOString(),
          updated_at: person.updated_at.toISOString(),
          trimester1_paid: true,
          trimester2_paid: true,
          trimester3_paid: true,
        } as PersonWithPayments;
      })
    );

    // console.log(`📋 ${personsWithPayments.length} persons retrieved`);
    return NextResponse.json(personsWithPayments);
  } catch (error) {
    console.error("❌ Error while retrieving persons:", error);
    return NextResponse.json(
      { error: "Error while retrieving persons" },
      { status: 500 }
    );
  }
}

// POST: Create a new person
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      rfid_uuid, // RFID UUID
      type,
      nom,
      prenom,
      photo_path,
      level,
      class: classField,
    } = body;

    // Validate required fields
    if (!rfid_uuid || !type || !nom || !prenom) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (rfid_uuid, type, nom, prenom)",
        },
        { status: 400 }
      );
    }

    // Validate type value
    if (!["student", "teacher", "staff", "visitor"].includes(type)) {
      return NextResponse.json(
        {
          error:
            "Invalid type. Allowed values: student, teacher, staff, visitor",
        },
        { status: 400 }
      );
    }

    // Validate level if provided (only for students)
    if (level && type !== "student") {
      return NextResponse.json(
        { error: "Level can only be set for students" },
        { status: 400 }
      );
    }

    if (
      level &&
      !["License_1", "License_2", "License_3", "Master_1", "Master_2"].includes(
        level
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid level. Allowed values: License_1, License_2, License_3, Master_1, Master_2",
        },
        { status: 400 }
      );
    }

    // Insert the new person with rfid_uuid
    const newPerson = await prisma.person.create({
      data: {
        rfid_uuid,
        type: type as any,
        nom,
        prenom,
        photo_path: photo_path && photo_path.trim() !== "" ? photo_path : null,
        level: level || null,
        class: classField || null,
      },
    });

    // console.log(`✅ New person created: ${prenom} ${nom} (${type})`);
    return NextResponse.json(
      {
        ...newPerson,
        created_at: newPerson.created_at.toISOString(),
        updated_at: newPerson.updated_at.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Error while creating the person:", error);

    if (error.code === "P2002") {
      // Prisma unique constraint error
      if (error.meta?.target?.includes("rfid_uuid")) {
        return NextResponse.json(
          { error: "This RFID UUID is already associated with a person" },
          { status: 409 }
        );
      }
      if (error.meta?.target?.includes("photo_path")) {
        return NextResponse.json(
          { error: "This photo path is already used" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error while creating the person" },
      { status: 500 }
    );
  }
}
