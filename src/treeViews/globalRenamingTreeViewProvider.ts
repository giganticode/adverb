import { commands, Disposable, window } from "vscode";
import configuration from "../configuration";
import { BaseRenamingTreeViewProvider } from "./_helpers/baseRenamingTreeViewProvider";
import { RenamingTreeItem } from "./nodes";
import { refreshRenamings } from "../utils";

export class GlobalRenamingTreeViewProvider extends BaseRenamingTreeViewProvider {
  constructor(){
    super("adverb.globalRenamings", true);
  }

  registerCommands(): Disposable[] {
    return [
      commands.registerCommand("adverb.globalRefreshRenamings", () => refreshRenamings(), this),
      commands.registerCommand("adverb.globalEditRenaming", (n: RenamingTreeItem) => this.edit(n), this),
      commands.registerCommand("adverb.globalDeleteRenaming", (n: RenamingTreeItem) => this.delete(n), this),
      commands.registerCommand("adverb.globalActuallyRename", (n: RenamingTreeItem) => this.actuallyRename(n), this)
    ];
  }

  async edit(node: RenamingTreeItem) {
    const renamingConfiguration = await configuration.getGlobalRenaming(node.originalName);
    if(renamingConfiguration)
      this._edit(renamingConfiguration, async () => await configuration.updateGlobalRenaming(node.originalName, renamingConfiguration));
  }

  async delete(node: RenamingTreeItem){
    if (node.originalName === "all symbol names") {
			const result = await configuration.updateGlobalFileRenaming(undefined);
			if (result)
				window.showInformationMessage(`Renaming of all symbols removed.`);
		} else {
			const value = await configuration.getGlobalRenaming(node.originalName);
			if (value) {
				const result = await configuration.removeGlobalRenaming(value);
				if (result)
					window.showInformationMessage(`Renaming ('${value.originalName}' -> '${value.newName}') successfully removed.`);
			}
		}
		refreshRenamings();
  }
}
