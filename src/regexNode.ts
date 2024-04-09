// type Pattern = 'string'

// export const zeroOrOne = (pattern: Pattern) => {
//     return
// }

interface IRegexBuilderFlags {
    global?: boolean;
    ignoreCase?: boolean;
    multiline?: boolean;
    hasIndices?: boolean;
}

interface IRegexNode {
    value: string;
}

export class RegexBuilder {
    global: boolean;
    ignoreCase: boolean;
    multiline: boolean;
    hasIndices: boolean;

    constructor(flags?: IRegexBuilderFlags) {
        this.global = flags?.global ?? false
        this.ignoreCase = flags?.ignoreCase ?? false
        this.multiline = flags?.multiline ?? false
        this.hasIndices = flags?.hasIndices ?? false
    }

    Build(regexNodes: IRegexNode[], flags?: IRegexBuilderFlags) {

        const encodedFlags = this.encodeFlags(flags)

        console.log(encodedFlags)

        const regex = regexNodes.reduce((acc, currentValue) => {
            return acc.concat(currentValue.value)
        }, "")

        return new RegExp(regex, "g")
    }

    private encodeFlags(flags?: IRegexBuilderFlags) {
        return {
            global: flags?.global && this.global,
            ignoreCase: flags?.ignoreCase && this.ignoreCase,
            multiline: flags?.multiline && this.multiline,
            hasIndices: flags?.hasIndices && this.hasIndices,
        }
    }

    get flags() {
        return {
            global: this.global,
            ignoreCase: this.ignoreCase,
            multiline: this.multiline,
            hasIndices: this.hasIndices,
        }
    }

}

export class RegexNode implements IRegexNode {
    value: string;

    constructor(value: string) {
        this.value = value;
    }

}

/* Examples
   const regex = RegexBuilder.Build(
        RegexBuilder.
   )
 */