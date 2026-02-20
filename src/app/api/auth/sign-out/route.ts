import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/sign-out
 *
 * Explicit sign-out route that takes precedence over the [...all] catch-all.
 * Ensures the session is deleted from the database and cookies are cleared
 * via explicit Set-Cookie headers on the HTTP response.
 */
export async function POST() {
  const reqHeaders = await headers();
  const cookieStore = await cookies();

  // Read the session token cookie directly
  const sessionTokenCookie =
    cookieStore.get("better-auth.session_token") ??
    cookieStore.get("__Secure-better-auth.session_token");

  const sessionToken = sessionTokenCookie?.value;

  // Delete the session from the database if we have a token
  if (sessionToken) {
    try {
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      });
    } catch {
      // Session might already be deleted or token might be invalid — ignore
    }
  }

  // Also try Better Auth's built-in sign-out to handle signed cookies
  try {
    await auth.api.signOut({
      headers: reqHeaders,
    });
  } catch {
    // Ignore errors — we handle cookie clearing below
  }

  // Build a response that explicitly clears all session cookies
  const res = NextResponse.json({ success: true }, { status: 200 });

  // Clear session cookies via Set-Cookie headers on the response
  const cookieOptions = {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
  };

  res.cookies.set("better-auth.session_token", "", cookieOptions);
  res.cookies.set("better-auth.session_data", "", cookieOptions);
  res.cookies.set("__Secure-better-auth.session_token", "", {
    ...cookieOptions,
    secure: true,
  });
  res.cookies.set("__Secure-better-auth.session_data", "", {
    ...cookieOptions,
    secure: true,
  });

  // Also clear any chunked session data cookies (better-auth.session_data.0, .1, etc.)
  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.startsWith("better-auth.session_data.") ||
      cookie.name.startsWith("__Secure-better-auth.session_data.")
    ) {
      res.cookies.set(cookie.name, "", cookieOptions);
    }
  }

  return res;
}
