import {Invertible, invertible} from "./node.js";

// Lookarounds instead of ^/$ so the meaning doesn't change with the m flag.
// Assertions can't take a quantifier directly, hence 'sequence'.
const lineTerminators = '\\n\\r\\u2028\\u2029'

const anchor = (source: string, invertedSource: string): Invertible => invertible(source, invertedSource, 'sequence')

export const Anchor = {
    startOfSubject: anchor('(?<![\\s\\S])', '(?<=[\\s\\S])'),
    endOfSubject: anchor('(?![\\s\\S])', '(?=[\\s\\S])'),
    startOfLine: anchor(`(?<![^${lineTerminators}])`, `(?<=[^${lineTerminators}])`),
    endOfLine: anchor(`(?![^${lineTerminators}])`, `(?=[^${lineTerminators}])`),
    wordBoundary: anchor('\\b', '\\B'),
}
