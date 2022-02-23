import * as vscode from "vscode";
import { Cache } from "./cache";
import { MethodSummaryCodeLensProvider } from "./codeLens";
import { FoldCommand, FoldOrCommentCommand, RenameAllCommand, RenameSingleCommand } from "./commands";
import { registerEvents } from "./events";
import { ModifiedFileFileDecorationProvider } from "./fileDecorations";
import { Settings } from "./settings";
import { GlobalRenamingTreeViewProvider, LocalRenamingTreeViewProvider } from "./treeViews";
import { initialize, refreshRenamings, SUPPORTED_LANGUAGES } from "./utils";

export function activate(context: vscode.ExtensionContext) {
  Settings.readSettings();
  Cache.initialize(context);

  let globalTreeViewProvider = new GlobalRenamingTreeViewProvider();
  let localTreeViewProvider = new LocalRenamingTreeViewProvider();
  let fileDecorationProvider = new ModifiedFileFileDecorationProvider();
  initialize(globalTreeViewProvider, localTreeViewProvider, fileDecorationProvider)

  if (Settings.isFoldingEnabled())
    context.subscriptions.push(new FoldCommand());

  if (Settings.isRenamingEnabled()) {
    context.subscriptions.push(new RenameAllCommand());
    context.subscriptions.push(new RenameSingleCommand());
    if (Settings.areTreeViewsEnabled()) {
      context.subscriptions.push(globalTreeViewProvider);
      context.subscriptions.push(localTreeViewProvider);
    }
  }

  if (Settings.areCodeLensEnabled()){
    vscode.languages.registerCodeLensProvider(SUPPORTED_LANGUAGES, new MethodSummaryCodeLensProvider());
    context.subscriptions.push(new FoldOrCommentCommand());
  }
  if (Settings.areFileDecorationsEnabled())
    vscode.window.registerFileDecorationProvider(fileDecorationProvider);

  registerEvents(context);

  refreshRenamings();
};

export function deactivate() { };
