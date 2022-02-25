import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { ExtensionContext, Position, Selection, TextEditor, TextEditorRevealType, Uri, ViewColumn, WebviewPanel, window, workspace } from "vscode";
import { Settings } from "../settings";
import { Command, Commands } from "./_helpers";

interface DirectoryMap {
  [key: string]: Item;
}

interface Item {
  path: string;
  name: string;
  relativePath: string;
  lines: number;
  content: string;
  match: object | null | false;
  lastModified: Date;
  hash: string;
}

export class SearchCommand extends Command {
  private overviewPanel: WebviewPanel | undefined = undefined;
  private cachedWebViewContent: string | null = null;
  private directoryMap: DirectoryMap = {};
  private context: ExtensionContext;
  private dataArray: Item[] = [];

  constructor(context: ExtensionContext) {
    super(Commands.Search);
    this.context = context;
  }

  async execute(editor: TextEditor, ...args: any[]) {
    let columnToShowIn: ViewColumn = (editor ? editor.viewColumn : ViewColumn.One) as ViewColumn;

    if (this.overviewPanel) {
      // If we already have a panel, show it in the target column
      this.overviewPanel.reveal(columnToShowIn);
    } else {
      // Otherwise, create a new panel
      this.overviewPanel = window.createWebviewPanel(
        "search",
        "Search",
        columnToShowIn,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            Uri.file(path.join(this.context.extensionPath, "resources")),
            Uri.file(path.join(this.context.extensionPath, "images", "minimap")),
          ]
        }
      );

      this.overviewPanel.webview.html = this.getCachedWebViewContent();

      this.overviewPanel.onDidChangeViewState(e => {
        if (e.webviewPanel.visible && e.webviewPanel.active) {
          (this.overviewPanel as WebviewPanel).webview.html = this.getCachedWebViewContent();
        }
      }, null, this.context.subscriptions
      );

      this.setupMessageListener();

      // Reset when the current panel is closed
      this.overviewPanel.onDidDispose(() => { this.overviewPanel = undefined }, null, this.context.subscriptions);
    }
  }

  private getCachedWebViewContent() {
    if (this.cachedWebViewContent === null) {
      this.cachedWebViewContent = this.getWebviewContent();
    }
    return this.cachedWebViewContent;
  }

  private getWebviewContent() {
    if (!workspace.workspaceFolders)
      return "No workspace root defined";
  
    const resourcePath = path.resolve(this.context.extensionPath, "resources");
    this.dataArray = [];
    this.initDirectoryMap();
  
    for (const key in this.directoryMap) {
      const element = this.directoryMap[key];
      this.dataArray.push(element);
    }
  
    const htmlPath = this.context.asAbsolutePath("./resources/search.html");
    const fileContent = fs.readFileSync(htmlPath).toString();
    const html = fileContent.replace(/script src="([^"]*)"/g, (match, src) => {
      const realSource = "vscode-resource:" + path.resolve(resourcePath, src);
      return `script src="${realSource}"`;
    }).replace(/link href="(\.\/[^"]*)"/g, (match, src) => {
      const realSource = "vscode-resource:" + path.resolve(resourcePath, src);
      return `link href="${realSource}"`;
    });
  
    return html;
  }

  private initDirectoryMap() {
    this.directoryMap = {} as DirectoryMap;
    const rootItem = {} as Item;
    rootItem.name = "root";
    rootItem.path = workspace.workspaceFolders![0].uri.fsPath;
    rootItem.relativePath = "root";
    this.scanItem(rootItem);
  }

  private scanItem(item: Item) {
    try {
      if (Settings.getDirectoriesToExclude().indexOf(item.name) > -1)
        return;

      const files = fs.readdirSync(item.path);

      files.forEach((file: any) => {
        let relativePath = path.join(item.relativePath, file);
        let absolutePath = path.join(item.path, file);
        let newItem = {} as Item;
        newItem.name = file;
        newItem.relativePath = relativePath;
        newItem.path = absolutePath;
        newItem.match = null;

        if (fs.statSync(absolutePath).isDirectory()) {
          this.scanItem(newItem);
        } else {
          let extension = path.extname(file);
          if (Settings.getFileTypesToExclude().indexOf(extension) > -1) {
            return;
          }
          let content = fs.readFileSync(absolutePath).toString();
          let lineCount = content.split(/\r\n|\r|\n/).length;
          newItem.content = content;
          newItem.lines = lineCount;
          newItem.lastModified = fs.statSync(absolutePath).mtime;
          // newItem.hash = Md5.hashStr(absolutePath) as string;
          this.directoryMap[relativePath] = newItem;
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  private getSearchResultFromWebServie(item: Item, search_phrase: string) {
    const url = Settings.getSearchApiUrl();

    item.match = [];
    axios.post(url, {
      content: item.content,
      search: search_phrase
    }).then((response: any) => {
      console.log("got search result");
      console.log(response.data);
    }).catch((error: any) => {
      console.log("Search error");
      console.log(error);
      item.match = {};
    }).finally(() => {
      const index = Object.keys(this.directoryMap).indexOf(item.relativePath);
      if (this.overviewPanel) {
        this.overviewPanel.webview.postMessage({ command: "searchResults", data: { index: index, match: item.match } });
      }
    });
  }

  private setupMessageListener() {
    if (this.overviewPanel) {
      this.overviewPanel.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case "init":
              // send files to webview
              this.overviewPanel!.webview.postMessage({
                command: "init",
                data: this.dataArray,
                cachePath: path.join(this.context.extensionPath, "images", "minimap") + "/",
              });
              break;
            case "openFile":
              const filePath = message.path;
              const openPath = Uri.file(filePath); //A request file path
              workspace.openTextDocument(openPath).then(doc => {
                window.showTextDocument(doc).then((textEditor: TextEditor) => {
                  if (message.line !== null) {
                    let moveToLine = parseInt(message.line);
                    const documentLineCount = textEditor.document.lineCount;
                    if (moveToLine > documentLineCount - 1)
                      moveToLine = documentLineCount - 1;
                    if (moveToLine < 0)
                      moveToLine = 0;
                    const moveToCharactor = textEditor.document.lineAt(moveToLine).firstNonWhitespaceCharacterIndex;
                    const newPosition = new Position(moveToLine, moveToCharactor);
                    textEditor.selection = new Selection(newPosition, newPosition);
                    textEditor.revealRange(textEditor.selection, TextEditorRevealType.InCenter);
                  }
                });
              });
              break;
            case "search":
              const search = message.value;
              for (const key in this.directoryMap) {
                const item = this.directoryMap[key];
                this.getSearchResultFromWebServie(item, search);
              }
              break;
          }
        },
        undefined,
        this.context.subscriptions
      );
    }
  }
}
