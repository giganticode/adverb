import * as vscode from "vscode";
import { Cache } from "./cache";
import { MethodSummaryCodeLensProvider } from "./codeLens";
import { FoldCommand, FoldOrCommentCommand, RenameAllCommand, RenameSingleCommand, SearchCommand } from "./commands";
import { registerEvents } from "./events";
import { ModifiedFileFileDecorationProvider } from "./fileDecorations";
import { Settings } from "./settings";
import { GlobalRenamingTreeViewProvider, LocalRenamingTreeViewProvider } from "./treeViews";
import { refreshRenamings } from "./utils";

export const globalTreeViewProvider = new GlobalRenamingTreeViewProvider();
export const localTreeViewProvider = new LocalRenamingTreeViewProvider();
export const fileDecorationProvider = new ModifiedFileFileDecorationProvider();

export const SUPPORTED_LANGUAGES = ["javascript", "typescript"];

export function activate(context: vscode.ExtensionContext) {
  Settings.readSettings();
  Cache.initialize(context);

  context.subscriptions.push(new FoldCommand());
  context.subscriptions.push(new RenameAllCommand());
  context.subscriptions.push(new RenameSingleCommand());
  context.subscriptions.push(new SearchCommand(context));

  // context.subscriptions.push(globalTreeViewProvider);
  // context.subscriptions.push(localTreeViewProvider);

  // if (Settings.areCodeLensEnabled()) {
  //   vscode.languages.registerCodeLensProvider(SUPPORTED_LANGUAGES, new MethodSummaryCodeLensProvider());
  //   context.subscriptions.push(new FoldOrCommentCommand());
  // }
  // if (Settings.areFileDecorationsEnabled())
  //   vscode.window.registerFileDecorationProvider(fileDecorationProvider);

  // registerEvents(context);

  // refreshRenamings();
};

export function deactivate() { };
