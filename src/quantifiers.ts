export type QuantifierOptions = {lazy?: boolean}
export type RepeatOptions = number | {min?: number, max?: number, lazy?: boolean}

export type One = (node: string, options?: QuantifierOptions) => string
export type Optionally = (node: string, options?: QuantifierOptions) => string
export type ZeroOrMore = (node: string, options?: QuantifierOptions) => string
export type OneOrMore = (node: string, options?: QuantifierOptions) => string
export type Repeat = (node: string, options?: RepeatOptions) => string

export const One: One = (node,options) => {
    return `${node}{1}${options?.lazy === true ? '?' : ''}`
}
export const Optionally: Optionally = (node, options) => {
    return `${node}?${options?.lazy === true ? '?' : ''}`
}
export const ZeroOrMore: ZeroOrMore = (node,options) => {
    return `${node}*${options?.lazy === true ? '?' : ''}`
}
export const OneOrMore: OneOrMore = (node, options) => {
    return `${node}+${options?.lazy === true ? '?' : ''}`
}
export const Repeat: Repeat = (node, options ) => {
    if(typeof options === 'number') {
        return `${node}{${options}}`
    }
    return `${node}{${options?.min}, ${options?.max ?? ''}}${options?.lazy === true ? '?' : ''}`
}
