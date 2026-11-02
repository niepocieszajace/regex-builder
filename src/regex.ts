import {CaptureSlot, capturesType, Component, ConcatCaptures, sequence} from "./node";
import {Reference} from "./groups";

export interface Match<Output extends unknown[] = unknown[]> {
    // [whole match, ...captures], like Swift's match.output
    output: Output
    range: {start: number, end: number}
    get<T>(reference: Reference<T>): T | undefined
}

const toMatch = <Output extends unknown[]>(result: RegExpExecArray | null, slots: readonly CaptureSlot[]): Match<Output> | null => {
    if (!result) return null

    const output: unknown[] = [result[0]]
    const references = new Map<string, unknown>()
    for (const [i, slot] of slots.entries()) {
        if (!slot) continue
        const raw = result[i + 1]
        const value = raw !== undefined && slot.transform ? slot.transform(raw) : raw
        if (raw !== undefined && slot.rejectsNullish && value == null) return null
        output.push(value)
        if (slot.name) references.set(slot.name, value)
    }

    return {
        output: output as Output,
        range: {start: result.index, end: result.index + result[0].length},
        get: <T>(reference: Reference<T>) => {
            if (!references.has(reference.name)) throw new Error(`Reference ${reference.name} isn't captured by this regex`)
            return references.get(reference.name) as T | undefined
        },
    }
}

// Steps over a whole surrogate pair, the u flag never matches inside one.
const nextIndex = (input: string, index: number) => index + ((input.codePointAt(index) ?? 0) > 0xffff ? 2 : 1)

class RegexImpl<Output extends unknown[]> {
    readonly #regExp: RegExp
    // Type only: lets a Regex nest inside another one with its capture types.
    declare readonly [capturesType]?: Output extends [string, ...infer Captures] ? Captures : unknown[]

    constructor(readonly source: string, readonly flags: string, readonly captures: readonly CaptureSlot[]) {
        // Compile once up front so an invalid embedded RegExp fails at build time.
        this.#regExp = new RegExp(source, flags)
    }

    ignoresCase(enabled = true) {
        return this.#withFlag('i', enabled)
    }

    anchorsMatchLineEndings(enabled = true) {
        return this.#withFlag('m', enabled)
    }

    dotMatchesNewlines(enabled = true) {
        return this.#withFlag('s', enabled)
    }

    firstMatch(input: string): Match<Output> | null {
        return this.#find(new RegExp(this.source, this.flags + 'g'), input, 0)
    }

    wholeMatch(input: string): Match<Output> | null {
        // Sticky + end-of-subject lookahead lets the engine backtrack until the match spans the input.
        return toMatch(new RegExp(`(?:${this.source})(?![\\s\\S])`, this.flags + 'y').exec(input), this.captures)
    }

    matches(input: string): Match<Output>[] {
        const regExp = new RegExp(this.source, this.flags + 'g')
        const found: Match<Output>[] = []
        for (let match = this.#find(regExp, input, 0); match; ) {
            found.push(match)
            const {start, end} = match.range
            match = this.#find(regExp, input, end === start ? nextIndex(input, end) : end)
        }
        return found
    }

    toRegExp(): RegExp {
        return new RegExp(this.#regExp)
    }

    // shortcut: a match rejected by TryCapture restarts the search one character later, while Swift
    // would also backtrack into other alternatives at the same position; matching that needs an own engine.
    #find(regExp: RegExp, input: string, from: number): Match<Output> | null {
        for (let index = from; index <= input.length; ) {
            regExp.lastIndex = index
            const result = regExp.exec(input)
            if (!result) return null
            const match = toMatch<Output>(result, this.captures)
            if (match) return match
            index = nextIndex(input, result.index)
        }
        return null
    }

    #withFlag(flag: string, enabled: boolean): RegexImpl<Output> {
        if (this.flags.includes(flag) === enabled) return this

        return new RegexImpl(this.source, enabled ? this.flags + flag : this.flags.replace(flag, ''), this.captures)
    }
}

export type Regex<Output extends unknown[] = unknown[]> = RegexImpl<Output>

export const Regex = <Cs extends Component[]>(...components: Cs): Regex<[string, ...ConcatCaptures<Cs>]> => {
    const {source, captures} = sequence(components)
    return new RegexImpl(source, 'u', captures)
}
