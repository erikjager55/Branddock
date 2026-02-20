import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Static system status — in production this would check real services
    const status = {
      overall: "operational" as const,
      updatedAt: new Date().toISOString(),
      services: [
        {
          name: "Platform",
          status: "operational" as const,
          description: "All systems running normally",
        },
        {
          name: "AI Services",
          status: "operational" as const,
          description: "AI analysis and generation available",
        },
        {
          name: "Database",
          status: "operational" as const,
          description: "Database connections stable",
        },
        {
          name: "Authentication",
          status: "operational" as const,
          description: "Login and session management working",
        },
      ],
      incidents: [],
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("[GET /api/help/system-status]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
