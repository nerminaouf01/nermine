import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const equipements = await prisma.equipement.findMany({
      orderBy: { id: "desc" },
    });
    return NextResponse.json(equipements);
  } catch (error) {
    console.error("GET /api/equipements error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}


