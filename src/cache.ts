import { Command, ExtensionContext, Range } from "vscode";
import { AdverbCache, CodeLensCacheBlock, Folding } from "./models";
import { hashCode } from "./utils";

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

    static getCodeLensCacheOfDocument(fileName: string): CodeLensCacheBlock[] | undefined {
        const cache = this.getCache();
        if (!cache?.codeLensCache)
            return undefined;
        return cache.codeLensCache[fileName];
    };

    static getCodeLensCacheOfDocumentAndCodeBlock(fileName: string, range: Range): CodeLensCacheBlock | undefined {
        const cache = this.getCache();
        if (!cache?.codeLensCache)
            return undefined;
        const fileCache = cache.codeLensCache[fileName];
        if (!fileCache)
            return undefined;
        const codeBlock = fileCache.find(x => x.range.isEqual(range));
        return codeBlock;
    };

    static updateCodeLensCacheOfDocumentAndCodeBlock(fileName: string, range: Range, command: Command): void {
        let cache = this.getCache();
        if (!cache)
            cache = new AdverbCache();
        if (!cache.codeLensCache)
            cache.codeLensCache = {}
        if (!cache.codeLensCache[fileName])
            cache.codeLensCache[fileName] = [];
        cache.codeLensCache[fileName] =
            [
                ...cache.codeLensCache[fileName]!.filter(x => !x.range.isEqual(range)),
                { range: range, command: command }
            ];
        this.context.workspaceState.update(this.CACHE_NAME, cache);
    };

    static cleanCodeLensCacheOfDocument(fileName: string, startingFromLine: number | undefined = undefined): void {
        const cache = this.getCache();
        if (cache?.codeLensCache && cache?.codeLensCache[fileName]) {
            if (startingFromLine)
                cache.codeLensCache[fileName] = cache.codeLensCache[fileName]?.filter(x => x.range.start.line < startingFromLine && x.range.end.line < startingFromLine);
            else
                cache.codeLensCache[fileName] = undefined;
            this.context.workspaceState.update(this.CACHE_NAME, cache);
        }
    };

    static getCachedSummary(code: string): string | undefined {
        const hash = hashCode(code);
        const cache = this.getCache();
        const cachedSummary = cache?.summariesCache ? cache.summariesCache[hash] : undefined;
        return cachedSummary;
    };

    static cacheSummary(code: string, summary: string): void {
        const hash = hashCode(code);
        let cache = this.getCache();
        if (!cache)
            cache = new AdverbCache();
        if (!cache.summariesCache)
            cache.summariesCache = {};
        cache.summariesCache[hash] = summary;
    };
};
