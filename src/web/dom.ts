/** Tiny DOM helpers — no framework, everything is plain elements. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | number> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) node.setAttribute(k, "");
    else if (v !== false) node.setAttribute(k, String(v));
  }
  add(node, ...children);
  return node;
}

export function add(parent: Element, ...children: (Node | string)[]): void {
  for (const c of children) {
    if (typeof c === "string") parent.appendChild(document.createTextNode(c));
    else parent.appendChild(c);
  }
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function on<K extends keyof HTMLElementEventMap>(
  node: Element,
  type: K,
  fn: (ev: HTMLElementEventMap[K]) => void,
): void {
  node.addEventListener(type, fn as EventListener);
}

export function cls(node: Element, ...names: (string | boolean)[]): void {
  names.forEach((n) => {
    if (typeof n === "string" && n) node.classList.toggle(n, true);
  });
}
