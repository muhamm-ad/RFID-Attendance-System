// app/api/persons/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const {
      rfid_uuid,
      type,
      nom,
      prenom,
      photo_path,
      level,
      class: classField,
    } = body;

    // Check that the person exists
    const existing = await prisma.person.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Validate level if provided (only for students)
    if (level !== undefined) {
      // Determine the final person type (updated type if provided, otherwise existing type)
      const finalType = type !== undefined ? type : existing.type;
      
      // Reject if the final person type is not "student"
      if (finalType !== "student") {
        return NextResponse.json(
          { error: "Level can only be set for students" },
          { status: 400 }
        );
      }
      if (
        level !== null &&
        ![
          "License_1",
          "License_2",
          "License_3",
          "Master_1",
          "Master_2",
        ].includes(level)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid level. Allowed values: License_1, License_2, License_3, Master_1, Master_2",
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (rfid_uuid !== undefined) updateData.rfid_uuid = rfid_uuid;
    if (type !== undefined) updateData.type = type;
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (photo_path !== undefined) updateData.photo_path = photo_path;
    if (level !== undefined) updateData.level = level;
    if (classField !== undefined) updateData.class = classField;

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
