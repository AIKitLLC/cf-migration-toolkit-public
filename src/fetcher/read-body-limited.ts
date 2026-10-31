import { MAX_BODY_BYTES } from './limits.js';

export async function readBodyLimited(response: Response, limit = MAX_BODY_BYTES): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
  }
  await reader.cancel();
  const merged = concat(chunks);
  const sliced = merged.byteLength > limit ? merged.subarray(0, limit) : merged;
  return new TextDecoder('utf-8', { fatal: false }).decode(sliced);
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}
