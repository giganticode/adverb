import { commands, TextEditor, window, workspace, WorkspaceEdit } from "vscode";
import ast from "../../ast";
import { getRenamingTypes, RenamingConfiguration } from "../../models";
import { GlobalConfiguration } from "../../models/GlobalConfiguration";
import configuration from "../../configuration";
import { SUPPORTED_LANGUAGES, refreshRenamings } from "../../utils";
import { RenamingTreeItem } from "../nodes";
import { BaseTreeViewProvider } from ".";

export abstract class BaseRenamingTreeViewProvider extends BaseTreeViewProvider<RenamingTreeItem> {
  constructor(protected id: string, protected isGlobal: boolean) {
    super(id);
  }

  async getChildren(element?: RenamingTreeItem): Promise<RenamingTreeItem[]> {
    if (element || (!this.isGlobal && !this.uri)) return [];

    let fileConfig: GlobalConfiguration | undefined;
    if (this.isGlobal)
      fileConfig = await configuration.getGlobalConfiguration();
    else
      fileConfig = await configuration.getLocalConfiguration(this.uri!);
    if (!fileConfig) return [];

    const renamings = fileConfig.renamings;
    const result: RenamingTreeItem[] = [];
    if (fileConfig.fileRenaming) {
      const renamingType = getRenamingTypes().find((x) => x.id === fileConfig!.fileRenaming);
      if (renamingType)
        result.push(new RenamingTreeItem("all symbol names", renamingType.description, fileConfig.fileRenaming));
    }
    if (renamings) {
      Object.keys(renamings).forEach((x) => {
        const value = renamings[x];
        result.push(new RenamingTreeItem(value.originalName, value.newName, value.renamingTypeId));
      });
    }
    return result;
  }

  async _edit(renamingConfiguration: RenamingConfiguration, updateRenaming: () => Promise<boolean>) {
    const newName = await window.showInputBox({
      title: `Enter a new name for '${renamingConfiguration.newName}':`,
      value: renamingConfiguration.newName,
      validateInput: (value) => value === renamingConfiguration.newName ? "Please choose a new name." : undefined,
    });
    if (newName) {
      renamingConfiguration.newName = newName;
      const result = await updateRenaming();
      if (result) {
        refreshRenamings();
        window.showInformationMessage(`'${renamingConfiguration.originalName}' successfully updated to '${newName}'.`);
      }
    }
  }

  async actuallyRename(node: RenamingTreeItem, deleteRenaming?: (editor: TextEditor, originalName: string) => Promise<void>) {
    const editor = window.activeTextEditor;
    if (!editor) return;
    if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId)) return;

    window.showInformationMessage("Do you really want to rename the code symbol in the selected way?", ...["Yes", "No"])
      .then(async (answer) => {
        if (answer === "Yes") {
          if (node.originalName === "all symbol names") {
            window.showErrorMessage("Unfortunately, all symbol names cannot be renamed.");
            return;
          }

          let position = ast.getSymbolPosition(editor, node.originalName);
          if (position) {
            while (position) {
              await commands.executeCommand<WorkspaceEdit>(
                "vscode.executeDocumentRenameProvider", editor.document.uri, position, node.newName
              )
                .then(async (edit) => {
                  if (edit?.size && edit.size > 0) await workspace.applyEdit(edit);
                });
              position = ast.getSymbolPosition(editor, node.originalName);
            }
            if (deleteRenaming) await deleteRenaming(editor, node.originalName);
            refreshRenamings();
          }
        }
      });
  }
}
