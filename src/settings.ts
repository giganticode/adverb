import { ThemeColor, workspace, WorkspaceConfiguration } from "vscode";

export class Settings {
  private static configuration: WorkspaceConfiguration;

  static readSettings() {
    Settings.configuration = workspace.getConfiguration("adverb");
  }

  // ** BASIC **
  static isRenamingEnabled(): boolean {
    return Settings.configuration.get<boolean>("renamingEnabled", true);
  }

  static isFoldingEnabled(): boolean {
    return Settings.configuration.get<boolean>("foldingEnabled", true);
  }

  static areTreeViewsEnabled(): boolean {
    return Settings.configuration.get<boolean>("treeViewsEnabled", true);
  }

  static areCodeLensEnabled(): boolean {
    return Settings.configuration.get<boolean>("codeLensEnabled", true);
  }

  static areFileDecorationsEnabled(): boolean {
    return Settings.configuration.get<boolean>("fileDecorationsEnabled", true);
  }



  // ** BACKEND **
  static getRenamingModelType(): string {
    return Settings.configuration.get<string>("renamingModel", "Salesforce/codet5-base");
  }

  static getBackendUrl(): string {
    return Settings.configuration.get<string>("backendUrl", "http://127.0.0.1:8080");
  }

  static getSummaryApiUrl(): string {
    return this.getBackendUrl() + Settings.configuration.get<string>("summaryUrl", "/api/summary");
  }

  static getNameApiUrl(): string {
    return this.getBackendUrl() + Settings.configuration.get<string>("nameUrl", "/api/name");
  }



  // ** STYLING **
  static getBackgroundColor(): string | ThemeColor {
    const backgroundColor = Settings.configuration.get<string>("backgroundColor", "inherit");
    return backgroundColor.startsWith("#") ? new ThemeColor(backgroundColor) : backgroundColor;
  }

  static getFontColor(): string | ThemeColor {
    const fontColor = Settings.configuration.get<string>("fontColor", "inherit");
    return fontColor.startsWith("#") ? new ThemeColor(fontColor) : fontColor;
  }

  static getFontStyle(): string {
    return Settings.configuration.get<string>("fontStyle", "inherit");
  }

  static getFontWeight(): string {
    return Settings.configuration.get<string>("fontWeight", "inherit");
  }

  static getFontSize(): string {
    return Settings.configuration.get<string>("fontSize", "inherit");
  }

  static getMargin(): string {
    return Settings.configuration.get<string>("margin", "none");
  }

  static getPadding(): string {
    return Settings.configuration.get<string>("padding", "none");
  }

  static getBorderRadius(): string {
    return Settings.configuration.get<string>("borderRadius", "none");
  }

  static getBorder(): string {
    return Settings.configuration.get<string>("border", "none");
  }
}
