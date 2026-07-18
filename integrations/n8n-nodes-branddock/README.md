# n8n-nodes-branddock

n8n community nodes for the [Branddock](https://branddock.app) public Brand API: generate, rewrite and score on-brand content from your workflows, and trigger workflows on Branddock events.

This package contains:

- **Branddock** (action node) — thin wrappers around the REST v1 endpoints:
  - Get Brand Context (`GET /api/v1/brand-context`, free)
  - Score Content (`POST /api/v1/score`, free F-VAL brand-fidelity score)
  - Generate Content (`POST /api/v1/generate`)
  - Rewrite Content (`POST /api/v1/rewrite`, ephemeral — nothing stored)
  - Generate Web Page (`POST /api/v1/webpage-generate`)
  - Start SEO Generation / Get SEO Status (`POST /api/v1/seo-generate`, `GET /api/v1/seo-status`)
  - Start Campaign Strategy / Get Strategy Status (`POST /api/v1/strategy-generate`, `GET /api/v1/strategy-status`)
  - Generate Video (`POST /api/v1/video-generate`)
- **Branddock Trigger** (trigger node) — receives Branddock outbound webhooks with optional HMAC signature verification. Supported events:
  - `content.published`
  - `fidelity.scored`
  - `fidelity.below_threshold`
  - `deliverable.generated`

Webhook payloads are **metadata-only** (IDs, scores, types — never content text). Use the Branddock action node with the delivered entity ID to fetch details.

## Installation

In n8n: **Settings → Community Nodes → Install** and enter `n8n-nodes-branddock`.

Or on a self-hosted instance:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-branddock
```

Building from this repo (the package is standalone — it is not part of the Branddock app build):

```bash
cd integrations/n8n-nodes-branddock
npm install
npm run build
```

## Credentials

1. In Branddock, go to **Settings → API & Connectors** and create an API key (`bd_live_…`). The key is shown only once.
2. In n8n, create **Branddock API** credentials with that key. The Base URL defaults to `https://app.branddock.app`.

The key is workspace-scoped: all operations run against the brand DNA of that workspace. Note that the public API surface must be enabled on the Branddock deployment (`PUBLIC_API_ENABLED`).

## Receiving webhooks

1. Add a **Branddock Trigger** node to a workflow and copy its production webhook URL.
2. In Branddock, register that URL as a webhook endpoint (Settings → API & Connectors → Webhooks) and pick the events. The URL must be public **https** — localhost/private addresses are rejected.
3. Copy the `whsec_…` secret (shown once) into the trigger node's **Webhook Secret** field so every delivery's `x-branddock-signature` header is verified.

Deliveries are signed with `x-branddock-signature: sha256=<hex>` — an HMAC-SHA256 over the raw request body with the endpoint secret. There are no retries in v1; delivery status per endpoint is visible in Branddock.

## Example recipes

### Validate every AI output before publishing

1. **Branddock Trigger** — subscribe to `fidelity.below_threshold`.
2. **Slack** — post "content `{{$json.data.entityId}}` scored {{$json.data.compositeScore}} — review before publishing" to your marketing channel.

### Generate a LinkedIn post from a form

1. **Form Trigger** — collect `objective` and `keyMessage`.
2. **Branddock → Generate Content** — content type `linkedin-post`, brief from the form fields.
3. **Branddock → Score Content** (optional) — score edited copy again before publishing.

### Long-form SEO article, polled to completion

1. **Branddock → Start SEO Generation** — primary keyword + funnel stage; returns `jobId`.
2. **Wait** — e.g. 2 minutes.
3. **Branddock → Get SEO Status** — loop until `status` is completed.

## Compatibility

Requires n8n with community-node support (Node.js >= 18.10). Built against the `n8n-workflow` node API (`n8nNodesApiVersion` 1).


## Build-noot (pre-publish)

Gebruik `npm install --ignore-scripts` op Node 24+ — de transitive native dependency `isolated-vm` van `n8n-workflow` compileert daar niet, en is voor de build niet nodig (n8n levert `n8n-workflow` runtime als peer). Daarna `npm run build`.
