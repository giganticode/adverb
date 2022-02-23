import * as vscode from "vscode";
import * as path from "path";

export class RenamingTreeItem extends vscode.TreeItem {
    constructor(
        public originalName: string,
        public newName: string,
        public renamingTypeId: number,
    ) {
        super(newName, vscode.TreeItemCollapsibleState.None);
        this.description = originalName;
    }

    iconPath = {
        light: path.join(__filename, "..", "..", "..", "resources", "light", "symbol-string.svg"),
        dark: path.join(__filename, "..", "..", "..", "resources", "dark", "symbol-string.svg")
    };
}