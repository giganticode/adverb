import { Folding } from ".";

export interface FoldingCache {
    [fileName: string]: Folding[] | undefined;
}