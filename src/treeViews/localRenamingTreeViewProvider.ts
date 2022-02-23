import { commands, Disposable, TextEditor, window } from "vscode";
import configuration from "../configuration";
import { refreshRenamings, SUPPORTED_LANGUAGES } from "../utils";
import { BaseRenamingTreeViewProvider } from "./_helpers/baseRenamingTreeViewProvider";
import { RenamingTreeItem } from "./nodes";

export class LocalRenamingTreeViewProvider extends BaseRenamingTreeViewProvider {
  constructor(){
    super("adverb.localRenamings", false);
  }

  registerCommands(): Disposable[] {
    return [
      commands.registerCommand("adverb.localRefreshRenamings", () => refreshRenamings(), this),
      commands.registerCommand("adverb.localEditRenaming", (n: RenamingTreeItem) => this.edit(n), this),
      commands.registerCommand("adverb.localDeleteRenaming", (n: RenamingTreeItem) => this.delete(n), this),
      commands.registerCommand("adverb.localActuallyRename", (n: RenamingTreeItem) => this.actuallyRename(n, this.deleteRenaming), this)
    ];
  }

  async edit(node: RenamingTreeItem) {
    const editor = window.activeTextEditor;
		if (!editor)
			return;
		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;
    const renamingConfiguration = await configuration.getRenaming(editor.document.uri, node.originalName);
    if(renamingConfiguration)
      this._edit(renamingConfiguration, async () => await configuration.updateLocalRenaming(editor.document.uri, node.originalName, renamingConfiguration));
  }

  async delete(node: RenamingTreeItem){
    const editor = window.activeTextEditor;
		if (!editor)
			return;

		await this.deleteRenaming(editor, node.originalName);
		refreshRenamings();
  }

  async deleteRenaming (editor: TextEditor, originalName: string) {
    if (originalName === "all symbol names") {
      const result = await configuration.updateLocalFileRenaming(editor.document.uri, undefined);
      if (result)
        window.showInformationMessage(`Renaming of all symbols removed.`);
    } else {
      const value = await configuration.getRenaming(editor.document.uri, originalName);
      if (value) {
        const result = await configuration.removeLocalRenaming(editor.document.uri, value);
        if (result)
          window.showInformationMessage(`Renaming ('${value.originalName}' -> '${value.newName}') successfully removed.`);
      }
    }
  };
}
