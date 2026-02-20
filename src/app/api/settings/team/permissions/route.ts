import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";

// GET /api/settings/team/permissions — static permissions matrix
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      permissions: {
        owner: {
          canManageMembers: true,
          canManageBilling: true,
          canDeleteWorkspace: true,
          canInvite: true,
          canEditContent: true,
          canViewContent: true,
        },
        admin: {
          canManageMembers: true,
          canManageBilling: false,
          canDeleteWorkspace: false,
          canInvite: true,
          canEditContent: true,
          canViewContent: true,
        },
        member: {
          canManageMembers: false,
          canManageBilling: false,
          canDeleteWorkspace: false,
          canInvite: false,
          canEditContent: true,
          canViewContent: true,
        },
        viewer: {
          canManageMembers: false,
          canManageBilling: false,
          canDeleteWorkspace: false,
          canInvite: false,
          canEditContent: false,
          canViewContent: true,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/settings/team/permissions]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
