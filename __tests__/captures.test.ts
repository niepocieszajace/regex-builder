import {describe, expect, expectTypeOf, test} from 'vitest'

import {Capture, ChoiceOf, digit, OneOrMore, Optionally, Reference, Regex, Repeat, word, ZeroOrMore} from "../src";

describe('typed output', () => {
    test('plain captures are strings', () => {
        const match = Regex(Capture(OneOrMore(word)), '@', Capture(OneOrMore(word))).wholeMatch('jan@poczta')!
        expectTypeOf(match.output).toEqualTypeOf<[string, string, string]>()
        expect(match.output).toEqual(['jan@poczta', 'jan', 'poczta'])
    })
    test('nested captures follow the outer one', () => {
        const match = Regex(Capture('a', Capture(digit))).wholeMatch('a1')!
        expectTypeOf(match.output).toEqualTypeOf<[string, string, string]>()
        expect(match.output).toEqual(['a1', 'a1', '1'])
    })
    test('optional quantifiers and choices make captures optional', () => {
        const regex = Regex(Optionally(Capture('a')), ZeroOrMore(Capture('b')), ChoiceOf(Capture('c'), Capture('d')))
        expectTypeOf(regex.wholeMatch('d')!.output)
            .toEqualTypeOf<[string, string | undefined, string | undefined, string | undefined, string | undefined]>()
        expect(regex.wholeMatch('d')!.output).toEqual(['d', undefined, undefined, undefined, 'd'])
    })
    test('required repetitions keep captures required', () => {
        expectTypeOf(Regex(OneOrMore(Capture('a'))).wholeMatch('aa')!.output).toEqualTypeOf<[string, string]>()
        expectTypeOf(Regex(Repeat({min: 2}, Capture('a'))).wholeMatch('aa')!.output).toEqualTypeOf<[string, string]>()
        expectTypeOf(Regex(Repeat({count: 3}, Capture('a'))).wholeMatch('aaa')!.output).toEqualTypeOf<[string, string]>()
        expectTypeOf(Regex(Repeat({max: 2}, Capture('a'))).wholeMatch('a')!.output).toEqualTypeOf<[string, string | undefined]>()
        expectTypeOf(Regex(ChoiceOf(Capture('a'))).wholeMatch('a')!.output).toEqualTypeOf<[string, string]>()
    })
    test('transform changes the type and the value', () => {
        const match = Regex(Capture({transform: Number}, OneOrMore(digit)), '-', Capture(OneOrMore(digit))).wholeMatch('12-34')!
        expectTypeOf(match.output).toEqualTypeOf<[string, number, string]>()
        expect(match.output).toEqual(['12-34', 12, '34'])
    })
    test('transform is skipped for groups that did not participate', () => {
        expect(Regex(Optionally(Capture({transform: Number}, digit))).wholeMatch('')!.output).toEqual(['', undefined])
    })
    test('groups of an embedded RegExp are left out of the output', () => {
        const match = Regex(/(x)(y)/, Capture('a')).wholeMatch('xya')!
        expectTypeOf(match.output).toEqualTypeOf<[string, string]>()
        expect(match.output).toEqual(['xya', 'a'])
    })
})

describe('Reference', () => {
    test('get returns the transformed capture', () => {
        const year = Reference<number>()
        const regex = Regex(Capture({as: year, transform: Number}, Repeat({count: 4}, digit)))
        const match = regex.firstMatch('in 2024')!
        expectTypeOf(match.get(year)).toEqualTypeOf<number | undefined>()
        expect(match.get(year)).toBe(2024)
        expect(match.output).toEqual(['2024', 2024])
    })
    test('used as a component it is a backreference', () => {
        const letter = Reference()
        const doubled = Regex(Capture({as: letter}, word), letter)
        expect(doubled.firstMatch('abccd')?.output).toEqual(['cc', 'c'])
    })
    test('get throws for a reference the regex does not capture', () => {
        expect(() => Regex(Capture('a')).firstMatch('a')!.get(Reference())).toThrow(/isn't captured/)
    })
    test('type mismatches are rejected', () => {
        const year = Reference<number>()
        // @ts-expect-error a number reference needs a transform producing a number
        Capture({as: year}, digit)
        // @ts-expect-error transform must produce the reference type
        Capture({as: year, transform: (s: string) => s}, digit)
        // @ts-expect-error count can't be combined with min
        Repeat({count: 3, min: 1}, 'a')
    })
})
