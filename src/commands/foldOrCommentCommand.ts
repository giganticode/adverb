import { commands, Position, TextEditor, window } from "vscode";
import { Command, Commands } from "./_helpers";
import { Settings } from "../settings";

export class FoldOrCommentCommand extends Command {
  constructor() {
    super(Commands.FoldOrComment);
  }

  async execute(editor: TextEditor, ...args: any[]) {
    let start = args[0] as number;
    let end = args[1] as number;
    let summary = args[2] as string;

    if(Settings.isFoldingEnabled()){
        const result = await window.showQuickPick(["Fold function body and show summary", "Add summary as comment/documentation"], {canPickMany: false});
        if(result){
            if(result === "Fold function body and show summary"){
                commands.executeCommand(Commands.Fold, start, end, summary);
            }else{
                this.commentFile(editor, start, summary);
            }
        }
    }else{
        this.commentFile(editor, start, summary);
    }
  }

  private commentFile(editor: TextEditor, start: number, summary: string) {
    editor.edit(editBuilder => {
        editBuilder.insert(new Position(start, 0), `/**\n * ${summary}\n */\n`);
    });
  }
}