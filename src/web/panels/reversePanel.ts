/**
 * Reverse-lookup panel: pick scale(s) + a root motion and list every chord
 * pair the catalog supports that fits. Also lets you explore alternative
 * expressions for any parsed symbol.
 */
import { mod12 } from "../../core/pitch.js";
import { Store } from "../state.js";
import { el, clear, on } from "../dom.js";
import { scaleCard } from "./scalePanel.js";

const MOTION_NAMES = ["P1", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7"];

export function mountReversePanel(root: HTMLElement, store: Store): void {
  const render = () => draw(root, store);
  render();
  store.subscribe(render);
}

function draw(root: HTMLElement, store: Store): void {
  clear(root);
  root.appendChild(el("h2", {}, "Reverse lookup — chords for a scale & root motion"));

  if (!store.activeScale) {
    root.appendChild(el("div", { class: "muted" }, "Set an active scale in the Scale panel first (or use two scales via the second-scale selector below)."));
  }

  // motion selector
  const row = el("div", { class: "btn-row" });
  row.appendChild(el("label", {}, "Root motion "));
  const sel = el("select", { class: "input" }) as HTMLSelectElement;
  MOTION_NAMES.forEach((n, i) => {
    const o = el("option", { value: String(i) }, `+${i}st (${n})`) as HTMLOptionElement;
    if (store.reverseMotion === i) o.selected = true;
    sel.appendChild(o);
  });
  on(sel, "change", () => store.setReverseMotion(parseInt(sel.value, 10)));
  row.appendChild(sel);

  // optional second scale
  const defs = store.app.scales();
  row.appendChild(el("label", {}, "  Second scale (optional) "));
  const s2 = el("select", { class: "input" }) as HTMLSelectElement;
  const noneOpt = el("option", { value: "" }, "— none —") as HTMLOptionElement;
  s2.appendChild(noneOpt);
  for (const def of defs) s2.appendChild(el("option", { value: def.id }, `${def.name} (${def.abbr})`));
  row.appendChild(s2);
  root.appendChild(row);

  if (!store.activeScale) return;

  const scales = [store.activeScale];
  if (s2.value) {
    const def = defs.find((d) => d.id === s2.value);
    if (def) scales.push({ def, root: store.activeScale.root });
  }

  const matches = store.app.reverse(scales, store.reverseMotion);
  root.appendChild(el("div", { class: "muted small" }, `${matches.length} chord pairs found.`));
  root.appendChild(scaleCard(store.app.scaleView(store.activeScale), store));

  const list = el("div", { class: "rev-list" });
  for (const m of matches.slice(0, 80)) {
    const line = el("div", { class: "opt-row" });
    line.appendChild(el("code", {}, m.from.label));
    line.appendChild(el("span", { class: "muted" }, ` →(+${mod12(m.rootMotion)}st) `));
    line.appendChild(el("code", {}, m.to.label));
    line.appendChild(el("span", { class: "muted small" }, `  deg ${m.from.degree}→${m.to.degree}`));
    list.appendChild(line);
  }
  root.appendChild(list);
}

/* ------------------------------------------------------------------ */
/* Expression explorer                                                */
/* ------------------------------------------------------------------ */

export function mountExplorerPanel(root: HTMLElement, store: Store): void {
  const render = () => drawExplore(root, store);
  render();
  store.subscribe(render);
}

function drawExplore(root: HTMLElement, store: Store): void {
  clear(root);
  root.appendChild(el("h2", {}, "Expression explorer"));
  root.appendChild(el("div", { class: "muted small" }, "Type any chord symbol to see all the ways it can be written — including slash reinterpretations like AmM7/F or Caug/B."));

  const bar = el("div", { class: "btn-row" });
  const inp = el("input", { class: "input wide", placeholder: "B C E G# → try CmM7b5 or Caug/B", type: "text" }) as HTMLInputElement;
  bar.appendChild(inp);
  root.appendChild(bar);
  const selChord = store.selectionChord();
  inp.value = selChord ? (store.app.expressions(selChord)[0]?.text ?? "") : "";

  const r = store.app.parse(inp.value || "Cmaj7");
  if (r.ok && r.chord) {
    const view = store.app.chordView(r.chord, r.bass);
    const card = el("div", { class: "chord-card" });
    card.appendChild(el("div", { class: "chord-title" }, view.rootName));
    const ul = el("ul", { class: "expr-list-full" });
    for (const e of view.expressions) {
      const li = el("li", {}, el("code", {}, e.text), " ", el("small", { class: "muted" }, `(${e.strategy})`));
      on(li.querySelector("code")!, "click", () => store.loadProgression(e.text));
      ul.appendChild(li);
    }
    card.appendChild(ul);
    root.appendChild(card);
  } else {
    root.appendChild(el("div", { class: "error" }, r.errors.join("; ")));
  }
}
