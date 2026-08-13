/**
 * Import-vrije HTML-escape-helpers — bewust zonder enige dependency zodat de
 * statische compiler (en smokes) ze kunnen laden zonder de zware
 * variant-generator/prisma-ketens mee te trekken.
 */

/**
 * JSON-LD veilig serialiseren voor embedding in HTML: JSON.stringify escaped
 * `<`/`>`/`&` niet, dus AI-/user-content met `</script>` kan anders uit het
 * script-element breken (stored XSS — security-audit 2026-06-26 H2). Eén
 * implementatie voor route én artifact-compiler.
 */
export function serializeJsonLdForHtml(jsonLd: Record<string, unknown>): string {
  return JSON.stringify(jsonLd)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
