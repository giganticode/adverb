import { CodeLensCacheBlock } from ".";

export interface CodeLensCache {
    [fileName: string]: CodeLensCacheBlock[] | undefined;
}