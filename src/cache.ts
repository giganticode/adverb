import { ExtensionContext, Range } from "vscode";
import { AdverbCache, Folding } from "./models";

export class Cache {
    private static CACHE_NAME: string = "ADVERB";
    private static context: ExtensionContext;

    static initialize(context: ExtensionContext): void {
        this.context = context;
        this.context.workspaceState.update(this.CACHE_NAME, new AdverbCache());
    };

    private static getCache(): AdverbCache | undefined {
        return this.context.workspaceState.get<AdverbCache>(this.CACHE_NAME);
    };

    static getFoldingCacheOfDocument(fileName: string): Folding[] | undefined {
        const cache = this.getCache();
        if (!cache?.foldingsCache)
            return undefined;
        return cache.foldingsCache[fileName];
    };

    static updateFoldingCacheOfDocument(fileName: string, range: Range, summary: string): void {
        let cache = this.getCache();
        if (!cache)
            cache = new AdverbCache();
        if (!cache.foldingsCache)
            cache.foldingsCache = {}
        if (!cache.foldingsCache[fileName])
            cache.foldingsCache[fileName] = [];
        cache.foldingsCache[fileName] =
            [
                ...cache.foldingsCache[fileName]!.filter(x => !x.range.isEqual(range)),
                new Folding(range, summary)
            ];
        this.context.workspaceState.update(this.CACHE_NAME, cache);
    };

    static cleanFoldingCacheOfDocument(fileName: string, startingFromLine: number | undefined = undefined): void {
        const cache = this.getCache();
        if (cache?.foldingsCache && cache?.foldingsCache[fileName]) {
            if (startingFromLine)
                cache.foldingsCache[fileName] = cache.foldingsCache[fileName]?.filter(x => x.range.start.line < startingFromLine && x.range.end.line < startingFromLine);
            else
                cache.foldingsCache[fileName] = undefined;
            this.context.workspaceState.update(this.CACHE_NAME, cache);
        }
    };
};
