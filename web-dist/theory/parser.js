/**
 * Symbol parser: text -> Chord. Handles "AmM7", "Fmaj7#9#11", "Gm7/C",
 * "Cadd9/E", "B7b9", "Csus4", unicode accidentals, etc.
 */
import { mod12 } from "../core/pitch.js";
import { parseDegreeToken } from "../theory/intervals.js";
import { parseSpelling, spellingPC } from "../theory/spelling.js";
import { makeChord } from "../theory/chord.js";
const ACC_RUN = "(?:#|b|x|\u266F|\u266D|bb)*";
/** Sort helper: longest alias first so "maj7" wins over "m". */
function aliasesSorted(entries) {
    const out = [];
    for (const e of entries)
        for (const a of e.aliases)
            if (a !== "")
                out.push({ alias: a, entry: e });
    return out.sort((p, q) => q.alias.length - p.alias.length || p.alias.localeCompare(q.alias));
}
/** Rebuild the alias index whenever the formula registry changes. */
let aliasSource = null;
let aliasIndex = null;
function getAliasIndex(entries) {
    if (!aliasIndex || aliasSource !== entries) {
        aliasSource = entries;
        aliasIndex = aliasesSorted(entries);
    }
    return aliasIndex;
}
export function parseChordSymbol(text, formulaEntries) {
    const errors = [];
    const input = text.trim();
    if (!input)
        return { ok: false, errors: ["empty input"] };
    // split off slash bass (only the last slash that is not inside "6/9")
    let mainText = input;
    let bassText;
    const slashIdx = input.lastIndexOf("/");
    if (slashIdx > 0 && !/6\/9$/i.test(input)) {
        mainText = input.slice(0, slashIdx).trim();
        bassText = input.slice(slashIdx + 1).trim();
    }
    if (/6\/9$/i.test(input))
        mainText = input; // treat 6/9 as one formula alias
    const rootMatch = /^([A-Ga-g])\s*(#|b|x|\u266F|\u266D)?/.exec(mainText);
    if (!rootMatch)
        return { ok: false, errors: [`cannot find root note in "${mainText}"`] };
    const rootSpelling = parseSpelling(rootMatch[1] + (rootMatch[2] ?? ""));
    if (!rootSpelling)
        return { ok: false, errors: [`bad root "${rootMatch[0]}"`] };
    const root = spellingPC(rootSpelling);
    const rest = mainText.slice(rootMatch[0].length).trim();
    // match quality suffix against the alias index
    const index = getAliasIndex(formulaEntries);
    let matched;
    let leftover = rest;
    for (const { alias, entry } of index) {
        if (alias === "")
            continue;
        if (rest.toLowerCase().startsWith(alias.toLowerCase())) {
            matched = entry;
            leftover = rest.slice(alias.length).trim();
            break;
        }
    }
    if (!matched && rest === "") {
        matched = formulaEntries.find((f) => f.id === "maj");
    }
    const degreeTokens = [];
    if (matched)
        degreeTokens.push(...matched.degrees);
    // parse any trailing explicit alterations like "maj7#9#11", "m7add11", "7b9(#5)"
    if (leftover) {
        let s = leftover.replace(/\s+/g, "");
        // strip common connective words
        s = s.replace(/add(?!9\s*b)/gi, "").replace(/with/gi, "").replace(/[()]/g, "");
        const tokens = s.match(new RegExp(`(${ACC_RUN}\\d{1,2})`, "g")) ?? [];
        for (const t of tokens) {
            if (!parseDegreeToken(t)) {
                errors.push(`unparsable degree "${t}"`);
                continue;
            }
            const semis = parseDegreeToken(t).semitones;
            const exists = degreeTokens.some((d) => {
                const spec = parseDegreeToken(d);
                return spec && mod12(spec.semitones) === mod12(semis);
            });
            if (!exists)
                degreeTokens.push(t);
        }
        if (tokens.length === 0 && s.length > 0)
            errors.push(`ignored trailing text "${leftover}"`);
    }
    const chord = makeChord(root, degreeTokens, input);
    let bass;
    if (bassText !== undefined) {
        const bs = parseSpelling(bassText);
        if (!bs)
            errors.push(`bad bass note "${bassText}"`);
        else
            bass = spellingPC(bs);
    }
    return { ok: errors.length === 0, chord, bass, formula: matched, errors };
}
/** Convenience: parse just a note name to a pitch class. */
export function parseNote(text) {
    const s = parseSpelling(text);
    return s ? spellingPC(s) : null;
}
//# sourceMappingURL=parser.js.map