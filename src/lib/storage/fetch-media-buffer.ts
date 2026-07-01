import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Resolveert een media-URL naar een Buffer, ongeacht of het een absolute
 * URL of een lokaal storage-pad is.
 *
 * Local-storage assets worden gepersist onder `public/uploads/...` en door
 * Next.js geserveerd als relatieve URLs ("/uploads/media/…"). Server-side
 * `fetch()` kan die niet resolven zonder base-host ("Failed to parse URL"),
 * dus lezen we relatieve `/`-paden rechtstreeks van disk — gespiegeld aan de
 * path-resolutie van `LocalStorageProvider`.
 *
 * @param url   absolute URL (http/https) of relatief storage-pad ("/uploads/…")
 * @param label korte omschrijving voor foutmeldingen
 */
export async function fetchMediaAsBuffer(url: string, label = "media"): Promise<Buffer> {
  if (url.startsWith("/")) {
    // Relatieve /uploads-paden bestaan alleen bij LocalStorageProvider (dev).
    // Op serverless persisteert die disk niet → een relatieve URL in prod is een
    // bug (R2 hoort absolute URLs te geven). Fail-closed i.p.v. dode disk-read.
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Kan ${label} niet lezen: relatief pad "${url}" in productie (R2 niet geconfigureerd?)`);
    }
    const filePath = path.join("public", url.replace(/^\//, ""));
    return readFile(filePath);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${label} (${res.status}): ${url}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
