/** WhatsApp template bodies use numbered placeholders: "Hi {{1}}, thanks for asking about {{2}}." */
const PLACEHOLDER = /\{\{(\d+)\}\}/g;

export type TemplateSegment = { kind: "text"; text: string } | { kind: "variable"; index: number };

/** Number of distinct variables a template needs (the highest placeholder number). */
export function templateVariableCount(body: string): number {
  let max = 0;
  for (const match of body.matchAll(PLACEHOLDER)) max = Math.max(max, Number(match[1]));
  return max;
}

/** Split a body into literal text and placeholders (0-based index), for previews that highlight variables. */
export function templateSegments(body: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let last = 0;
  for (const match of body.matchAll(PLACEHOLDER)) {
    const start = match.index;
    if (start > last) segments.push({ kind: "text", text: body.slice(last, start) });
    segments.push({ kind: "variable", index: Number(match[1]) - 1 });
    last = start + match[0].length;
  }
  if (last < body.length) segments.push({ kind: "text", text: body.slice(last) });
  return segments;
}

/** Fill {{n}} with variables[n - 1]. Missing values stay as the placeholder so nothing is silently dropped. */
export function renderTemplate(body: string, variables: readonly string[]): string {
  return body.replace(PLACEHOLDER, (placeholder, n: string) => {
    const value = variables[Number(n) - 1];
    return value === undefined || value === "" ? placeholder : value;
  });
}
