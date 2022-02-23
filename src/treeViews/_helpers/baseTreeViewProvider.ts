import {
  Disposable,
  Event,
  EventEmitter,
  TreeDataProvider,
  Uri,
  window,
} from "vscode";

export abstract class BaseTreeViewProvider<TreeItem> implements TreeDataProvider<TreeItem>, Disposable {
  protected _onDidChangeTreeData = new EventEmitter<TreeItem | undefined>();
  get onDidChangeTreeData(): Event<TreeItem | undefined> {
    return this._onDidChangeTreeData.event;
  }

  protected disposables: Disposable[] = [];

  constructor(protected id: string, protected uri?: Uri) {
    this.disposables.push(...this.registerCommands());
    this.initialize();
  }

  dispose() {
    Disposable.from(...this.disposables).dispose();
  }

  protected initialize() {
    window.createTreeView(this.id, { treeDataProvider: this });
  }

  getTreeItem(node: TreeItem): TreeItem | Promise<TreeItem> {
    return node;
  }

  public abstract getChildren(element?: TreeItem): Promise<TreeItem[]>;

  public refresh(uri?: Uri) {
    this.uri = uri;
    this._onDidChangeTreeData.fire(undefined);
  }

  protected abstract registerCommands(): Disposable[];
}
