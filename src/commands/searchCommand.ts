import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { Md5 } from "ts-md5";
import { ExtensionContext, Position, Selection, TextEditor, TextEditorRevealType, Uri, ViewColumn, WebviewPanel, window, workspace } from "vscode";
import ast from "../ast";
import { SUPPORTED_LANGUAGES } from "../extension";
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
  matches: object | null | false;
  lastModified: Date;
  hash: string;
  imagePath: string;
}

export class SearchCommand extends Command {
  private overviewPanel: WebviewPanel | undefined = undefined;
  private cachedWebViewContent: string | null = null;
  private directoryMap: DirectoryMap = {};
  private context: ExtensionContext;
  private dataArray: Item[] = [];
  private CACHE_PATH: string;
  private index_name: string = "adverb";
  private lastIndexing: string | undefined = undefined;

  constructor(context: ExtensionContext) {
    super(Commands.Search, false, false);
    this.context = context;
    this.CACHE_PATH = path.join(this.context.extensionPath, "resources", "images", "minimap");

    this.getCachedWebViewContent().then(e => {
      if (Settings.getSearchModelType() === "stanford/ColBERT")
        this.indexAllFiles();
    });

    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("adverb"))
        if (Settings.getSearchModelType() !== "stanford/ColBERT") //old value check...
          this.indexAllFiles();
    });
  }

  private async indexAllFiles() {
    const url = Settings.getSearchIndexApiUrl();
    const data = await this.getSearchParts();
    window.setStatusBarMessage("Workspace indexing started...");
    this.overviewPanel?.webview.postMessage({
      command: "indexing"
    });
    axios.post(url, {
      content: JSON.stringify(data), index_name: this.index_name
    }).then((response: any) => {
    }).catch((err) => {
    }).finally(() => {
      const d = new Date();
      const dateTimeString = d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear() + " " +
        d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
      this.lastIndexing = dateTimeString;
      this.overviewPanel?.webview.postMessage({
        command: "lastIndex",
        data: this.lastIndexing
      });
      window.setStatusBarMessage("Workspace successfully indexed (" + dateTimeString + ").");
    });
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
            Uri.file(this.CACHE_PATH)
          ]
        }
      );

      this.overviewPanel.webview.html = await this.getCachedWebViewContent();

      this.overviewPanel.onDidChangeViewState(async e => {
        if (e.webviewPanel.visible && e.webviewPanel.active) {
          (this.overviewPanel as WebviewPanel).webview.html = await this.getCachedWebViewContent();
        }
      }, null, this.context.subscriptions
      );

      await this.setupMessageListener();

      // Reset when the current panel is closed
      this.overviewPanel.onDidDispose(() => { this.overviewPanel = undefined }, null, this.context.subscriptions);
    }
  }

  private generateSVGFromPath(filePath: string, hash: string) {
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

  private async getCachedWebViewContent() {
    // if (this.cachedWebViewContent === null) {
    this.cachedWebViewContent = await this.getWebviewContent();
    // }
    return this.cachedWebViewContent;
  }

  private async getWebviewContent() {
    if (!workspace.workspaceFolders)
      return "No workspace root defined";

    const resourcePath = path.resolve(this.context.extensionPath, "resources");
    this.dataArray = [];
    await this.initDirectoryMap();
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
    }).replace(/link rel="stylesheet" href="([^"]*)"/g, (match, src) => {
      const realSource = "vscode-resource:" + path.resolve(resourcePath, src);
      return `link rel="stylesheet" href="${realSource}"`;
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

  private async initDirectoryMap() {
    this.directoryMap = {} as DirectoryMap;
    const rootItem = {} as Item;
    rootItem.name = "root";
    rootItem.path = workspace.workspaceFolders![0].uri.fsPath;
    rootItem.relativePath = "root";
    await this.scanItem(rootItem);
  }

  private async scanItem(item: Item) {
    try {
      if (Settings.getDirectoriesToExclude().indexOf(item.name) > -1)
        return;

      const files = fs.readdirSync(item.path);
      for (const file of files) {
        let relativePath = path.join(item.relativePath, file);
        let absolutePath = path.join(item.path, file);
        let newItem = {} as Item;
        newItem.name = file;
        newItem.relativePath = relativePath;
        newItem.path = absolutePath;
        newItem.matches = null;

        if (fs.statSync(absolutePath).isDirectory()) {
          await this.scanItem(newItem);
        } else {
          const document = await workspace.openTextDocument(newItem.path);
          if (document && SUPPORTED_LANGUAGES.includes(document.languageId)) {
            let content = fs.readFileSync(absolutePath).toString();
            let lineCount = content.split(/\r\n|\r|\n/).length;
            newItem.content = content;
            newItem.lines = lineCount;
            newItem.lastModified = fs.statSync(absolutePath).mtime;
            newItem.hash = Md5.hashStr(absolutePath) as string;
            this.directoryMap[relativePath] = newItem;
          }
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  private async getSearchResults(model: "colBERT" | "codeBERT", search_phrase: string) {
    if (!this.overviewPanel)
      return;
    const url = Settings.getSearchApiUrl();
    const data = await this.getSearchParts();

    if (search_phrase.length % 9 === 0 || search_phrase.length === 11)
      search_phrase = search_phrase + " " //Bug fix...

    axios.post(url, {
      model: model,
      search: search_phrase,
      content: JSON.stringify(data),
      index_name: this.index_name
    }).then((response: any) => {
      if (response.data)
        this.overviewPanel!.webview.postMessage({ command: "searchResults", data: response.data });
      else {
        data.forEach(f => f.matches = []);
        this.overviewPanel!.webview.postMessage({ command: "searchResults", data: data });
      }
    }).catch((err) => {
      console.log(err);
      data.forEach(f => f.matches = []);
      this.overviewPanel!.webview.postMessage({ command: "searchResults", data: data });
    });
  }

  private async getSearchParts() {
    const batch_size = Settings.getSearchBatchSize();
    const data = [];
    for (const x of this.dataArray) {
      const matches = [];
      let length = 0;
      if (batch_size > 0) {
        const lines = x.content.split(/\r\n|\r|\n/);
        length = lines.length;
        for (let i = 0; i < lines.length; i += batch_size) {
          const end = i + batch_size > lines.length - 1 ? lines.length - 1 : i + batch_size;
          const linesContent = lines.slice(i, end).join("\n");
          matches.push({ start: i, end: i + batch_size, code: linesContent });
        }
      } else {
        const document = await workspace.openTextDocument(x.path);
        if (document) {
          if (SUPPORTED_LANGUAGES.includes(document.languageId)) {
            const methods = ast.getFunctionDeclarations(document);
            length = x.lines;
            methods.forEach(i => {
              let content: string = "";
              for (let j = i.start.line; j <= i.end.line; j++)
                content += document.lineAt(j).text + "\n";
              matches.push({ start: i.start.line, end: i.end.line, code: content });
            });
          }
        }
      }
      data.push({ ...x, lines: length, content: undefined, matches: matches });
    }
    return data;
  }

  private async setupMessageListener() {
    if (this.overviewPanel) {
      await this.overviewPanel.webview.onDidReceiveMessage(
        async message => {
          switch (message.command) {
            case "init":
              this.dataArray = this.dataArray.map(x => {
                const local_path = Uri.file(path.join(this.CACHE_PATH, x.hash + ".svg"));
                const uri = this.overviewPanel!.webview.asWebviewUri(local_path);
                x.imagePath = uri.toString();
                return x;
              });
              // send files to webview
              this.overviewPanel!.webview.postMessage({
                command: "init",
                data: this.dataArray
              });
              this.overviewPanel!.webview.postMessage({
                command: "lastIndex",
                data: this.lastIndexing
              });
              break;
            case "openFile":
              const filePath = message.path;
              const openPath = Uri.file(filePath); //A request file path
              workspace.openTextDocument(openPath).then(doc => {
                window.showTextDocument(doc, { viewColumn: ViewColumn.Beside, preview: true }).then((textEditor: TextEditor) => {
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
            case "index":
              this.indexAllFiles();
              break;
            case "search":
              const search = message.value;
              if (Settings.getSearchModelType() === "stanford/ColBERT")
                this.getSearchResults("colBERT", search);
              else
                this.getSearchResults("codeBERT", search);
              break;
          }
        },
        undefined,
        this.context.subscriptions
      );
    }
  }
}
