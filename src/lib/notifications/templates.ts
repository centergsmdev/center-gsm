import { TEMPLATE_PLACEHOLDERS } from "./constants";
export function extractTemplateVariables(...templates: string[]): string[] {
  const found = new Set<string>();
  for (const template of templates) {
    for (const match of template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g))
      if (match[1]) found.add(match[1]);
  }
  return [...found];
}
export function placeholderToken(name: string) {
  return `{{${name}}}`;
}
export { TEMPLATE_PLACEHOLDERS };
