// app/api/persons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Person } from "@/lib/types";
import { getPersonWithPayments } from "@/lib/utils";

// GET: Retrieve a person by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const person = db.prepare("SELECT * FROM Persons WHERE id = ?").get(id) as
      | Person
      | undefined;

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // If the person is a student, add payment info
    if (person.type === "student") {
      const personWithPayments = getPersonWithPayments(person.rfid_uuid);
      return NextResponse.json(personWithPayments);
    }

    return NextResponse.json(person);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT: Update a person
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { rfid_uuid, type, nom, prenom, photo_path } = body;

    // Check that the person exists
    const existingPerson = db
      .prepare("SELECT * FROM Persons WHERE id = ?")
      .get(id);
    if (!existingPerson) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (rfid_uuid !== undefined) {
      updates.push("rfid_uuid = ?");
      values.push(rfid_uuid);
    }
    if (type !== undefined) {
      updates.push("type = ?");
      values.push(type);
    }
    if (nom !== undefined) {
      updates.push("nom = ?");
      values.push(nom);
    }
    if (prenom !== undefined) {
      updates.push("prenom = ?");
      values.push(prenom);
    }
    if (photo_path !== undefined) {
      updates.push("photo_path = ?");
      values.push(photo_path);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    db.prepare(
      `
      UPDATE Persons 
      SET ${updates.join(", ")}
      WHERE id = ?
    `
    ).run(...values);

    const updatedPerson = db
      .prepare("SELECT * FROM Persons WHERE id = ?")
      .get(id) as Person;

    console.log(
      `✅ Person updated: ${updatedPerson.prenom} ${updatedPerson.nom}`
    );
    return NextResponse.json(updatedPerson);
  } catch (error: any) {
    console.error("Error:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      if (error.message.includes("rfid_uuid")) {
        return NextResponse.json(
          { error: "This RFID UUID is already associated with another person" },
          { status: 409 }
        );
      }
      if (error.message.includes("photo_path")) {
        return NextResponse.json(
          { error: "This photo path is already used" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Conflict: rfid_uuid or photo_path already used" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE: Delete a person
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    db.prepare("DELETE FROM Persons WHERE id = ?").run(id);

    console.log(`🗑️ Person deleted (ID: ${id})`);
    return NextResponse.json({ message: "Person successfully deleted" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
