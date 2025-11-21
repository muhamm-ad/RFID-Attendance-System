// app/api/persons/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Person, PersonWithPayments } from "@/lib/types";
import { getPersonWithPayments } from "@/lib/utils";

// GET: Retrieve all persons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // Filter by type if provided

    let query = "SELECT * FROM Persons";
    const params: any[] = [];

    if (type && ["student", "teacher", "staff", "visitor"].includes(type)) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY nom, prenom";

    const persons = db.prepare(query).all(...params) as Person[];

    // For students, add payment info
    const personsWithPayments = persons.map((person) => {
      if (person.type === "student") {
        return getPersonWithPayments(person.rfid_uuid);
      }
      return person;
    });

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
    const result = db
      .prepare(
        `
      INSERT INTO Persons (rfid_uuid, type, nom, prenom, photo_path)
      VALUES (?, ?, ?, ?, ?)
    `
      )
      .run(rfid_uuid, type, nom, prenom, photo_path);

    // Retrieve the created person
    const newPerson = db
      .prepare("SELECT * FROM Persons WHERE id = ?")
      .get(result.lastInsertRowid) as Person;

    console.log(`✅ New person created: ${prenom} ${nom} (${type})`);
    return NextResponse.json(newPerson, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error while creating the person:", error);

    if (error.message && error.message.includes("UNIQUE constraint failed")) {
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
