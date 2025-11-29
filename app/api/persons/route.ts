// app/api/persons/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { Person, PersonWithPayments } from "@/lib/types";
import { getPersonWithPayments } from "@/lib/utils";

// GET: Retrieve all persons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // Filter by type if provided

    let result;
    if (type && ["student", "teacher", "staff", "visitor"].includes(type)) {
      result = await sql`
        SELECT * FROM Persons 
        WHERE type = ${type}
        ORDER BY nom, prenom
      `;
    } else {
      result = await sql`
        SELECT * FROM Persons 
        ORDER BY nom, prenom
      `;
    }

    const persons = result.rows as Person[];

    // For students, add payment info
    const personsWithPayments = await Promise.all(
      persons.map(async (person) => {
        if (person.type === "student") {
          return await getPersonWithPayments(person.rfid_uuid);
        }
        return person;
      })
    );

    console.log(`📋 ${personsWithPayments.length} persons retrieved`);
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
    } = body;

    // Validate required fields
    if (!rfid_uuid || !type || !nom || !prenom || !photo_path) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (rfid_uuid, type, nom, prenom, photo_path)",
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

    // Insert the new person with rfid_uuid
    const result = await sql`
      INSERT INTO Persons (rfid_uuid, type, nom, prenom, photo_path)
      VALUES (${rfid_uuid}, ${type}, ${nom}, ${prenom}, ${photo_path})
      RETURNING *
    `;

    const newPerson = result.rows[0] as Person;

    console.log(`✅ New person created: ${prenom} ${nom} (${type})`);
    return NextResponse.json(newPerson, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error while creating the person:", error);

    if (error.message && (error.message.includes("UNIQUE constraint") || error.message.includes("duplicate key"))) {
      if (error.message.includes("rfid_uuid")) {
        return NextResponse.json(
          { error: "This RFID UUID is already associated with a person" },
          { status: 409 }
        );
      }
      if (error.message.includes("photo_path")) {
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
