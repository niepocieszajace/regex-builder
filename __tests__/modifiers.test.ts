import {describe, expect, expectTypeOf, test} from 'vitest'

import {Capture, digit, One, OneOrMore, Reference, Regex, word} from "../src";

describe('component modifiers', () => {
    test('ignoresCase applies only to the component', () => {
        const regex = Regex('x', One('abc').ignoresCase())
        expect(regex.source).toBe('x(?i:abc)')
        expect(regex.wholeMatch('xABC')).not.toBeNull()
        expect(regex.wholeMatch('XABC')).toBeNull()
    })
    test('ignoresCase(false) overrides the Regex modifier', () => {
        const regex = Regex('a', One('b').ignoresCase(false)).ignoresCase()
        expect(regex.source).toBe('a(?-i:b)')
        expect(regex.wholeMatch('Ab')).not.toBeNull()
        expect(regex.wholeMatch('AB')).toBeNull()
    })
    test('dotMatchesNewlines and anchorsMatchLineEndings affect embedded RegExps', () => {
        expect(Regex(One(/a.b/).dotMatchesNewlines()).wholeMatch('a\nb')).not.toBeNull()
        expect(Regex(One(/a.b/)).wholeMatch('a\nb')).toBeNull()
        expect(Regex(One(/^b/).anchorsMatchLineEndings()).firstMatch('a\nb')?.range.start).toBe(2)
        expect(Regex(One(/^b/)).firstMatch('a\nb')).toBeNull()
    })
    test('modified components quantify as atoms and keep captures', () => {
        expect(Regex(OneOrMore(One('ab').ignoresCase())).wholeMatch('abAB')).not.toBeNull()
        expect(Regex(OneOrMore(One('ab').ignoresCase())).source).toBe('(?i:ab)+')

        const match = Regex(Capture(OneOrMore(word)).ignoresCase(), Capture({transform: Number}, digit)).wholeMatch('Ab1')!
        expectTypeOf(match.output).toEqualTypeOf<[string, string, number]>()
        expect(match.output).toEqual(['Ab1', 'Ab', 1])
    })
    test('every builder exposes modifiers', () => {
        const letter = Reference()
        expect(Regex(Capture({as: letter}, word), letter.ignoresCase()).wholeMatch('aA')).not.toBeNull()
        expect(Regex(OneOrMore('a').reluctant().ignoresCase()).wholeMatch('A')).not.toBeNull()
        expect(digit.ignoresCase().source).toBe('(?i:\\d)')
    })
})
