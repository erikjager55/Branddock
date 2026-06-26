/**
 * Set a value at a nested path in an object, creating intermediate
 * objects/arrays as needed. Path segments use bracket notation for array
 * indices (e.g. `goals[0].title`).
 *
 * Originally lived in the AI Exploration field-suggestion pipeline
 * (see entry #97 in CLAUDE.md). Extracted so the Brand Assistant's
 * `update_asset_framework` write-tool can do single-field framework
 * updates without re-sending the whole object.
 */
export function deepSet(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');

  // M6 (security-audit): reject prototype-pollution segments before walking the
  // path. `update_asset_framework` feeds an LLM-/user-influenced `fieldPath`
  // here, so a key like `__proto__.polluted` must not reach the object walk.
  for (const seg of keys) {
    const name = seg.replace(/\[\d+\]$/, '');
    if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
      throw new Error(`deepSet: forbidden key segment "${name}"`);
    }
  }

  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const rawKey = keys[i];
    const arrMatch = rawKey.match(/^(.+)\[(\d+)\]$/);

    if (arrMatch) {
      const arrName = arrMatch[1];
      const idx = parseInt(arrMatch[2]);
      if (!Array.isArray(current[arrName])) current[arrName] = [];
      const arr = current[arrName] as unknown[];
      while (arr.length <= idx) arr.push({});
      if (typeof arr[idx] !== 'object' || arr[idx] === null) arr[idx] = {};
      current = arr[idx] as Record<string, unknown>;
    } else {
      if (!(rawKey in current) || typeof current[rawKey] !== 'object' || current[rawKey] === null) {
        current[rawKey] = {};
      }
      current = current[rawKey] as Record<string, unknown>;
    }
  }

  const lastKey = keys[keys.length - 1];
  const lastArrMatch = lastKey.match(/^(.+)\[(\d+)\]$/);
  if (lastArrMatch) {
    const arrName = lastArrMatch[1];
    const idx = parseInt(lastArrMatch[2]);
    if (!Array.isArray(current[arrName])) current[arrName] = [];
    const arr = current[arrName] as unknown[];
    while (arr.length <= idx) arr.push({});
    arr[idx] = value;
  } else {
    current[lastKey] = value;
  }
}
