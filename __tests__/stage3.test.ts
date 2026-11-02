import {describe, expect, expectTypeOf, test} from 'vitest'

import {
    Capture, digit, Lookahead, Lookbehind, NegativeLookahead, NegativeLookbehind, OneOrMore, Optionally, Regex, word,
} from "../src";

describe('lookarounds', () => {
    test('lookahead and negative lookahead', () => {
        expect(Regex(OneOrMore(digit), Lookahead('px')).firstMatch('10em 20px')?.output[0]).toBe('20')
        expect(Regex(OneOrMore(digit), NegativeLookahead(digit), NegativeLookahead('px')).firstMatch('20px 30em')?.output[0]).toBe('30')
    })
    test('lookbehind and negative lookbehind', () => {
        expect(Regex(Lookbehind('$'), OneOrMore(digit)).firstMatch('€5 $7')?.output[0]).toBe('7')
        expect(Regex(NegativeLookbehind('$'), NegativeLookbehind(digit), OneOrMore(digit)).firstMatch('$5 7')?.output[0]).toBe('7')
    })
    test('can be quantified', () => {
        expect(Regex(Optionally(Lookahead('a')), 'a').source).toBe('(?:(?=a))?a')
    })
    test('captures in lookarounds are typed', () => {
        const match = Regex(Lookahead(Capture(word)), NegativeLookahead(Capture('x'))).firstMatch('ab')!
        expectTypeOf(match.output).toEqualTypeOf<[string, string, string | undefined]>()
        expect(match.output).toEqual(['', 'a', undefined])
    })
})

describe('matches', () => {
    test('returns every match with captures', () => {
        const pairs = Regex(Capture(word), '=', Capture({transform: Number}, OneOrMore(digit))).matches('a=1, b=22')
        expectTypeOf(pairs[0].output).toEqualTypeOf<[string, string, number]>()
        expect(pairs.map(m => m.output)).toEqual([['a=1', 'a', 1], ['b=22', 'b', 22]])
        expect(pairs.map(m => m.range)).toEqual([{start: 0, end: 3}, {start: 5, end: 9}])
    })
    test('handles empty matches and no matches', () => {
        expect(Regex(Optionally('a')).matches('ba').map(m => m.output[0])).toEqual(['', 'a', ''])
        expect(Regex('z').matches('abc')).toEqual([])
    })
    test('ignores the state of previous calls', () => {
        const regex = Regex('a')
        expect(regex.matches('aa')).toHaveLength(2)
        expect(regex.matches('aa')).toHaveLength(2)
    })
})

describe('embedded RegExp backreferences', () => {
    test('still point at their own group after a preceding Capture', () => {
        const regex = Regex(Capture('a'), /(x)\1/)
        expect(regex.wholeMatch('axx')?.output).toEqual(['axx', 'a'])
        expect(regex.wholeMatch('axa')).toBeNull()
    })
    test('named groups, escapes and classes are respected', () => {
        expect(Regex(Capture('a'), /(?<q>x)\1/).wholeMatch('axx')).not.toBeNull()
        expect(Regex(Capture('a'), /\((x)\1[(]/).wholeMatch('a(xx(')).not.toBeNull()
        expect(Regex(Capture('a'), /(?:y)(?<=y)(x)\1/).wholeMatch('ayxx')).not.toBeNull()
    })
    test('the same RegExp can be embedded twice', () => {
        const doubled = /(\w)\1/
        expect(Regex(doubled, '-', doubled).wholeMatch('aa-bb')).not.toBeNull()
        expect(Regex(doubled, '-', doubled).wholeMatch('aa-ba')).toBeNull()
    })
    test('patterns without backreferences are left untouched', () => {
        expect(Regex(Capture('a'), /(x)/).source).toBe('(a)(?:(x))')
    })
})
