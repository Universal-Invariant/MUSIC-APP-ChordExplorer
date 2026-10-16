/**
 * Shared visual renderers for pitch content: a piano-keyboard strip and a
 * fretboard-style dot grid. Both are pure functions of (pitch-class set,
 * highlight sets) so any panel can drop them in — plug-and-play display.
 */
import { mod12 } from "../../core/pitch.js";
import { PC_NAMES_SHARP } from "../../core/pitch.js";
import { el, on } from "../dom.js";
const WHITE_OCTAVES = 2; // two octaves + top C
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
const WHITE_ORDER = [0, 2, 4, 5, 7, 9, 11];
/** Names override lets callers pass context-aware spellings. */
export function keyboardStrip(highlights, opts = {}) {
    const wrap = el("div", { class: "kbd" });
    const start = opts.octaveStart ?? 0;
    const whites = [];
    const nameOf = (pc) => opts.names?.get(pc) ?? PC_NAMES_SHARP[pc];
    // white keys
    const whiteRow = el("div", { class: "kbd-whites" });
    for (let o = 0; o < WHITE_OCTAVES; o++) {
        for (const w of WHITE_ORDER) {
            const pc = mod12(start + w);
            const key = el("button", { class: `key white ${hlClass(pc, highlights)}`, "data-pc": String(w), type: "button" }, nameOf(pc));
            wire(key, pc, opts);
            whites.push(key);
            whiteRow.appendChild(key);
        }
    }
    const lastPc = mod12(start + 0);
    whites.push(el("button", { class: `key white ${hlClass(lastPc, highlights)}`, "data-pc": "0", type: "button" }, nameOf(lastPc)));
    whiteRow.appendChild(whites[whites.length - 1]);
    wrap.appendChild(whiteRow);
    // black keys positioned absolutely over the gaps
    const blackRow = el("div", { class: "kbd-blacks" });
    let wi = 0;
    for (let o = 0; o < WHITE_OCTAVES; o++) {
        for (const w of WHITE_ORDER) {
            if (w !== 11 && BLACK_PCS.has(mod12(w + 1))) {
                const pc = mod12(start + w + 1);
                const gapPct = ((wi + 1) / (WHITE_OCTAVES * 7 + 1)) * 100;
                const key = el("button", { class: `key black ${hlClass(pc, highlights)}`, "data-pc": String(mod12(w + 1)), type: "button" }, "");
                key.style.left = `calc(${gapPct}% - 1.6%)`;
                wire(key, pc, opts);
                blackRow.appendChild(key);
            }
            wi++;
        }
    }
    wrap.appendChild(blackRow);
    return wrap;
}
/** Fretboard dots: rows = strings (high to low), columns = frets. */
export function fretGrid(tuning, // open-string pitch classes, high E first
frets, highlights, opts = {}) {
    const table = el("table", { class: "fret" });
    const head = el("tr", { class: "fret-head" }, el("th", {}, "open"));
    for (let f = 1; f <= frets; f++)
        head.appendChild(el("th", {}, String(f)));
    table.appendChild(head);
    for (const open of tuning) {
        const row = el("tr");
        row.appendChild(cellFor(mod12(open), highlights, opts));
        for (let f = 1; f <= frets; f++)
            row.appendChild(cellFor(mod12(open + f), highlights, opts));
        table.appendChild(row);
    }
    return table;
}
function cellFor(pc, highlights, opts) {
    const td = el("td", { class: hlClass(pc, highlights) });
    const dot = el("span", { class: "dot" }, opts.names?.get(pc) ?? "");
    td.appendChild(dot);
    if (opts.onClickPc)
        on(td, "click", (ev) => opts.onClickPc(pc, ev));
    return td;
}
function hlClass(pc, highlights) {
    const hit = highlights.find((h) => h.pcs.has(mod12(pc)));
    return hit ? `hl-${hit.kind}` : "";
}
function wire(node, pc, opts) {
    if (opts.onClickPc)
        on(node, "click", (ev) => opts.onClickPc(pc, ev));
}
//# sourceMappingURL=visual.js.map