import { Command, Range } from "vscode";

export interface CodeLensCacheBlock {
    range: Range,
    command: Command
};