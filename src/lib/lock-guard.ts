import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LockableModel =
  | "persona"
  | "brandAsset"
  | "product"
  | "campaign"
  | "businessStrategy"
  | "interview";

/**
 * Check if an entity is locked. Returns HTTP 423 response if locked,
 * or null if unlocked (safe to proceed).
 *
 * Fails open on database errors — if the check fails, we allow the
 * operation to continue rather than blocking it.
 */
export async function requireUnlocked(
  model: LockableModel,
  id: string
): Promise<NextResponse | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = prisma[model] as any;
    const record = await delegate.findUnique({
      where: { id },
      select: { isLocked: true },
    });

    if (!record) {
      // Entity not found — let the calling route handle 404
      return null;
    }

    if (record.isLocked) {
      return NextResponse.json(
        {
          error: "Dit item is vergrendeld. Ontgrendel het om wijzigingen te maken.",
          code: "LOCKED",
        },
        { status: 423 }
      );
    }

    return null;
  } catch (error) {
    // Fail open — log the error but don't block the operation
    console.error(`[lock-guard] Failed to check lock for ${model}:${id}`, error);
    return null;
  }
}
