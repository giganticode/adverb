import { TextEditor, window } from "vscode";
import configuration from "../configuration";
import { getRenamingTypes } from "../models";
import { refreshRenamings } from "../utils";
import { Command, Commands, CustomQuickPickItem, MultiStepInput } from "./_helpers";

interface State {
  scope: CustomQuickPickItem;
  renamingTechnique: CustomQuickPickItem;
}

export class RenameAllCommand extends Command {
  constructor() {
    super(Commands.RenameAll);
  }

  async execute(editor: TextEditor, ...args: any[]) {
    const renamingTypes = getRenamingTypes().filter((x) => x.onlyForSingleRenaming === false);

    const title = "Rename all code symbols";
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
        items: renamingTypes.map(x => ({ id: x.id, label: x.description })),
        activeItem: state.renamingTechnique,
        shouldResume: shouldResume
      });
      state.renamingTechnique = pick;
    };
    function shouldResume() {
      return new Promise<boolean>((resolve, reject) => {
      });
    }
    
    const renamingType = renamingTypes.find((x) => x.id === state.renamingTechnique?.id);
    if (renamingType) {
      let update: boolean;
      if (state.scope?.id as boolean)
        update = await configuration.updateGlobalFileRenaming(renamingType);
      else
        update = await configuration.updateLocalFileRenaming(editor.document.uri, renamingType);
      if (update) {
        refreshRenamings();
        window.showInformationMessage(`All symbols successfully renamed.`);
      }
    }
  }
}
