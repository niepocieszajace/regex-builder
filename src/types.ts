export type RegexFlags = {
    global?: boolean;
    ignoreCase?: boolean;
    multiline?: boolean;
    hasIndices?: boolean;
}

export interface RegexNode {
    toRegex(): string
}