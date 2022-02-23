import axios from "axios";
import { window, ProgressLocation } from "vscode";
import { Settings } from "../settings";

export const getSymbolName = async (symbolName: string, code: string, showProgress: boolean = false): Promise<string | undefined> => {
    let modelType: number;
    switch (Settings.getRenamingModelType()) {
        case "huggingface/CodeBERTa":
            modelType = 0;
            break;
        case "microsoft/codebert-base-mlm":
            modelType = 1;
            break;
        default: //"Salesforce/codet5-base"
            modelType = 2;
            break;
    }
    if (modelType === 2){
        code = code.replace(symbolName, "<extra_id_0>");
        // code = code.replace(new RegExp(symbolName, "g"), "<extra_id_0>");
        // code = code.replace(new RegExp("\n", "g"), "<sep>");
    }
    else
        code = code.replace(symbolName, "<mask>");
    return showProgress ?
        window.withProgress({
            location: ProgressLocation.Notification,
            title: "Getting symbol name...",
            cancellable: false
        }, async () => {
            return new Promise<string | undefined>(resolve => resolve(_getSymbolName(code, modelType)));
        })
        :
        _getSymbolName(code, modelType);
};

const _getSymbolName = async (code: string, modelType: number): Promise<string | undefined> => {
    const result = await axios
        .post(Settings.getNameApiUrl(), {
            content: code,
            modelType: modelType
        })
        .then((response: any) => {
            return response.data["result"];
        })
        .catch((error: any) => {
            console.error(error);
            window.showErrorMessage("API request for code name failed.");
            return undefined;
        });
    return result;
};