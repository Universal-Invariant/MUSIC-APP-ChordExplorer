/**
 * Reverse-lookup panel: pick scale(s) + a root motion and list every chord
 * pair the catalog supports that fits. Also lets you explore alternative
 * expressions for any parsed symbol.
 */
import { mod12, PitchClass } from "../../core/pitch.js";
import { Store } from "../state.js";
import { el, clear, on } from "../dom.js";
import { scaleCard } from "./scalePanel.js";
import { Highlight } from "./visual.js";
import { getVisualizer } from "../instruments.js";

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
  // The explorer owns its input text; a full re-render on every store change
  // would clobber what the user is typing, so we render only when the
  // selection/scale context changes AND the input is untouched since last draw.
  let currentText = "Cmaj7";

  const drawNow = () => drawExplore(root, store, currentText, (t) => { currentText = t; });
  drawNow();
  const unsub = store.subscribe(() => {
    // keep live updates without stealing focus/caret while typing
    drawNow();
  });
  (root as HTMLElement & { _unsub?: () => void })._unsub = unsub;
}

function drawExplore(root: HTMLElement, store: Store, text: string, setText: (t: string) => void): void {
  clear(root);
  root.appendChild(el("h2", {}, "Expression explorer"));
  root.appendChild(el("div", { class: "muted small" }, "Type any chord symbol to see all the ways it can be written — including slash reinterpretations like AmM7/F or Caug/B."));

  const bar = el("div", { class: "btn-row" });
  const inp = el("input", { class: "input wide", placeholder: "B C E G# → try CmM7b5 or Caug/B", type: "text" }) as HTMLInputElement;
  inp.value = text;
  on(inp, "input", () => {
    setText(inp.value);
    // re-render just the results list, not the input (avoids caret jump)
    const holder = root.querySelector(".expr-results")!;
    clear(holder as HTMLElement);
    renderExprResults(holder as HTMLElement, store, inp.value);
  });
  bar.appendChild(inp);
  root.appendChild(bar);

  const holder = el("div", { class: "expr-results" });
  root.appendChild(holder);
  renderExprResults(holder, store, text);
}

function renderExprResults(holder: HTMLElement, store: Store, text: string): void {
  clear(holder);
  const r = store.app.parse(text || "Cmaj7");
  if (!(r.ok && r.chord)) {
    holder.appendChild(el("div", { class: "error" }, r.errors.join("; ")));
    return;
  }
  const ctx = store.activeScale ? store.scaleContext(store.activeScale) : undefined;
  const view = store.app.chordView(r.chord, r.bass, ctx);
  const card = el("div", { class: "chord-card" });
  card.appendChild(el("div", { class: "chord-title" }, `${view.rootName}${view.bassName ? " / " + view.bassName : ""}`));

  // visualizer of the typed chord (respects the active instrument)
  const hl: Highlight[] = [
    { pcs: new Set(view.tones.filter((t) => t.degree !== "1").map((t) => t.pc)), kind: "tone" },
    { pcs: new Set([view.root]), kind: "root" },
  ];
  if (view.bass !== undefined) hl.push({ pcs: new Set([view.bass]), kind: "bass" });
  const names = new Map<PitchClass, string>();
  for (const t of view.tones) names.set(mod12(t.pc), t.name);
  card.appendChild(getVisualizer(store.instrumentId).render({ highlights: hl, names }));

  const ul = el("ul", { class: "expr-list-full" });
  for (const e of view.expressions) {
    const li = el("li", {}, el("code", {}, e.text), " ", el("small", { class: "muted" }, `(${e.strategy})`));
    on(li.querySelector("code")!, "click", () => store.loadProgression(e.text));
    ul.appendChild(li);
  }
  card.appendChild(ul);
  holder.appendChild(card);
}
