export function replaceAll(html: string, map: Record<string, string>) {
  let out = html;
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  return out;
}
