export function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  //crypto.randomUUID is only available in secure contexts according to MDN docs. Fall back to an inline version when normal version not available.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
