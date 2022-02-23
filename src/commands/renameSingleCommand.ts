import { ProgressLocation, TextEditor, window } from "vscode";
import ast from "../ast";
import configuration from "../configuration";
import { getRenamingTypes, RenamingConfiguration } from "../models";
import { refreshRenamings, getCodeForRange, getAllLinesContainingSymbol } from "../utils";
import { Command, Commands, CustomQuickPickItem, MultiStepInput } from "./_helpers";

interface State {
  scope: CustomQuickPickItem;
  renamingTechnique: CustomQuickPickItem;
  newName: string;
}

export class RenameSingleCommand extends Command {
  constructor() {
    super(Commands.RenameSingle);
  }

  async execute(editor: TextEditor, ...args: any[]) {
    const cursorPosition = editor.selection.start;
    const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
    if (!wordRange) {
      window.showErrorMessage("No symbol to rename found.");
      return;
    }
    const originalName = editor.document.getText(wordRange);
    if (!originalName) {
      window.showErrorMessage("No symbol to rename found.");
      return;
    }
    if (!ast.checkIfNameIsACodeSymbol(editor, originalName)) {
      window.showErrorMessage(`'${originalName}' is not a code symbol.`);
      return;
    }

    const isFunction = ast.getRangeOfFunctionSymbol(editor, originalName);
    const renamingTypes = isFunction ? getRenamingTypes() : getRenamingTypes().filter(x => !x.onlyForFunctionNames);
    const code = isFunction ? getCodeForRange(editor.document, isFunction) : await getAllLinesContainingSymbol(editor, cursorPosition);

    const newNames: { [key: number]: string } = {};
    async function getNewNames() {
      for (const x of renamingTypes.sort((a, b) => b.id - a.id)) {
        if (x.getNewNameFunction)
          newNames[x.id] = await x.getNewNameFunction(originalName, code) ?? "";
      }
    };
    getNewNames();

    const title = "Rename code symbol";
    const state = {} as Partial<State>;

    await MultiStepInput.run(input => pickScope(input, state)).catch(console.error);

    async function pickScope(input: MultiStepInput, state: Partial<State>) {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps: 3,
        placeholder: "Choose the scope of your renaming",
        items: ["Local (current file)", "Global (whole workspace)"].map((label, i) => ({ id: i == 1, label: label })),
        activeItem: state.scope,
        shouldResume: shouldResume
      });
      state.scope = pick;
      return (input: MultiStepInput) => pickRenamingTechnique(input, state);
    };
    async function pickRenamingTechnique(input: MultiStepInput, state: Partial<State>) {
      const pick = await input.showQuickPick({
        title,
        step: 2,
        totalSteps: 3,
        placeholder: "Choose a renaming technique",
        items: renamingTypes.map(x => ({ id: x.id, label: x.description, detail: (newNames[x.id] ? `=> ${newNames[x.id]}` : "") })),
        activeItem: state.renamingTechnique,
        shouldResume: shouldResume
      });
      state.renamingTechnique = pick;
      if (!((pick.id as number) in newNames)) {
        const technique = renamingTypes.find(x => x.id === pick.id);
        if (technique?.getNewNameFunction !== undefined) {
          return window.withProgress({
            location: ProgressLocation.Notification,
            title: "Getting new symbol name...",
            cancellable: false
          }, async () => {
            newNames[pick.id as number] = await technique!.getNewNameFunction!(originalName, code) ?? "";
            return (input: MultiStepInput) => inputName(input, state);
          });
        }
      }
      return (input: MultiStepInput) => inputName(input, state);
    };
    async function inputName(input: MultiStepInput, state: Partial<State>) {
      if (!newNames[state.renamingTechnique!.id as number]) {
        window.showErrorMessage("Error getting new name for symbol.");
        return;
      }
      state.newName = await input.showInputBox({
        title,
        step: 3,
        totalSteps: 3,
        value: state.newName || (newNames[state.renamingTechnique!.id as number] ?? ""),
        prompt: "New symbol name for '" + originalName + "'",
        validate: async (newName) => newName === originalName ? "Please choose a different name." : undefined,
        shouldResume: shouldResume
      });
    }
    function shouldResume() {
      return new Promise<boolean>((resolve, reject) => {
      });
    }

    if (!state.newName)
      return;

    const newName = state.newName!;
    const scope = state.scope!;
    const renamingType = state.renamingTechnique!;

    if (newName && newName !== originalName) {
      const renamingConfiguration: RenamingConfiguration = new RenamingConfiguration(originalName, newName, renamingType.id as number);
      let update: boolean;
      if (scope.id as boolean)
        update = await configuration.updateGlobalRenaming(originalName, renamingConfiguration);
      else
        update = await configuration.updateLocalRenaming(editor.document.uri, originalName, renamingConfiguration);
      if (update) {
        refreshRenamings();
        window.showInformationMessage(`'${originalName}' successfully renamed to '${newName}'.`);
      }
    }
  }
}
