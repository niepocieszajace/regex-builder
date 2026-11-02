import {CaptureSlot, Component, ConcatCaptures, sequence} from "./node";
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
    slots.forEach((slot, i) => {
        if (!slot) return
        const raw = result[i + 1]
        const value = raw !== undefined && slot.transform ? slot.transform(raw) : raw
        output.push(value)
        if (slot.name) references.set(slot.name, value)
    })

    return {
        output: output as Output,
        range: {start: result.index, end: result.index + result[0].length},
        get: <T>(reference: Reference<T>) => {
            if (!references.has(reference.name)) throw new Error(`Reference ${reference.name} isn't captured by this regex`)
            return references.get(reference.name) as T | undefined
        },
    }
}

class RegexImpl<Output extends unknown[]> {
    readonly #regExp: RegExp
    readonly #slots: readonly CaptureSlot[]

    constructor(readonly source: string, readonly flags: string, slots: readonly CaptureSlot[]) {
        // Compile once up front so an invalid embedded RegExp fails at build time.
        this.#regExp = new RegExp(source, flags)
        this.#slots = slots
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
        return toMatch(this.#regExp.exec(input), this.#slots)
    }

    wholeMatch(input: string): Match<Output> | null {
        // Sticky + end-of-subject lookahead lets the engine backtrack until the match spans the input.
        return toMatch(new RegExp(`(?:${this.source})(?![\\s\\S])`, this.flags + 'y').exec(input), this.#slots)
    }

    matches(input: string): Match<Output>[] {
        return Array.from(input.matchAll(new RegExp(this.source, this.flags + 'g')), result => toMatch<Output>(result, this.#slots)!)
    }

    toRegExp(): RegExp {
        return new RegExp(this.#regExp)
    }

    #withFlag(flag: string, enabled: boolean): RegexImpl<Output> {
        if (this.flags.includes(flag) === enabled) return this

        return new RegexImpl(this.source, enabled ? this.flags + flag : this.flags.replace(flag, ''), this.#slots)
    }
}

export type Regex<Output extends unknown[] = unknown[]> = RegexImpl<Output>

export const Regex = <Cs extends Component[]>(...components: Cs): Regex<[string, ...ConcatCaptures<Cs>]> => {
    const {source, captures} = sequence(components)
    return new RegexImpl(source, 'u', captures)
}
