import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["terms", "privacy"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const fileName =
      type === "terms" ? "terms-and-conditions.md" : "privacy-policy.md";
    const filePath = join(process.cwd(), "content", fileName);

    const content = await readFile(filePath, "utf8");

    return NextResponse.json({ content }, { status: 200 });
  } catch (error) {
    console.error("Error reading content file:", error);
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
}
