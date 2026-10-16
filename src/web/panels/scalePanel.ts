/**
 * Scale panel: visualize a scale (degrees + keyboard) and BUILD chords from
 * it by toggling degrees on/off. The active scale also tints the chord
 * builder keyboard, so you can see which tones are diatonic while building.
 */
import { mod12, PitchClass } from "../../core/pitch.js";
import { ScaleView } from "../../analysis/api.js";
import { ScaleInstance } from "../../theory/scale.js";
import { Store } from "../state.js";
import { el, clear, on } from "../dom.js";
import { keyboardStrip, Highlight } from "./visual.js";

const NOTE_TO_PC: Record<string, PitchClass> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function mountScalePanel(root: HTMLElement, store: Store): void {
  const render = () => draw(root, store);
  render();
  store.subscribe(render);
}

function draw(root: HTMLElement, store: Store): void {
  clear(root);
  root.appendChild(el("h2", {}, "Scale view"));

  if (!store.activeScale) {
    root.appendChild(el("div", { class: "muted" }, "Pick a scale below or choose one from an interpolation result to explore and build chords from it."));
    root.appendChild(scalePicker(store, null));
    return;
  }

  const inst = store.activeScale;
  const view = store.app.scaleView(inst);
  root.appendChild(scaleCard(view, store, true));

  // degree toggle row for chord building
  const chosen = new Set<number>([1, 3, 5, 7]);
  const controls = el("div", { class: "deg-controls" });
  controls.appendChild(el("h3", {}, "Build a chord from these degrees"));
  const chipsRow = el("div", { class: "chips" });
  const updateChordBtn = el("button", { class: "btn primary", type: "button" }, "Load into chord builder");
  const refresh = () => {
    store.buildFromScaleDegrees([...chosen].sort((a, b) => a - b));
  };
  on(updateChordBtn, "click", refresh);
  for (const d of view.degrees) {
    const chip = el("button", { class: `chip deg-chip ${chosen.has(d.degree) ? "on" : ""}`, type: "button" }, `${d.label}`);
    on(chip, "click", () => {
      if (chosen.has(d.degree)) chosen.delete(d.degree);
      else chosen.add(d.degree);
      chip.classList.toggle("on", chosen.has(d.degree));
    });
    chipsRow.appendChild(chip);
  }
  controls.appendChild(chipsRow);
  controls.appendChild(updateChordBtn);
  root.appendChild(controls);

  // change root / pick another scale
  root.appendChild(scalePicker(store, inst));
}

/** Full visualization card for a scale instance: title, degree table, keyboard. */
export function scaleCard(view: ScaleView, store: Store, interactive = false): HTMLElement {
  const card = el("div", { class: "scale-card" });
  card.appendChild(el("div", { class: "scale-title" }, `${view.rootName} ${view.def.name}`, el("small", { class: "muted" }, ` [${view.def.abbr}]`)));
  if (view.def.note) card.appendChild(el("div", { class: "muted small" }, view.def.note));

  const table = el("table", { class: "deg-table" });
  const hr = el("tr");
  for (const d of view.degrees) hr.appendChild(el("th", {}, String(d.degree)));
  table.appendChild(hr);
  const rn = el("tr");
  for (const d of view.degrees) rn.appendChild(el("td", {}, d.name));
  table.appendChild(rn);
  const rl = el("tr");
  for (const d of view.degrees) rl.appendChild(el("td", { class: "muted" }, d.label.replace(String(d.degree), "").padEnd(1) || "♮"));
  table.appendChild(rl);
  card.appendChild(table);

  const hl: Highlight[] = [
    { pcs: new Set([view.root]), kind: "root" },
    { pcs: new Set(view.degrees.filter((d) => d.pc !== view.root).map((d) => d.pc)), kind: "scale" },
  ];
  const names = new Map<PitchClass, string>();
  for (const d of view.degrees) names.set(mod12(d.pc), d.name);
  card.appendChild(keyboardStrip(hl, { names }));

  if (interactive) {
    const btns = el("div", { class: "btn-row" });
    const useBtn = el("button", { class: "btn", type: "button" }, "Use as active scale");
    btns.appendChild(useBtn);
    card.appendChild(btns);
  }
  return card;
}

/** Root transposer + scale id picker bound to the store's active scale. */
function scalePicker(store: Store, current: ScaleInstance | null): HTMLElement {
  const box = el("div", { class: "scale-picker" });

  const defs = store.app.scales();
  const sel = el("select", { class: "input" }) as HTMLSelectElement;
  for (const def of defs) {
    const o = el("option", { value: def.id }, `${def.name} (${def.abbr})`) as HTMLOptionElement;
    if (current && current.def.id === def.id) o.selected = true;
    sel.appendChild(o);
  }

  const rootSel = el("select", { class: "input" }) as HTMLSelectElement;
  const rootNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  rootNames.forEach((n, i) => {
    const o = el("option", { value: String(i) }, n) as HTMLOptionElement;
    if (current && current.root === i) o.selected = true;
    rootSel.appendChild(o);
  });

  const apply = () => {
    const def = defs.find((d) => d.id === sel.value);
    if (!def) return;
    store.setActiveScale({ def, root: parseInt(rootSel.value, 10) });
  };
  on(sel, "change", apply);
  on(rootSel, "change", apply);

  box.appendChild(el("label", {}, "Scale "));
  box.appendChild(sel);
  box.appendChild(el("label", {}, " Root "));
  box.appendChild(rootSel);
  if (!current) {
    const init = el("button", { class: "btn", type: "button" }, "Set active scale");
    on(init, "click", apply);
    box.appendChild(init);
  }
  return box;
}

export { NOTE_TO_PC };
