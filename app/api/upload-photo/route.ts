// app/api/upload-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${timestamp}_${randomString}.${extension}`;

    // Ensure photos directory exists
    const photosDir = join(process.cwd(), "public", "photos");
    if (!existsSync(photosDir)) {
      await mkdir(photosDir, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(photosDir, filename);
    await writeFile(filepath, buffer);

    // Return the public path
    const publicPath = `/photos/${filename}`;

    return NextResponse.json({
      success: true,
      photo_path: publicPath,
    });
  } catch (error: any) {
    console.error("❌ Error uploading photo:", error);
    return NextResponse.json(
      { error: "Error uploading photo: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

