import {asAtom, Component, Components, ConcatCaptures, node, Optional, RegexComponent, sequence, toNode, CapturesOf} from "./node";

export interface Quantifier<Captures extends unknown[]> extends RegexComponent<Captures> {
    reluctant(): RegexComponent<Captures>
}

export type RepeatOptions =
    | {count: number, min?: never, max?: never}
    | {count?: never, min?: number, max?: number}

// Captures stay required only when at least one repetition is guaranteed at the type level.
type IsPositive<N> = N extends 0 ? false : number extends N ? false : true
type MinOf<O> = O extends {count: infer N} ? N : O extends {min: infer M} ? M : 0
type RepeatCaptures<O, Captures extends unknown[]> = IsPositive<MinOf<O>> extends true ? Captures : Optional<Captures>

const quantify = <Captures extends unknown[]>(quantifier: string, components: Component[]): Quantifier<Captures> => {
    const inner = sequence(components)
    const source = asAtom(inner) + quantifier
    return {
        ...node<Captures>(source, 'sequence', inner.captures),
        reluctant: () => node<Captures>(source + '?', 'sequence', inner.captures),
    }
}

const checkBound = (bound: number) => {
    if (!Number.isInteger(bound) || bound < 0) {
        throw new RangeError(`Repeat bounds must be non-negative integers, got ${bound}`)
    }
}

const repeatRange = (options: RepeatOptions) => {
    if (options.count !== undefined) {
        checkBound(options.count)
        return `{${options.count}}`
    }
    const {min = 0, max} = options
    checkBound(min)
    if (max === undefined) return `{${min},}`
    checkBound(max)
    if (max < min) throw new RangeError(`Repeat max (${max}) is smaller than min (${min})`)

    return `{${min},${max}}`
}

export const One = <C extends Component>(component: C) => toNode(component) as RegexComponent<CapturesOf<C>>

export const Optionally = <Cs extends Components>(...components: Cs) =>
    quantify<Optional<ConcatCaptures<Cs>>>('?', components)

export const ZeroOrMore = <Cs extends Components>(...components: Cs) =>
    quantify<Optional<ConcatCaptures<Cs>>>('*', components)

export const OneOrMore = <Cs extends Components>(...components: Cs) =>
    quantify<ConcatCaptures<Cs>>('+', components)

export const Repeat = <const O extends RepeatOptions, Cs extends Components>(options: O, ...components: Cs) =>
    quantify<RepeatCaptures<O, ConcatCaptures<Cs>>>(repeatRange(options), components)
