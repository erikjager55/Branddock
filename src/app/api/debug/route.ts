import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers, cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();

    // 1. Check cookies
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map(c => c.name);
    const sessionCookie = allCookies.find(c => c.name.includes('session'));

    // 2. Try to get session
    let session = null;
    let sessionError = null;
    try {
      session = await auth.api.getSession({
        headers: headersList,
      });
    } catch (e) {
      sessionError = String(e);
    }

    // 3. If session exists, check workspace resolution
    let workspaceInfo = null;
    if (session) {
      const activeOrgId = (session.session as Record<string, unknown>)
        .activeOrganizationId as string | undefined;

      // Check explicit workspace cookie
      const wsCookie = cookieStore.get('branddock-workspace-id')?.value;

      // Check workspace for org
      let wsForOrg = null;
      if (activeOrgId) {
        wsForOrg = await prisma.workspace.findFirst({
          where: { organizationId: activeOrgId },
          select: { id: true, name: true },
        });
      }

      // Check workspace for user
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        include: {
          organization: {
            include: { workspaces: { take: 1, select: { id: true, name: true } } },
          },
        },
      });

      workspaceInfo = {
        activeOrgId,
        wsCookie: wsCookie || null,
        wsForOrg,
        userMembership: membership ? {
          orgId: membership.organizationId,
          orgName: membership.organization?.name,
          workspace: membership.organization?.workspaces?.[0] || null,
        } : null,
      };
    }

    return NextResponse.json({
      cookies: cookieNames,
      hasSessionCookie: !!sessionCookie,
      sessionCookieValue: sessionCookie ? sessionCookie.value.substring(0, 20) + '...' : null,
      session: session ? {
        userId: session.user.id,
        userName: session.user.name,
        email: session.user.email,
      } : null,
      sessionError,
      workspaceInfo,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
