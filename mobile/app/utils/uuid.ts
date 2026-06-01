/**
 * UUID v4 generator that uses the `crypto.getRandomValues` polyfill
 * (provided by `react-native-get-random-values`, imported at app entry).
 *
 * Used to give locally-created rows a stable id BEFORE they hit Supabase.
 * If the network response is lost and the sync queue retries the insert,
 * the server's primary-key uniqueness rejects the duplicate — making the
 * write idempotent without any schema change.
 */
export function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set the version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}
