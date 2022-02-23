import { commands, TextEditor, window } from "vscode";
import { getCodeSummary } from "../api";
import { addFolding } from "../utils";
import { Command, Commands } from "./_helpers";

export class FoldCommand extends Command {
  constructor() {
    super(Commands.Fold);
  }

  async execute(editor: TextEditor, ...args: any[]) {
    let initialMin = args && args.length >= 2 ? (args[0] as number) : undefined;
    let initialMax = args && args.length >= 2 ? (args[1] as number) : undefined;
    let summary: string | undefined = args && args.length === 3 ? (args[2] as string) : undefined;

    if (!initialMin && !initialMax && !editor.selection.isSingleLine) {
      initialMin = editor.selection.start.line;
      initialMax = editor.selection.end.line;
    }

    const lineRange = await this.askLineRange(editor, initialMin, initialMax);
    if (!lineRange)
      return;

    const [start, end] = lineRange;
    if (!summary) {
      let content: string = "";
      for (let i = start; i <= end; i++) {
        content += editor.document.lineAt(i).text + "\n";
      }
      summary = await getCodeSummary(content, true);
    }
    if (summary) {
      await addFolding(editor, start, end, summary);
      await commands.executeCommand("editor.fold", { levels: 1, selectionLines: [start] });
      window.showInformationMessage(`Folding ${start + 1}-${end + 1} successfully added.`);
    }
  }

  private async askLineRange(editor: TextEditor, initialMin: number | undefined, initialMax: number | undefined): Promise<[number, number] | undefined> {
    if (initialMin && initialMax && initialMin < initialMax)
      return [initialMin, initialMax];
    let min = 1;
    let max = editor.document.lineCount;
    const startInput = await window.showInputBox({
      title: `Enter the starting line number:`, value: (initialMin ?? min).toString(),
      validateInput: (value: string) => {
        if (isNaN(parseInt(value))) return "Please enter a valid line number.";
        if (parseInt(value) < min! || parseInt(value) > max! - 1)
          return "Please choose a valid line number.";
        return undefined;
      },
    });
    if (!startInput) return undefined;
    const start = parseInt(startInput) - 1;
    const endInput = await window.showInputBox({
      title: `Enter the ending line number:`, value: (initialMax ?? start + 2).toString(),
      validateInput: (value: string) => {
        if (isNaN(parseInt(value))) return "Please enter a valid line number.";
        if (parseInt(value) < start + 2 || parseInt(value) > max!)
          return "Please choose a valid line number.";
        return undefined;
      },
    });
    if (!endInput) return undefined;
    const end = parseInt(endInput) - 1;
    return [start, end];
  };
}
