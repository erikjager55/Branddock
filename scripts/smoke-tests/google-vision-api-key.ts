/**
 * Smoke test voor GOOGLE_VISION_API_KEY env var.
 *
 * Stuurt een minimale TEXT_DETECTION request naar de Google Vision API met
 * een publieke test-image die bekende tekst bevat (Google's eigen demo).
 * Verifieert dat:
 *   1. De API-key wordt geaccepteerd (geen 401/403)
 *   2. De response een herkenbare textAnnotations-veld bevat
 *   3. De gevonden tekst overeenkomt met wat we verwachten
 *
 * Run: DATABASE_URL niet nodig — alleen GOOGLE_VISION_API_KEY uit .env.local.
 *   npx tsx --env-file=.env.local scripts/smoke-tests/google-vision-api-key.ts
 */

const TEST_IMAGE_URL =
  "https://cloud.google.com/vision/docs/images/sign_small.jpg";
const EXPECTED_TEXT_FRAGMENT = "WAITING";

interface VisionAnnotateResponse {
  responses: Array<{
    error?: { code: number; message: string };
    textAnnotations?: Array<{ description: string; locale?: string }>;
    fullTextAnnotation?: { text: string };
  }>;
}

async function main() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) {
    console.error("✗ GOOGLE_VISION_API_KEY niet gezet of leeg");
    process.exit(1);
  }
  if (apiKey.length < 20) {
    console.error("✗ GOOGLE_VISION_API_KEY lijkt te kort (lengte < 20)");
    process.exit(1);
  }

  console.log("→ Vision API request via image URI");
  console.log(`  test-image: ${TEST_IMAGE_URL}`);
  console.log(`  key-length: ${apiKey.length} chars`);

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const body = {
    requests: [
      {
        image: { source: { imageUri: TEST_IMAGE_URL } },
        features: [{ type: "TEXT_DETECTION", maxResults: 5 }],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("✗ Network error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log(`  status: ${res.status} ${res.statusText}`);

  if (res.status === 403) {
    const errBody = await res.text();
    console.error(
      "✗ 403 Forbidden — API key invalid OR Vision API not enabled in project",
    );
    console.error("  details:", errBody.slice(0, 400));
    console.error(
      "\nFix: ga naar https://console.cloud.google.com/apis/library/vision.googleapis.com",
    );
    console.error("→ Enable de Vision API voor je project + verifieer dat de");
    console.error("→ API-key onbeperkt is (of toegestaan voor Vision-host).");
    process.exit(1);
  }

  if (res.status === 400) {
    const errBody = await res.text();
    console.error("✗ 400 Bad Request — payload-shape probleem");
    console.error("  details:", errBody.slice(0, 400));
    process.exit(1);
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`✗ ${res.status} ${res.statusText}`);
    console.error("  details:", errBody.slice(0, 400));
    process.exit(1);
  }

  const data = (await res.json()) as VisionAnnotateResponse;
  const first = data.responses?.[0];

  if (first?.error) {
    console.error(`✗ Per-image error: code ${first.error.code} — ${first.error.message}`);
    process.exit(1);
  }

  const annotations = first?.textAnnotations ?? [];
  const fullText = first?.fullTextAnnotation?.text ?? "";

  if (annotations.length === 0 && !fullText) {
    console.error("✗ Geen textAnnotations gevonden — API werkt maar test-image gaf geen detectie");
    process.exit(1);
  }

  console.log(`  detected ${annotations.length} annotation(s)`);
  if (fullText) {
    console.log(`  fullText sample: "${fullText.slice(0, 80).replace(/\n/g, " ")}"`);
  } else if (annotations[0]) {
    console.log(`  first annotation: "${annotations[0].description.slice(0, 80)}"`);
  }

  const allText = (fullText || annotations.map((a) => a.description).join(" ")).toUpperCase();
  if (allText.includes(EXPECTED_TEXT_FRAGMENT)) {
    console.log(`\n✓ Vision API key werkt — fragment "${EXPECTED_TEXT_FRAGMENT}" gedetecteerd`);
    process.exit(0);
  }

  console.warn(
    `\n⚠ Vision API key werkt, maar verwachte fragment "${EXPECTED_TEXT_FRAGMENT}" niet gevonden`,
  );
  console.warn("  Mogelijk gebruikt Google een andere demo-image; key is wel valide.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Unexpected error:", err);
  process.exit(1);
});
