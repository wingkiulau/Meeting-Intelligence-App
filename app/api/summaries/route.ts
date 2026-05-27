import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const summaries = await prisma.summary.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(summaries);
  } catch (err) {
    console.error("GET summaries error:", err);
    return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, meetingType, format, rawInput, summary, actionItems, riskFlags } = body;

    if (!title || !meetingType || !rawInput || !summary) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validFormats = ["detailed", "email", "slack"];
    const saved = await prisma.summary.create({
      data: {
        title,
        meetingType,
        format: validFormats.includes(format) ? format : "detailed",
        rawInput,
        summary,
        actionItems: actionItems ?? "",
        riskFlags: riskFlags ?? "",
      },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("POST summaries error:", err);
    return NextResponse.json({ error: "Failed to save summary" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
    }

    await prisma.summary.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE summaries error:", err);
    return NextResponse.json({ error: "Failed to delete summary" }, { status: 500 });
  }
}
