/**
 * Scale catalog. Plug-and-play: add a parent scale or a named mode anywhere in
 * these arrays and every downstream feature (harmonization, interpolation,
 * reverse lookup) picks it up automatically.
 */
import { mod12, rotateMode } from "../core/pitch.js";
import { makeSpelling } from "../theory/spelling.js";
const S = (letter, acc = 0) => makeSpelling(letter, acc);
/* ------------------------- parent scales ------------------------- */
export const PARENT_SCALES = [
    { id: "major", name: "Major (Ionian family)", abbr: "Major",
        steps: [2, 2, 1, 2, 2, 2, 1],
        degrees: [S("C"), S("D"), S("E"), S("F"), S("G"), S("A"), S("B")] },
    { id: "harmonicMinor", name: "Harmonic minor", abbr: "hm",
        steps: [2, 1, 2, 2, 1, 3, 2],
        degrees: [S("C"), S("D"), S("Eb"), S("F"), S("G"), S("Ab"), S("B")] },
    { id: "melodicMinor", name: "Melodic minor", abbr: "mm",
        steps: [2, 1, 2, 2, 2, 2, 1],
        degrees: [S("C"), S("D"), S("Eb"), S("F"), S("G"), S("A"), S("B")] },
    { id: "harmonicMajor", name: "Harmonic major", abbr: "HM",
        steps: [2, 2, 1, 2, 1, 3, 1],
        degrees: [S("C"), S("D"), S("E"), S("F"), S("G"), S("Ab"), S("B")] },
    { id: "wholeTone", name: "Whole-tone", abbr: "WT",
        steps: [2, 2, 2, 2, 2, 2],
        degrees: [S("C"), S("D"), S("E"), S("F#"), S("G#"), S("Bb")] },
    { id: "halfWhole", name: "Half-whole diminished", abbr: "HW",
        steps: [1, 2, 1, 2, 1, 2, 1, 2],
        degrees: [S("C"), S("Db"), S("Eb"), S("E"), S("F#"), S("G"), S("A"), S("Bb")] },
    { id: "doubleHarmonic", name: "Double harmonic (Byzantine)", abbr: "DH",
        steps: [1, 3, 1, 2, 1, 3, 1],
        degrees: [S("C"), S("Db"), S("E"), S("F"), S("G"), S("Ab"), S("B")] },
    { id: "hungarianMinor", name: "Hungarian minor", abbr: "Hun",
        steps: [2, 1, 3, 1, 1, 3, 1],
        degrees: [S("C"), S("D"), S("Eb"), S("F#"), S("G"), S("Ab"), S("B")] },
];
export const MODE_TABLE = [
    // --- Major modes ---
    ["major", 1, "ionian", "Ionian", "Ion"],
    ["major", 2, "dorian", "Dorian", "Dor"],
    ["major", 3, "phrygian", "Phrygian", "Phr"],
    ["major", 4, "lydian", "Lydian", "Lyd"],
    ["major", 5, "mixolydian", "Mixolydian", "Mix"],
    ["major", 6, "aeolian", "Aeolian", "Aeo"],
    ["major", 7, "locrian", "Locrian", "Loc"],
    // --- Harmonic minor modes ---
    ["harmonicMinor", 1, "hm", "Harmonic minor", "hm", "mode 1 of harmonic minor"],
    ["harmonicMinor", 2, "locNat6", "Locrian natural 6", "loc6", "mode 2 of harmonic minor"],
    ["harmonicMinor", 3, "ionSharp5", "Ionian #5", "ion#5", "mode 3 of harmonic minor"],
    ["harmonicMinor", 4, "dorSharp4", "Dorian #4", "dor#4", "mode 4 of harmonic minor"],
    ["harmonicMinor", 5, "phrygianDominant", "Phrygian dominant", "phrydom", "mode 5 of harmonic minor"],
    ["harmonicMinor", 6, "lydianSharp9", "Lydian #9", "lyd#9", "mode 6 of harmonic minor"],
    ["harmonicMinor", 7, "ultralocrian", "Ultralocrian (Super Locrian bb7)", "ult", "mode 7 of harmonic minor"],
    // --- Melodic minor modes ---
    ["melodicMinor", 1, "mm", "Melodic minor", "mm", "mode 1 of melodic minor"],
    ["melodicMinor", 2, "phrygianNat6", "Phrygian natural 6 / Dorian b2", "phr6", "mode 2 of melodic minor"],
    ["melodicMinor", 3, "lydianAugmented", "Lydian augmented", "lydaug", "mode 3 of melodic minor"],
    ["melodicMinor", 4, "lydianDominant", "Lydian dominant", "lyddom", "mode 4 of melodic minor"],
    ["melodicMinor", 5, "mixolydianB6", "Mixolydian b6", "mixb6", "mode 5 of melodic minor"],
    ["melodicMinor", 6, "locrianNat2", "Locrian natural 2", "loc2", "mode 6 of melodic minor"],
    ["melodicMinor", 7, "altered", "Altered (Super Locrian)", "alt", "mode 7 of melodic minor"],
    // --- Harmonic major modes ---
    ["harmonicMajor", 1, "ionianB6", "Ionian b6", "ionb6", "mode 1 of harmonic major"],
    ["harmonicMajor", 2, "dorianB5", "Dorian b5", "dorb5", "mode 2 of harmonic major"],
    ["harmonicMajor", 3, "phrygianB4", "Phrygian b4", "phrb4", "mode 3 of harmonic major"],
    ["harmonicMajor", 4, "lydianB3", "Lydian b3", "lydb3", "mode 4 of harmonic major"],
    ["harmonicMajor", 5, "mixolydianB2", "Mixolydian b2", "mixb2", "mode 5 of harmonic major"],
    ["harmonicMajor", 6, "lydianAugSharp2", "Lydian augmented #2", "lydaug#2", "mode 6 of harmonic major"],
    ["harmonicMajor", 7, "locrianBB7", "Locrian bb7", "locbb7", "mode 7 of harmonic major"],
    // --- Symmetric ---
    ["wholeTone", 1, "wholeToneMode", "Whole-tone", "WT", "symmetric: all rotations identical"],
    ["halfWhole", 1, "halfWholeMode", "Half-whole diminished", "HW", "symmetric: rotations repeat"],
].map(([parent, degree, id, name, abbr, note]) => ({
    parent: parent, degree: degree, id: id,
    name: name, abbr: abbr, note: note,
}));
/* ------------------------- extra standalone scales ------------------------- */
export const EXTRA_SCALES = [
    { id: "acoustic", name: "Acoustic (Lydian dominant, Loosemore)", abbr: "acoust",
        steps: [2, 2, 2, 1, 2, 1, 2], degrees: [S("C"), S("D"), S("E"), S("F#"), S("G"), S("A"), S("Bb")] },
    { id: "neapolitanMajor", name: "Neapolitan major", abbr: "neopMaj",
        steps: [1, 2, 2, 2, 2, 2, 1], degrees: [S("C"), S("Db"), S("Eb"), S("F"), S("G"), S("A"), S("B")] },
    { id: "neapolitanMinor", name: "Neapolitan minor", abbr: "neopMin",
        steps: [1, 2, 2, 2, 1, 3, 1], degrees: [S("C"), S("Db"), S("Eb"), S("F"), S("G"), S("Ab"), S("B")] },
    { id: "ukrainianDorian", name: "Ukrainian Dorian (Romanian minor)", abbr: "ukrDor",
        steps: [2, 1, 3, 1, 2, 1, 2], degrees: [S("C"), S("D"), S("Eb"), S("F#"), S("G"), S("A"), S("Bb")] },
    { id: "doubleHarmonicMajor", name: "Persian (double harmonic major)", abbr: "persian",
        steps: [1, 3, 1, 2, 1, 3, 1], degrees: [S("C"), S("Db"), S("E"), S("F"), S("G"), S("Ab"), S("B")] },
    { id: "enigmatic", name: "Enigmatic (Verdi)", abbr: "enig",
        steps: [1, 3, 2, 2, 2, 1, 1], degrees: [S("C"), S("Db"), S("E"), S("F#"), S("G#"), S("A#"), S("B")] },
    { id: "wholeHalf", name: "Whole-half diminished", abbr: "WH",
        steps: [2, 1, 2, 1, 2, 1, 2, 1], degrees: [S("C"), S("D"), S("Eb"), S("F"), S("Gb"), S("Ab"), S("A"), S("B")] },
    { id: "augmented", name: "Augmented (hex)", abbr: "aug6",
        steps: [3, 1, 3, 1, 3, 1], degrees: [S("C"), S("Eb"), S("E"), S("G"), S("Ab"), S("B")] },
    { id: "lydianDiminished", name: "Lydian diminished", abbr: "lydDim",
        steps: [2, 1, 3, 1, 2, 2, 1], degrees: [S("C"), S("D"), S("Eb"), S("F#"), S("G"), S("A"), S("B")] },
    { id: "majorPent", name: "Major pentatonic", abbr: "majPent",
        steps: [2, 2, 3, 2, 3], degrees: [S("C"), S("D"), S("E"), S("G"), S("A")] },
    { id: "minorPent", name: "Minor pentatonic", abbr: "minPent",
        steps: [3, 2, 2, 3, 2], degrees: [S("C"), S("Eb"), S("F"), S("G"), S("Bb")] },
    { id: "blues", name: "Blues", abbr: "blues",
        steps: [3, 2, 1, 1, 3, 2], degrees: [S("C"), S("Eb"), S("F"), S("Gb"), S("G"), S("Bb")] },
    { id: "bebopDominant", name: "Bebop dominant", abbr: "bebDom",
        steps: [2, 2, 1, 2, 2, 1, 1, 1], degrees: [S("C"), S("D"), S("E"), S("F"), S("G"), S("A"), S("Bb"), S("B")] },
    { id: "bebopMajor", name: "Bebop major", abbr: "bebMaj",
        steps: [2, 2, 1, 2, 1, 2, 1, 1], degrees: [S("C"), S("D"), S("E"), S("F"), S("G"), S("Ab"), S("A"), S("B")] },
];
/* ------------------------- assembly ------------------------- */
function buildModeDef(parent, entry) {
    const steps = rotateMode(parent.steps, entry.degree - 1);
    // spelled degrees: rotate the parent's degree spellings so they stay a legal
    // letter sequence (7th on top when wrapping)
    let degrees;
    if (parent.degrees && parent.degrees.length === parent.steps.length) {
        const n = parent.degrees.length;
        const k = entry.degree - 1;
        const rotated = [...parent.degrees.slice(k), ...parent.degrees.slice(0, k)];
        degrees = rotated.map((d, i) => i < n - k ? d : { letter: d.letter, accidental: d.accidental + 1 });
    }
    return {
        id: entry.id,
        name: entry.name,
        abbr: entry.abbr,
        steps,
        degrees,
        note: entry.note ?? `mode ${entry.degree} of ${parent.name}`,
    };
}
/** Semitone offset from parent root to the tonic of mode `degree` (1-based). */
export function modeOffset(parentSteps, degree) {
    let acc = 0;
    for (let i = 0; i < degree - 1; i++)
        acc += parentSteps[i];
    return mod12(acc);
}
/** All scale definitions known to the app, keyed by id. */
export function buildScaleCatalog() {
    const map = new Map();
    for (const p of PARENT_SCALES) {
        map.set(p.id, { id: p.id, name: p.name, abbr: p.abbr, steps: p.steps, degrees: p.degrees });
    }
    for (const m of MODE_TABLE) {
        const parent = PARENT_SCALES.find((p) => p.id === m.parent);
        if (!parent)
            continue;
        if (!map.has(m.id))
            map.set(m.id, buildModeDef(parent, m));
    }
    for (const e of EXTRA_SCALES)
        if (!map.has(e.id))
            map.set(e.id, e);
    return map;
}
export const SCALE_CATALOG = buildScaleCatalog();
/** Lookup helper tolerant of aliases/abbreviations. */
export function findScale(idOrAbbr) {
    const key = idOrAbbr.trim();
    return (SCALE_CATALOG.get(key) ??
        [...SCALE_CATALOG.values()].find((s) => s.abbr === key || s.name.toLowerCase() === key.toLowerCase()));
}
/** Transpose root helper re-exported for convenience. */
export function rootOf(rootName) { return mod12(rootName); }
//# sourceMappingURL=scales.js.map