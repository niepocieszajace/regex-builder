import {describe, expect, expectTypeOf, test} from 'vitest'

import {
    any, anyNonNewline, anyOf, Capture, digit, hexDigit, newlineSequence, OneOrMore, range, Reference, Regex, word,
} from "../src";

describe('nested Regex', () => {
    test('keeps captures and their types', () => {
        const number = Regex(Capture({transform: Number}, OneOrMore(digit)))
        const match = Regex(Capture(word), '=', number).wholeMatch('a=42')!
        expectTypeOf(match.output).toEqualTypeOf<[string, string, number]>()
        expect(match.output).toEqual(['a=42', 'a', 42])
    })
    test('keeps references', () => {
        const year = Reference<number>()
        const inner = Regex(Capture({as: year, transform: Number}, OneOrMore(digit)))
        expect(Regex('y', inner).firstMatch('y2024')!.get(year)).toBe(2024)
    })
    test('applies its flags locally', () => {
        const regex = Regex('x', Regex('abc').ignoresCase())
        expect(regex.source).toBe('x(?i:abc)')
        expect(regex.wholeMatch('xABC')).not.toBeNull()
        expect(regex.wholeMatch('XABC')).toBeNull()
        expect(Regex(Regex(/a.b/).dotMatchesNewlines()).wholeMatch('a\nb')).not.toBeNull()
    })
    test('is grouped when quantified', () => {
        expect(Regex(OneOrMore(Regex('ab'))).wholeMatch('abab')).not.toBeNull()
        expect(Regex(OneOrMore(Regex('ab'))).wholeMatch('abb')).toBeNull()
    })
    test('flags of an embedded RegExp become modifiers', () => {
        expect(Regex('x', /abc/i).source).toBe('x(?i:abc)')
        expect(Regex('x', /abc/i).wholeMatch('xABC')).not.toBeNull()
        expect(() => Regex(/a/g)).toThrow(/only i, m and s/)
    })
})

describe('more character classes', () => {
    const full = (c: Parameters<typeof Regex>[0], input: string) => Regex(c).wholeMatch(input) !== null

    test('hexDigit', () => {
        expect(full(OneOrMore(hexDigit), 'aF09')).toBe(true)
        expect(full(hexDigit, 'g')).toBe(false)
        expect(full(hexDigit.inverted(), 'g')).toBe(true)
    })
    test('anyNonNewline ignores dotMatchesNewlines', () => {
        expect(full(anyNonNewline, 'a')).toBe(true)
        expect(full(anyNonNewline, ' ')).toBe(false)
        expect(Regex(anyNonNewline).dotMatchesNewlines().wholeMatch('\n')).toBeNull()
        expect(full(anyNonNewline.inverted(), '\r')).toBe(true)
    })
    test('newlineSequence treats \\r\\n as one newline', () => {
        expect(full(newlineSequence, '\r\n')).toBe(true)
        expect(full(newlineSequence, '\u0085')).toBe(true)
        expect(full(newlineSequence, 'a')).toBe(false)
        expect(Regex(OneOrMore(newlineSequence.inverted())).firstMatch('ab\r\ncd')?.output[0]).toBe('ab')
    })
    test('union and its inverse', () => {
        const digitOrAbc = digit.union(anyOf('abc'))
        expect(['1', 'b', 'd'].map(c => full(digitOrAbc, c))).toEqual([true, true, false])
        expect(['1', 'b', 'd'].map(c => full(digitOrAbc.inverted(), c))).toEqual([false, false, true])
        expect(full(OneOrMore(digit.union(range('a', 'f'))), 'ff00')).toBe(true)
        expect(full(any.inverted().union(digit), '5')).toBe(true)
    })
})
