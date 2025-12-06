declare module 'minimatch' {
  export interface MinimatchOptions {
    nocase?: boolean;
    nocomment?: boolean;
    debug?: boolean;
    dot?: boolean;
    matchBase?: boolean;
    nonegate?: boolean;
    nobrace?: boolean;
    noglobstar?: boolean;
    noext?: boolean;
    flipNegate?: boolean;
  }

  export interface Minimatch {
    pattern: string;
    negated: boolean;
    comment: boolean;
    empty: boolean;
    makeRe(): RegExp;
    match(fname: string): boolean;
  }

  export function minimatch(path: string, pattern: string, options?: MinimatchOptions): boolean;
  export default minimatch;
  export function Minimatch(pattern: string, options?: MinimatchOptions): Minimatch;
  export const filter: (pattern: string, options?: MinimatchOptions) => (path: string) => boolean;
  export const defaults: (options: MinimatchOptions) => typeof minimatch;
}
