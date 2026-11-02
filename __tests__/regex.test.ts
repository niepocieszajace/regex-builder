import {describe, expect, test} from 'vitest'

import {
    Anchor, any, anyOf, Capture, ChoiceOf, digit, noneOf, One, OneOrMore, Optionally, range, Regex, Repeat,
    whitespace, word, ZeroOrMore,
} from "../src";

const matches = (regex: Regex, input: string) => regex.wholeMatch(input) !== null

describe('literals', () => {
    test('strings are escaped', () => {
        expect(Regex('a.b').source).toBe('a\\.b')
        expect(matches(Regex('a.b'), 'axb')).toBe(false)
        expect(matches(Regex('(1+1)*[x]{2}|^$\\'), '(1+1)*[x]{2}|^$\\')).toBe(true)
    })
    test('One is the component itself', () => {
        expect(Regex(One('a')).source).toBe('a')
    })
    test('raw RegExp is embedded and grouped', () => {
        expect(Regex(OneOrMore(/a|b/)).source).toBe('(?:a|b)+')
        expect(() => Regex(/a/y)).toThrow(/only i, m and s/)
    })
})

describe('quantifiers', () => {
    test('group multi-character components', () => {
        expect(Regex(OneOrMore('ab')).source).toBe('(?:ab)+')
        expect(matches(Regex(OneOrMore('ab')), 'abab')).toBe(true)
        expect(matches(Regex(OneOrMore('ab')), 'abb')).toBe(false)
    })
    test('concatenate their arguments', () => {
        expect(Regex(ZeroOrMore('a', digit)).source).toBe('(?:a\\d)*')
        expect(Regex(Optionally('x')).source).toBe('x?')
    })
    test('nested quantifiers stay valid', () => {
        expect(Regex(OneOrMore(OneOrMore('a'))).source).toBe('(?:a+)+')
    })
    test('treat an astral character as one atom', () => {
        expect(matches(Regex(OneOrMore('😀')), '😀😀')).toBe(true)
    })
    test('reluctant', () => {
        expect(Regex(OneOrMore(any).reluctant(), 'b').firstMatch('aabab')?.output[0]).toBe('aab')
        expect(Regex(OneOrMore(any), 'b').firstMatch('aabab')?.output[0]).toBe('aabab')
    })
})

describe('Repeat', () => {
    test('ranges', () => {
        expect(Regex(Repeat({count: 3}, 'a')).source).toBe('a{3}')
        expect(Regex(Repeat({min: 2, max: 5}, 'ab')).source).toBe('(?:ab){2,5}')
        expect(Regex(Repeat({min: 2}, 'a')).source).toBe('a{2,}')
        expect(Regex(Repeat({max: 2}, 'a')).source).toBe('a{0,2}')
        expect(matches(Regex(Repeat({min: 2, max: 3}, digit)), '123')).toBe(true)
        expect(matches(Regex(Repeat({min: 2, max: 3}, digit)), '1234')).toBe(false)
    })
    test('rejects invalid bounds', () => {
        expect(() => Repeat({min: 3, max: 1}, 'a')).toThrow(RangeError)
        expect(() => Repeat({count: -1}, 'a')).toThrow(RangeError)
        expect(() => Repeat({count: 1.5}, 'a')).toThrow(RangeError)
    })
})

describe('ChoiceOf', () => {
    test('is grouped inside a sequence', () => {
        const regex = Regex('x', ChoiceOf('a', 'b'))
        expect(regex.source).toBe('x(?:a|b)')
        expect(matches(regex, 'b')).toBe(false)
        expect(matches(regex, 'xb')).toBe(true)
    })
    test('alternatives can be sequences', () => {
        expect(matches(Regex(ChoiceOf('com', 'pl')), 'pl')).toBe(true)
    })
})

describe('character classes', () => {
    test('builtin and inverted', () => {
        expect(matches(Regex(OneOrMore(word), whitespace, digit), 'ab_1 7')).toBe(true)
        expect(matches(Regex(digit.inverted()), '7')).toBe(false)
        expect(matches(Regex(any), '\n')).toBe(true)
    })
    test('anyOf and noneOf escape class syntax', () => {
        expect(matches(Regex(OneOrMore(anyOf('a-]^\\'))), ']-^\\a')).toBe(true)
        expect(matches(Regex(anyOf('a-c')), 'b')).toBe(false)
        expect(matches(Regex(noneOf('abc')), 'a')).toBe(false)
        expect(matches(Regex(noneOf('abc')), 'd')).toBe(true)
    })
    test('range', () => {
        expect(matches(Regex(OneOrMore(range('a', 'f'))), 'cafe')).toBe(true)
        expect(matches(Regex(range('a', 'f').inverted()), 'c')).toBe(false)
        expect(() => range('z', 'a')).toThrow(RangeError)
        expect(() => range('ab', 'c')).toThrow(RangeError)
    })
})

describe('anchors', () => {
    const lines = 'one\ntwo'
    test('subject anchors ignore the m flag', () => {
        const regex = Regex(Anchor.startOfSubject, 'two').anchorsMatchLineEndings()
        expect(regex.firstMatch(lines)).toBeNull()
    })
    test('line anchors work without the m flag', () => {
        expect(Regex(Anchor.startOfLine, 'two', Anchor.endOfLine).firstMatch(lines)?.range).toEqual({start: 4, end: 7})
        expect(Regex(Anchor.startOfLine, 'wo').firstMatch(lines)).toBeNull()
    })
    test('word boundary and inverted', () => {
        expect(Regex(Anchor.wordBoundary, 'two').firstMatch('network two')?.range.start).toBe(8)
        expect(Regex(Anchor.wordBoundary.inverted(), 'two').firstMatch('two network')?.range.start).toBe(6)
    })
})

describe('Regex', () => {
    test('captures appear in the output', () => {
        const regex = Regex(Capture(OneOrMore(word)), '@', Capture(OneOrMore(word), '.', ChoiceOf('com', 'pl')))
        expect(regex.wholeMatch('jan@poczta.pl')?.output).toEqual(['jan@poczta.pl', 'jan', 'poczta.pl'])
    })
    test('wholeMatch backtracks to cover the whole input', () => {
        expect(Regex(ChoiceOf('a', 'ab')).wholeMatch('ab')?.output[0]).toBe('ab')
        expect(Regex('a').wholeMatch('ab')).toBeNull()
        expect(Regex('a').firstMatch('ba')?.range).toEqual({start: 1, end: 2})
    })
    test('modifiers', () => {
        expect(matches(Regex('abc').ignoresCase(), 'ABC')).toBe(true)
        expect(matches(Regex('abc').ignoresCase().ignoresCase(false), 'ABC')).toBe(false)
        expect(matches(Regex(/a.b/).dotMatchesNewlines(), 'a\nb')).toBe(true)
        expect(Regex('a').ignoresCase().toRegExp().flags).toBe('iu')
    })
    test('toRegExp returns a fresh RegExp', () => {
        const regex = Regex('a')
        expect(regex.toRegExp()).not.toBe(regex.toRegExp())
        expect('xa').toMatch(regex.toRegExp())
    })
})
