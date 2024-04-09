import {RegexFlags} from "./types";

export const parseFlags = (flags: RegexFlags): string => {
    let flagsResult = ''

    if(flags.global) flagsResult += 'g';
    if (flags.ignoreCase) flagsResult += 'i';
    if (flags.multiline) flagsResult += 'm';
    if (flags.hasIndices) flagsResult += 'd';

    return flagsResult
}