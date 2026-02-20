import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ id: string }> };

// =============================================================
// GET /api/settings/billing/invoices/[id]/download
// Stub — returns downloadUrl for the invoice PDF
// Verifies invoice belongs to the workspace
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, workspaceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      downloadUrl: invoice.pdfUrl || "/invoices/placeholder.pdf",
    });
  } catch (error) {
    console.error("[GET /api/settings/billing/invoices/:id/download]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
