import { Range } from "vscode";

export class Folding {
    constructor(public range: Range, public message: string) { }
};