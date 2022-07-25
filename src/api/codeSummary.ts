import axios from "axios";
import { window } from "vscode";
import { Settings } from "../settings";

export const getCodeSummary = async (code: string): Promise<string | undefined> => {
    return await axios
        .post(Settings.getSummaryApiUrl(), {
            content: code,
        })
        .then((response: any) => {
            return response.data["result"];
        })
        .catch((error: any) => {
            console.error(error);
            window.showErrorMessage("API request for code summary failed.");
            return undefined;
        });
};

export const getCodeSummaries = async (code_parts: string[]): Promise<string | undefined> => {
    return await axios
        .post(Settings.getSummariesApiUrl(), {
            content: code_parts,
        })
        .then((response: any) => {
            return response.data["result"];
        })
        .catch((error: any) => {
            console.error(error);
            window.showErrorMessage("API request for code summary failed.");
            return undefined;
        });
};