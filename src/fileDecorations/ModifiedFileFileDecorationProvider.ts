import { Event, EventEmitter, FileDecoration, FileDecorationProvider, Uri, window, workspace } from "vscode";
import configuration from "../configuration";
import { Settings } from "../settings";

export class ModifiedFileFileDecorationProvider implements FileDecorationProvider {
    private _onDidChangeFileDecorations: EventEmitter<Uri | Uri[] | undefined> = new EventEmitter<Uri | Uri[] | undefined>();
    public readonly onDidChangeFileDecorations: Event<Uri | Uri[] | undefined> | undefined = this._onDidChangeFileDecorations.event;

    constructor() {
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("adverb")) {
                const editor = window.activeTextEditor;
                if (editor)
                    this._onDidChangeFileDecorations.fire(editor.document.uri);
            }
        });
    }

    public refresh(uri: Uri): void {
        this._onDidChangeFileDecorations.fire(uri);
    }

    async provideFileDecoration(uri: Uri): Promise<FileDecoration | null | undefined> {
        if (Settings.areFileDecorationsEnabled()) {
            const config = await configuration.getMergedConfigurationForCurrentFile(uri);
            if (config?.fileRenaming || (config?.renamings && Object.values(config?.renamings).length > 0))
                return new FileDecoration("🚧");
        }
        return null;
    };
};