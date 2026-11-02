import {
    CapturesOf, Component, Components, ConcatCaptures, isComponent, node, Optional, RegexComponent, sequence, toNode,
} from "./node";

export declare const valueType: unique symbol

// Used as a component it matches the same text again (a backreference).
export interface Reference<T = string> extends RegexComponent<[]> {
    readonly name: string
    readonly [valueType]?: T
}

export type CaptureOptions<T> = {as?: Reference<T>, transform?: (match: string) => T}

let referenceCount = 0

export const Reference = <T = string>(): Reference<T> => {
    const name = `ref${++referenceCount}`
    return {...node(`\\k<${name}>`, 'atom'), name}
}

// Each argument is one alternative, like each line of a Swift ChoiceOf block.
export const ChoiceOf = <Cs extends Components>(...alternatives: Cs): RegexComponent<
    Cs extends [infer Only] ? CapturesOf<Only> : Optional<ConcatCaptures<Cs>>
> => {
    if (alternatives.length === 1) return toNode(alternatives[0]) as never

    const nodes = alternatives.map(toNode)
    return node(nodes.map(n => n.source).join('|'), 'alternation', nodes.flatMap(n => n.captures))
}

// Assertions can't take a quantifier directly, hence 'sequence'.
const lookaround = <Captures extends unknown[]>(prefix: string, components: Component[]) => {
    const inner = sequence(components)
    return node<Captures>(`(${prefix}${inner.source})`, 'sequence', inner.captures)
}

export const Lookahead = <Cs extends Components>(...components: Cs) =>
    lookaround<ConcatCaptures<Cs>>('?=', components)

// Captures inside a negative lookaround never hold a value.
export const NegativeLookahead = <Cs extends Components>(...components: Cs) =>
    lookaround<Optional<ConcatCaptures<Cs>>>('?!', components)

// Not in Swift's RegexBuilder, but supported by JS.
export const Lookbehind = <Cs extends Components>(...components: Cs) =>
    lookaround<ConcatCaptures<Cs>>('?<=', components)

export const NegativeLookbehind = <Cs extends Components>(...components: Cs) =>
    lookaround<Optional<ConcatCaptures<Cs>>>('?<!', components)

export function Capture<Cs extends Components>(...components: Cs): RegexComponent<[string, ...ConcatCaptures<Cs>]>
export function Capture<T, Cs extends Components>(
    options: {transform: (match: string) => T, as?: Reference<T>}, ...components: Cs
): RegexComponent<[T, ...ConcatCaptures<Cs>]>
export function Capture<Cs extends Components>(
    options: {as: Reference<string>}, ...components: Cs
): RegexComponent<[string, ...ConcatCaptures<Cs>]>
export function Capture(...args: [CaptureOptions<unknown> | Component, ...Component[]]): RegexComponent {
    return isComponent(args[0])
        ? capture({}, args as Component[], false)
        : capture(args[0], args.slice(1) as Component[], false)
}

// A null or undefined transform result rejects the match, like nil in Swift.
export const TryCapture = <T, Cs extends Components>(
    options: {transform: (match: string) => T | null | undefined, as?: Reference<T>}, ...components: Cs
): RegexComponent<[T, ...ConcatCaptures<Cs>]> => capture(options, components, true)

const capture = <Captures extends unknown[]>(options: CaptureOptions<unknown>, components: Component[], rejectsNullish: boolean) => {
    const inner = sequence(components)
    const name = options.as?.name

    // The group's own paren opens before any nested group, so its slot comes first.
    return node<Captures>(
        `(${name ? `?<${name}>` : ''}${inner.source})`,
        'atom',
        [{name, transform: options.transform, rejectsNullish}, ...inner.captures],
    )
}
