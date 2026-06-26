export function extractJsonObject(raw: string) {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Model did not return JSON. Raw response: ${trimmed}`);
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}
