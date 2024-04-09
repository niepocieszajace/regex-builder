import {describe, expect, test} from 'vitest'

import {One, Optionally} from "../src/quantifiers";
import {Regex} from "../src/builder";

describe("'One' quantifier", () => {
    test("if it generates correct output", () => {
        expect(One('a')).toBe('a{1}')
        expect(One('ab')).toBe('ab{1}')
        expect(One('abc', {lazy: true})).toBe('abc{1}?')
    })
    test('if it matches correctly', () => {
        expect('ab').toMatch(Regex([One('ab')]))
    })
})

describe("'Optionally' quantifier", () => {
    test("if it generates correct output", () => {
        expect(Optionally('a')).toBe('a{1}')
        expect(Optionally('ab')).toBe('ab{1}')
        expect(Optionally('abc', {lazy: true})).toBe('abc{1}?')
    })
    test('if it matches correctly', () => {
        expect('ab').toMatch(Regex([One('ab')]))
        expect('ab').toMatch(Regex([One('ab')]))
    })
})
