// Minimal XML tree + serializer, enough for building DDEX messages.

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = XmlNode | null | undefined | false | "";

export interface XmlNode {
  name: string;
  attrs?: Attrs;
  text?: string;
  children?: Child[];
}

export function el(
  name: string,
  content?: string | number | Child[],
  attrs?: Attrs,
): XmlNode {
  if (Array.isArray(content)) return { name, attrs, children: content };
  return { name, attrs, text: content === undefined ? undefined : String(content) };
}

/** Element only if the value is present. */
export function opt(name: string, value: string | number | undefined | null, attrs?: Attrs) {
  return value === undefined || value === null || value === "" ? null : el(name, value, attrs);
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderAttrs(attrs?: Attrs): string {
  if (!attrs) return "";
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escape(String(v))}"`)
    .join("");
}

function render(node: XmlNode, depth: number, indent: string): string {
  const pad = indent.repeat(depth);
  const open = `${pad}<${node.name}${renderAttrs(node.attrs)}`;
  const children = (node.children ?? []).filter((c): c is XmlNode => Boolean(c));

  if (children.length > 0) {
    const inner = children.map((c) => render(c, depth + 1, indent)).join("\n");
    return `${open}>\n${inner}\n${pad}</${node.name}>`;
  }
  if (node.text !== undefined) return `${open}>${escape(node.text)}</${node.name}>`;
  return `${open}/>`;
}

export function serialize(root: XmlNode, indent = "  "): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${render(root, 0, indent)}\n`;
}
