// app/api/persons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { Person } from "@/lib/types";
import { getPersonWithPayments } from "@/lib/utils";

// GET: Retrieve a person by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await sql`
      SELECT * FROM persons WHERE id = ${id}
    `;

    const person = result.rows[0] as Person | undefined;

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // If the person is a student, add payment info
    if (person.type === "student") {
      const personWithPayments = await getPersonWithPayments(person.rfid_uuid);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { rfid_uuid, type, nom, prenom, photo_path } = body;

    // Check that the person exists
    const existingResult = await sql`
      SELECT * FROM persons WHERE id = ${id}
    `;
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (rfid_uuid !== undefined) {
      updates.push(`rfid_uuid = $${paramIndex}`);
      values.push(rfid_uuid);
      paramIndex++;
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      values.push(type);
      paramIndex++;
    }
    if (nom !== undefined) {
      updates.push(`nom = $${paramIndex}`);
      values.push(nom);
      paramIndex++;
    }
    if (prenom !== undefined) {
      updates.push(`prenom = $${paramIndex}`);
      values.push(prenom);
      paramIndex++;
    }
    if (photo_path !== undefined) {
      updates.push(`photo_path = $${paramIndex}`);
      values.push(photo_path);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const updateQuery = `
      UPDATE persons 
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
    `;

    const { dbQuery } = await import("@/lib/db");
    await dbQuery(updateQuery, values);

    const updatedResult = await sql`
      SELECT * FROM persons WHERE id = ${id}
    `;
    const updatedPerson = updatedResult.rows[0] as Person;

    console.log(
      `✅ Person updated: ${updatedPerson.prenom} ${updatedPerson.nom}`
    );
    return NextResponse.json(updatedPerson);
  } catch (error: any) {
    console.error("Error:", error);
    if (error.message && (error.message.includes("UNIQUE constraint") || error.message.includes("duplicate key"))) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await sql`
      DELETE FROM persons WHERE id = ${id}
    `;

    console.log(`🗑️ Person deleted (ID: ${id})`);
    return NextResponse.json({ message: "Person successfully deleted" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
