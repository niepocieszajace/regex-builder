import {node, RegexComponent} from "./node";

export interface CharacterClass extends RegexComponent<[]> {
    inverted(): CharacterClass
    union(other: CharacterClass): CharacterClass
}

const escapeInClass = (chars: string) => chars.replace(/[\\\]\[^-]/g, '\\$&')

// Union as alternation and its inverse as "any character none of them matches at this
// position", so it also works for multi-character classes like newlineSequence.
const characterClass = (source: string, invertedSource: string): CharacterClass => ({
    ...node(source, 'atom'),
    inverted: () => characterClass(invertedSource, source),
    union: other => characterClass(`(?:${source}|${other.source})`, `(?:(?!${source}|${other.source})[\\s\\S])`),
})

// Swift's newline set: \n, \v, \f, \r, NEL, LS, PS.
const newlines = '\\n\\v\\f\\r\\u0085\\u2028\\u2029'

const codePoint = (char: string) => {
    if (Array.from(char).length !== 1) throw new RangeError(`Range bound must be a single character, got '${char}'`)

    return char.codePointAt(0)!
}

export const digit = characterClass('\\d', '\\D')

export const word = characterClass('\\w', '\\W')

export const whitespace = characterClass('\\s', '\\S')

// Matches newlines too, like Swift's .any.
export const any = characterClass('[\\s\\S]', '[^\\s\\S]')

// Explicit set instead of '.', so dotMatchesNewlines doesn't change it.
export const anyNonNewline = characterClass(`[^${newlines}]`, `[${newlines}]`)

export const hexDigit = characterClass('[0-9A-Fa-f]', '[^0-9A-Fa-f]')

// \r\n counts as one newline, like in Swift.
export const newlineSequence = characterClass(`(?:\\r\\n|[${newlines}])`, `(?:(?!\\r\\n|[${newlines}])[\\s\\S])`)

export const anyOf = (chars: string) => characterClass(`[${escapeInClass(chars)}]`, `[^${escapeInClass(chars)}]`)

export const noneOf = (chars: string) => anyOf(chars).inverted()

export const range = (from: string, to: string) => {
    if (codePoint(from) > codePoint(to)) throw new RangeError(`Range '${from}'-'${to}' is out of order`)

    const set = `${escapeInClass(from)}-${escapeInClass(to)}`
    return characterClass(`[${set}]`, `[^${set}]`)
}
