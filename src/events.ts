import {
  ExtensionContext,
  TextEditorVisibleRangesChangeEvent,
  window,
  workspace,
} from "vscode";
import ast from "./ast";
import { Settings } from "./settings";
import { clearFoldings, getPositionsFromRange, refreshFoldings, refreshRenamings } from "./utils";

export const registerEvents = (context: ExtensionContext) => {
  window.onDidChangeActiveTextEditor(() => {
    refreshRenamings();
  }, null, context.subscriptions);

  window.onDidChangeTextEditorSelection((event) => {
    const selectedPositions = event.selections.length > 0 ? getPositionsFromRange(event.selections[0].start, event.selections[0].end) : [];
    ast.refreshRenamings(event.textEditor, selectedPositions);
    ast.highlightSymbolDefinitions(event.textEditor, selectedPositions);
  }, null, context.subscriptions);

  window.onDidChangeTextEditorVisibleRanges((event: TextEditorVisibleRangesChangeEvent) => {
    refreshFoldings(event.textEditor, event.visibleRanges);
  });

  workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("adverb")) {
      Settings.readSettings();  
      refreshRenamings();
      const editor = window.activeTextEditor;
      if (editor)
        refreshFoldings(editor, editor.visibleRanges);
    }
  }, null, context.subscriptions);

  workspace.onDidChangeTextDocument((event) => {
    const editor = window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;
    if (event.contentChanges.length === 1)
      ast.refreshRenamings(editor, event.contentChanges.map(x => x.range.start));
    else
      ast.refreshRenamings(editor);
    clearFoldings(editor, Math.min(...event.contentChanges.map(x => x.range.start.line)));
  }, null, context.subscriptions);
};