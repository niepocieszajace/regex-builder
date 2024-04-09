export type Anchor = () => string
export const StartOfString: Anchor = () => '^'

export const EndOfString: Anchor = () =>'$'

export const WordBoundary: Anchor = () => '\\b'

export const NonWordBoundary: Anchor = () => '\\B'