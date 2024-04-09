export type Capture = (...nodes: string[]) => string

export const Capture: Capture = (...nodes) => {
    return `(${nodes.join('')})`
}