import { CodeLensCache, FoldingCache } from ".";

export class AdverbCache {
    codeLensCache: CodeLensCache | undefined;
    foldingsCache: FoldingCache | undefined;
    summariesCache: { [hash: number]: string } | undefined;
};