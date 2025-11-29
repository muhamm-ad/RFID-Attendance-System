// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
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

    const searchPattern = `%${query}%`;

    let sqlQuery = `
      SELECT 
        p.*
      FROM Persons p
      WHERE (
        p.nom LIKE $1 OR 
        p.prenom LIKE $2 OR 
        p.rfid_uuid LIKE $3
        ${queryId !== null ? "OR p.id = $4" : ""}
      )
    `;

    const params: any[] = [searchPattern, searchPattern, searchPattern];
    let paramIndex = 4;
    if (queryId !== null) {
      params.push(queryId);
    }

    if (type && ["student", "teacher", "staff", "visitor"].includes(type)) {
      sqlQuery += ` AND p.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    sqlQuery += " ORDER BY p.nom, p.prenom LIMIT 50";

    const result = await sql.query(sqlQuery, params);
    const results = result.rows as Person[];

    // For students, add payment info
    const personsWithPayments = await Promise.all(
      results.map(async (person) => {
        if (person.type === "student") {
          const personWithPayments = await getPersonWithPayments(person.rfid_uuid);
          return personWithPayments || person;
        }
        return person;
      })
    );

    console.log(`🔍 Search: "${query}" - ${personsWithPayments.length} results`);
    return NextResponse.json(personsWithPayments);
  } catch (error) {
    console.error("❌ Error during search:", error);
    return NextResponse.json({ error: "Error during search" }, { status: 500 });
  }
}
