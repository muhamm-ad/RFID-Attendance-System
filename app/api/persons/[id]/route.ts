// app/api/persons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
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

    const person = await prisma.person.findUnique({
      where: { id },
    });

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // If the person is a student, add payment info
    if (person.type === "student") {
      const personWithPayments = await getPersonWithPayments(person.rfid_uuid);
      return NextResponse.json(personWithPayments);
    }

    return NextResponse.json({
      ...person,
      created_at: person.created_at.toISOString(),
      updated_at: person.updated_at.toISOString(),
    });
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
    const existing = await prisma.person.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (rfid_uuid !== undefined) updateData.rfid_uuid = rfid_uuid;
    if (type !== undefined) updateData.type = type;
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (photo_path !== undefined) updateData.photo_path = photo_path;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updatedPerson = await prisma.person.update({
      where: { id },
      data: updateData,
    });

    // console.log(`✅ Person updated: ${updatedPerson.prenom} ${updatedPerson.nom}`);
    return NextResponse.json(updatedPerson);
  } catch (error: any) {
    console.error("Error:", error);
    if (error.code === "P2002") {
      // Prisma unique constraint error
      if (error.meta?.target?.includes("rfid_uuid")) {
        return NextResponse.json(
          { error: "This RFID UUID is already associated with another person" },
          { status: 409 }
        );
      }
      if (error.meta?.target?.includes("photo_path")) {
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

    await prisma.person.delete({
      where: { id },
    });

    // console.log(`🗑️ Person deleted (ID: ${id})`);
    return NextResponse.json({ message: "Person successfully deleted" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
