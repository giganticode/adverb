import { commands, Disposable, window } from "vscode";
import { SUPPORTED_LANGUAGES } from "../../utils";
import { Commands } from ".";

export abstract class Command implements Disposable {
  private readonly _disposable: Disposable;

  constructor(command: Commands) {
    this._disposable = commands.registerCommand(
      command,
      (...args: any[]) => this._execute(...args),
      this
    );
  }

  dispose() {
    this._disposable.dispose();
  };

  private _execute(...args: any[]) {
    const editor = window.activeTextEditor;
    if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
      return;
    this.execute(editor, ...args)
  }

  abstract execute(...args: any[]): any;
}

// interface CommandContextParsingOptions {
//   expectsEditor: boolean;
// }

// export interface CommandBaseContext {
//   command: string;
//   editor?: TextEditor;
//   uri?: Uri;
// }

// interface CommandNodeContext extends CommandBaseContext {
//     node?: TreeItem;
// }

// type CommandContext = CommandBaseContext | CommandNodeContext;

// abstract class Command implements Disposable {
//   protected readonly contextParsingOptions: CommandContextParsingOptions = {
//     expectsEditor: false,
//   };
//   private readonly _disposable: Disposable;

//   constructor(command: Commands | Commands[]) {
//     if (typeof command === "string") {
//       this._disposable = commands.registerCommand(
//         command,
//         (...args: any[]) => this._execute(command, ...args),
//         this
//       );
//       return;
//     }

//     const subscriptions = command.map((cmd) =>
//       commands.registerCommand(
//         cmd,
//         (...args: any[]) => this._execute(cmd, ...args),
//         this
//       )
//     );
//     this._disposable = Disposable.from(...subscriptions);
//   };

//   dispose() {
//     this._disposable.dispose();
//   };

//   protected preExecute(...args: any[]): Promise<any> {
//     return this.execute(...args);
//   };

//   abstract execute(...args: any[]): any;

//   protected _execute(command: string, ...args: any[]): any {
//     const rest = Command.parseContext(
//       command,
//       { ...this.contextParsingOptions },
//       ...args
//     );
//     return this.preExecute(...rest);
//   };

//   private static parseContext(
//     command: string,
//     options: CommandContextParsingOptions,
//     ...args: any[]
//   ): [CommandContext, any[]] {
//     let editor: TextEditor | undefined = undefined;

//     let firstArg = args[0];

//     if (options.expectsEditor) {
//       if (
//         firstArg == null ||
//         (firstArg.id != null && firstArg.document?.uri != null)
//       ) {
//         editor = firstArg;
//         args = args.slice(1);
//         firstArg = args[0];
//       }

//       if (args.length > 0 && (firstArg == null || firstArg instanceof Uri)) {
//         const [uri, ...rest] = args as [Uri, any];
//         if (uri != null) {
//           // If the uri matches the active editor (or we are in a left-hand side of a diff), then pass the active editor
//           if (
//             editor == null &&
//             (uri.toString() ===
//               window.activeTextEditor?.document.uri.toString() ||
//               command.endsWith("InDiffLeft"))
//           ) {
//             editor = window.activeTextEditor;
//           }

//           const uris = rest[0];
//           if (
//             uris != null &&
//             Array.isArray(uris) &&
//             uris.length !== 0 &&
//             uris[0] instanceof Uri
//           ) {
//             return [
//               {
//                 command: command,
//                 editor: editor,
//                 uri: uri
//               },
//               rest.slice(1),
//             ];
//           }
//           return [
//             { command: command, editor: editor, uri: uri },
//             rest,
//           ];
//         }

//         args = args.slice(1);
//       } else if (editor == null) {
//         // If we are expecting an editor and we have no uri, then pass the active editor
//         editor = window.activeTextEditor;
//       }
//     }

//     if (firstArg instanceof TreeItem) {
//       const [node, ...rest] = args as [TreeItem, any];
//       return [
//         { command: command, node: node, uri: editor?.document.uri },
//         rest,
//       ];
//     }

//     return [
//       {
//         command: command,
//         editor: editor,
//         uri: editor?.document.uri,
//       },
//       args,
//     ];
//   };
// };

// export abstract class ActiveEditorCommand extends Command {
//   protected override readonly contextParsingOptions: CommandContextParsingOptions =
//     { expectsEditor: true };

//   constructor(command: Commands | Commands[]) {
//     super(command);
//   };

//   protected override preExecute(
//     context: CommandContext,
//     ...args: any[]
//   ): Promise<any> {
//     return this.execute(context.editor, context.uri, ...args);
//   };

//   protected override _execute(command: string, ...args: any[]): any {
//     return super._execute(command, undefined, ...args);
//   };

//   abstract override execute(editor?: TextEditor, ...args: any[]): any;
// };
