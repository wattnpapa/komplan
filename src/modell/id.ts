const ZEICHEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Zufällige ID aus 10 Zeichen. Nur innerhalb eines Plans eindeutig gebraucht. */
export function neueId(): string {
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += ZEICHEN[b % ZEICHEN.length];
  return id;
}
