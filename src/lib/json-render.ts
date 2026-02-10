/**
 * Safely extract a displayable string from a Prisma JSON value.
 * Handles strings, numbers, and objects with common text keys.
 */
export function jsonToString(item: unknown): string {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    // Try common text properties in priority order
    for (const key of ["text", "name", "title", "label", "value", "goal", "benefit", "description"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
    return JSON.stringify(item);
  }
  return String(item);
}

/**
 * Normalize a Prisma JSON field into a string array for rendering.
 * Handles: null, string, string[], object[], and nested objects.
 */
export function toStringArray(json: unknown): string[] {
  if (json == null) return [];
  if (typeof json === "string") return [json];
  if (Array.isArray(json)) return json.map(jsonToString);
  if (typeof json === "object") {
    // Handle nested objects like behaviors: { digital: [...], purchasing: [...] }
    const entries: string[] = [];
    for (const [, value] of Object.entries(json as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        entries.push(...value.map(jsonToString));
      } else if (typeof value === "string") {
        entries.push(value);
      }
    }
    return entries.length > 0 ? entries : [jsonToString(json)];
  }
  return [String(json)];
}
