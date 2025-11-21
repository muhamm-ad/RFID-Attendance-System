// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Person, PersonWithPayments } from "@/lib/types";
import { getPersonWithPayments } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type"); // student, teacher, staff, visitor

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Search must contain at least 2 characters" },
        { status: 400 }
      );
    }

    // Check if query is a number (for ID search)
    const isNumeric = !isNaN(Number(query));
    const queryId = isNumeric ? Number(query) : null;

    let sqlQuery = `
      SELECT 
        p.*
      FROM Persons p
      WHERE (
        p.nom LIKE ? OR 
        p.prenom LIKE ? OR 
        p.rfid_uuid LIKE ?
        ${queryId !== null ? "OR p.id = ?" : ""}
      )
    `;

    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`];
    if (queryId !== null) {
      params.push(queryId);
    }

    if (type && ["student", "teacher", "staff", "visitor"].includes(type)) {
      sqlQuery += " AND p.type = ?";
      params.push(type);
    }

    sqlQuery += " ORDER BY p.nom, p.prenom LIMIT 50";

    const results = db.prepare(sqlQuery).all(...params) as Person[];

    // For students, add payment info
    const personsWithPayments = results.map((person) => {
      if (person.type === "student") {
        const personWithPayments = getPersonWithPayments(person.rfid_uuid);
        return personWithPayments || person;
      }
      return person;
    }).filter((p): p is PersonWithPayments => p !== null) as PersonWithPayments[];

    console.log(`🔍 Search: "${query}" - ${personsWithPayments.length} results`);
    return NextResponse.json(personsWithPayments);
  } catch (error) {
    console.error("❌ Error during search:", error);
    return NextResponse.json({ error: "Error during search" }, { status: 500 });
  }
}
