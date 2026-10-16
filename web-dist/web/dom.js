/** Tiny DOM helpers — no framework, everything is plain elements. */
export function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === true)
            node.setAttribute(k, "");
        else if (v !== false)
            node.setAttribute(k, String(v));
    }
    add(node, ...children);
    return node;
}
export function add(parent, ...children) {
    for (const c of children) {
        if (typeof c === "string")
            parent.appendChild(document.createTextNode(c));
        else
            parent.appendChild(c);
    }
}
export function clear(node) {
    while (node.firstChild)
        node.removeChild(node.firstChild);
}
export function on(node, type, fn) {
    node.addEventListener(type, fn);
}
export function cls(node, ...names) {
    names.forEach((n) => {
        if (typeof n === "string" && n)
            node.classList.toggle(n, true);
    });
}
//# sourceMappingURL=dom.js.map