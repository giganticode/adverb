import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { Md5 } from "ts-md5";
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
  private CACHE_PATH: string;
  private index_name: string = "adverb";

  constructor(context: ExtensionContext) {
    super(Commands.Search, false, false);
    this.context = context;
    this.CACHE_PATH = path.resolve(this.context.extensionPath, "resources", "images", "minimap");

    this.getCachedWebViewContent();
    if (Settings.getSearchModelType() === "stanford/ColBERT")
      this.indexAllFiles();

    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("adverb"))
        if (Settings.getSearchModelType() === "stanford/ColBERT")
          this.indexAllFiles();
    });
  }

  private async indexAllFiles() {
    const url = Settings.getSearchIndexApiUrl();
    axios.post(url, {
      content: JSON.stringify(this.dataArray),
      index_name: this.index_name
    }).then((response: any) => {
    }).catch((err) => {
      console.log(err);
    })
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
        "Search code in NL",
        columnToShowIn,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            Uri.file(path.join(this.context.extensionPath, "resources")),
            Uri.file(path.join(this.context.extensionPath, "resources", "images", "minimap"))
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

  private generateSVGFromPath(filePath: string, hash: string) {
    let extension = path.extname(filePath);
    if (Settings.getFileTypesToExclude().indexOf(extension) > -1)
      return;

    let content = fs.readFileSync(filePath).toString();
    let lines = content.split(/\r\n|\r|\n/);
    let lineCount = lines.length;
    content = content.replace("\t", "    ");
    let lastModified = fs.statSync(filePath).mtime;

    // Check if cached file exists
    if (!fs.existsSync(this.CACHE_PATH))
      fs.mkdirSync(this.CACHE_PATH, { recursive: true });
    let cachePath = path.join(this.CACHE_PATH, hash + ".svg");
    if (!fs.existsSync(cachePath) || fs.statSync(cachePath).mtime < lastModified) {
      // Cached file does not exists or is outdated -> create new one
      let svg = `<svg width="75" height="${lineCount * 3}" viewPort="0 0 32 48" xmlns="http://www.w3.org/2000/svg">`;

      let y = 1;
      lines.forEach(function (line: string) {
        let indent = (line.match(/^\s*/) || [""])[0].length;
        let length = Math.min(line.length - indent, 75);
        svg += `<polygon points="${indent},${y} ${length},${y} ${length},${y + 2} ${indent},${y + 2}" fill="rgba(200,200,200,80)"/>`;
        y += 3;
      });

      svg += '</svg>';

      fs.writeFileSync(cachePath, svg);
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
    this.initCache();

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

  private initCache() {
    try {
      for (let file in this.directoryMap) {
        let item = this.directoryMap[file];
        this.generateSVGFromPath(item.path, item.hash);
      }
    } catch {
    }
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
          newItem.hash = Md5.hashStr(absolutePath) as string;
          this.directoryMap[relativePath] = newItem;
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  private getSearchResultFromColBERT(search_phrase: string) {
    if (!this.overviewPanel)
      return;
    const url = Settings.getSearchApiUrl();
    const batch_size = 30;
    const results = this.dataArray.map((x, i) => ({ index: i, match: [], batch_size: batch_size }));
    axios.post(url, {
      model: "colBERT",
      search: search_phrase,
      content: JSON.stringify(this.dataArray),
      index_name: this.index_name
    }).then((response: any) => {
      if (response.data && (response.data as []).length > 0) {
        const stringl = (response.data as []).map(x => path.basename(this.dataArray[x["index"]]["relativePath"]) + " - " + x["score"] + "\n");
        console.log(stringl.toString());
        results.forEach(item => {
          const result = (response.data as []).find(x => x["index"] === item.index);
          if (result) {
            item.match = result["match"];
            item.batch_size = result["lines"];
          }
          this.overviewPanel!.webview.postMessage({ command: "searchResults", data: item });
        });
      }
    }).catch((err) => {
      console.log(err);
      results.forEach(item =>
        this.overviewPanel!.webview.postMessage({ command: "searchResults", data: item })
      );
    });
  }

  private getSearchResultFromCodeBERT(search_phrase: string) {
    if (!this.overviewPanel)
      return;
    const url = Settings.getSearchApiUrl();
    const batch_size = 40;
    const results = this.dataArray.map((x, i) => ({ index: i, relativePath: x.relativePath, match: [], batch_size: batch_size }));
    axios.post(url, {
      model: "codeBERT",
      search: search_phrase,
      content: JSON.stringify(this.dataArray),
      batch_size: batch_size
    }).then((response: any) => {
      if (response.data && (response.data as []).length > 0) {
        const stringl = (response.data as []).map(x => path.basename(x["relativePath"]) + " - " + JSON.stringify(x["match"]) + "\n");
        console.log(stringl.toString());
        results.forEach(item => {
          const result = (response.data as []).find(x => x["relativePath"] === item.relativePath);
          if (result)
            item.match = (result["match"] as []).map(x => x["line"]);
          this.overviewPanel!.webview.postMessage({ command: "searchResults", data: item });
        });
      }
    }).catch((err) => {
      console.log(err);
      results.forEach(item =>
        this.overviewPanel!.webview.postMessage({ command: "searchResults", data: item })
      );
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
                cachePath: this.CACHE_PATH.replace(new RegExp("\\\\"), "/") + "/"
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
              if (Settings.getSearchModelType() === "stanford/ColBERT")
                this.getSearchResultFromColBERT(search);
              else
                this.getSearchResultFromCodeBERT(search);
              break;
          }
        },
        undefined,
        this.context.subscriptions
      );
    }
  }
}
