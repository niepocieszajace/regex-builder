import {Invertible, invertible} from "./node";

export type CharacterClass = Invertible

const escapeInClass = (chars: string) => chars.replace(/[\\\]\[^-]/g, '\\$&')

const characterClass = (source: string, invertedSource: string): CharacterClass => invertible(source, invertedSource, 'atom')

const codePoint = (char: string) => {
    if (Array.from(char).length !== 1) throw new RangeError(`Range bound must be a single character, got '${char}'`)

    return char.codePointAt(0)!
}

export const digit = characterClass('\\d', '\\D')

export const word = characterClass('\\w', '\\W')

export const whitespace = characterClass('\\s', '\\S')

// Matches newlines too, like Swift's .any.
export const any = characterClass('[\\s\\S]', '[^\\s\\S]')

export const anyOf = (chars: string) => characterClass(`[${escapeInClass(chars)}]`, `[^${escapeInClass(chars)}]`)

export const noneOf = (chars: string) => anyOf(chars).inverted()

export const range = (from: string, to: string) => {
    if (codePoint(from) > codePoint(to)) throw new RangeError(`Range '${from}'-'${to}' is out of order`)

    const set = `${escapeInClass(from)}-${escapeInClass(to)}`
    return characterClass(`[${set}]`, `[^${set}]`)
}
