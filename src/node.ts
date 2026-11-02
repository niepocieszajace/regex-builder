// How tightly a node binds: an atom takes a quantifier directly, a sequence must be
// grouped before quantifying, an alternation must be grouped before anything touches it.
export type Precedence = 'atom' | 'sequence' | 'alternation'

// One entry per capturing group, in source order. null marks a group of an embedded
// RegExp: it shifts group numbering but isn't part of the match output.
export type CaptureSlot = {name?: string, transform?: (match: string) => unknown} | null

export declare const capturesType: unique symbol

export interface RegexComponent<Captures extends unknown[] = unknown[]> {
    readonly source: string
    readonly precedence: Precedence
    readonly captures: readonly CaptureSlot[]
    // Type only: what this component adds to the match output.
    readonly [capturesType]?: Captures
    ignoresCase(enabled?: boolean): RegexComponent<Captures>
    anchorsMatchLineEndings(enabled?: boolean): RegexComponent<Captures>
    dotMatchesNewlines(enabled?: boolean): RegexComponent<Captures>
}

export interface Invertible extends RegexComponent<[]> {
    inverted(): Invertible
}

// A string is always a literal, a RegExp is the escape hatch for raw patterns.
export type Component = RegexComponent | string | RegExp
export type Components = [Component, ...Component[]]

export type CapturesOf<C> = C extends RegexComponent<infer Captures> ? Captures : []

export type ConcatCaptures<Cs extends unknown[]> =
    Cs extends [infer Head, ...infer Rest] ? [...CapturesOf<Head>, ...ConcatCaptures<Rest>]
        : Cs extends [] ? [] : unknown[]

export type Optional<Captures extends unknown[]> = {[K in keyof Captures]: Captures[K] | undefined}

// Modifier groups (?i:…) are ES2025, older engines reject them.
const supportsModifiers = (() => {
    try {
        return new RegExp('(?i:a)').test('A')
    } catch {
        return false
    }
})()

const modify = <Captures extends unknown[]>(component: RegexComponent<Captures>, flag: string, enabled: boolean) => {
    if (!supportsModifiers) {
        throw new Error('Component modifiers need RegExp modifier groups (?i:…), which this JavaScript engine lacks; use the Regex modifier instead')
    }
    return node<Captures>(`(?${enabled ? '' : '-'}${flag}:${component.source})`, 'atom', component.captures)
}

export const node = <Captures extends unknown[] = []>(
    source: string, precedence: Precedence, captures: readonly CaptureSlot[] = [],
): RegexComponent<Captures> => {
    const component: RegexComponent<Captures> = {
        source,
        precedence,
        captures,
        ignoresCase: (enabled = true) => modify(component, 'i', enabled),
        anchorsMatchLineEndings: (enabled = true) => modify(component, 'm', enabled),
        dotMatchesNewlines: (enabled = true) => modify(component, 's', enabled),
    }
    return component
}

export const invertible = (source: string, invertedSource: string, precedence: Precedence): Invertible => ({
    ...node(source, precedence),
    inverted: () => invertible(invertedSource, source, precedence),
})

const escapeLiteral = (value: string) => value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

// An empty alternative always matches, so exec reports every group of the pattern.
const groupCount = (source: string) => new RegExp(`${source}|`, 'u').exec('')!.length - 1

let embeddedGroupCount = 0

// \N in an embedded RegExp counts groups from its own start, which breaks once other
// groups precede it, so numbered backreferences are rewritten to named ones.
const nameBackreferences = (source: string) => {
    const names: string[] = []
    const parts: (string | number)[] = []
    let inClass = false
    for (let i = 0; i < source.length; i++) {
        const char = source[i]
        if (char === '\\') {
            const number = inClass ? undefined : /^[1-9]\d*/.exec(source.slice(i + 1))?.[0]
            parts.push(number ? Number(number) : source.slice(i, i + 2))
            i += number ? number.length : 1
            continue
        }
        if (inClass) {
            if (char === ']') inClass = false
        } else if (char === '[') {
            inClass = true
        } else if (char === '(') {
            const named = /^\?<([^=!][^>]*)>/.exec(source.slice(i + 1))
            if (named) {
                names.push(named[1])
            } else if (source[i + 1] !== '?') {
                const name = `g${++embeddedGroupCount}`
                names.push(name)
                parts.push(`(?<${name}>`)
                continue
            }
        }
        parts.push(char)
    }
    if (!parts.some(part => typeof part === 'number')) return source

    return parts.map(part => typeof part === 'number' ? `\\k<${names[part - 1]}>` : part).join('')
}

export const isComponent = (value: unknown): value is Component =>
    typeof value === 'string' || value instanceof RegExp || (typeof value === 'object' && value !== null && 'precedence' in value)

export const toNode = (component: Component): RegexComponent => {
    if (typeof component === 'string') {
        // Patterns are compiled with the u flag, so one code point is one atom.
        return node(escapeLiteral(component), Array.from(component).length === 1 ? 'atom' : 'sequence')
    }
    if (component instanceof RegExp) {
        if (component.flags !== '' && component.flags !== 'u') {
            throw new Error(`Flags of embedded RegExp /${component.source}/${component.flags} would be lost, use Regex modifiers instead`)
        }
        const captures = Array(groupCount(component.source)).fill(null)
        return node(nameBackreferences(component.source), 'alternation', captures)
    }
    return component
}

export const asAtom = (n: RegexComponent) => n.precedence === 'atom' ? n.source : `(?:${n.source})`

export const sequence = (components: Component[]): RegexComponent => {
    const nodes = components.map(toNode)
    if (nodes.length === 1) return nodes[0]

    return node(
        nodes.map(n => n.precedence === 'alternation' ? `(?:${n.source})` : n.source).join(''),
        'sequence',
        nodes.flatMap(n => n.captures),
    )
}
