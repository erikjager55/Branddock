import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/settings/billing/invoices
// Returns all invoices for the workspace, sorted by issuedAt desc
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const dbInvoices = await prisma.invoice.findMany({
      where: { workspaceId },
      orderBy: { issuedAt: "desc" },
    });

    const invoices = dbInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      periodStart: inv.periodStart.toISOString(),
      periodEnd: inv.periodEnd.toISOString(),
      pdfUrl: inv.pdfUrl,
      issuedAt: inv.issuedAt.toISOString(),
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("[GET /api/settings/billing/invoices]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
