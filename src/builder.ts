import {RegexFlags} from "./types";
import {parseFlags} from "./helpers";

export const Regex = (nodes: string[], flags?: RegexFlags): RegExp => {
    const parsedFlags = parseFlags(flags ?? {})

    nodes.join('')


    return new RegExp('', parsedFlags)
}