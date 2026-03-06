import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LockableModel =
  | "persona"
  | "brandAsset"
  | "product"
  | "campaign"
  | "businessStrategy"
  | "interview";

/** Prisma delegate with at least a findUnique method */
interface LockableDelegate {
  findUnique(args: { where: { id: string }; select: { isLocked: true } }): Promise<{ isLocked: boolean } | null>;
}

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
    const delegate = prisma[model] as unknown as LockableDelegate;
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
          error: "This item is locked. Unlock it to make changes.",
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
