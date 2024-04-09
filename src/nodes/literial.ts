import {RegexNode} from "../types";

export class Literal implements RegexNode {
    constructor(private value: string) {}
    toRegex(): string {
        return this.value
    }
}

export const literal = (value: string) => {
    return value
}

export const sequence = (...nodes: string[]): string => {

    return nodes.join('')
}

export const ChoiceOf = (...nodes: string[]) => {
    if(nodes.length === 0) {
        throw new Error('')
    }

    return nodes.join('|')
}