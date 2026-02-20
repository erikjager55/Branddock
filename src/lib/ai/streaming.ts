// =============================================================
// Streaming Utilities (R0.8)
//
// Server:  createStreamingResponse(stream) → Response with SSE headers
// Client:  parseSSEStream(response)        → AsyncIterable<string>
// Helper:  streamToString(response)        → full string (fallback)
// =============================================================

/**
 * Wrap a ReadableStream in a Next.js-compatible Response with SSE headers.
 *
 * Usage in API route:
 *   const stream = await openaiClient.createStreamingCompletion(messages);
 *   return createStreamingResponse(stream);
 */
export function createStreamingResponse(
  stream: ReadableStream<Uint8Array>,
): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Parse an SSE response body into an async iterable of text chunks.
 *
 * Usage on client:
 *   const res = await fetch('/api/ai/chat', { method: 'POST', body });
 *   for await (const text of parseSSEStream(res)) {
 *     setOutput(prev => prev + text);
 *   }
 */
export async function* parseSSEStream(
  response: Response,
): AsyncIterable<string> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;

        try {
          const parsed = JSON.parse(payload) as { text?: string };
          if (parsed.text) yield parsed.text;
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Collect an entire SSE stream into a single string.
 * Useful as a non-streaming fallback or for testing.
 */
export async function streamToString(response: Response): Promise<string> {
  let result = '';
  for await (const chunk of parseSSEStream(response)) {
    result += chunk;
  }
  return result;
}
