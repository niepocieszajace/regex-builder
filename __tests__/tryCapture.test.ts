import {describe, expect, expectTypeOf, test} from 'vitest'

import {Anchor, digit, OneOrMore, Optionally, Reference, Regex, Repeat, TryCapture} from "../src";

const byte = (s: string) => Number(s) < 256 ? Number(s) : null
const octet = TryCapture({transform: byte}, Repeat({min: 1, max: 3}, digit))

describe('TryCapture', () => {
    test('output has the non-nullable transform type', () => {
        const match = Regex(octet).wholeMatch('42')!
        expectTypeOf(match.output).toEqualTypeOf<[string, number]>()
        expect(match.output).toEqual(['42', 42])
    })
    test('wholeMatch fails when the transform rejects', () => {
        expect(Regex(octet).wholeMatch('300')).toBeNull()
        expect(Regex(octet, '.', octet).wholeMatch('10.255')?.output).toEqual(['10.255', 10, 255])
    })
    test('firstMatch keeps searching after a rejection', () => {
        const regex = Regex(Anchor.wordBoundary, octet, Anchor.wordBoundary)
        expect(regex.firstMatch('999 42')?.output).toEqual(['42', 42])
        expect(regex.firstMatch('999 300')).toBeNull()
    })
    test('matches skips rejected matches', () => {
        const regex = Regex(Anchor.wordBoundary, octet, Anchor.wordBoundary)
        expect(regex.matches('1 300 2 999').map(m => m.output[1])).toEqual([1, 2])
    })
    test('undefined also rejects, falsy values do not', () => {
        const regex = Regex(TryCapture({transform: s => s === '0' ? 0 : undefined}, digit))
        expect(regex.wholeMatch('0')?.output).toEqual(['0', 0])
        expect(regex.wholeMatch('1')).toBeNull()
    })
    test('a group that did not participate is not rejected', () => {
        const match = Regex('x', Optionally(octet)).wholeMatch('x')!
        expectTypeOf(match.output).toEqualTypeOf<[string, number | undefined]>()
        expect(match.output).toEqual(['x', undefined])
    })
    test('works with a Reference', () => {
        const value = Reference<number>()
        const match = Regex(TryCapture({as: value, transform: byte}, OneOrMore(digit))).firstMatch('7')!
        expect(match.get(value)).toBe(7)
    })
    test('needs a transform', () => {
        // @ts-expect-error transform is required
        TryCapture({}, digit)
    })
    test('retries step over surrogate pairs', () => {
        const regex = Regex(TryCapture({transform: s => s === '😀' ? null : s}, /./))
        expect(regex.matches('😀a').map(m => m.output[1])).toEqual(['a'])
    })
})
