# regex-builder

Simple and lightweight implementation of the [Swift RegexBuilder API](https://developer.apple.com/documentation/regexbuilder) for JavaScript/TypeScript.

```ts
import {Regex, Anchor, Capture, ChoiceOf, OneOrMore, Optionally, Repeat, digit, word} from 'regex-builder'

const email = Regex(
    Anchor.startOfLine,
    Capture(OneOrMore(word)),
    '@',
    Capture(OneOrMore(word), '.', ChoiceOf('com', 'pl', 'org')),
    Optionally(':', Repeat({min: 2, max: 5}, digit)),
    Anchor.endOfLine,
).ignoresCase()

email.wholeMatch('Jan@poczta.pl')?.output // ['Jan@poczta.pl', 'Jan', 'poczta.pl']
email.toRegExp()                          // plain RegExp
```

- Strings are literals and get escaped; pass a `RegExp` to embed a raw pattern.
- A `Regex` can be nested in another one, keeping its captures. Its flags (and `i`/`m`/`s` of an embedded `RegExp`) apply only to that part.
- Several arguments mean a sequence, like several lines in a Swift builder block.
- Grouping `(?:…)` is added automatically where precedence requires it.
- Patterns are compiled with the `u` flag.
- Modifiers work on single components too: `One('abc').ignoresCase()` → `(?i:abc)`, `.ignoresCase(false)` → `(?-i:…)`. This needs RegExp modifier groups (ES2025: Node 23+, Chrome 125+, Firefox 132+); on older engines use the `Regex` modifier.

| Swift | regex-builder |
|---|---|
| `One`, `Optionally`, `ZeroOrMore`, `OneOrMore` | same names |
| `Repeat(count: 3)`, `Repeat(2...5)`, `Repeat(2...)` | `Repeat({count: 3}, …)`, `Repeat({min: 2, max: 5}, …)`, `Repeat({min: 2}, …)` |
| `.repetitionBehavior(.reluctant)` | `.reluctant()` |
| `ChoiceOf`, `Capture`, `TryCapture` | same names, options first: `Capture({transform}, …)`, `TryCapture({transform}, …)` |
| `.digit`, `.hexDigit`, `.word`, `.whitespace`, `.any`, `.anyNonNewline`, `.newlineSequence`, `.anyOf("…")`, `.noneOf("…")`, `"a"..."z"` | `digit`, `hexDigit`, `word`, `whitespace`, `any`, `anyNonNewline`, `newlineSequence`, `anyOf('…')`, `noneOf('…')`, `range('a', 'z')` |
| `.inverted`, `.union(_:)` | `.inverted()`, `.union(other)` |
| `Anchor.startOfSubject`, `.endOfSubject`, `.startOfLine`, `.endOfLine`, `.wordBoundary` | same names |
| `.ignoresCase()`, `.anchorsMatchLineEndings()`, `.dotMatchesNewlines()` | same names, on `Regex` and on any component |
| `Lookahead`, `NegativeLookahead` | same names, plus `Lookbehind`, `NegativeLookbehind` |
| `firstMatch(of:)`, `wholeMatch(of:)`, `matches(of:)` | `regex.firstMatch(input)`, `regex.wholeMatch(input)`, `regex.matches(input)` |

## Typed captures

The match output is a typed tuple, like Swift's `Regex<(Substring, …)>`:

```ts
const year = Reference<number>()
const date = Regex(
    Capture({as: year, transform: Number}, Repeat({count: 4}, digit)),
    '-',
    Capture(Repeat({count: 2}, digit)),
    Optionally('/', Capture(OneOrMore(word))),
)

const match = date.wholeMatch('2024-04/draft')!
match.output    // [string, number, string, string | undefined] → ['2024-04/draft', 2024, '04', 'draft']
match.get(year) // number | undefined → 2024
```

- Captures under `Optionally`, `ZeroOrMore`, `ChoiceOf` or a `Repeat` that may run zero times are `T | undefined`.
- Options come first, like in `Repeat`: `Capture({transform}, …)`, `Capture({as: reference}, …)`.
- A `Reference` used as a component matches the captured text again (backreference).
- `TryCapture` rejects the match when its transform returns `null` or `undefined`, and the output type is non-nullable. Unlike Swift it doesn't backtrack into other alternatives at the same position: `firstMatch` and `matches` continue one character later, `wholeMatch` fails.
- Groups inside an embedded `RegExp` are left out of the output; its numbered backreferences keep pointing at its own groups.
