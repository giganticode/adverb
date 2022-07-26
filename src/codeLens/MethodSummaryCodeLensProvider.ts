import { CodeLens, CodeLensProvider, Event, EventEmitter, ProviderResult, Range, TextDocument, workspace } from "vscode";
import { getCodeSummaries } from "../api";
import ast from "../ast";
import { Commands } from "../commands";
import { Settings } from "../settings";

export class MethodSummaryCodeLensProvider implements CodeLensProvider {
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("adverb"))
                this._onDidChangeCodeLenses.fire();
        });

        workspace.onDidSaveTextDocument(() => {
            this._onDidChangeCodeLenses.fire();
        });
    };

    public provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
        if (Settings.areCodeLensEnabled() && !document.isDirty) {
            const ranges: Range[] = ast.getFunctionDeclarations(document);
            const codeParts = ranges.map(range => {
                let content: string = "";
                for (let i = range.start.line; i <= range.end.line; i++) {
                    content += document.lineAt(i).text + "\n";
                }
                return content;
            });
            return getCodeSummaries(codeParts)
                .then((summaries) => {
                    return ranges.map((range, i) => {
                        const summary = summaries![i];
                        return new CodeLens(range, {
                            title: summary,
                            tooltip: "Click to fold or to add summary as comment",
                            command: Commands.FoldOrComment,
                            arguments: [range.start.line, range.end.line, summary]
                        });
                    });
                });
        }
        return undefined;
    }
}